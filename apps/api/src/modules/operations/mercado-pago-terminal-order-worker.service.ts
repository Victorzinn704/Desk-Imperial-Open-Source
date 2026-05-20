import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { AuditSeverity, PaymentTerminalIntentStatus, PaymentTerminalProvider } from '@prisma/client'
import { toNumberOrZero } from './operations-domain.utils'
import { AuditLogService } from '../monitoring/audit-log.service'
import { PrismaService } from '../../database/prisma.service'
import { MercadoPagoPointClient, type MercadoPagoPointPaymentMethod } from './mercado-pago-point.client'
import {
  type MercadoPagoTerminalOrderJob,
  MercadoPagoTerminalOrderRuntime,
} from './mercado-pago-terminal-order-runtime.service'

const POLL_TIMEOUT_SEC = 5
const WORKER_COUNT = 2
const RUNTIME_NOT_READY_BACKOFF_MS = 1_000
const LOOP_FAILURE_BACKOFF_MS = 1_000
const TERMINAL_INTENT_FAILED_CODE = 'MERCADO_PAGO_POINT_CREATE_ORDER_FAILED'

@Injectable()
export class MercadoPagoTerminalOrderWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MercadoPagoTerminalOrderWorker.name)
  private loops: Array<Promise<void>> = []
  private retrySweep: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly runtime: MercadoPagoTerminalOrderRuntime,
    private readonly prisma: PrismaService,
    private readonly mercadoPagoPoint: MercadoPagoPointClient,
    private readonly auditLogService: AuditLogService,
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

        const dequeued = await this.runtime.dequeueTerminalOrderBlocking(POLL_TIMEOUT_SEC)
        if (!dequeued) {
          continue
        }

        await this.processTerminalOrder(workerId, dequeued.job)
      } catch (error) {
        this.logger.error(`Loop terminal order Mercado Pago interrompido: ${toErrorMessage(error)}`)
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

  private async processTerminalOrder(workerId: number, job: MercadoPagoTerminalOrderJob) {
    const intent = await this.loadPendingIntent(job.intentId)
    if (!intent) {
      return
    }

    try {
      const providerOrder = await this.mercadoPagoPoint.createOrder({
        amount: toNumberOrZero(intent.amount),
        description: 'Desk Imperial comanda',
        externalReference: intent.externalReference,
        idempotencyKey: intent.idempotencyKey,
        method: intent.method as MercadoPagoPointPaymentMethod,
        terminalId: intent.providerTerminalId,
      })
      const updated = await this.markIntentAsQueued(intent.id, providerOrder)
      await this.recordCreatedAudit(job, updated)
    } catch (error) {
      await this.handleTerminalOrderFailure(workerId, job, error)
    }
  }

  private loadPendingIntent(intentId: string) {
    return this.prisma.paymentTerminalIntent.findFirst({
      where: {
        id: intentId,
        provider: PaymentTerminalProvider.MERCADO_PAGO_POINT,
        providerOrderId: null,
        status: PaymentTerminalIntentStatus.PENDING,
      },
    })
  }

  private markIntentAsQueued(
    intentId: string,
    providerOrder: Awaited<ReturnType<MercadoPagoPointClient['createOrder']>>,
  ) {
    return this.prisma.paymentTerminalIntent.update({
      where: { id: intentId },
      data: {
        providerOrderId: providerOrder.orderId,
        providerPaymentId: providerOrder.paymentId,
        providerStatus: providerOrder.status,
      },
    })
  }

  private async handleTerminalOrderFailure(workerId: number, job: MercadoPagoTerminalOrderJob, error: unknown) {
    const retried = await this.runtime.retryTerminalOrder(job, resolveRetryDelayMs(job))
    if (retried) {
      this.logger.warn(`Terminal order Mercado Pago reagendada pelo worker ${workerId}: ${toErrorMessage(error)}`)
      return
    }

    await this.markIntentAsFailed(job.intentId, error)
    this.logger.warn(
      `Terminal order Mercado Pago falhou definitivamente pelo worker ${workerId}: ${toErrorMessage(error)}`,
    )
  }

  private markIntentAsFailed(intentId: string, error: unknown) {
    return this.prisma.paymentTerminalIntent.updateMany({
      where: { id: intentId, providerOrderId: null, status: PaymentTerminalIntentStatus.PENDING },
      data: {
        errorCode: TERMINAL_INTENT_FAILED_CODE,
        errorMessage: toErrorMessage(error).slice(0, 240),
        status: PaymentTerminalIntentStatus.FAILED,
      },
    })
  }

  private recordCreatedAudit(job: MercadoPagoTerminalOrderJob, intent: TerminalPaymentIntentRecordSource) {
    return this.auditLogService.record({
      actorUserId: intent.createdByUserId,
      event: 'operations.comanda_terminal_payment_intent.created',
      ipAddress: job.context.ipAddress,
      metadata: {
        amount: toNumberOrZero(intent.amount),
        comandaId: intent.comandaId,
        method: intent.method,
        provider: intent.provider,
        providerOrderId: intent.providerOrderId,
      },
      resource: 'payment-terminal-intent',
      resourceId: intent.id,
      severity: AuditSeverity.INFO,
      userAgent: job.context.userAgent,
    })
  }
}

type TerminalPaymentIntentRecordSource = {
  amount: { toNumber(): number } | number
  comandaId: string
  createdByUserId: string
  id: string
  method: string
  provider: PaymentTerminalProvider
  providerOrderId: string | null
}

function resolveRetryDelayMs(job: MercadoPagoTerminalOrderJob) {
  return Math.min(30_000, 800 * 2 ** Math.min(job.attempts, 5))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
