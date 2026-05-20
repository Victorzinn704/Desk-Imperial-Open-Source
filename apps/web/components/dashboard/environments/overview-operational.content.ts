import { formatCurrency } from '@/lib/currency'
import { formatPercent, type OverviewSnapshot } from './overview-environment.model'
import {
  brief,
  type OverviewBriefEntry,
  type OverviewTileTone,
  signedPercent,
  tile,
  trendBriefTone,
} from './overview-environment.content'

export function buildOperationalTiles(snapshot: OverviewSnapshot) {
  return [
    tile({ label: 'volume atual', note: 'pedidos concluídos', tone: 'accent', value: `${snapshot.completedOrders}` }),
    tile({
      label: 'ticket médio',
      note: 'caixa por pedido',
      tone: 'soft',
      value: formatCurrency(snapshot.averageTicket, snapshot.displayCurrency),
    }),
    tile({ label: 'margem', note: 'qualidade do mix', tone: 'success', value: formatPercent(snapshot.averageMargin) }),
    tile({
      label: 'estoque baixo',
      note: 'alertas críticos',
      tone: stockTileTone(snapshot),
      value: stockCount(snapshot),
    }),
  ]
}

export function buildOperationalBriefEntries(snapshot: OverviewSnapshot): OverviewBriefEntry[] {
  return [
    brief({
      label: 'receita do mês',
      tone: 'accent',
      value: formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency),
    }),
    brief({
      label: 'lucro do mês',
      tone: trendBriefTone({ value: snapshot.currentProfit }),
      value: formatCurrency(snapshot.currentProfit, snapshot.displayCurrency),
    }),
    brief({ label: 'produto líder', tone: 'soft', value: snapshot.topProductName ?? 'sem registro' }),
    brief({
      label: 'crescimento',
      tone: trendBriefTone({ value: snapshot.revenueGrowth }),
      value: signedPercent({ value: snapshot.revenueGrowth }),
    }),
  ]
}

function stockCount(snapshot: OverviewSnapshot) {
  return snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems}` : '0'
}

function stockTileTone({ lowStockItems }: Pick<OverviewSnapshot, 'lowStockItems'>): OverviewTileTone {
  return lowStockItems > 0 ? 'warning' : 'soft'
}
