import type { LabStatusTone } from '@/components/design-lab/lab-primitives'
import { clamp, daysLeftInMonth, formatPercent, type OverviewSnapshot } from './overview-environment.model'

export type OverviewBriefTone = 'accent' | 'success' | 'danger' | 'warning' | 'soft'
export type OverviewTileTone = 'accent' | 'success' | 'warning' | 'soft'

export type OverviewLedgerItem = {
  label: string
  note: string
  tone: OverviewBriefTone
  value: string
}

export type OverviewBriefEntry = {
  label: string
  tone: OverviewBriefTone
  value: string
}

export type OverviewTileItem = {
  label: string
  note: string
  tone: OverviewTileTone
  value: string
}

export type OverviewTargetPlan = {
  dailyRevenueNeed: number
  dailyNeed: number
  ordersNeeded: number
  projectedClose: number
  remainingDays: number
  revenueGap: number
  targetProgress: number
  targetRevenue: number
}

type OverviewTrendSignal = {
  value: number
}

type OverviewMarginSignal = Pick<OverviewSnapshot, 'averageMargin'>
type OverviewStockSignal = Pick<OverviewSnapshot, 'lowStockItems'>

export function signedPercent(signal: Readonly<OverviewTrendSignal>) {
  return `${signal.value >= 0 ? '+' : ''}${formatPercent(signal.value)}`
}

export function trendBriefTone(signal: Readonly<OverviewTrendSignal>): OverviewBriefTone {
  return signal.value >= 0 ? 'success' : 'danger'
}

export function trendLabTone(signal: Readonly<OverviewTrendSignal>): LabStatusTone {
  return signal.value >= 0 ? 'success' : 'danger'
}

export function stockLabTone(signal: Readonly<OverviewStockSignal>): LabStatusTone {
  return signal.lowStockItems > 0 ? 'warning' : 'success'
}

export function stockBriefTone(signal: Readonly<OverviewStockSignal>): OverviewBriefTone {
  return signal.lowStockItems > 0 ? 'warning' : 'soft'
}

export function marginLabTone(signal: Readonly<OverviewMarginSignal>): LabStatusTone {
  return signal.averageMargin >= 30 ? 'success' : 'warning'
}

export function buildTargetPlan(
  snapshot: OverviewSnapshot,
  options: Readonly<{ multiplier: number; orderFactor: number; minimumGap: number }>,
): OverviewTargetPlan {
  const targetRevenue = Math.max(
    snapshot.currentRevenue * options.multiplier,
    snapshot.currentRevenue + Math.max(snapshot.averageTicket * options.orderFactor, options.minimumGap),
  )
  const revenueGap = Math.max(targetRevenue - snapshot.currentRevenue, 0)
  const remainingDays = daysLeftInMonth()

  return {
    dailyNeed: revenueGap / remainingDays,
    dailyRevenueNeed: revenueGap / Math.max(1, remainingDays),
    ordersNeeded: snapshot.averageTicket > 0 ? Math.ceil(revenueGap / snapshot.averageTicket) : 0,
    projectedClose: projectMonthlyClose(snapshot),
    remainingDays,
    revenueGap,
    targetProgress: targetRevenue > 0 ? clamp((snapshot.currentRevenue / targetRevenue) * 100, 0, 100) : 0,
    targetRevenue,
  }
}

export function ledger(item: Readonly<OverviewLedgerItem>): OverviewLedgerItem {
  return { label: item.label, note: item.note, tone: item.tone, value: item.value }
}

export function brief(entry: Readonly<OverviewBriefEntry>): OverviewBriefEntry {
  return { label: entry.label, tone: entry.tone, value: entry.value }
}

export function tile(item: Readonly<OverviewTileItem>): OverviewTileItem {
  return { label: item.label, note: item.note, tone: item.tone, value: item.value }
}

export function stockValue(snapshot: OverviewSnapshot) {
  return snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens` : 'sem alerta crítico'
}

export function stockNote(snapshot: OverviewSnapshot) {
  return snapshot.lowStockItems > 0 ? 'reposições precisam entrar no radar' : 'sem ruptura crítica agora'
}

export function completedOrdersLabel(snapshot: OverviewSnapshot) {
  return snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos concluídos` : 'sem fechamento ainda'
}

function projectMonthlyClose(snapshot: Pick<OverviewSnapshot, 'currentRevenue'>) {
  const today = new Date()
  const elapsedDays = Math.max(today.getDate(), 1)
  const monthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return elapsedDays > 0 ? (snapshot.currentRevenue / elapsedDays) * monthDays : snapshot.currentRevenue
}
