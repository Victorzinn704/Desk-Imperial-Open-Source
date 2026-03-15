export type HealthResponse = {
  status: 'ok'
  service: string
  timestamp: string
}

export type ProductRecord = {
  id: string
  name: string
  category: string
  description: string | null
  unitCost: number
  unitPrice: number
  stock: number
  active: boolean
  createdAt: string
  updatedAt: string
  inventoryCostValue: number
  inventorySalesValue: number
  potentialProfit: number
  marginPercent: number
}

export type ProductsResponse = {
  items: ProductRecord[]
  totals: {
    totalProducts: number
    activeProducts: number
    inactiveProducts: number
    stockUnits: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    averageMarginPercent: number
    categories: string[]
  }
}

export type FinanceSummaryResponse = {
  totals: {
    activeProducts: number
    inventoryUnits: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    realizedRevenue: number
    realizedCost: number
    realizedProfit: number
    completedOrders: number
    currentMonthRevenue: number
    currentMonthProfit: number
    previousMonthRevenue: number
    previousMonthProfit: number
    revenueGrowthPercent: number
    profitGrowthPercent: number
    averageMarginPercent: number
    averageMarkupPercent: number
    lowStockItems: number
  }
  categoryBreakdown: Array<{
    category: string
    products: number
    units: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
  }>
  topProducts: Array<{
    id: string
    name: string
    category: string
    stock: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    marginPercent: number
  }>
  recentOrders: Array<{
    id: string
    customerName: string | null
    channel: string | null
    status: 'COMPLETED' | 'CANCELLED'
    totalRevenue: number
    totalProfit: number
    totalItems: number
    createdAt: string
  }>
}

export type OrderRecord = {
  id: string
  customerName: string | null
  channel: string | null
  notes: string | null
  status: 'COMPLETED' | 'CANCELLED'
  totalRevenue: number
  totalCost: number
  totalProfit: number
  totalItems: number
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
  items: Array<{
    id: string
    productId: string
    productName: string
    category: string
    quantity: number
    unitPrice: number
    unitCost: number
    lineRevenue: number
    lineCost: number
    lineProfit: number
  }>
}

export type OrdersResponse = {
  items: OrderRecord[]
  totals: {
    completedOrders: number
    cancelledOrders: number
    realizedRevenue: number
    realizedProfit: number
    soldUnits: number
  }
}
