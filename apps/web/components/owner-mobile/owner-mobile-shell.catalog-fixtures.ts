import type * as api from '@/lib/api'

const createdAt = new Date().toISOString()

type CategoryBreakdownSeed = {
  category: string
  products: number
  units: number
  inventoryCostValue: number
  inventorySalesValue: number
}

export function createOrdersResponse() {
  return {
    items: [createOrderRecord('o-1', 100), createOrderRecord('o-2', 200)],
    totals: {
      completedOrders: 2,
      cancelledOrders: 0,
      realizedRevenue: 300,
      realizedProfit: 120,
      soldUnits: 3,
    },
  } as Awaited<ReturnType<typeof api.fetchOrders>>
}

export function createProductsResponse() {
  return {
    displayCurrency: 'BRL',
    ratesUpdatedAt: null,
    ratesSource: 'fallback',
    ratesNotice: null,
    items: [],
    totals: {
      totalProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0,
      stockUnits: 0,
      stockPackages: 0,
      stockLooseUnits: 0,
      stockBaseUnits: 0,
      inventoryCostValue: 0,
      inventorySalesValue: 0,
      potentialProfit: 0,
      averageMarginPercent: 0,
      categories: [],
    },
  } as Awaited<ReturnType<typeof api.fetchProducts>>
}

export function createFinanceSummary() {
  return {
    displayCurrency: 'BRL',
    ratesUpdatedAt: null,
    ratesSource: 'fallback',
    ratesNotice: null,
    totals: createFinanceTotals(),
    categoryBreakdown: [
      createCategoryBreakdown({
        category: 'Petiscos',
        products: 2,
        units: 12,
        inventoryCostValue: 120,
        inventorySalesValue: 240,
      }),
      createCategoryBreakdown({
        category: 'Cervejas',
        products: 1,
        units: 18,
        inventoryCostValue: 180,
        inventorySalesValue: 360,
      }),
    ],
    topProducts: [],
    recentOrders: [],
    revenueTimeline: [],
    salesByChannel: [],
    topCustomers: [],
    topEmployees: [],
    salesMap: [],
    topRegions: [],
    categoryTopProducts: {},
  } as Awaited<ReturnType<typeof api.fetchFinanceSummary>>
}

function createOrderRecord(id: string, totalRevenue: number) {
  return {
    id,
    comandaId: null,
    customerName: null,
    buyerType: null,
    buyerDocument: null,
    buyerDistrict: null,
    buyerCity: null,
    buyerState: null,
    buyerCountry: null,
    buyerLatitude: null,
    buyerLongitude: null,
    employeeId: null,
    sellerCode: null,
    sellerName: null,
    channel: null,
    notes: null,
    currency: 'BRL',
    displayCurrency: 'BRL',
    status: 'COMPLETED',
    totalRevenue,
    totalCost: 0,
    totalProfit: totalRevenue,
    originalTotalRevenue: totalRevenue,
    originalTotalCost: 0,
    originalTotalProfit: totalRevenue,
    totalItems: 1,
    createdAt,
    updatedAt: createdAt,
    cancelledAt: null,
    items: [],
  }
}

function createFinanceTotals() {
  return {
    activeProducts: 3,
    inventoryUnits: 30,
    inventoryCostValue: 300,
    inventorySalesValue: 600,
    potentialProfit: 300,
    realizedRevenue: 300,
    realizedCost: 180,
    realizedProfit: 120,
    completedOrders: 2,
    currentMonthRevenue: 300,
    currentMonthProfit: 120,
    previousMonthRevenue: 200,
    previousMonthProfit: 80,
    revenueGrowthPercent: 50,
    profitGrowthPercent: 50,
    averageMarginPercent: 40,
    averageMarkupPercent: 66.6,
    lowStockItems: 0,
  }
}

function createCategoryBreakdown(seed: CategoryBreakdownSeed) {
  return {
    category: seed.category,
    products: seed.products,
    units: seed.units,
    inventoryCostValue: seed.inventoryCostValue,
    inventorySalesValue: seed.inventorySalesValue,
    potentialProfit: seed.inventorySalesValue - seed.inventoryCostValue,
  }
}
