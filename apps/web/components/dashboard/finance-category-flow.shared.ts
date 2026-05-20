'use client'

import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'

export type FinanceCategoryFlowTab = 'products' | 'metrics'

export const CATEGORY_TONES = [
  { bg: 'rgba(52,242,127,0.08)', border: 'rgba(52,242,127,0.16)', text: '#36f57c' },
  { bg: 'rgba(34,101,216,0.10)', border: 'rgba(34,101,216,0.18)', text: '#60a5fa' },
  { bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.18)', text: '#C9A84C' },
  { bg: 'rgba(240,68,56,0.08)', border: 'rgba(240,68,56,0.18)', text: '#f87171' },
  { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)', text: '#a78bfa' },
  { bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.18)', text: '#38bdf8' },
] as const

export const PRODUCT_METRIC_TONE_CLASSES = {
  neutral: 'bg-[var(--surface-soft)] text-[var(--text-primary)] border-[var(--border)]',
  purple: 'border-[rgba(167,139,250,0.16)] bg-[rgba(167,139,250,0.08)] text-[#c084fc]',
  success: 'border-[rgba(52,242,127,0.16)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]',
  warning: 'border-[rgba(201,168,76,0.16)] bg-[rgba(201,168,76,0.08)] text-[#C9A84C]',
} as const

export const METRIC_LINE_COLORS = {
  neutral: 'var(--text-primary)',
  success: '#36f57c',
  warning: '#C9A84C',
} as const

export function getDetailTone(selectedIndex: number) {
  return CATEGORY_TONES[Math.max(0, selectedIndex) % CATEGORY_TONES.length]
}

export function resolveFinanceProductVisual(
  product: FinanceSummaryResponse['topProducts'][number],
  catalogProduct: ProductRecord | undefined,
) {
  const productBrand = pickPreferred(trimmedOrNull(product.brand), trimmedOrNull(catalogProduct?.brand)) ?? null

  return {
    name: product.name,
    brand: productBrand,
    category: product.category,
    barcode: pickPreferred(product.barcode, catalogProduct?.barcode),
    packagingClass: pickPreferred(product.packagingClass, catalogProduct?.packagingClass),
    quantityLabel: pickPreferred(product.quantityLabel, catalogProduct?.quantityLabel),
    imageUrl: pickPreferred(product.imageUrl, catalogProduct?.imageUrl),
    catalogSource: pickPreferred(product.catalogSource, catalogProduct?.catalogSource),
    isCombo: pickPreferred(product.isCombo, catalogProduct?.isCombo),
  }
}

function pickPreferred<T>(primary: T | null | undefined, secondary: T | null | undefined) {
  return primary ?? secondary
}

function trimmedOrNull(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
