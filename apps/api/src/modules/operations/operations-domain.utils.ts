import { BadRequestException } from '@nestjs/common'
import {
  BuyerType,
  type CashClosure,
  CashClosureStatus,
  CashMovementType,
  CashSessionStatus,
  ComandaStatus,
} from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { OperationsResponseOptionsDto } from './dto/operations-response-options.dto'
import type { OperationsLiveResponse } from './operations.types'

type OperationsSnapshotBuilder = {
  buildLiveSnapshot(
    workspaceOwnerUserId: string,
    businessDate: Date,
    scopedEmployeeId?: string | null,
    options?: {
      includeCashMovements?: boolean
    },
  ): Promise<OperationsLiveResponse>
}

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
  cache: Pick<CacheService, 'delByPrefix'>,
  workspaceOwnerUserId: string,
  businessDate: Date,
) {
  const dateKey = formatBusinessDateKey(businessDate)
  // O cache de `live` NÃO é invalidado aqui intencionalmente.
  // O socket já empurra eventos para todos os clientes conectados e o frontend
  // aplica setQueryData instantaneamente. Invalidar o Redis a cada mutação
  // fazia o cache nunca ficar quente durante operação ativa (mutações a cada
  // 30–60s, TTL de 20s), tornando cada background refetch um cold path de ~1500ms.
  // Com o TTL natural o cache fica warm e serve reconexões em <50ms.
  // Risco aceito: cliente que reconecta recebe snapshot com até 20s de defasagem
  // antes do socket sincronizar — aceitável para operação de restaurante.
  void cache.delByPrefix(CacheService.operationsKitchenPrefix(workspaceOwnerUserId, dateKey))
  void cache.delByPrefix(CacheService.operationsSummaryPrefix(workspaceOwnerUserId, dateKey))
}

export async function buildOptionalOperationsSnapshot(
  helpers: OperationsSnapshotBuilder,
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

export function toNumberOrZero(value: { toNumber(): number } | number | null | undefined): number {
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
      .reduce((sum, movement) => sum + toNumberOrZero(movement.amount), 0),
  )
  const outflowAmount = roundCurrency(
    session.movements
      .filter((movement) => movement.type === CashMovementType.WITHDRAWAL)
      .reduce((sum, movement) => sum + toNumberOrZero(movement.amount), 0),
  )

  return {
    cashSessionId: session.id,
    status: session.status === CashSessionStatus.OPEN ? 'OPEN' : 'CLOSED',
    openingAmount: toNumberOrZero(session.openingCashAmount),
    inflowAmount,
    outflowAmount,
    expectedAmount: toNumberOrZero(session.expectedCashAmount),
    countedAmount: session.countedCashAmount == null ? null : toNumberOrZero(session.countedCashAmount),
    differenceAmount: session.differenceAmount == null ? null : toNumberOrZero(session.differenceAmount),
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
  items?: Array<{ quantity: number }>
}) {
  return {
    comandaId: comanda.id,
    mesaLabel: comanda.tableLabel,
    status:
      comanda.status === ComandaStatus.OPEN
        ? 'OPEN'
        : comanda.status === ComandaStatus.IN_PREPARATION
          ? 'IN_PREPARATION'
          : comanda.status === ComandaStatus.READY
            ? 'READY'
            : 'CLOSED',
    employeeId: comanda.currentEmployeeId,
    subtotal: toNumberOrZero(comanda.subtotalAmount),
    discountAmount: toNumberOrZero(comanda.discountAmount),
    totalAmount: toNumberOrZero(comanda.totalAmount),
    totalItems: comanda.items ? comanda.items.reduce((sum, item) => sum + item.quantity, 0) : 0,
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
    expectedAmount: toNumberOrZero(closure.expectedCashAmount),
    grossRevenueAmount: toNumberOrZero(closure.grossRevenueAmount),
    realizedProfitAmount: toNumberOrZero(closure.realizedProfitAmount),
    countedAmount: closure.countedCashAmount == null ? null : toNumberOrZero(closure.countedCashAmount),
    differenceAmount: closure.differenceAmount == null ? null : toNumberOrZero(closure.differenceAmount),
    openComandasCount: closure.openComandasCount,
    pendingCashSessions: closure.openSessionsCount,
  } as const
}
