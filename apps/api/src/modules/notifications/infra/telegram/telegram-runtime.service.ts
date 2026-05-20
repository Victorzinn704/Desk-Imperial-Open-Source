import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import Redis from 'ioredis'
import { resolveRedisUrl } from '../../../../common/utils/redis-url.util'
import {
  buildEmptyTelegramMetrics,
  buildTelegramMetricKey,
  buildTelegramMetricsSnapshot,
  TELEGRAM_METRIC_NAMES,
  type TelegramMetricName,
} from './telegram-runtime-metrics'
import { clearTelegramFsmState, readTelegramFsmState, writeTelegramFsmState } from './telegram-runtime-fsm-store'
import type { InboundJob, OutboundJob } from './telegram-runtime.types'

const QUEUE_INBOUND = 'telegram:queue:inbound'
const QUEUE_OUTBOUND = 'telegram:queue:outbound'
const ZSET_DELAYED = 'telegram:queue:delayed'
const KEY_GLOBAL_RATE = 'telegram:ratelimit:global'
const KEY_CHAT_THROTTLE = (chatId: string | number) => `telegram:throttle:chat:${chatId}`

const METRICS_BUCKET_SECONDS = 60
const METRICS_RETENTION_SECONDS = 60 * 60
const GLOBAL_INBOUND_PER_SEC = 80 // conservative; Telegram allows ~30/s outbound, inbound is lighter
const PER_CHAT_OUTBOUND_INTERVAL_MS = 1000 // 1 msg / chat / sec
const GLOBAL_OUTBOUND_PER_SEC = 28 // < 30/s safety margin
const DEFAULT_RETRY_DELAY_MS = 2_000
const MAX_RETRY_ATTEMPTS = 6

