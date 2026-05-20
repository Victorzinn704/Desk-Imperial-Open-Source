import type { FinanceSummaryResponse, ProductRecord, ProductsResponse } from '@contracts/contracts'
import { formatPortfolioMoney } from './portfolio-environment.format'
import type {
  PortfolioActionCardModel,
  PortfolioMetricItem,
  PortfolioSignalItem,
} from './portfolio-environment.content-types'
import { createRadarModel, type PortfolioRadarModel } from './portfolio-radar.content'

type ProductsTotals = ProductsResponse['totals'] | undefined
type CategoryBreakdown = FinanceSummaryResponse['categoryBreakdown']

export type PortfolioEnvironmentContent = {
  actionPanel: {
    activeProductsLabel: string
    createProduct: PortfolioActionCardModel
    createSale: PortfolioActionCardModel
  }
  headerMetrics: PortfolioMetricItem[]
  operationalPanel: {
    actionLabel: string
    signals: PortfolioSignalItem[]
  }
  radarPanel: PortfolioRadarModel
}

export function createPortfolioEnvironmentContent({
  avgMargin,
  categoryBreakdown,
  displayCurrency,
  lowStockItems,
  products,
  productsTotals,
}: Readonly<{
  avgMargin: string
  categoryBreakdown: CategoryBreakdown
  displayCurrency: string
  lowStockItems: number
  products: ProductRecord[]
  productsTotals: ProductsTotals
}>): PortfolioEnvironmentContent {
  const catalogStats = createCatalogStats({ products, productsTotals })

  return {
    actionPanel: createActionPanelModel({ catalogStats }),
    headerMetrics: createHeaderMetrics({ catalogStats, displayCurrency, lowStockItems }),
    operationalPanel: createOperationalModel({ avgMargin, catalogStats }),
    radarPanel: createRadarModel({
      avgMargin,
      catalogStats,
      categoryBreakdown,
      displayCurrency,
      lowStockItems,
    }),
  }
}

function createCatalogStats({
  products,
  productsTotals,
}: Readonly<{
  products: ProductRecord[]
  productsTotals: ProductsTotals
}>) {
  return {
    activeProducts: productsTotals?.activeProducts ?? 0,
    categoriesCount: productsTotals?.categories.length ?? countProductCategories({ products }),
    comboCount: countProductsWhere({ products, predicate: (product) => Boolean(product.isCombo) }),
    inactiveProducts: productsTotals?.inactiveProducts ?? 0,
    inventoryCostValue: productsTotals?.inventoryCostValue ?? 0,
    inventorySalesValue: productsTotals?.inventorySalesValue ?? 0,
    kitchenCount: countProductsWhere({ products, predicate: (product) => Boolean(product.requiresKitchen) }),
  }
}

function createActionPanelModel({
  catalogStats,
}: Readonly<{
  catalogStats: ReturnType<typeof createCatalogStats>
}>) {
  return {
    activeProductsLabel: `${catalogStats.activeProducts} ativos`,
    createProduct: {
      description: 'Abrir cadastro completo de item, estoque, margem e cozinha.',
      label: 'Cadastrar produto',
      statLabel: 'fluxo',
      statValue: 'novo item',
    },
    createSale: {
      description: 'Abrir venda rápida com localização e contexto de delivery.',
      label: 'Vender produto',
      statLabel: 'canal',
      statValue: 'delivery',
    },
  }
}

function createHeaderMetrics({
  catalogStats,
  displayCurrency,
  lowStockItems,
}: Readonly<{
  catalogStats: ReturnType<typeof createCatalogStats>
  displayCurrency: string
  lowStockItems: number
}>): PortfolioMetricItem[] {
  return [
    { description: 'itens ativos no catálogo', label: 'SKUs ativos', value: String(catalogStats.activeProducts) },
    {
      description: 'capital parado no estoque',
      label: 'capital em estoque',
      value: formatPortfolioMoney({ amount: catalogStats.inventoryCostValue, currency: displayCurrency }),
    },
    {
      description: 'valor máximo de venda do mix',
      label: 'venda potencial',
      value: formatPortfolioMoney({ amount: catalogStats.inventorySalesValue, currency: displayCurrency }),
    },
    {
      description: lowStockItems > 0 ? 'itens pedindo reposição' : 'sem pressão crítica no estoque',
      label: 'itens em alerta',
      value: String(lowStockItems),
    },
  ]
}

function createOperationalModel({
  avgMargin,
  catalogStats,
}: Readonly<{
  avgMargin: string
  catalogStats: ReturnType<typeof createCatalogStats>
}>) {
  return {
    actionLabel: `${catalogStats.categoriesCount} famílias`,
    signals: [
      {
        label: 'arquivados',
        note: 'itens fora do mix ativo',
        tone: 'neutral' as const,
        value: String(catalogStats.inactiveProducts),
      },
      {
        label: 'combos',
        note: 'ofertas compostas no catálogo',
        tone: 'warning' as const,
        value: String(catalogStats.comboCount),
      },
      {
        label: 'cozinha',
        note: 'produtos que geram fila no KDS',
        tone: 'info' as const,
        value: String(catalogStats.kitchenCount),
      },
      { label: 'margem média', note: 'qualidade média de precificação', tone: 'success' as const, value: avgMargin },
    ],
  }
}

function countProductCategories({ products }: Readonly<{ products: ProductRecord[] }>) {
  return new Set(products.map((product) => product.category)).size
}

function countProductsWhere({
  predicate,
  products,
}: Readonly<{
  predicate: (product: ProductRecord) => boolean
  products: ProductRecord[]
}>) {
  return products.filter(predicate).length
}
