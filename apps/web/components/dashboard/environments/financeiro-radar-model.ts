import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { LabStatusTone } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'

export type FinanceRadar = {
  cancelledOrders: number
  cancelTone: LabStatusTone
  categoryCount: number
  categoryLead: string
  channelLead: string
  channels: FinanceSummaryResponse['salesByChannel']
  completedOrders: number
  customerLead: string
  customerRevenue: string
}

export function buildFinanceRadar(
  finance: FinanceSummaryResponse | undefined,
  displayCurrency: FinanceSummaryResponse['displayCurrency'],
): FinanceRadar {
  const channels = readChannels(finance)
  const topCustomer = readTopCustomer(finance)
  const cancelledOrders = countCancelledOrders(finance)

  return {
    cancelledOrders,
    cancelTone: resolveCancelTone(cancelledOrders),
    categoryCount: countCategories(finance),
    categoryLead: readCategoryLead(finance),
    channelLead: readChannelLead(channels),
    channels,
    completedOrders: readCompletedOrders(finance),
    customerLead: topCustomer?.customerName ?? 'sem leitura',
    customerRevenue: formatCustomerRevenue(topCustomer, displayCurrency),
  }
}

function readChannels(finance: FinanceSummaryResponse | undefined) {
  return finance?.salesByChannel.slice(0, 4) ?? []
}

function readTopCustomer(finance: FinanceSummaryResponse | undefined) {
  return finance?.topCustomers[0] ?? null
}

function countCancelledOrders(finance: FinanceSummaryResponse | undefined) {
  return (finance?.recentOrders ?? []).filter((order) => order.status === 'CANCELLED').length
}

function resolveCancelTone(cancelledOrders: number): LabStatusTone {
  return cancelledOrders > 0 ? 'warning' : 'neutral'
}

function countCategories(finance: FinanceSummaryResponse | undefined) {
  return finance?.categoryBreakdown.length ?? 0
}

function readCategoryLead(finance: FinanceSummaryResponse | undefined) {
  return finance?.categoryBreakdown[0]?.category ?? 'sem leitura'
}

function readChannelLead(channels: FinanceSummaryResponse['salesByChannel']) {
  return channels[0]?.channel ?? 'sem leitura'
}

function readCompletedOrders(finance: FinanceSummaryResponse | undefined) {
  return finance?.totals.completedOrders ?? 0
}

function formatCustomerRevenue(
  topCustomer: FinanceSummaryResponse['topCustomers'][number] | null,
  displayCurrency: FinanceSummaryResponse['displayCurrency'],
) {
  return topCustomer ? formatCurrency(topCustomer.revenue, displayCurrency) : 'sem leitura'
}
