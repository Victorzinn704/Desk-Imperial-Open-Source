import { z } from 'zod'

const isoDateStringSchema = z.string()
const nullableIsoDateStringSchema = isoDateStringSchema.nullable()
const nullableStringSchema = z.string().nullable()
const nullableNumberSchema = z.number().nullable()

export const currencyCodeSchema = z.enum(['BRL', 'USD', 'EUR'])
export type CurrencyCode = z.infer<typeof currencyCodeSchema>

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: isoDateStringSchema,
})
export type HealthResponse = z.infer<typeof healthResponseSchema>

export const employeeRecordSchema = z.object({
  id: z.string(),
  employeeCode: z.string(),
  displayName: z.string(),
  active: z.boolean(),
  hasLogin: z.boolean(),
  salarioBase: z.number(),
  percentualVendas: z.number(),
  createdAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
})
export type EmployeeRecord = z.infer<typeof employeeRecordSchema>

export const employeesResponseSchema = z.object({
  items: z.array(employeeRecordSchema),
  totals: z.object({
    totalEmployees: z.number(),
    activeEmployees: z.number(),
  }),
})
export type EmployeesResponse = z.infer<typeof employeesResponseSchema>

export const productComboItemRecordSchema = z.object({
  componentProductId: z.string(),
  componentProductName: z.string(),
  packagingClass: z.string(),
  measurementUnit: z.string(),
  measurementValue: z.number(),
  unitsPerPackage: z.number(),
  quantityPackages: z.number(),
  quantityUnits: z.number(),
  totalUnits: z.number(),
})

export const productRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  barcode: nullableStringSchema.optional(),
  brand: nullableStringSchema,
  category: z.string(),
  packagingClass: z.string(),
  measurementUnit: z.string(),
  measurementValue: z.number(),
  unitsPerPackage: z.number(),
  isCombo: z.boolean().optional(),
  comboDescription: nullableStringSchema.optional(),
  comboItems: z.array(productComboItemRecordSchema).optional(),
  stockPackages: z.number(),
  stockLooseUnits: z.number(),
  description: nullableStringSchema,
  quantityLabel: nullableStringSchema.optional(),
  servingSize: nullableStringSchema.optional(),
  imageUrl: nullableStringSchema.optional(),
  catalogSource: nullableStringSchema.optional(),
  currency: currencyCodeSchema,
  displayCurrency: currencyCodeSchema,
  unitCost: z.number(),
  unitPrice: z.number(),
  originalUnitCost: z.number(),
  originalUnitPrice: z.number(),
  stock: z.number(),
  lowStockThreshold: nullableNumberSchema,
  isLowStock: z.boolean(),
  requiresKitchen: z.boolean(),
  active: z.boolean(),
  createdAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
  inventoryCostValue: z.number(),
  inventorySalesValue: z.number(),
  potentialProfit: z.number(),
  originalInventoryCostValue: z.number(),
  originalInventorySalesValue: z.number(),
  originalPotentialProfit: z.number(),
  stockBaseUnits: z.number(),
  marginPercent: z.number(),
})
export type ProductRecord = z.infer<typeof productRecordSchema>

export const ratesSourceSchema = z.enum(['live', 'stale-cache', 'fallback'])

export const productsResponseSchema = z.object({
  displayCurrency: currencyCodeSchema,
  ratesUpdatedAt: nullableIsoDateStringSchema,
  ratesSource: ratesSourceSchema,
  ratesNotice: nullableStringSchema,
  items: z.array(productRecordSchema),
  totals: z.object({
    totalProducts: z.number(),
    activeProducts: z.number(),
    inactiveProducts: z.number(),
    stockUnits: z.number(),
    stockPackages: z.number(),
    stockLooseUnits: z.number(),
    stockBaseUnits: z.number(),
    inventoryCostValue: z.number(),
    inventorySalesValue: z.number(),
    potentialProfit: z.number(),
    averageMarginPercent: z.number(),
    categories: z.array(z.string()),
  }),
})
export type ProductsResponse = z.infer<typeof productsResponseSchema>

const financeCategoryBreakdownSchema = z.object({
  category: z.string(),
  products: z.number(),
  units: z.number(),
  inventoryCostValue: z.number(),
  inventorySalesValue: z.number(),
  potentialProfit: z.number(),
})

const financeTopProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: nullableStringSchema.optional(),
  category: z.string(),
  barcode: nullableStringSchema.optional(),
  packagingClass: z.string().optional(),
  quantityLabel: nullableStringSchema.optional(),
  imageUrl: nullableStringSchema.optional(),
  catalogSource: z.string().optional(),
  isCombo: z.boolean().optional(),
  stock: z.number(),
  currency: currencyCodeSchema,
  displayCurrency: currencyCodeSchema,
  originalInventorySalesValue: z.number(),
  originalPotentialProfit: z.number(),
  inventoryCostValue: z.number(),
  inventorySalesValue: z.number(),
  potentialProfit: z.number(),
  marginPercent: z.number(),
})

const financeRecentOrderSchema = z.object({
  id: z.string(),
  customerName: nullableStringSchema,
  channel: nullableStringSchema,
  currency: currencyCodeSchema,
  status: z.enum(['COMPLETED', 'CANCELLED']),
  totalRevenue: z.number(),
  totalProfit: z.number(),
  originalTotalRevenue: z.number(),
  originalTotalProfit: z.number(),
  totalItems: z.number(),
  createdAt: isoDateStringSchema,
})

const financeRevenueTimelineSchema = z.object({
  label: z.string(),
  revenue: z.number(),
  profit: z.number(),
  orders: z.number(),
})

const financeSalesByChannelSchema = z.object({
  channel: z.string(),
  orders: z.number(),
  revenue: z.number(),
  profit: z.number(),
})

const financeTopCustomerSchema = z.object({
  customerName: z.string(),
  buyerType: z.enum(['PERSON', 'COMPANY']).nullable(),
  buyerDocument: nullableStringSchema,
  orders: z.number(),
  revenue: z.number(),
  profit: z.number(),
})

const financeTopEmployeeSchema = z.object({
  employeeId: z.string().nullable(),
  employeeCode: z.string().nullable(),
  employeeName: z.string(),
  orders: z.number(),
  revenue: z.number(),
  profit: z.number(),
  averageTicket: z.number(),
})

const financeSalesMapEntrySchema = z.object({
  label: z.string(),
  district: nullableStringSchema,
  city: nullableStringSchema,
  state: nullableStringSchema,
  country: nullableStringSchema,
  latitude: z.number(),
  longitude: z.number(),
  orders: z.number(),
  revenue: z.number(),
  profit: z.number(),
})

const financeTopRegionSchema = z.object({
  label: z.string(),
  city: nullableStringSchema,
  state: nullableStringSchema,
  country: nullableStringSchema,
  orders: z.number(),
  revenue: z.number(),
  profit: z.number(),
})

export const financeSummaryResponseSchema = z.object({
  displayCurrency: currencyCodeSchema,
  ratesUpdatedAt: nullableIsoDateStringSchema,
  ratesSource: ratesSourceSchema,
  ratesNotice: nullableStringSchema,
  totals: z.object({
    activeProducts: z.number(),
    inventoryUnits: z.number(),
    inventoryCostValue: z.number(),
    inventorySalesValue: z.number(),
    potentialProfit: z.number(),
    realizedRevenue: z.number(),
    realizedCost: z.number(),
    realizedProfit: z.number(),
    completedOrders: z.number(),
    currentMonthRevenue: z.number(),
    currentMonthProfit: z.number(),
    previousMonthRevenue: z.number(),
    previousMonthProfit: z.number(),
    revenueGrowthPercent: z.number(),
    profitGrowthPercent: z.number(),
    averageMarginPercent: z.number(),
    averageMarkupPercent: z.number(),
    lowStockItems: z.number(),
  }),
  categoryBreakdown: z.array(financeCategoryBreakdownSchema),
  salesCategoryBreakdown: z.array(financeCategoryBreakdownSchema).optional(),
  topProducts: z.array(financeTopProductSchema),
  recentOrders: z.array(financeRecentOrderSchema),
  revenueTimeline: z.array(financeRevenueTimelineSchema),
  salesByChannel: z.array(financeSalesByChannelSchema),
  topCustomers: z.array(financeTopCustomerSchema),
  topEmployees: z.array(financeTopEmployeeSchema),
  salesMap: z.array(financeSalesMapEntrySchema),
  topRegions: z.array(financeTopRegionSchema),
  categoryTopProducts: z.record(z.string(), z.array(financeTopProductSchema)),
})
export type FinanceSummaryResponse = z.infer<typeof financeSummaryResponseSchema>

