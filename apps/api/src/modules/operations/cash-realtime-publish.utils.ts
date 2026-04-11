import { CashMovementType, CashSessionStatus } from '@prisma/client'
import type { AuthContext } from '../auth/auth.types'
import type { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import {
  buildCashClosurePayload,
  buildCashUpdatedPayload,
  formatBusinessDateKey,
  toNumberOrZero,
} from './operations-domain.utils'
import { toRealtimeCashSessionRecord } from './operations.types'

export function publishCashRealtime(
  operationsRealtimeService: OperationsRealtimeService,
  auth: AuthContext,
  session: Parameters<typeof buildCashUpdatedPayload>[0],
  closure: Parameters<typeof buildCashClosurePayload>[0],
  businessDate?: Date,
) {
  operationsRealtimeService.publishCashUpdated(auth, {
    ...buildCashUpdatedPayload(session),
    businessDate: businessDate ? formatBusinessDateKey(businessDate) : undefined,
    cashSession: toRealtimeCashSessionRecord(session),
  })
  publishCashClosureRealtime(operationsRealtimeService, auth, closure)
}

export function publishCashOpenedRealtime(
  operationsRealtimeService: OperationsRealtimeService,
  auth: AuthContext,
  session: {
    id: string
    openedAt: Date
    openingCashAmount: { toNumber(): number } | number
    employeeId: string | null
    companyOwnerId: string
    businessDate: Date
    status: CashSessionStatus
    countedCashAmount: { toNumber(): number } | number | null
    expectedCashAmount: { toNumber(): number } | number
    differenceAmount: { toNumber(): number } | number | null
    grossRevenueAmount: { toNumber(): number } | number
    realizedProfitAmount: { toNumber(): number } | number
    notes: string | null
    closedAt: Date | null
    movements: Array<{
      id: string
      cashSessionId: string
      employeeId: string | null
      type: CashMovementType
      amount: { toNumber(): number } | number
      note: string | null
      createdAt: Date
    }>
  },
  closure: Parameters<typeof buildCashClosurePayload>[0],
) {
  operationsRealtimeService.publishCashOpened(auth, {
    cashSessionId: session.id,
    openedAt: session.openedAt.toISOString(),
    openingAmount: toNumberOrZero(session.openingCashAmount),
    currency: auth.preferredCurrency,
    employeeId: session.employeeId,
    businessDate: formatBusinessDateKey(session.businessDate),
    cashSession: toRealtimeCashSessionRecord(session),
  })
  publishCashClosureRealtime(operationsRealtimeService, auth, closure)
}

function publishCashClosureRealtime(
  operationsRealtimeService: OperationsRealtimeService,
  auth: AuthContext,
  closure: Parameters<typeof buildCashClosurePayload>[0],
) {
  operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))
}
