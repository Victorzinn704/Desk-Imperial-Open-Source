import { BadRequestException } from '@nestjs/common'
import {
  BuyerType,
  CashClosureStatus,
  CashMovementType,
  CashSessionStatus,
  ComandaStatus,
  type CashClosure,
} from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { OperationsResponseOptionsDto } from './dto/operations-response-options.dto'
import type { OperationsHelpersService } from './operations-helpers.service'

export const OPEN_COMANDA_STATUSES: ComandaStatus[] = [
  ComandaStatus.OPEN,
  ComandaStatus.IN_PREPARATION,
  ComandaStatus.READY,
]

export function resolveBusinessDate(value?: string): Date {
  const source = value ? new Date(`${value}T00:00:00`) : new Date()

  if (Number.isNaN(source.getTime())) {
    throw new BadRequestException('Informe uma data operacional valida no formato YYYY-MM-DD.')
  }

  return new Date(source.getFullYear(), source.getMonth(), source.getDate())
}

export function buildBusinessDateWindow(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

export function formatBusinessDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function invalidateOperationsLiveCache(
  cache: Pick<CacheService, 'del'>,
  workspaceOwnerUserId: string,
  businessDate: Date,
) {
  const dateKey = formatBusinessDateKey(businessDate)
  void cache.del(CacheService.operationsLiveKey(workspaceOwnerUserId, dateKey, true))
  void cache.del(CacheService.operationsLiveKey(workspaceOwnerUserId, dateKey, false))
}

export async function buildOptionalOperationsSnapshot(
  helpers: Pick<OperationsHelpersService, 'buildLiveSnapshot'>,
  workspaceOwnerUserId: string,
  businessDate: Date,
  options?: OperationsResponseOptionsDto,
) {
  if (options?.includeSnapshot === false) {
    return {}
  }

  return {
    snapshot: await helpers.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
  }
}

export function toNumber(value: { toNumber(): number } | number | null | undefined): number {
  if (value == null) {
    return 0
  }

  return typeof value === 'number' ? value : value.toNumber()
}

export function resolveBuyerTypeFromDocument(document: string | null | undefined) {
  const digits = (document ?? '').replace(/\D/g, '')

  if (digits.length === 11) {
    return BuyerType.PERSON
  }

  if (digits.length === 14) {
    return BuyerType.COMPANY
  }

  return null
}

export function isOpenComandaStatus(status: ComandaStatus) {
  return status === ComandaStatus.OPEN || status === ComandaStatus.IN_PREPARATION || status === ComandaStatus.READY
}

export function buildCashUpdatedPayload(session: {
  id: string
  status: CashSessionStatus
  openingCashAmount: { toNumber(): number } | number
  countedCashAmount: { toNumber(): number } | number | null
  expectedCashAmount: { toNumber(): number } | number
  differenceAmount: { toNumber(): number } | number | null
  movements: Array<{
    type: CashMovementType
    amount: { toNumber(): number } | number
  }>
}) {
  const inflowAmount = roundCurrency(
    session.movements
      .filter((movement) => movement.type === CashMovementType.SUPPLY || movement.type === CashMovementType.ADJUSTMENT)
      .reduce((sum, movement) => sum + toNumber(movement.amount), 0),
  )
  const outflowAmount = roundCurrency(
    session.movements
      .filter((movement) => movement.type === CashMovementType.WITHDRAWAL)
      .reduce((sum, movement) => sum + toNumber(movement.amount), 0),
  )

  return {
    cashSessionId: session.id,
    status: session.status === CashSessionStatus.OPEN ? 'OPEN' : 'CLOSED',
    openingAmount: toNumber(session.openingCashAmount),
    inflowAmount,
    outflowAmount,
    expectedAmount: toNumber(session.expectedCashAmount),
    countedAmount: session.countedCashAmount == null ? null : toNumber(session.countedCashAmount),
    differenceAmount: session.differenceAmount == null ? null : toNumber(session.differenceAmount),
    movementCount: session.movements.length,
  } as const
}

export function buildComandaUpdatedPayload(comanda: {
  id: string
  tableLabel: string
  status: ComandaStatus
  currentEmployeeId: string | null
  subtotalAmount: { toNumber(): number } | number
  discountAmount: { toNumber(): number } | number
  totalAmount: { toNumber(): number } | number
  items: Array<{ quantity: number }>
}) {
  return {
    comandaId: comanda.id,
    mesaLabel: comanda.tableLabel,
    status:
      comanda.status === ComandaStatus.OPEN
        ? 'ABERTA'
        : comanda.status === ComandaStatus.IN_PREPARATION
          ? 'EM_PREPARO'
          : comanda.status === ComandaStatus.READY
            ? 'PRONTA'
            : 'FECHADA',
    employeeId: comanda.currentEmployeeId,
    subtotal: toNumber(comanda.subtotalAmount),
    discountAmount: toNumber(comanda.discountAmount),
    totalAmount: toNumber(comanda.totalAmount),
    totalItems: comanda.items.reduce((sum, item) => sum + item.quantity, 0),
  } as const
}

export function buildCashClosurePayload(closure: CashClosure) {
  return {
    closureId: closure.id,
    status:
      closure.status === CashClosureStatus.CLOSED || closure.status === CashClosureStatus.FORCE_CLOSED
        ? 'CLOSED'
        : closure.status === CashClosureStatus.PENDING_EMPLOYEE_CLOSE
          ? 'PENDING'
          : 'OPEN',
    openedAt: closure.createdAt.toISOString(),
    closedAt: closure.closedAt?.toISOString() ?? null,
    expectedAmount: toNumber(closure.expectedCashAmount),
    grossRevenueAmount: toNumber(closure.grossRevenueAmount),
    realizedProfitAmount: toNumber(closure.realizedProfitAmount),
    countedAmount: closure.countedCashAmount == null ? null : toNumber(closure.countedCashAmount),
    differenceAmount: closure.differenceAmount == null ? null : toNumber(closure.differenceAmount),
    openComandasCount: closure.openComandasCount,
    pendingCashSessions: closure.openSessionsCount,
  } as const
}
