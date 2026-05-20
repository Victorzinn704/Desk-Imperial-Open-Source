import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { TelegramRuntimeService } from './telegram-runtime.service'
import type { InboundJob } from './telegram-runtime.types'
import { TelegramBotService } from '../../telegram-bot.service'
import { TelegramAdapter } from './telegram.adapter'

const POLL_TIMEOUT_SEC = 5
const PROCESSING_BUDGET_MS = 30_000
const WORKER_COUNT = 2
const RUNTIME_NOT_READY_BACKOFF_MS = 1_000
const LOOP_FAILURE_BACKOFF_MS = 1_000

/**
 * Consome os updates do Telegram que o controller enfileirou. Como o /webhook responde 200
 * imediatamente, processamento longo (queries Operations/Finance) nao gera retry do Telegram.
 */
@Injectable()
export class TelegramInboundWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramInboundWorker.name)
  private loops: Array<Promise<void>> = []
  private running = false

  constructor(
    private readonly runtime: TelegramRuntimeService,
    private readonly bot: TelegramBotService,
    private readonly adapter: TelegramAdapter,
  ) {}

  onApplicationBootstrap() {
    if (!this.adapter.isBotEnabled()) {
      this.logger.log('Telegram bot desabilitado — worker inbound nao iniciado.')
      return
    }
    this.running = true
    this.loops = Array.from({ length: WORKER_COUNT }, () => this.runLoop())
  }

  async onModuleDestroy() {
    this.running = false
    await Promise.allSettled(this.loops)
    this.loops = []
  }

  private async runLoop() {
    while (this.running) {
      try {
        if (!(await this.waitForRuntimeReady())) {
          continue
        }

        const dequeued = await this.runtime.dequeueInboundBlocking(POLL_TIMEOUT_SEC)
        if (!dequeued) {
          continue
        }

        await this.processWithBudget(dequeued.job)
      } catch (err) {
        this.logger.error(`Loop inbound interrompido: ${err instanceof Error ? err.message : String(err)}`)
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

  private async processWithBudget(job: InboundJob) {
    const start = Date.now()
    try {
      await Promise.race([
        this.bot.handleWebhookUpdate(job.update, {
          ipAddress: job.ipAddress,
          userAgent: job.userAgent,
          host: null,
          origin: null,
          referer: null,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Inbound update timeout')), PROCESSING_BUDGET_MS),
        ),
      ])
    } catch (err) {
      this.logger.warn(
        `Falha ao processar update Telegram (id=${job.update.update_id}): ${
          err instanceof Error ? err.message : String(err)
        } (latency=${Date.now() - start}ms)`,
      )
      await this.runtime.incrementMetric('errors')
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
