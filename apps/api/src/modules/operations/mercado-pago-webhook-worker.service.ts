import {
  BadRequestException,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common'
import { ComandaTerminalPaymentReconcileService } from './comanda-terminal-payment-reconcile.service'
import { type MercadoPagoWebhookJob, MercadoPagoWebhookRuntime } from './mercado-pago-webhook-runtime.service'

const POLL_TIMEOUT_SEC = 5
const WORKER_COUNT = 2
const RUNTIME_NOT_READY_BACKOFF_MS = 1_000
const LOOP_FAILURE_BACKOFF_MS = 1_000

@Injectable()
export class MercadoPagoWebhookWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MercadoPagoWebhookWorker.name)
  private loops: Array<Promise<void>> = []
  private retrySweep: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly runtime: MercadoPagoWebhookRuntime,
    private readonly reconcile: ComandaTerminalPaymentReconcileService,
  ) {}

  onApplicationBootstrap() {
    this.running = true
    this.loops = Array.from({ length: WORKER_COUNT }, (_, index) => this.runLoop(index + 1))
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

  private async runLoop(workerId: number) {
    while (this.running) {
      try {
        if (!(await this.waitForRuntimeReady())) {
          continue
        }

        const dequeued = await this.runtime.dequeueWebhookBlocking(POLL_TIMEOUT_SEC)
        if (!dequeued) {
          continue
        }

        await this.processWebhook(workerId, dequeued.job)
      } catch (error) {
        this.logger.error(`Loop webhook Mercado Pago interrompido: ${toErrorMessage(error)}`)
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

  private async processWebhook(workerId: number, job: MercadoPagoWebhookJob) {
    try {
      await this.reconcile.handleWebhook(job)
    } catch (error) {
      await this.handleWebhookFailure(workerId, job, error)
    }
  }

  private async handleWebhookFailure(workerId: number, job: MercadoPagoWebhookJob, error: unknown) {
    if (isPermanentWebhookError(error)) {
      this.logger.warn(`Webhook Mercado Pago descartado pelo worker ${workerId}: ${toErrorMessage(error)}`)
      return
    }

    await this.runtime.retryWebhook(job, resolveRetryDelayMs(job))
    this.logger.warn(`Webhook Mercado Pago reagendado pelo worker ${workerId}: ${toErrorMessage(error)}`)
  }
}

function isPermanentWebhookError(error: unknown) {
  return error instanceof UnauthorizedException || error instanceof BadRequestException
}

function resolveRetryDelayMs(job: MercadoPagoWebhookJob) {
  return Math.min(60_000, 1_000 * 2 ** Math.min(job.attempts, 5))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
