import { formatCurrency } from '@/lib/currency'
import { formatPercent, type OverviewSnapshot } from './overview-environment.model'
import {
  brief,
  completedOrdersLabel,
  ledger,
  type OverviewBriefEntry,
  type OverviewLedgerItem,
  signedPercent,
  stockBriefTone,
  stockNote,
  stockValue,
  trendBriefTone,
} from './overview-environment.content'

export function buildPrincipalLedger(snapshot: OverviewSnapshot): OverviewLedgerItem[] {
  return [
    ledger({
      label: 'pedidos fechados',
      note: 'volume já convertido em caixa',
      tone: 'soft',
      value: String(snapshot.completedOrders),
    }),
    ledger({
      label: 'ticket médio',
      note: 'quanto cada pedido entrega',
      tone: 'accent',
      value: formatCurrency(snapshot.averageTicket, snapshot.displayCurrency),
    }),
    ledger({
      label: 'margem média',
      note: 'qualidade do mix vendido',
      tone: marginTone(snapshot),
      value: formatPercent(snapshot.averageMargin),
    }),
    ledger({
      label: 'lucro do mês',
      note: 'resultado líquido atual',
      tone: trendBriefTone({ value: snapshot.currentProfit }),
      value: formatCurrency(snapshot.currentProfit, snapshot.displayCurrency),
    }),
    ledger({
      label: stockLabel(snapshot),
      note: stockNote(snapshot),
      tone: stockBriefTone(snapshot),
      value: stockValue(snapshot),
    }),
    ledger({
      label: 'produto líder',
      note: 'item que está puxando o caixa',
      tone: 'accent',
      value: snapshot.topProductName ?? 'sem destaque claro',
    }),
  ]
}

export function buildPrincipalRadarEntries(snapshot: OverviewSnapshot): OverviewBriefEntry[] {
  return [
    brief({
      label: 'crescimento de receita',
      tone: trendBriefTone({ value: snapshot.revenueGrowth }),
      value: signedPercent({ value: snapshot.revenueGrowth }),
    }),
    brief({
      label: 'crescimento de lucro',
      tone: trendBriefTone({ value: snapshot.profitGrowth }),
      value: signedPercent({ value: snapshot.profitGrowth }),
    }),
    brief({ label: 'estoque baixo', tone: stockBriefTone(snapshot), value: stockValue(snapshot) }),
    brief({
      label: 'produto que puxa caixa',
      tone: 'accent',
      value: snapshot.topProductName ?? 'sem vendas registradas',
    }),
  ]
}

export function buildPrincipalSignalEntries(snapshot: OverviewSnapshot): OverviewBriefEntry[] {
  return [
    brief({ label: 'empresa', tone: 'soft', value: snapshot.companyName }),
    brief({
      label: 'lucro do mês',
      tone: trendBriefTone({ value: snapshot.currentProfit }),
      value: formatCurrency(snapshot.currentProfit, snapshot.displayCurrency),
    }),
    brief({ label: 'ritmo do caixa', tone: 'accent', value: completedOrdersLabel(snapshot) }),
  ]
}

export function principalRevenueNarrative(snapshot: OverviewSnapshot) {
  return snapshot.revenueGrowth >= 0
    ? 'A receita caminha acima do período anterior e abre espaço para puxar margem sem perder giro.'
    : 'O mês ainda pede recomposição de ritmo. Vale conferir conversão, mix e recorrência de comandas.'
}

function marginTone(snapshot: OverviewSnapshot) {
  return snapshot.averageMargin >= 30 ? 'success' : 'warning'
}

function stockLabel(snapshot: OverviewSnapshot) {
  return snapshot.lowStockItems > 0 ? 'estoque baixo' : 'estoque'
}
