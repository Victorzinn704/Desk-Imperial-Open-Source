import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { LabStatusTone } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { formatPercent } from './financeiro-model'
import type { FinanceDisplayCurrency, FinancePanelProps } from './financeiro-tab-panels.model'

const ACCOUNT_CHANNEL_LIMIT = 4

const EMPTY_FINANCE_TOTALS = {
  activeProducts: 0,
  inventoryUnits: 0,
  inventoryCostValue: 0,
  inventorySalesValue: 0,
  potentialProfit: 0,
  realizedRevenue: 0,
  realizedCost: 0,
  realizedProfit: 0,
  completedOrders: 0,
  currentMonthRevenue: 0,
  currentMonthProfit: 0,
  previousMonthRevenue: 0,
  previousMonthProfit: 0,
  revenueGrowthPercent: 0,
  profitGrowthPercent: 0,
  averageMarginPercent: 0,
  averageMarkupPercent: 0,
  lowStockItems: 0,
} satisfies FinanceSummaryResponse['totals']

type SummaryRowModel = {
  label: string
  tone: LabStatusTone
  value: string
}

type SummaryRowSpec<Context> = {
  label: string
  tone: (context: Context) => LabStatusTone
  value: (context: Context) => string
}

type FinanceSummarySource = {
  channels: FinanceSummaryResponse['salesByChannel']
  recentOrders: FinanceSummaryResponse['recentOrders']
  topCustomer: FinanceSummaryResponse['topCustomers'][number] | null
  totals: FinanceSummaryResponse['totals']
}

type DreStatementContext = {
  averageTicket: number
  completedOrders: number
  displayCurrency: FinanceDisplayCurrency
  profit: number
  profitTone: LabStatusTone
  realizedCost: number
  revenue: number
  totals: FinanceSummaryResponse['totals']
}

type AccountsSummaryContext = {
  averageTicket: number
  cancelledOrders: number
  completedOrders: number
  displayCurrency: FinanceDisplayCurrency
  realizedRevenue: number
  topCustomer: FinanceSummarySource['topCustomer']
}

const DRE_STATEMENT_ROWS: Array<SummaryRowSpec<DreStatementContext>> = [
  staticSummaryRow({
    label: 'Receita bruta',
    tone: 'neutral',
    value: (context) => formatCurrency(context.revenue, context.displayCurrency),
  }),
  staticSummaryRow({
    label: 'Custo realizado',
    tone: 'warning',
    value: (context) => formatCurrency(context.realizedCost, context.displayCurrency),
  }),
  {
    label: 'Lucro líquido',
    tone: (context) => context.profitTone,
    value: (context) => formatCurrency(context.profit, context.displayCurrency),
  },
  staticSummaryRow({
    label: 'Margem média',
    tone: 'info',
    value: (context) => formatPercent(context.totals.averageMarginPercent),
  }),
  staticSummaryRow({
    label: 'Markup médio',
    tone: 'neutral',
    value: (context) => formatPercent(context.totals.averageMarkupPercent),
  }),
  staticSummaryRow({
    label: 'Ticket médio',
    tone: 'neutral',
    value: (context) => formatCurrency(context.averageTicket, context.displayCurrency),
  }),
  staticSummaryRow({
    label: 'Pedidos concluídos',
    tone: 'neutral',
    value: (context) => String(context.completedOrders),
  }),
]

const ACCOUNT_SUMMARY_ROWS: Array<SummaryRowSpec<AccountsSummaryContext>> = [
  staticSummaryRow({
    label: 'Recebimento consolidado',
    tone: 'success',
    value: (context) => formatCurrency(context.realizedRevenue, context.displayCurrency),
  }),
  staticSummaryRow({
    label: 'Ticket médio',
    tone: 'info',
    value: (context) => formatCurrency(context.averageTicket, context.displayCurrency),
  }),
  {
    label: 'Cancelados',
    tone: (context) => (context.cancelledOrders > 0 ? 'warning' : 'success'),
    value: (context) => String(context.cancelledOrders),
  },
  staticSummaryRow({
    label: 'Maior cliente',
    tone: 'neutral',
    value: formatTopCustomerValue,
  }),
]

