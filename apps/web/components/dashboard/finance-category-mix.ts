import type { FinanceSummaryResponse } from '@contracts/contracts'
import { getFinanceCategoryColor } from './finance-category-colors'

export type FinanceCategoryMixRow = FinanceSummaryResponse['categoryBreakdown'][number] & {
  color: string
  share: number
}

export function buildFinanceCategoryMixRows(
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown'],
  limit = 4,
): FinanceCategoryMixRow[] {
  const total = categoryBreakdown.reduce((sum, category) => sum + category.inventorySalesValue, 0)

  return categoryBreakdown
    .filter((category) => category.inventorySalesValue > 0)
    .sort((left, right) => right.inventorySalesValue - left.inventorySalesValue)
    .slice(0, limit)
    .map((category, index) => ({
      ...category,
      color: getFinanceCategoryColor(index),
      share: total > 0 ? (category.inventorySalesValue / total) * 100 : 0,
    }))
}
