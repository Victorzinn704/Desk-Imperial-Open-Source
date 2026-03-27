export type CurrencyCode = 'BRL' | 'USD' | 'EUR'

export type HealthResponse = {
  status: 'ok'
  service: string
  timestamp: string
}

export type EmployeeRecord = {
  id: string
  employeeCode: string
  displayName: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type EmployeesResponse = {
  items: EmployeeRecord[]
  totals: {
    totalEmployees: number
    activeEmployees: number
  }
}

export type ProductRecord = {
  id: string
  name: string
  brand: string | null
  category: string
  packagingClass: string
  measurementUnit: string
  measurementValue: number
  unitsPerPackage: number
  stockPackages: number
  stockLooseUnits: number
  description: string | null
  currency: CurrencyCode
  displayCurrency: CurrencyCode
  unitCost: number
  unitPrice: number
  originalUnitCost: number
  originalUnitPrice: number
  stock: number
  requiresKitchen: boolean
  active: boolean
  createdAt: string
  updatedAt: string
  inventoryCostValue: number
  inventorySalesValue: number
  potentialProfit: number
  originalInventoryCostValue: number
  originalInventorySalesValue: number
  originalPotentialProfit: number
  stockBaseUnits: number
  marginPercent: number
}

export type ProductsResponse = {
  displayCurrency: CurrencyCode
  ratesUpdatedAt: string | null
  ratesSource: 'live' | 'stale-cache' | 'fallback'
  ratesNotice: string | null
  items: ProductRecord[]
  totals: {
    totalProducts: number
    activeProducts: number
    inactiveProducts: number
    stockUnits: number
    stockPackages: number
    stockLooseUnits: number
    stockBaseUnits: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    averageMarginPercent: number
    categories: string[]
  }
}

export type FinanceSummaryResponse = {
  displayCurrency: CurrencyCode
  ratesUpdatedAt: string | null
  ratesSource: 'live' | 'stale-cache' | 'fallback'
  ratesNotice: string | null
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
    currency: CurrencyCode
    displayCurrency: CurrencyCode
    originalInventorySalesValue: number
    originalPotentialProfit: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    marginPercent: number
  }>
  recentOrders: Array<{
    id: string
    customerName: string | null
    channel: string | null
    currency: CurrencyCode
    status: 'COMPLETED' | 'CANCELLED'
    totalRevenue: number
    totalProfit: number
    originalTotalRevenue: number
    originalTotalProfit: number
    totalItems: number
    createdAt: string
  }>
  revenueTimeline: Array<{
    label: string
    revenue: number
    profit: number
    orders: number
  }>
  salesByChannel: Array<{
    channel: string
    orders: number
    revenue: number
    profit: number
  }>
  topCustomers: Array<{
    customerName: string
    buyerType: 'PERSON' | 'COMPANY' | null
    buyerDocument: string | null
    orders: number
    revenue: number
    profit: number
  }>
  topEmployees: Array<{
    employeeId: string | null
    employeeCode: string | null
    employeeName: string
    orders: number
    revenue: number
    profit: number
    averageTicket: number
  }>
  salesMap: Array<{
    label: string
    district: string | null
    city: string | null
    state: string | null
    country: string | null
    latitude: number
    longitude: number
    orders: number
    revenue: number
    profit: number
  }>
  topRegions: Array<{
    label: string
    city: string | null
    state: string | null
    country: string | null
    orders: number
    revenue: number
    profit: number
  }>
  categoryTopProducts: Record<string, FinanceSummaryResponse['topProducts']>
}

export type MarketInsightResponse = {
  generatedAt: string
  model: string
  focus: string
  cached: boolean
  summary: string
  forecast: string
  opportunities: string[]
  risks: string[]
  nextActions: string[]
}

