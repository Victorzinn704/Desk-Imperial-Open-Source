import { BadRequestException } from '@nestjs/common'
import { AuditSeverity, ComandaPaymentStatus, ComandaStatus, Prisma } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { AuditLogService } from '../monitoring/audit-log.service'
import type { ComandaRealtimePublisher } from './comanda-realtime-publisher.service'
import type { MercadoPagoPointOrderResult } from './mercado-pago-point.client'
import {
  buildTerminalIntentWorkspaceAuth,
  type ExistingPaymentTerminalIntent,
} from './comanda-terminal-payment-reconcile.utils'
import { calculateConfirmedPaidAmount } from './comanda-settlement.utils'
import type { OperationsHelpersService } from './operations-helpers.service'
import { toNumberOrZero } from './operations-domain.utils'

export type ApprovedIntentResult =
  | { createdPayment: false; intent: ExistingPaymentTerminalIntent }
  | {
      businessDate: Date
      closure: Awaited<ReturnType<OperationsHelpersService['syncCashClosure']>>
      closedComanda: boolean
      createdPayment: true
      intent: ExistingPaymentTerminalIntent
      refreshedComanda: Awaited<ReturnType<typeof loadComandaWithPayments>>
      refreshedSession: Awaited<ReturnType<OperationsHelpersService['recalculateCashSession']>> | null
    }

export async function loadComandaWithPayments(transaction: Prisma.TransactionClient, comandaId: string) {
  const comanda = await transaction.comanda.findUnique({
    where: { id: comandaId },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { paidAt: 'asc' }, where: { status: ComandaPaymentStatus.CONFIRMED } },
    },
  })

  if (!comanda) {
    throw new BadRequestException('Comanda da cobranca nao encontrada.')
  }

  return comanda
}

export type LoadedComandaWithPayments = Awaited<ReturnType<typeof loadComandaWithPayments>>

export function shouldCloseComandaAfterTerminalPayment(comanda: LoadedComandaWithPayments) {
  if (comanda.status === ComandaStatus.CLOSED || comanda.status === ComandaStatus.CANCELLED) {
    return false
  }

  const remainingAmount = toNumberOrZero(comanda.totalAmount) - calculateConfirmedPaidAmount(comanda)
  return remainingAmount <= 0.009
}

export function buildTerminalPaymentNote(intent: ExistingPaymentTerminalIntent, order: MercadoPagoPointOrderResult) {
  const fragments = [`Mercado Pago Point - ${intent.method}`]
  if (order.paymentId?.trim()) {
    fragments.push(`Transacao MP ${order.paymentId.trim()}`)
  }
  if (intent.note?.trim()) {
    fragments.push(intent.note.trim())
  }

  return fragments.join('. ')
}

export function publishApprovedTerminalPayment(
  realtime: ComandaRealtimePublisher,
  result: ApprovedIntentResult,
  mutationStartedAtMs: number,
) {
  if (!result.createdPayment) {
    return
  }

  const auth = buildTerminalIntentWorkspaceAuth(result.intent)
  realtime.invalidate(result.intent.companyOwnerId, result.businessDate)
  if (result.closedComanda) {
    realtime.publishClosed({
      auth,
      businessDate: result.businessDate,
      closure: result.closure,
      comanda: result.refreshedComanda,
      instrumentation: { mutationName: 'close-comanda', mutationStartedAtMs },
      refreshedSession: result.refreshedSession,
    })
    realtime.deleteOrdersCache(result.intent.companyOwnerId)
    realtime.refreshFinanceSummary(result.intent.companyOwnerId)
    return
  }

  publishTerminalPaymentUpdate(realtime, result, auth, mutationStartedAtMs)
}

export function recordApprovedTerminalPaymentAudit(
  auditLogService: AuditLogService,
  result: ApprovedIntentResult,
  context: RequestContext,
) {
  if (!result.createdPayment) {
    return Promise.resolve()
  }

  return auditLogService.record({
    actorUserId: result.intent.createdByUserId,
    event: 'operations.comanda_terminal_payment_intent.approved',
    ipAddress: context.ipAddress,
    metadata: {
      amount: toNumberOrZero(result.intent.amount),
      comandaId: result.intent.comandaId,
      providerOrderId: result.intent.providerOrderId,
      providerPaymentId: result.intent.providerPaymentId,
    },
    resource: 'payment-terminal-intent',
    resourceId: result.intent.id,
    severity: AuditSeverity.INFO,
    userAgent: context.userAgent,
  })
}

function publishTerminalPaymentUpdate(
  realtime: ComandaRealtimePublisher,
  result: Extract<ApprovedIntentResult, { createdPayment: true }>,
  auth: ReturnType<typeof buildTerminalIntentWorkspaceAuth>,
  mutationStartedAtMs: number,
) {
  realtime.publishUpdated({
    auth,
    businessDate: result.businessDate,
    comanda: result.refreshedComanda,
    instrumentation: { mutationName: 'create-comanda-payment', mutationStartedAtMs },
  })

  if (result.refreshedSession) {
    realtime.publishCashUpdated({ auth, businessDate: result.businessDate, session: result.refreshedSession })
  }
  if (result.closure) {
    realtime.publishCashClosureUpdated({ auth, closure: result.closure })
  }
}
