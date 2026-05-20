import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { PortfolioMetricItem, PortfolioSignalItem } from './portfolio-environment.content-types'
import { formatPortfolioMoney } from './portfolio-environment.format'

type CategoryBreakdown = FinanceSummaryResponse['categoryBreakdown']
type CategoryBreakdownItem = CategoryBreakdown[number]

export type PortfolioRadarCategory = {
  capitalLabel: string
  inventorySalesLabel: string
  label: string
  potentialProfitLabel: string
  productsLabel: string
  widthPercent: number
}

export type PortfolioRadarModel = {
  actionLabel: string
  facts: PortfolioSignalItem[]
  hasCategories: boolean
  metrics: PortfolioMetricItem[]
  topCategories: PortfolioRadarCategory[]
}

export function createRadarModel({
  avgMargin,
  catalogStats,
  categoryBreakdown,
  displayCurrency,
  lowStockItems,
}: Readonly<{
  avgMargin: string
  catalogStats: {
    categoriesCount: number
    comboCount: number
    kitchenCount: number
  }
  categoryBreakdown: CategoryBreakdown
  displayCurrency: string
  lowStockItems: number
}>): PortfolioRadarModel {
  const maxCategoryProfit = Math.max(...categoryBreakdown.map((category) => category.potentialProfit), 0)
  const topCategories = categoryBreakdown.slice(0, 4).map((category) =>
    createRadarCategory({
      category,
      displayCurrency,
      maxCategoryProfit,
    }),
  )

  return {
    actionLabel: `${catalogStats.categoriesCount} categorias`,
    facts: createRadarFacts({ categoryLeader: categoryBreakdown[0], displayCurrency, lowStockItems }),
    hasCategories: topCategories.length > 0,
    metrics: [
      { description: 'famílias com produtos', label: 'categorias ativas', value: String(catalogStats.categoriesCount) },
      { description: 'ofertas compostas', label: 'combos', value: String(catalogStats.comboCount) },
      { description: 'itens que vão para KDS', label: 'cozinha', value: String(catalogStats.kitchenCount) },
      { description: 'margem média ativa', label: 'margem média', value: avgMargin },
    ],
    topCategories,
  }
}

function createRadarCategory({
  category,
  displayCurrency,
  maxCategoryProfit,
}: Readonly<{
  category: CategoryBreakdownItem
  displayCurrency: string
  maxCategoryProfit: number
}>): PortfolioRadarCategory {
  return {
    capitalLabel: formatPortfolioMoney({ amount: category.inventoryCostValue, currency: displayCurrency }),
    inventorySalesLabel: formatPortfolioMoney({ amount: category.inventorySalesValue, currency: displayCurrency }),
    label: category.category,
    potentialProfitLabel: formatPortfolioMoney({ amount: category.potentialProfit, currency: displayCurrency }),
    productsLabel: `${category.products} SKU(s)`,
    widthPercent: resolveRadarBarWidth({ maxCategoryProfit, potentialProfit: category.potentialProfit }),
  }
}

function createRadarFacts({
  categoryLeader,
  displayCurrency,
  lowStockItems,
}: Readonly<{
  categoryLeader: CategoryBreakdownItem | undefined
  displayCurrency: string
  lowStockItems: number
}>): PortfolioSignalItem[] {
  return [
    {
      label: 'família líder',
      note: 'categoria com maior lucro potencial',
      tone: 'info',
      value: categoryLeader?.category ?? 'sem leitura',
    },
    {
      label: 'lucro líder',
      note: 'potencial máximo da família dominante',
      tone: 'success',
      value: formatPortfolioMoney({ amount: categoryLeader?.potentialProfit ?? 0, currency: displayCurrency }),
    },
    {
      label: 'capital líder',
      note: 'estoque comprometido na família dominante',
      tone: 'neutral',
      value: formatPortfolioMoney({ amount: categoryLeader?.inventoryCostValue ?? 0, currency: displayCurrency }),
    },
    {
      label: 'estoque baixo',
      note: 'famílias pressionadas por reposição',
      tone: lowStockItems > 0 ? 'warning' : 'success',
      value: String(lowStockItems),
    },
  ]
}

function resolveRadarBarWidth({
  maxCategoryProfit,
  potentialProfit,
}: Readonly<{
  maxCategoryProfit: number
  potentialProfit: number
}>) {
  const rawPercent = maxCategoryProfit > 0 ? (potentialProfit / maxCategoryProfit) * 100 : 0
  return Math.max(rawPercent, 8)
}
