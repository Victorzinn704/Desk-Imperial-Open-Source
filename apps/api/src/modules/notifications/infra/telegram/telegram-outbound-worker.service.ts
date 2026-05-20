import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { TelegramAdapter } from './telegram.adapter'
import { TelegramRuntimeService } from './telegram-runtime.service'
import type { OutboundJob } from './telegram-runtime.types'
import { TelegramLinkService } from '../../telegram-link.service'
import { executeTelegramOutboundJob } from './telegram-outbound-job-dispatcher'
import { resolveTelegramRetryDecision } from './telegram-outbound-retry-policy'

const POLL_TIMEOUT_SEC = 5
const WORKER_COUNT = 4
const RUNTIME_NOT_READY_BACKOFF_MS = 1_000
const LOOP_FAILURE_BACKOFF_MS = 1_000

/**
 * Consome a fila outbound respeitando:
 * - 30 msg/s global (limite do Telegram)
 * - 1 msg/s/chat
 * - 429 com Retry-After preciso (`parameters.retry_after`)
 * - 4xx 'bot was blocked by the user' -> marca conta bloqueada
 */
@Injectable()
export class TelegramOutboundWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramOutboundWorker.name)
  private loops: Array<Promise<void>> = []
  private running = false
  private retrySweep: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly runtime: TelegramRuntimeService,
    private readonly adapter: TelegramAdapter,
    private readonly linkService: TelegramLinkService,
  ) {}

  onApplicationBootstrap() {
    if (!this.adapter.isBotEnabled()) {
      this.logger.log('Telegram bot desabilitado — worker outbound nao iniciado.')
      return
    }
    this.running = true
    this.loops = Array.from({ length: WORKER_COUNT }, () => this.runLoop())
    // Move delayed jobs back to the active queue every second.
    this.retrySweep = setInterval(() => {
      void this.runtime.drainDelayedReady()
    }, 1_000)
  }

  async onModuleDestroy() {
    this.running = false
    if (this.retrySweep) {
      clearInterval(this.retrySweep)
    }
    await Promise.allSettled(this.loops)
    this.loops = []
  }

  private async runLoop() {
    while (this.running) {
      try {
        if (!(await this.waitForRuntimeReady())) {
          continue
        }

        const dequeued = await this.runtime.dequeueOutboundBlocking(POLL_TIMEOUT_SEC)
        if (!dequeued) {
          continue
        }

        const job = dequeued.job
        await this.dispatch(job)
      } catch (err) {
        this.logger.error(`Loop outbound interrompido: ${err instanceof Error ? err.message : String(err)}`)
        await sleep(LOOP_FAILURE_BACKOFF_MS)
      }
    }
  }

  private async waitForRuntimeReady() {
    if (this.runtime.isReady()) {
      return true
    }

    await sleep(RUNTIME_NOT_READY_BACKOFF_MS)
    return false
  }

  private async dispatch(job: OutboundJob) {
    // Per-chat throttle
    const wait = await this.runtime.waitTimeForChat(job.chatId)
    if (wait > 0) {
      await this.runtime.retryOutbound(job, wait)
      return
    }

    // Global throughput cap
    if (!(await this.runtime.allowGlobalOutbound())) {
      await this.runtime.retryOutbound(job, 1_000)
      return
    }

    try {
      await executeTelegramOutboundJob(this.adapter, job)
      await this.runtime.incrementMetric('sent')
    } catch (error) {
      const handled = await this.handleFailure(job, error)
      if (!handled) {
        await this.runtime.incrementMetric('errors')
        this.logger.warn(
          `Falha definitiva em job Telegram (${job.kind}): ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }

  /** Returns true if the failure was recoverable (retry scheduled). */
  private async handleFailure(job: OutboundJob, error: unknown): Promise<boolean> {
    if (await this.tryHandleBlockedUserFailure(job, error)) {
      return false
    }

    return this.scheduleRetryWhenAllowed(job, error)
  }

  private async scheduleRetryWhenAllowed(job: OutboundJob, error: unknown) {
    const retryDecision = resolveTelegramRetryDecision(job, error)
    if (!retryDecision.retry) {
      return false
    }

    if (retryDecision.reason === 'rate_429') {
      await this.runtime.incrementMetric('rate_429')
    }
    await this.runtime.retryOutbound(job, retryDecision.delayMs)
    return true
  }

  private async tryHandleBlockedUserFailure(job: OutboundJob, error: unknown) {
    if (!this.adapter.isBlockedByUserError(error)) {
      return false
    }

    await this.markBlockedAccount(job.accountId)
    return true
  }

  private async markBlockedAccount(accountId: string | undefined) {
    if (!accountId) {
      return
    }

    await this.linkService.markAccountBlocked(accountId).catch(() => undefined)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
