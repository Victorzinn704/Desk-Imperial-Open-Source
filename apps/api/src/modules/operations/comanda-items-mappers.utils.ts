import { KitchenItemStatus } from '@prisma/client'

type BatchPreparedItem = {
  kitchenQueuedAt: Date | null
  notes: string | null
  productId: string | null
  productName: string
  quantity: number
  requiresKitchen: boolean
  totalAmount: number
  unitPrice: number
}

type DraftItem = Omit<BatchPreparedItem, 'kitchenQueuedAt'>

type ReplaceInput = {
  fields: {
    customerDocument: string | null
    customerName: string | null
    notes: string | null
    participantCount: number
  }
  mesaSelection: {
    mesaId: string | null
    tableLabel: string
  }
}

export function toBatchComandaItemCreateManyRow(comandaId: string, item: BatchPreparedItem) {
  return {
    comandaId,
    kitchenQueuedAt: item.kitchenQueuedAt,
    kitchenStatus: item.requiresKitchen ? KitchenItemStatus.QUEUED : null,
    notes: item.notes,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    totalAmount: item.totalAmount,
    unitPrice: item.unitPrice,
  }
}

export function toDraftComandaItemCreateManyRow(comandaId: string, item: DraftItem) {
  return {
    comandaId,
    notes: item.notes,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    totalAmount: item.totalAmount,
    unitPrice: item.unitPrice,
  }
}

export function toReplaceComandaUpdateData(input: ReplaceInput) {
  return {
    customerDocument: input.fields.customerDocument,
    customerName: input.fields.customerName,
    mesaId: input.mesaSelection.mesaId,
    notes: input.fields.notes,
    participantCount: input.fields.participantCount,
    tableLabel: input.mesaSelection.tableLabel,
  }
}