export type OrderRecord = {
  id: string
  comandaId: string | null
  customerName: string | null
  buyerType: 'PERSON' | 'COMPANY' | null
  buyerDocument: string | null
  buyerDistrict: string | null
  buyerCity: string | null
  buyerState: string | null
  buyerCountry: string | null
  buyerLatitude: number | null
  buyerLongitude: number | null
  employeeId: string | null
  sellerCode: string | null
  sellerName: string | null
  channel: string | null
  notes: string | null
  currency: CurrencyCode
  displayCurrency: CurrencyCode
  status: 'COMPLETED' | 'CANCELLED'
  totalRevenue: number
  totalCost: number
  totalProfit: number
  originalTotalRevenue: number
  originalTotalCost: number
  originalTotalProfit: number
  totalItems: number
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
  items: Array<{
    id: string
    productId: string | null
    productName: string
    category: string
    quantity: number
    currency: CurrencyCode
    unitPrice: number
    unitCost: number
    lineRevenue: number
    lineCost: number
    lineProfit: number
    originalUnitPrice: number
    originalUnitCost: number
    originalLineRevenue: number
    originalLineCost: number
    originalLineProfit: number
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

export type ProductImportResponse = {
  summary: {
    totalRows: number
    createdCount: number
    updatedCount: number
    failedCount: number
  }
  errors: Array<{
    line: number
    message: string
  }>
}

export type CashSessionStatus = 'OPEN' | 'CLOSED' | 'FORCE_CLOSED'
export type CashMovementType = 'OPENING_FLOAT' | 'SUPPLY' | 'WITHDRAWAL' | 'ADJUSTMENT'
export type CashClosureStatus = 'OPEN' | 'PENDING_EMPLOYEE_CLOSE' | 'CLOSED' | 'FORCE_CLOSED'
export type ComandaStatus = 'OPEN' | 'IN_PREPARATION' | 'READY' | 'CLOSED' | 'CANCELLED'
export type KitchenItemStatus = 'QUEUED' | 'IN_PREPARATION' | 'READY' | 'DELIVERED'

export type CashMovementRecord = {
  id: string
  cashSessionId: string
  employeeId: string | null
  type: CashMovementType
  amount: number
  note: string | null
  createdAt: string
}

export type CashSessionRecord = {
  id: string
  companyOwnerId: string
  employeeId: string | null
  status: CashSessionStatus
  businessDate: string
  openingCashAmount: number
  countedCashAmount: number | null
  expectedCashAmount: number
  differenceAmount: number | null
  grossRevenueAmount: number
  realizedProfitAmount: number
  notes: string | null
  openedAt: string
  closedAt: string | null
  movements: CashMovementRecord[]
}

export type ComandaItemRecord = {
  id: string
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  notes: string | null
  kitchenStatus: KitchenItemStatus | null
  kitchenQueuedAt: string | null
  kitchenReadyAt: string | null
}

export type MesaRecord = {
  id: string
  label: string
  capacity: number
  section: string | null
  positionX: number | null
  positionY: number | null
  active: boolean
  reservedUntil: string | null
  status: 'livre' | 'ocupada' | 'reservada'
  comandaId: string | null
  currentEmployeeId: string | null
}

export type ComandaRecord = {
  id: string
  companyOwnerId: string
  cashSessionId: string | null
  mesaId: string | null
  currentEmployeeId: string | null
  tableLabel: string
  customerName: string | null
  customerDocument: string | null
  participantCount: number
  status: ComandaStatus
  subtotalAmount: number
  discountAmount: number
  serviceFeeAmount: number
  totalAmount: number
  notes: string | null
  openedAt: string
  closedAt: string | null
  items: ComandaItemRecord[]
}

export type EmployeeOperationsRecord = {
  employeeId: string | null
  employeeCode: string | null
  displayName: string
  active: boolean
  cashSession: CashSessionRecord | null
  comandas: ComandaRecord[]
  metrics: {
    openTables: number
    closedTables: number
    grossRevenueAmount: number
    realizedProfitAmount: number
    expectedCashAmount: number
  }
}

export type OperationsLiveResponse = {
  businessDate: string
  companyOwnerId: string
  closure: {
    status: CashClosureStatus
    expectedCashAmount: number
    countedCashAmount: number | null
    differenceAmount: number | null
    grossRevenueAmount: number
    realizedProfitAmount: number
    openSessionsCount: number
    openComandasCount: number
  } | null
  employees: EmployeeOperationsRecord[]
  unassigned: EmployeeOperationsRecord
  mesas: MesaRecord[]
}

/**
 * Padrões de validação compartilhados entre API e Web
 */
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/
export const STRONG_PASSWORD_MESSAGE =
  'A senha precisa ter letra maiúscula, minúscula, número e caractere especial.'
export const EMAIL_CODE_REGEX = /^\d{6}$/
export const EMAIL_CODE_MESSAGE = 'Digite o código de 6 dígitos enviado por e-mail.'
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
