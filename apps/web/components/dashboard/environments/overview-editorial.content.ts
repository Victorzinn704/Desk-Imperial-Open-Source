import { formatCurrency } from '@/lib/currency'
import { formatPercent, type OverviewSnapshot } from './overview-environment.model'
import {
  brief,
  completedOrdersLabel,
  ledger,
  type OverviewLedgerItem,
  stockBriefTone,
  trendBriefTone,
} from './overview-environment.content'

export function buildEditorialContent(snapshot: OverviewSnapshot) {
  return {
    briefEntries: [
      brief({
        label: 'narrativa do caixa',
        tone: trendBriefTone({ value: snapshot.revenueGrowth }),
        value: editorialCashNarrative(snapshot),
      }),
      brief({ label: 'produto em evidência', tone: 'accent', value: snapshot.topProductName ?? 'sem campeão claro' }),
      brief({ label: 'estoque', tone: stockBriefTone(snapshot), value: editorialStockValue(snapshot) }),
    ],
    chips: [
      `receita ${formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency)}`,
      `lucro ${formatCurrency(snapshot.currentProfit, snapshot.displayCurrency)}`,
      `margem ${formatPercent(snapshot.averageMargin)}`,
    ],
    ledger: buildEditorialLedger(snapshot),
    narrative: editorialNarrative(snapshot),
    titleProduct: snapshot.topProductName ?? 'o giro da casa',
  }
}

function buildEditorialLedger(snapshot: OverviewSnapshot): OverviewLedgerItem[] {
  return [
    ledger({
      label: 'leitura do caixa',
      note: 'receita acumulada até agora',
      tone: 'accent',
      value: formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency),
    }),
    ledger({
      label: 'ritmo do turno',
      note: 'volume que já passou pelo salão',
      tone: 'soft',
      value: completedOrdersLabel(snapshot),
    }),
    ledger({
      label: 'ponto de atenção',
      note: editorialStockNote(snapshot),
      tone: stockBriefTone(snapshot),
      value: editorialStockValue(snapshot),
    }),
    ledger({
      label: 'tom do dia',
      note: editorialTrendNote(snapshot),
      tone: trendBriefTone({ value: snapshot.revenueGrowth }),
      value: snapshot.revenueGrowth >= 0 ? 'crescimento com tração' : 'dia pede correção',
    }),
    ledger({
      label: 'produto em foco',
      note: 'item que concentra a história comercial do painel',
      tone: 'accent',
      value: snapshot.topProductName ?? 'giro disperso',
    }),
    ledger({
      label: 'próxima ação',
      note: nextActionNote(snapshot),
      tone: 'soft',
      value: nextActionValue(snapshot),
    }),
  ]
}

function editorialNarrative(snapshot: OverviewSnapshot) {
  return snapshot.completedOrders > 0
    ? `${snapshot.companyName} abriu o período com ${snapshot.completedOrders} pedidos fechados e ticket médio de ${formatCurrency(snapshot.averageTicket, snapshot.displayCurrency)}.`
    : `${snapshot.companyName} ainda não tem pedidos fechados no período, então a leitura editorial fica voltada a meta, margem e preparação.`
}

function editorialCashNarrative(snapshot: OverviewSnapshot) {
  return snapshot.revenueGrowth >= 0 ? 'o mês acelera com consistência' : 'o mês pede correção de rota'
}

function editorialStockValue(snapshot: OverviewSnapshot) {
  return snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens exigem atenção` : 'estoque sob controle'
}

function editorialStockNote(snapshot: OverviewSnapshot) {
  return snapshot.lowStockItems > 0 ? 'estoque merece ação curta ainda hoje' : 'estoque não bloqueia a operação'
}

function editorialTrendNote(snapshot: OverviewSnapshot) {
  return snapshot.revenueGrowth >= 0 ? 'receita acompanha uma narrativa positiva' : 'vale revisar conversão e mix'
}

function nextActionValue(snapshot: OverviewSnapshot) {
  return snapshot.lowStockItems > 0 ? 'repor insumos de maior saída' : 'empurrar o campeão do dia'
}

function nextActionNote(snapshot: OverviewSnapshot) {
  return snapshot.lowStockItems > 0 ? 'reduz risco de perda de venda' : 'aproveita o item que já converte bem'
}