export function buildDreStatementModel(props: FinancePanelProps) {
  const context = buildDreStatementContext(props)

  return {
    actionTone: context.profitTone,
    actionValue: formatCurrency(context.profit, context.displayCurrency),
    rows: buildSummaryRows(DRE_STATEMENT_ROWS, context),
  }
}

export function buildAccountsSummaryModel(props: FinancePanelProps) {
  const source = resolveFinanceSummarySource(props.finance)
  const context = buildAccountsSummaryContext({ displayCurrency: props.displayCurrency, source })

  return {
    channels: source.channels.slice(0, ACCOUNT_CHANNEL_LIMIT),
    completedOrders: context.completedOrders,
    rows: buildSummaryRows(ACCOUNT_SUMMARY_ROWS, context),
  }
}

function buildDreStatementContext({ displayCurrency, finance }: FinancePanelProps): DreStatementContext {
  const totals = resolveFinanceSummarySource(finance).totals
  const revenue = totals.currentMonthRevenue
  const profit = totals.currentMonthProfit
  const completedOrders = totals.completedOrders

  return {
    averageTicket: calculateAverageTicket({ orders: completedOrders, revenue }),
    completedOrders,
    displayCurrency,
    profit,
    profitTone: profit >= 0 ? 'success' : 'danger',
    realizedCost: totals.realizedCost,
    revenue,
    totals,
  }
}

function buildAccountsSummaryContext({
  displayCurrency,
  source,
}: Readonly<{
  displayCurrency: FinanceDisplayCurrency
  source: FinanceSummarySource
}>): AccountsSummaryContext {
  const revenue = source.totals.currentMonthRevenue
  const completedOrders = source.totals.completedOrders

  return {
    averageTicket: calculateAverageTicket({ orders: completedOrders, revenue }),
    cancelledOrders: countCancelledOrders(source.recentOrders),
    completedOrders,
    displayCurrency,
    realizedRevenue: source.totals.realizedRevenue,
    topCustomer: source.topCustomer,
  }
}

function resolveFinanceSummarySource(finance: FinanceSummaryResponse | undefined): FinanceSummarySource {
  if (!finance) {
    return {
      channels: [],
      recentOrders: [],
      topCustomer: null,
      totals: EMPTY_FINANCE_TOTALS,
    }
  }

  return {
    channels: finance.salesByChannel,
    recentOrders: finance.recentOrders,
    topCustomer: finance.topCustomers[0] ?? null,
    totals: finance.totals,
  }
}

function staticSummaryRow<Context>(spec: Omit<SummaryRowSpec<Context>, 'tone'> & { tone: LabStatusTone }) {
  return {
    label: spec.label,
    tone: () => spec.tone,
    value: spec.value,
  }
}

function buildSummaryRows<Context>(specs: Array<SummaryRowSpec<Context>>, context: Context): SummaryRowModel[] {
  return specs.map((spec) => ({
    label: spec.label,
    tone: spec.tone(context),
    value: spec.value(context),
  }))
}

function calculateAverageTicket({ orders, revenue }: Readonly<{ orders: number; revenue: number }>) {
  return orders > 0 ? revenue / orders : 0
}

function countCancelledOrders(orders: FinanceSummaryResponse['recentOrders']) {
  return orders.filter((order) => order.status === 'CANCELLED').length
}

function formatTopCustomerValue(context: AccountsSummaryContext) {
  if (!context.topCustomer) {
    return 'Sem registro'
  }

  return `${context.topCustomer.customerName} · ${formatCurrency(context.topCustomer.revenue, context.displayCurrency)}`
}