export const marketInsightResponseSchema = z.object({
  generatedAt: isoDateStringSchema,
  model: z.string(),
  focus: z.string(),
  cached: z.boolean(),
  summary: z.string(),
  forecast: z.string(),
  opportunities: z.array(z.string()),
  risks: z.array(z.string()),
  nextActions: z.array(z.string()),
})
export type MarketInsightResponse = z.infer<typeof marketInsightResponseSchema>

export const orderItemRecordSchema = z.object({
  id: z.string(),
  productId: z.string().nullable(),
  productName: z.string(),
  category: z.string(),
  quantity: z.number(),
  currency: currencyCodeSchema,
  unitPrice: z.number(),
  unitCost: z.number(),
  lineRevenue: z.number(),
  lineCost: z.number(),
  lineProfit: z.number(),
  originalUnitPrice: z.number(),
  originalUnitCost: z.number(),
  originalLineRevenue: z.number(),
  originalLineCost: z.number(),
  originalLineProfit: z.number(),
})

export const orderRecordSchema = z.object({
  id: z.string(),
  comandaId: z.string().nullable(),
  customerName: z.string().nullable(),
  buyerType: z.enum(['PERSON', 'COMPANY']).nullable(),
  buyerDocument: z.string().nullable(),
  buyerDistrict: z.string().nullable(),
  buyerCity: z.string().nullable(),
  buyerState: z.string().nullable(),
  buyerCountry: z.string().nullable(),
  buyerLatitude: z.number().nullable(),
  buyerLongitude: z.number().nullable(),
  employeeId: z.string().nullable(),
  sellerCode: z.string().nullable(),
  sellerName: z.string().nullable(),
  channel: z.string().nullable(),
  notes: z.string().nullable(),
  currency: currencyCodeSchema,
  displayCurrency: currencyCodeSchema,
  status: z.enum(['COMPLETED', 'CANCELLED']),
  totalRevenue: z.number(),
  totalCost: z.number(),
  totalProfit: z.number(),
  originalTotalRevenue: z.number(),
  originalTotalCost: z.number(),
  originalTotalProfit: z.number(),
  totalItems: z.number(),
  createdAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
  cancelledAt: nullableIsoDateStringSchema,
  items: z.array(orderItemRecordSchema),
})
export type OrderRecord = z.infer<typeof orderRecordSchema>

export const ordersResponseSchema = z.object({
  items: z.array(orderRecordSchema),
  totals: z.object({
    completedOrders: z.number(),
    cancelledOrders: z.number(),
    realizedRevenue: z.number(),
    realizedProfit: z.number(),
    soldUnits: z.number(),
  }),
})
export type OrdersResponse = z.infer<typeof ordersResponseSchema>

export const productImportResponseSchema = z.object({
  summary: z.object({
    totalRows: z.number(),
    createdCount: z.number(),
    updatedCount: z.number(),
    failedCount: z.number(),
  }),
  errors: z.array(
    z.object({
      line: z.number(),
      message: z.string(),
    }),
  ),
})
export type ProductImportResponse = z.infer<typeof productImportResponseSchema>

export const cashSessionStatusSchema = z.enum(['OPEN', 'CLOSED', 'FORCE_CLOSED'])
export type CashSessionStatus = z.infer<typeof cashSessionStatusSchema>

export const cashMovementTypeSchema = z.enum(['OPENING_FLOAT', 'SUPPLY', 'WITHDRAWAL', 'ADJUSTMENT'])
export type CashMovementType = z.infer<typeof cashMovementTypeSchema>

export const comandaPaymentMethodSchema = z.enum(['CASH', 'PIX', 'DEBIT', 'CREDIT', 'VOUCHER', 'OTHER'])
export type ComandaPaymentMethod = z.infer<typeof comandaPaymentMethodSchema>

export const comandaPaymentStatusSchema = z.enum(['CONFIRMED', 'VOIDED'])
export type ComandaPaymentStatus = z.infer<typeof comandaPaymentStatusSchema>

