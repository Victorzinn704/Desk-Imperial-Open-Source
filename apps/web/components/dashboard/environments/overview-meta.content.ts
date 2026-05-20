import { formatCurrency } from '@/lib/currency'
import { formatPercent, type OverviewSnapshot } from './overview-environment.model'
import {
  brief,
  ledger,
  type OverviewBriefEntry,
  type OverviewLedgerItem,
  type OverviewTargetPlan,
  trendBriefTone,
} from './overview-environment.content'

export function buildMetaLedger(snapshot: OverviewSnapshot, plan: OverviewTargetPlan): OverviewLedgerItem[] {
  return [
    ledger({
      label: 'meta projetada',
      note: 'patamar comercial esperado para o mês',
      tone: 'soft',
      value: formatCurrency(plan.targetRevenue, snapshot.displayCurrency),
    }),
    ledger({
      label: 'falta para bater',
      note: gapNote(plan),
      tone: plan.revenueGap > 0 ? 'warning' : 'success',
      value: gapValue(snapshot, plan),
    }),
    ledger({
      label: 'média por dia',
      note: `${plan.remainingDays} dias restantes para fechar o mês`,
      tone: plan.revenueGap > 0 ? 'accent' : 'success',
      value: dailyNeedValue(snapshot, plan),
    }),
    ledger({
      label: 'pedidos necessários',
      note: 'mantendo o ticket médio atual',
      tone: plan.revenueGap > 0 ? 'soft' : 'success',
      value: plan.revenueGap > 0 ? String(plan.ordersNeeded) : '0',
    }),
    ledger({
      label: 'projeção de fechamento',
      note: projectedCloseNote(plan),
      tone: plan.projectedClose >= plan.targetRevenue ? 'success' : 'warning',
      value: formatCurrency(plan.projectedClose, snapshot.displayCurrency),
    }),
    ledger({
      label: 'alavanca principal',
      note: 'produto com maior chance de puxar a receita',
      tone: 'accent',
      value: snapshot.topProductName ?? 'mix da casa',
    }),
  ]
}

export function buildMetaBriefEntries(snapshot: OverviewSnapshot): OverviewBriefEntry[] {
  return [
    brief({
      label: 'ticket médio',
      tone: 'accent',
      value: formatCurrency(snapshot.averageTicket, snapshot.displayCurrency),
    }),
    brief({
      label: 'lucro do mês',
      tone: trendBriefTone({ value: snapshot.currentProfit }),
      value: formatCurrency(snapshot.currentProfit, snapshot.displayCurrency),
    }),
    brief({ label: 'margem média', tone: 'soft', value: formatPercent(snapshot.averageMargin) }),
  ]
}

function gapValue(snapshot: OverviewSnapshot, plan: OverviewTargetPlan) {
  return plan.revenueGap > 0 ? formatCurrency(plan.revenueGap, snapshot.displayCurrency) : 'meta superada'
}

function gapNote(plan: OverviewTargetPlan) {
  return plan.revenueGap > 0 ? 'gap restante até o alvo' : 'já está acima do objetivo'
}

function dailyNeedValue(snapshot: OverviewSnapshot, plan: OverviewTargetPlan) {
  return plan.revenueGap > 0 ? formatCurrency(plan.dailyNeed, snapshot.displayCurrency) : 'folga diária'
}

function projectedCloseNote(plan: OverviewTargetPlan) {
  return plan.projectedClose >= plan.targetRevenue
    ? 'o ritmo atual entrega a meta'
    : 'o ritmo atual ainda fica abaixo do alvo'
}
