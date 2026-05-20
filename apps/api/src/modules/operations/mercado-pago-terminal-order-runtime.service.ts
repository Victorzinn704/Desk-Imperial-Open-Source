import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'
import { resolveRedisUrl } from '../../common/utils/redis-url.util'
import type { RequestContext } from '../../common/utils/request-context.util'

const QUEUE_TERMINAL_ORDER = 'mercado-pago:queue:terminal-order'
const ZSET_TERMINAL_ORDER_DELAYED = 'mercado-pago:queue:terminal-order:delayed'
const DEFAULT_RETRY_DELAY_MS = 2_000
const MAX_RETRY_ATTEMPTS = 5

export type MercadoPagoTerminalOrderJob = {
  attempts: number
  context: RequestContext
  intentId: string
  receivedAt: string
}

type DequeueResult = { job: MercadoPagoTerminalOrderJob; raw: string } | null

@Injectable()
export class MercadoPagoTerminalOrderRuntime implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MercadoPagoTerminalOrderRuntime.name)
  private blockingClient: Redis | null = null
  private commandClient: Redis | null = null
  private enabled = false

  async onModuleInit() {
    const url = resolveRedisUrl(process.env)
    if (!url) {
      this.logger.warn('Redis nao configurado — criacao de order Mercado Pago vai usar fallback inline.')
      return
    }

    const baseOptions = {
      connectTimeout: 5_000,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    } as const

    this.commandClient = new Redis(url, baseOptions)
    this.blockingClient = new Redis(url, { ...baseOptions, maxRetriesPerRequest: null })
    this.attachErrorHandlers()

    try {
      await Promise.all([this.commandClient.connect(), this.blockingClient.connect()])
      this.enabled = true
      this.logger.log('Mercado Pago terminal order runtime conectado ao Redis.')
    } catch (error) {
      this.closeRedisClientsAfterFailedConnect()
      this.logger.error(`Falha ao conectar Redis para terminal order Mercado Pago: ${toErrorMessage(error)}`)
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.blockingClient?.quit(), this.commandClient?.quit()])
    this.blockingClient = null
    this.commandClient = null
    this.enabled = false
  }

  isReady() {
    return this.enabled && this.commandClient !== null && this.blockingClient !== null
  }

  async enqueueTerminalOrder(job: Omit<MercadoPagoTerminalOrderJob, 'attempts'>) {
    if (!this.commandClient) {
      return false
    }

    await this.commandClient.lpush(QUEUE_TERMINAL_ORDER, JSON.stringify({ ...job, attempts: 0 }))
    return true
  }

  async dequeueTerminalOrderBlocking(timeoutSec: number): Promise<DequeueResult> {
    const client = this.blockingClient
    if (!(this.enabled && client)) {
      return null
    }

    const result = await client.brpop(QUEUE_TERMINAL_ORDER, timeoutSec)
    if (!result) {
      return null
    }

    const [, raw] = result
    return parseTerminalOrderJob(raw)
  }

  async retryTerminalOrder(job: MercadoPagoTerminalOrderJob, delayMs = DEFAULT_RETRY_DELAY_MS) {
    if (!this.commandClient) {
      return false
    }

    const next: MercadoPagoTerminalOrderJob = { ...job, attempts: job.attempts + 1 }
    if (next.attempts > MAX_RETRY_ATTEMPTS) {
      this.logger.warn(`Terminal order Mercado Pago descartada apos ${next.attempts} tentativas.`)
      return false
    }

    await this.commandClient.zadd(
      ZSET_TERMINAL_ORDER_DELAYED,
      Date.now() + Math.max(100, delayMs),
      JSON.stringify(next),
    )
    return true
  }

  async drainDelayedReady(): Promise<number> {
    if (!this.commandClient) {
      return 0
    }

    const due = await this.commandClient.zrangebyscore(ZSET_TERMINAL_ORDER_DELAYED, 0, Date.now(), 'LIMIT', 0, 50)
    return this.moveDueJobs(due)
  }

  private async moveDueJobs(due: string[]) {
    let moved = 0
    for (const raw of due) {
      const parsed = parseTerminalOrderJob(raw)
      const removed = await this.commandClient?.zrem(ZSET_TERMINAL_ORDER_DELAYED, raw)
      if (!parsed || removed === 0) {
        continue
      }
      await this.commandClient?.lpush(QUEUE_TERMINAL_ORDER, JSON.stringify(parsed.job))
      moved += 1
    }
    return moved
  }

  private attachErrorHandlers() {
    for (const client of [this.commandClient, this.blockingClient]) {
      client?.on('error', (error) =>
        this.logger.warn(`Redis Mercado Pago terminal order error: ${toErrorMessage(error)}`),
      )
    }
  }

  private closeRedisClientsAfterFailedConnect() {
    this.blockingClient?.disconnect()
    this.commandClient?.disconnect()
    this.blockingClient = null
    this.commandClient = null
    this.enabled = false
  }
}

function parseTerminalOrderJob(raw: string): DequeueResult {
  try {
    const job = JSON.parse(raw) as MercadoPagoTerminalOrderJob
    return job.intentId ? { job, raw } : null
  } catch {
    return null
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
