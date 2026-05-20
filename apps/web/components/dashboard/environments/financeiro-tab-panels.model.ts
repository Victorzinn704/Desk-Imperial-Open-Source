import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'

export type FinanceDisplayCurrency = FinanceSummaryResponse['displayCurrency']

export type FinancePanelProps = Readonly<{
  displayCurrency: FinanceDisplayCurrency
  finance?: FinanceSummaryResponse
}>

export type FinanceLoadingPanelProps = FinancePanelProps &
  Readonly<{
    isLoading: boolean
  }>

export type FinanceProductsPanelProps = FinancePanelProps &
  Readonly<{
    products: ProductRecord[]
  }>

export type TimelineAuditRow = {
  label: string
  revenue: number
  profit: number
  orders: number
  averageTicket: number
  revenueDelta: number | null
}

export type FlowAuditRow = {
  label: string
  revenue: number
  cost: number
  profit: number
  orders: number
  averageTicket: number
}

export type DreAuditRow = {
  label: string
  revenue: number
  profit: number
  marginPercent: number
  orders: number
  averageTicket: number
}

export type CustomerLedgerRow = FinanceSummaryResponse['topCustomers'][number]

export function buildTimelineAuditRows(timeline: FinanceSummaryResponse['revenueTimeline']): TimelineAuditRow[] {
  return timeline
    .map((row, index) => {
      const previous = timeline[index - 1] ?? null

      return {
        label: row.label,
        revenue: row.revenue,
        profit: row.profit,
        orders: row.orders,
        averageTicket: calculateAverageTicket(row),
        revenueDelta: calculateRevenueDelta({ currentRevenue: row.revenue, previousRevenue: previous?.revenue }),
      }
    })
    .reverse()
}

export function buildFlowAuditRows(timeline: FinanceSummaryResponse['revenueTimeline']): FlowAuditRow[] {
  return timeline
    .map((row) => ({
      label: row.label,
      revenue: row.revenue,
      cost: Math.max(0, row.revenue - row.profit),
      profit: row.profit,
      orders: row.orders,
      averageTicket: calculateAverageTicket(row),
    }))
    .reverse()
}

export function buildDreAuditRows(timeline: FinanceSummaryResponse['revenueTimeline']): DreAuditRow[] {
  return timeline
    .map((row) => ({
      label: row.label,
      revenue: row.revenue,
      profit: row.profit,
      marginPercent: calculateMarginPercent(row),
      orders: row.orders,
      averageTicket: calculateAverageTicket(row),
    }))
    .reverse()
}

export function calculateSharePercent({ total, value }: Readonly<{ total: number; value: number }>) {
  return total > 0 ? (value / total) * 100 : 0
}

export function progressWidth(sharePercent: number) {
  return `${Math.max(8, Math.min(sharePercent, 100))}%`
}

function calculateAverageTicket(row: Readonly<{ orders: number; revenue: number }>) {
  return row.orders > 0 ? row.revenue / row.orders : 0
}

function calculateMarginPercent(row: Readonly<{ profit: number; revenue: number }>) {
  return row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0
}

function calculateRevenueDelta({
  currentRevenue,
  previousRevenue,
}: Readonly<{
  currentRevenue: number
  previousRevenue?: number
}>) {
  return previousRevenue && previousRevenue > 0
    ? Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1))
    : null
}