type DequeueResult<T> = { job: T; raw: string } | null
@Injectable()
export class TelegramRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramRuntimeService.name)
  private blockingClient: Redis | null = null
  private commandClient: Redis | null = null
  private enabled = false

  async onModuleInit() {
    const url = resolveRedisUrl(process.env)
    if (!url) {
      this.logger.warn('Redis nao configurado — fila Telegram desabilitada (Fail Open).')
      return
    }

    const baseOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
      enableOfflineQueue: false,
    } as const

    this.commandClient = new Redis(url, baseOptions)
    this.blockingClient = new Redis(url, { ...baseOptions, maxRetriesPerRequest: null })

    for (const client of [this.commandClient, this.blockingClient]) {
      client.on('error', (err) =>
        this.logger.warn(`Redis Telegram queue error: ${err instanceof Error ? err.message : 'unknown'}`),
      )
    }

    try {
      await Promise.all([this.commandClient.connect(), this.blockingClient.connect()])
      this.enabled = true
      this.logger.log('Telegram queue runtime conectado ao Redis.')
    } catch (err) {
      this.closeRedisClientsAfterFailedConnect()
      this.logger.error(
        `Falha ao conectar Redis para fila Telegram: ${err instanceof Error ? err.message : String(err)}`,
      )
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

  async enqueueInbound(job: Omit<InboundJob, 'attempts'>) {
    if (!this.commandClient) {
      return false
    }
    if (!(await this.allowGlobalInbound())) {
      this.logger.warn('Global inbound rate limit excedido — descartando update Telegram.')
      await this.incrementMetric('drops_inbound')
      return false
    }
    const payload: InboundJob = { ...job, attempts: 0 }
    const metricBucket = Math.floor(Date.now() / 1000 / METRICS_BUCKET_SECONDS)
    const metricKey = buildTelegramMetricKey('received', metricBucket)
    await this.commandClient
      .pipeline()
      .lpush(QUEUE_INBOUND, JSON.stringify(payload))
      .incr(metricKey)
      .expire(metricKey, METRICS_RETENTION_SECONDS)
      .exec()
    return true
  }

  async dequeueInboundBlocking(timeoutSec: number): Promise<DequeueResult<InboundJob>> {
    const client = this.blockingClient
    if (!(this.enabled && client)) {
      return null
    }
    const result = await client.brpop(QUEUE_INBOUND, timeoutSec)
    if (!result) {
      return null
    }
    const [, raw] = result
    try {
      return { job: JSON.parse(raw) as InboundJob, raw }
    } catch {
      return null
    }
  }

  async enqueueOutbound(job: Omit<OutboundJob, 'attempts' | 'enqueuedAt'>) {
    if (!this.commandClient) {
      return false
    }
    const payload: OutboundJob = { ...job, attempts: 0, enqueuedAt: new Date().toISOString() }
    await this.commandClient.lpush(QUEUE_OUTBOUND, JSON.stringify(payload))
    return true
  }

  async dequeueOutboundBlocking(timeoutSec: number): Promise<DequeueResult<OutboundJob>> {
    const client = this.blockingClient
    if (!(this.enabled && client)) {
      return null
    }
    const result = await client.brpop(QUEUE_OUTBOUND, timeoutSec)
    if (!result) {
      return null
    }
    const [, raw] = result
    try {
      return { job: JSON.parse(raw) as OutboundJob, raw }
    } catch {
      return null
    }
  }

  async retryOutbound(job: OutboundJob, delayMs: number = DEFAULT_RETRY_DELAY_MS) {
    if (!this.commandClient) {
      return
    }
    const next: OutboundJob = { ...job, attempts: job.attempts + 1 }
    if (next.attempts > MAX_RETRY_ATTEMPTS) {
      await this.incrementMetric('drops_outbound')
      this.logger.warn(`Outbound Telegram dropped apos ${next.attempts} tentativas.`)
      return
    }
    const score = Date.now() + Math.max(100, delayMs)
    await this.commandClient.zadd(ZSET_DELAYED, score, JSON.stringify({ kind: 'outbound', job: next }))
    await this.incrementMetric('retries_outbound')
  }

  async drainDelayedReady(): Promise<number> {
    if (!this.commandClient) {
      return 0
    }
    const now = Date.now()
    const due = await this.commandClient.zrangebyscore(ZSET_DELAYED, 0, now, 'LIMIT', 0, 50)
    if (due.length === 0) {
      return 0
    }
    let moved = 0
    for (const raw of due) {
      try {
        const parsed = JSON.parse(raw) as { kind: string; job: OutboundJob | InboundJob }
        const removed = await this.commandClient.zrem(ZSET_DELAYED, raw)
        if (removed === 0) {
          continue
        } // someone else grabbed it
        if (parsed.kind === 'outbound') {
          await this.commandClient.lpush(QUEUE_OUTBOUND, JSON.stringify(parsed.job))
        } else {
          await this.commandClient.lpush(QUEUE_INBOUND, JSON.stringify(parsed.job))
        }
        moved += 1
      } catch {
        await this.commandClient.zrem(ZSET_DELAYED, raw)
      }
    }
    return moved
  }

  private async allowGlobalInbound() {
    if (!this.commandClient) {
      return true
    }
    try {
      const key = `${KEY_GLOBAL_RATE}:inbound:${currentSecondBucket()}`
      const count = await this.commandClient.incr(key)
      if (count === 1) {
        await this.commandClient.expire(key, 5)
      }
      return count <= GLOBAL_INBOUND_PER_SEC
    } catch {
      return true // fail open
    }
  }

  async allowGlobalOutbound() {
    if (!this.commandClient) {
      return true
    }
    try {
      const key = `${KEY_GLOBAL_RATE}:outbound:${currentSecondBucket()}`
      const count = await this.commandClient.incr(key)
      if (count === 1) {
        await this.commandClient.expire(key, 5)
      }
      return count <= GLOBAL_OUTBOUND_PER_SEC
    } catch {
      return true
    }
  }

  async waitTimeForChat(chatId: number | string | null | undefined): Promise<number> {
    if (!(chatId && this.commandClient)) {
      return 0
    }

    try {
      const key = KEY_CHAT_THROTTLE(chatId)
      const now = Date.now()
      // SET key now NX PX 1000 — if not set, available immediately.
      const setOk = await this.commandClient.set(key, String(now), 'PX', PER_CHAT_OUTBOUND_INTERVAL_MS, 'NX')
      if (setOk === 'OK') {
        return 0
      }

      const pttl = await this.commandClient.pttl(key)
      return pttl > 0 ? pttl : 0
    } catch {
      return 0
    }
  }

  async incrementMetric(name: TelegramMetricName) {
    if (!this.commandClient) {
      return
    }
    try {
      const bucket = Math.floor(Date.now() / 1000 / METRICS_BUCKET_SECONDS)
      const key = buildTelegramMetricKey(name, bucket)
      const count = await this.commandClient.incr(key)
      if (count === 1) {
        await this.commandClient.expire(key, METRICS_RETENTION_SECONDS)
      }
    } catch {
      // metrics are best-effort
    }
  }

  async readMetricsLastMinute() {
    if (!this.commandClient) {
      return buildEmptyTelegramMetrics()
    }
    const bucket = Math.floor(Date.now() / 1000 / METRICS_BUCKET_SECONDS)
    const keys = TELEGRAM_METRIC_NAMES.map((name) => buildTelegramMetricKey(name, bucket))
    try {
      const values = await this.commandClient.mget(...keys)
      return buildTelegramMetricsSnapshot(values)
    } catch {
      return buildEmptyTelegramMetrics()
    }
  }

  async getQueueDepths() {
    if (!this.commandClient) {
      return { inbound: 0, outbound: 0, delayed: 0 }
    }
    try {
      const [inbound, outbound, delayed] = await Promise.all([
        this.commandClient.llen(QUEUE_INBOUND),
        this.commandClient.llen(QUEUE_OUTBOUND),
        this.commandClient.zcard(ZSET_DELAYED),
      ])
      return { inbound, outbound, delayed }
    } catch {
      return { inbound: 0, outbound: 0, delayed: 0 }
    }
  }

  async getFsmState<T = Record<string, unknown>>(chatId: number | string): Promise<T | null> {
    return readTelegramFsmState<T>(this.commandClient, chatId)
  }

  async setFsmState(chatId: number | string, state: Record<string, unknown>) {
    await writeTelegramFsmState(this.commandClient, chatId, state)
  }

  async clearFsmState(chatId: number | string) {
    await clearTelegramFsmState(this.commandClient, chatId)
  }

  private closeRedisClientsAfterFailedConnect() {
    this.blockingClient?.disconnect()
    this.commandClient?.disconnect()
    this.blockingClient = null
    this.commandClient = null
    this.enabled = false
  }
}

function currentSecondBucket() {
  return Math.floor(Date.now() / 1000)
}
