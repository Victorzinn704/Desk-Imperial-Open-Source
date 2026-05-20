export const FINANCE_CATEGORY_COLORS = [
  '#36f57c',
  '#2265d8',
  '#C9A84C',
  '#f04438',
  '#a78bfa',
  '#38bdf8',
  '#fb923c',
  '#e879f9',
] as const

export function getFinanceCategoryColor(index: number) {
  return FINANCE_CATEGORY_COLORS[index % FINANCE_CATEGORY_COLORS.length]
}
