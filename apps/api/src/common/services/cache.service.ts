import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name)
  private client: Redis | null = null
  private enabled = false

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL')
    if (!url) {
      this.logger.warn('REDIS_URL não configurado — cache desabilitado. Dashboard rodará sem cache.')
      return
    }

    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    })

    this.client.on('connect', () => {
      this.enabled = true
      this.logger.log('Redis conectado — cache ativo.')
    })

    this.client.on('error', (err: Error) => {
      this.enabled = false
      this.logger.error(`Redis erro — cache desabilitado temporariamente: ${err.message}`)
    })

    void this.client.connect().catch(() => {
      this.logger.warn('Redis indisponível no startup — cache desabilitado.')
    })
  }

  onModuleDestroy() {
    if (this.client) {
      void this.client.quit()
      this.client = null
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null
    try {
      const raw = await this.client.get(key)
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch {
      // Falha silenciosa — não derrubar o fluxo principal
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      await this.client.del(key)
    } catch {
      // Falha silenciosa
    }
  }

  isReady(): boolean {
    return this.enabled && !!this.client
  }

  async ping(): Promise<boolean> {
    if (!this.enabled || !this.client) return false
    try {
      const result = await this.client.ping()
      return result === 'PONG' || result === 'pong'
    } catch {
      return false
    }
  }

  /** Chave padrão para o resumo financeiro de um usuário */
  static financeKey(userId: string): string {
    return `finance:summary:${userId}`
  }

  /** Chave para rate limiting genérico — prefixo identifica o domínio */
  static ratelimitKey(prefix: string, key: string): string {
    return `ratelimit:${prefix}:${key}`
  }

  /** Chave para cache de insight do Gemini por usuário, moeda e foco */
  static geminiKey(userId: string, currency: string, focus: string): string {
    return `gemini:insight:${userId}:${currency}:${focus.toLowerCase()}`
  }

  static productsKey(userId: string) {
    return `products:list:${userId}`
  }
  static employeesKey(userId: string) {
    return `employees:list:${userId}`
  }
  static ordersKey(userId: string) {
    return `orders:summary:${userId}`
  }

  static operationsLiveKey(workspaceOwnerUserId: string, businessDate: string, includeCashMovements: boolean) {
    return `operations:live:${workspaceOwnerUserId}:${businessDate}:${includeCashMovements ? 'full' : 'compact'}`
  }
}
