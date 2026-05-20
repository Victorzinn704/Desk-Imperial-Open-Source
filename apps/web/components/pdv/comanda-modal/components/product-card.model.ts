import { formatCurrency } from '@/lib/currency'
import type { SimpleProduct } from '../types'

export type ProductCardModel = {
  available: number
  cartBadge: string | null
  comboDetails: string | null
  formattedPrice: string
  isDraggable: boolean
  isSoldOut: boolean
  secondaryLabel: string
  rootClassName: string
  stockTone: 'danger' | 'warning' | 'muted'
  stockLabel: string
}

type ProductCardModelInput = {
  inCartQty: number
  product: SimpleProduct
}

const LOW_STOCK_THRESHOLD = 5

export function buildProductCardModel({ inCartQty, product }: ProductCardModelInput): ProductCardModel {
  const available = product.stock - inCartQty
  const isSoldOut = available <= 0

  return {
    available,
    cartBadge: resolveCartBadge(inCartQty),
    comboDetails: resolveComboDetails(product),
    formattedPrice: formatCurrency(product.unitPrice, 'BRL'),
    isDraggable: !isSoldOut,
    isSoldOut,
    secondaryLabel: resolveSecondaryLabel(product),
    rootClassName: buildRootClassName(isSoldOut),
    stockTone: resolveStockTone({ available, isLowStock: product.isLowStock, isSoldOut }),
    stockLabel: isSoldOut ? 'Esgotado' : `${available} und`,
  }
}

function resolveSecondaryLabel(product: SimpleProduct) {
  if (product.brand) {
    return product.brand
  }

  if (product.quantityLabel) {
    return product.quantityLabel
  }

  return product.barcode ? `EAN ${product.barcode.slice(-6)}` : product.category
}

function resolveCartBadge(inCartQty: number) {
  if (inCartQty <= 0) {
    return null
  }

  return String(inCartQty)
}

function resolveComboDetails(product: SimpleProduct) {
  const comboItems = product.comboItems ?? []
  if (!product.isCombo || comboItems.length === 0) {
    return null
  }

  const preview = comboItems
    .slice(0, 2)
    .map((item) => `${item.componentProductName} (${item.totalUnits} und)`)
    .join(' • ')

  if (comboItems.length <= 2) {
    return preview
  }

  return `${preview} • ...`
}

function resolveStockTone({
  available,
  isLowStock,
  isSoldOut,
}: {
  available: number
  isLowStock: boolean
  isSoldOut: boolean
}) {
  if (isSoldOut) {
    return 'danger' as const
  }

  if (isLowStock || available <= LOW_STOCK_THRESHOLD) {
    return 'warning' as const
  }

  return 'muted' as const
}

function buildRootClassName(isSoldOut: boolean) {
  const baseClassName =
    'group relative flex min-h-[212px] w-full flex-col rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-all'

  if (isSoldOut) {
    return `${baseClassName} cursor-not-allowed opacity-60`
  }

  return `${baseClassName} cursor-grab hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] hover:bg-[var(--surface-soft)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] active:cursor-grabbing`
}