export const comandaPaymentStateSchema = z.enum(['UNPAID', 'PARTIAL', 'PAID'])
export type ComandaPaymentState = z.infer<typeof comandaPaymentStateSchema>

export const cashClosureStatusSchema = z.enum(['OPEN', 'PENDING_EMPLOYEE_CLOSE', 'CLOSED', 'FORCE_CLOSED'])
export type CashClosureStatus = z.infer<typeof cashClosureStatusSchema>

export const comandaStatusSchema = z.enum(['OPEN', 'IN_PREPARATION', 'READY', 'CLOSED', 'CANCELLED'])
export type ComandaStatus = z.infer<typeof comandaStatusSchema>

export const kitchenItemStatusSchema = z.enum(['QUEUED', 'IN_PREPARATION', 'READY', 'DELIVERED'])
export type KitchenItemStatus = z.infer<typeof kitchenItemStatusSchema>

export const cashMovementRecordSchema = z.object({
  id: z.string(),
  cashSessionId: z.string(),
  employeeId: z.string().nullable(),
  type: cashMovementTypeSchema,
  amount: z.number(),
  note: z.string().nullable(),
  createdAt: isoDateStringSchema,
})
export type CashMovementRecord = z.infer<typeof cashMovementRecordSchema>

export const cashSessionRecordSchema = z.object({
  id: z.string(),
  companyOwnerId: z.string(),
  employeeId: z.string().nullable(),
  status: cashSessionStatusSchema,
  businessDate: isoDateStringSchema,
  openingCashAmount: z.number(),
  countedCashAmount: z.number().nullable(),
  expectedCashAmount: z.number(),
  differenceAmount: z.number().nullable(),
  grossRevenueAmount: z.number(),
  realizedProfitAmount: z.number(),
  notes: z.string().nullable(),
  openedAt: isoDateStringSchema,
  closedAt: nullableIsoDateStringSchema,
  movements: z.array(cashMovementRecordSchema),
})
export type CashSessionRecord = z.infer<typeof cashSessionRecordSchema>

