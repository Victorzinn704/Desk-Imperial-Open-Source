import { Prisma } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import type { AuditLogService } from '../monitoring/audit-log.service'
import { calculateConfirmedPaidAmount, type PreparedComandaCloseInput } from './comanda-settlement.utils'
import { toNumberOrZero } from './operations-domain.utils'
import type { CreateComandaPaymentDto } from './operations.schemas'

export function recordComandaPaymentAudit(params: {
  amount: number
  auditLogService: AuditLogService
  auth: AuthContext
  comandaId: string
  context: RequestContext
  method: CreateComandaPaymentDto['method']
  refreshedComanda: {
    payments?: Array<{ amount: Prisma.Decimal | number; status?: string }>
    totalAmount: Prisma.Decimal | number
  }
}) {
  return params.auditLogService.record({
    actorUserId: resolveAuthActorUserId(params.auth),
    event: 'operations.comanda_payment.created',
    resource: 'comanda',
    resourceId: params.comandaId,
    metadata: {
      amount: params.amount,
      method: params.method,
      remainingAmount: roundCurrency(
        Math.max(
          0,
          toNumberOrZero(params.refreshedComanda.totalAmount) - calculateConfirmedPaidAmount(params.refreshedComanda),
        ),
      ),
    },
    ipAddress: params.context.ipAddress,
    userAgent: params.context.userAgent,
  })
}

export function recordComandaCloseAudit(params: {
  auditLogService: AuditLogService
  auth: AuthContext
  comandaId: string
  context: RequestContext
  input: PreparedComandaCloseInput
  refreshedComanda: { totalAmount: Prisma.Decimal | number }
}) {
  return params.auditLogService.record({
    actorUserId: resolveAuthActorUserId(params.auth),
    event: 'operations.comanda.closed',
    resource: 'comanda',
    resourceId: params.comandaId,
    metadata: {
      discountAmount: params.input.discountAmount,
      serviceFeeAmount: params.input.serviceFeeAmount,
      totalAmount: toNumberOrZero(params.refreshedComanda.totalAmount),
    },
    ipAddress: params.context.ipAddress,
    userAgent: params.context.userAgent,
  })
}
