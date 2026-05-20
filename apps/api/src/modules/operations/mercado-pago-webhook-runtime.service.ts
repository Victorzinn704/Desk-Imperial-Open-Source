import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'
import { resolveRedisUrl } from '../../common/utils/redis-url.util'
import type { RequestContext } from '../../common/utils/request-context.util'

const QUEUE_WEBHOOK = 'mercado-pago:queue:webhook'
const ZSET_DELAYED = 'mercado-pago:queue:delayed'
const DEFAULT_RETRY_DELAY_MS = 2_000
const MAX_RETRY_ATTEMPTS = 6

export type MercadoPagoWebhookJob = {
  body: unknown
  context: RequestContext
  query: Record<string, unknown>
  requestId: string | undefined
  signature: string | undefined
  receivedAt: string
  attempts: number
}

type DequeueResult = { job: MercadoPagoWebhookJob; raw: string } | null

@Injectable()
export class MercadoPagoWebhookRuntime implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MercadoPagoWebhookRuntime.name)
  private blockingClient: Redis | null = null
  private commandClient: Redis | null = null
  private enabled = false

  async onModuleInit() {
    const url = resolveRedisUrl(process.env)
    if (!url) {
      this.logger.warn('Redis nao configurado — webhook Mercado Pago vai usar fallback local.')
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
      this.logger.log('Mercado Pago webhook runtime conectado ao Redis.')
    } catch (error) {
      this.closeRedisClientsAfterFailedConnect()
      this.logger.error(`Falha ao conectar Redis para Mercado Pago webhook: ${toErrorMessage(error)}`)
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

  async enqueueWebhook(job: Omit<MercadoPagoWebhookJob, 'attempts'>) {
    if (!this.commandClient) {
      return false
    }
    await this.commandClient.lpush(QUEUE_WEBHOOK, JSON.stringify({ ...job, attempts: 0 }))
    return true
  }

  async dequeueWebhookBlocking(timeoutSec: number): Promise<DequeueResult> {
    const client = this.blockingClient
    if (!(this.enabled && client)) {
      return null
    }

    const result = await client.brpop(QUEUE_WEBHOOK, timeoutSec)
    if (!result) {
      return null
    }

    const [, raw] = result
    return parseWebhookJob(raw)
  }

  async retryWebhook(job: MercadoPagoWebhookJob, delayMs = DEFAULT_RETRY_DELAY_MS) {
    if (!this.commandClient) {
      return
    }

    const next: MercadoPagoWebhookJob = { ...job, attempts: job.attempts + 1 }
    if (next.attempts > MAX_RETRY_ATTEMPTS) {
      this.logger.warn(`Webhook Mercado Pago descartado apos ${next.attempts} tentativas.`)
      return
    }

    await this.commandClient.zadd(
      ZSET_DELAYED,
      Date.now() + Math.max(100, delayMs),
      JSON.stringify({ kind: 'webhook', job: next }),
    )
  }

  async drainDelayedReady(): Promise<number> {
    if (!this.commandClient) {
      return 0
    }

    const due = await this.commandClient.zrangebyscore(ZSET_DELAYED, 0, Date.now(), 'LIMIT', 0, 50)
    return this.moveDueJobs(due)
  }

  private async moveDueJobs(due: string[]) {
    let moved = 0
    for (const raw of due) {
      const job = parseDelayedWebhookJob(raw)
      const removed = await this.commandClient?.zrem(ZSET_DELAYED, raw)
      if (!job || removed === 0) {
        continue
      }
      await this.commandClient?.lpush(QUEUE_WEBHOOK, JSON.stringify(job))
      moved += 1
    }
    return moved
  }

  private attachErrorHandlers() {
    for (const client of [this.commandClient, this.blockingClient]) {
      client?.on('error', (error) => this.logger.warn(`Redis Mercado Pago webhook error: ${toErrorMessage(error)}`))
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

function parseWebhookJob(raw: string): DequeueResult {
  try {
    return { job: JSON.parse(raw) as MercadoPagoWebhookJob, raw }
  } catch {
    return null
  }
}

function parseDelayedWebhookJob(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { job?: MercadoPagoWebhookJob; kind?: string }
    return parsed.kind === 'webhook' && parsed.job ? parsed.job : null
  } catch {
    return null
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
