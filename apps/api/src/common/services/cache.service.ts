import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'
import { resolveRedisUrl } from '../utils/redis-url.util'

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name)
  private client: Redis | null = null
  private enabled = false
  private failureCount = 0

  constructor() {}

  private handleFailure(context: string) {
    this.failureCount++
    if (this.failureCount >= 3 && this.enabled) {
      this.enabled = false
      this.logger.error(
        `Redis apresentou 3 falhas consecutivas (${context}). Cache desligado permanentemente via Fail Open.`,
      )
    }
  }

  onModuleInit() {
    const url = resolveRedisUrl(process.env)
    if (!url) {
      this.logger.warn(
        'Redis não configurado (REDIS_URL/REDIS_PRIVATE_URL/REDIS_PUBLIC_URL) — cache desabilitado e realtime multi-instância indisponível. Em produção, Redis é obrigatório.',
      )
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
      this.failureCount = 0
      if (!raw) return null
      return JSON.parse(raw) as T
    } catch {
      this.handleFailure('get')
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
      this.failureCount = 0
    } catch {
      this.handleFailure('set')
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      await this.client.del(key)
      this.failureCount = 0
    } catch {
      this.handleFailure('del')
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (!this.enabled || !this.client) return
    try {
      let cursor = '0'
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', '100')
        cursor = nextCursor
        if (keys.length > 0) {
          await this.client.unlink(...keys)
        }
      } while (cursor !== '0')
      this.failureCount = 0
    } catch {
      this.handleFailure('delByPrefix')
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

  static productsKey(userId: string, scope: 'active' | 'all' = 'active') {
    return `products:list:${userId}:${scope}`
  }
  static consentDocumentsKey(version: string) {
    return `consent:documents:${version}`
  }
  static consentOverviewKey(userId: string, version: string) {
    return `consent:overview:${userId}:${version}`
  }
  static employeesKey(userId: string) {
    return `employees:list:${userId}`
  }
  static ordersKey(userId: string) {
    return `orders:summary:${userId}`
  }

  static operationsLivePrefix(workspaceOwnerUserId: string, businessDate: string) {
    return `operations:live:${workspaceOwnerUserId}:${businessDate}:`
  }

  static operationsLiveKey(
    workspaceOwnerUserId: string,
    businessDate: string,
    includeCashMovements: boolean,
    scopedEmployeeId?: string | null,
  ) {
    const scopeSegment = scopedEmployeeId ? `employee:${scopedEmployeeId}` : 'workspace'
    return `operations:live:${workspaceOwnerUserId}:${businessDate}:${includeCashMovements ? 'full' : 'compact'}:${scopeSegment}`
  }

  static operationsKitchenPrefix(workspaceOwnerUserId: string, businessDate: string) {
    return `operations:kitchen:${workspaceOwnerUserId}:${businessDate}:`
  }

  static operationsKitchenKey(workspaceOwnerUserId: string, businessDate: string, scopedEmployeeId?: string | null) {
    const scopeSegment = scopedEmployeeId ? `employee:${scopedEmployeeId}` : 'workspace'
    return `operations:kitchen:${workspaceOwnerUserId}:${businessDate}:${scopeSegment}`
  }

  static operationsSummaryPrefix(workspaceOwnerUserId: string, businessDate: string) {
    return `operations:summary:${workspaceOwnerUserId}:${businessDate}:`
  }

  static operationsSummaryKey(workspaceOwnerUserId: string, businessDate: string, scopedEmployeeId?: string | null) {
    const scopeSegment = scopedEmployeeId ? `employee:${scopedEmployeeId}` : 'workspace'
    return `operations:summary:${workspaceOwnerUserId}:${businessDate}:${scopeSegment}`
  }
}
