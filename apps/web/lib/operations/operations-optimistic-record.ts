import type { ComandaItemRecord, ComandaRecord } from '@contracts/contracts'

let optimisticIdCounter = 0

export function generateOptimisticId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  optimisticIdCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${optimisticIdCounter.toString(36).padStart(4, '0')}`
}

export function buildOptimisticComandaRecord(input: {
  tableLabel: string
  mesaId?: string | null
  cashSessionId?: string | null
  currentEmployeeId?: string | null
  companyOwnerId?: string
  customerName?: string | null
  customerDocument?: string | null
  participantCount?: number
  notes?: string | null
  discountAmount?: number
  serviceFeeAmount?: number
  items?: Parameters<typeof buildOptimisticComandaItem>[0][]
}): ComandaRecord {
  const items = (input.items ?? []).map(buildOptimisticComandaItem)
  const subtotalAmount = sumOptimisticSubtotal(items)
  const discountAmount = resolvePositiveAmount(input.discountAmount)
  const serviceFeeAmount = resolvePositiveAmount(input.serviceFeeAmount)

  return {
    id: generateOptimisticId('optimistic'),
    companyOwnerId: input.companyOwnerId ?? '',
    mesaId: input.mesaId ?? null,
    status: 'OPEN',
    tableLabel: input.tableLabel,
    customerName: input.customerName ?? null,
    customerDocument: input.customerDocument ?? null,
    participantCount: input.participantCount ?? 1,
    notes: input.notes ?? null,
    cashSessionId: input.cashSessionId ?? null,
    currentEmployeeId: input.currentEmployeeId ?? null,
    discountAmount,
    serviceFeeAmount,
    subtotalAmount,
    totalAmount: Math.max(0, subtotalAmount - discountAmount + serviceFeeAmount),
    openedAt: new Date().toISOString(),
    closedAt: null,
    items,
  }
}

export function buildOptimisticComandaItem(input: {
  productId?: string | null
  productName?: string | null
  quantity: number
  unitPrice?: number
  notes?: string | null
}): ComandaItemRecord {
  const unitPrice = resolveOptimisticUnitPrice(input.unitPrice)
  return {
    id: generateOptimisticId('opt-item'),
    productId: input.productId ?? null,
    productName: input.productName ?? 'Item',
    quantity: input.quantity,
    unitPrice,
    totalAmount: input.quantity * unitPrice,
    notes: input.notes ?? null,
    kitchenStatus: null,
    kitchenQueuedAt: null,
    kitchenReadyAt: null,
  }
}

function sumOptimisticSubtotal(items: ComandaItemRecord[]) {
  return items.reduce((sum, item) => sum + item.totalAmount, 0)
}

function resolveOptimisticUnitPrice(unitPrice: number | undefined) {
  return typeof unitPrice === 'number' && Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0
}

function resolvePositiveAmount(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}