export const comandaItemRecordSchema = z.object({
  id: z.string(),
  productId: z.string().nullable(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalAmount: z.number(),
  notes: z.string().nullable(),
  kitchenStatus: kitchenItemStatusSchema.nullable(),
  kitchenQueuedAt: nullableIsoDateStringSchema,
  kitchenReadyAt: nullableIsoDateStringSchema,
})
export type ComandaItemRecord = z.infer<typeof comandaItemRecordSchema>

export const comandaPaymentRecordSchema = z.object({
  id: z.string(),
  method: comandaPaymentMethodSchema,
  amount: z.number(),
  note: z.string().nullable(),
  status: comandaPaymentStatusSchema,
  paidAt: isoDateStringSchema,
})
export type ComandaPaymentRecord = z.infer<typeof comandaPaymentRecordSchema>

export const mesaStatusSchema = z.enum(['livre', 'ocupada', 'reservada'])
export type MesaStatus = z.infer<typeof mesaStatusSchema>

export const mesaRecordSchema = z.object({
  id: z.string(),
  label: z.string(),
  capacity: z.number(),
  section: z.string().nullable(),
  positionX: z.number().nullable(),
  positionY: z.number().nullable(),
  active: z.boolean(),
  reservedUntil: nullableIsoDateStringSchema,
  status: mesaStatusSchema,
  comandaId: z.string().nullable(),
  currentEmployeeId: z.string().nullable(),
})
export type MesaRecord = z.infer<typeof mesaRecordSchema>

export const comandaRecordSchema = z.object({
  id: z.string(),
  companyOwnerId: z.string(),
  cashSessionId: z.string().nullable(),
  mesaId: z.string().nullable(),
  currentEmployeeId: z.string().nullable(),
  tableLabel: z.string(),
  customerName: z.string().nullable(),
  customerDocument: z.string().nullable(),
  participantCount: z.number(),
  status: comandaStatusSchema,
  subtotalAmount: z.number(),
  discountAmount: z.number(),
  serviceFeeAmount: z.number(),
  totalAmount: z.number(),
  paidAmount: z.number().optional(),
  remainingAmount: z.number().optional(),
  paymentStatus: comandaPaymentStateSchema.optional(),
  notes: z.string().nullable(),
  openedAt: isoDateStringSchema,
  closedAt: nullableIsoDateStringSchema,
  items: z.array(comandaItemRecordSchema),
  payments: z.array(comandaPaymentRecordSchema).optional(),
})
export type ComandaRecord = z.infer<typeof comandaRecordSchema>

export const operationsKitchenItemStatusSchema = z.enum(['QUEUED', 'IN_PREPARATION', 'READY'])
export type OperationsKitchenItemStatus = z.infer<typeof operationsKitchenItemStatusSchema>

export const operationsKitchenItemRecordSchema = z.object({
  itemId: z.string(),
  comandaId: z.string(),
  mesaLabel: z.string(),
  employeeId: z.string().nullable(),
  employeeName: z.string(),
  productName: z.string(),
  quantity: z.number(),
  notes: z.string().nullable(),
  kitchenStatus: operationsKitchenItemStatusSchema,
  kitchenQueuedAt: nullableIsoDateStringSchema,
  kitchenReadyAt: nullableIsoDateStringSchema,
})
export type OperationsKitchenItemRecord = z.infer<typeof operationsKitchenItemRecordSchema>

export const operationsKitchenResponseSchema = z.object({
  businessDate: isoDateStringSchema,
  companyOwnerId: z.string(),
  items: z.array(operationsKitchenItemRecordSchema),
  statusCounts: z.object({
    queued: z.number(),
    inPreparation: z.number(),
    ready: z.number(),
  }),
})
export type OperationsKitchenResponse = z.infer<typeof operationsKitchenResponseSchema>

export const operationsExecutiveKpisSchema = z.object({
  receitaRealizada: z.number(),
  faturamentoAberto: z.number(),
  projecaoTotal: z.number(),
  lucroRealizado: z.number(),
  lucroEsperado: z.number(),
  caixaEsperado: z.number(),
  openComandasCount: z.number(),
  openSessionsCount: z.number(),
})
export type OperationsExecutiveKpis = z.infer<typeof operationsExecutiveKpisSchema>

export const operationsPerformerRankingEntrySchema = z.object({
  nome: z.string(),
  valor: z.number(),
  comandas: z.number(),
})
export type OperationsPerformerRankingEntry = z.infer<typeof operationsPerformerRankingEntrySchema>

export const operationsTopProductEntrySchema = z.object({
  nome: z.string(),
  qtd: z.number(),
  valor: z.number(),
})
export type OperationsTopProductEntry = z.infer<typeof operationsTopProductEntrySchema>

export const operationsSummaryResponseSchema = z.object({
  businessDate: isoDateStringSchema,
  companyOwnerId: z.string(),
  kpis: operationsExecutiveKpisSchema,
  performers: z.array(operationsPerformerRankingEntrySchema),
  topProducts: z.array(operationsTopProductEntrySchema),
})
export type OperationsSummaryResponse = z.infer<typeof operationsSummaryResponseSchema>

export const employeeOperationsRecordSchema = z.object({
  employeeId: z.string().nullable(),
  employeeCode: z.string().nullable(),
  displayName: z.string(),
  active: z.boolean(),
  cashSession: cashSessionRecordSchema.nullable(),
  comandas: z.array(comandaRecordSchema),
})
export type EmployeeOperationsRecord = z.infer<typeof employeeOperationsRecordSchema>

export const operationsClosureSnapshotSchema = z.object({
  status: cashClosureStatusSchema,
  expectedCashAmount: z.number(),
  countedCashAmount: z.number().nullable(),
  differenceAmount: z.number().nullable(),
  grossRevenueAmount: z.number(),
  realizedProfitAmount: z.number(),
  openSessionsCount: z.number(),
  openComandasCount: z.number(),
})

export const operationsLiveResponseSchema = z.object({
  businessDate: isoDateStringSchema,
  companyOwnerId: z.string(),
  closure: operationsClosureSnapshotSchema.nullable(),
  employees: z.array(employeeOperationsRecordSchema),
  unassigned: employeeOperationsRecordSchema,
  mesas: z.array(mesaRecordSchema),
})
export type OperationsLiveResponse = z.infer<typeof operationsLiveResponseSchema>
