import {
  BarChart3,
  ChefHat,
  ClipboardList,
  Crown,
  type LucideIcon,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'

export type Performer = { nome: string; valor: number; comandas: number }
export type PerformerSnapshot = Performer & { abertasAgora: number }
export type TopProduct = { nome: string; qtd: number; valor: number }

export type OwnerTodayViewProps = Readonly<{
  activeComandas: number
  errorMessage: string | null
  garconRanking: Performer[]
  garconSnapshots: PerformerSnapshot[]
  isLoading: boolean
  isOffline: boolean
  kitchenBadge: number
  mesasLivres: number
  mesasOcupadas: number
  onOpenComandas: () => void
  onOpenFullDashboard: () => void
  onOpenKitchen: () => void
  onOpenPdv: () => void
  onOpenQuickRegister: () => void
  ticketMedio: number
  todayOrderCount: number
  todayRevenue: number
  topProdutos: TopProduct[]
}>

export type TurnPriority = {
  background: string
  border: string
  color: string
  headline: string
  label: string
}

type TodayKpiCard = {
  color: string
  icon: LucideIcon
  key: string
  label: string
  sub: string
  value: string
}

type TodayAction = {
  accent: string
  icon: LucideIcon
  label: string
  onClick: () => void
  sub: string
}

type TodayChip = string

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

export function buildTurnPriority({
  activeComandas,
  kitchenBadge,
  mesasLivres,
  mesasOcupadas,
  todayOrderCount,
}: {
  activeComandas: number
  kitchenBadge: number
  mesasLivres: number
  mesasOcupadas: number
  todayOrderCount: number
}): TurnPriority {
  if (kitchenBadge > 0) {
    return buildKitchenPriority(kitchenBadge)
  }
  if (activeComandas > 0) {
    return buildOpenComandasPriority(activeComandas)
  }
  if (mesasOcupadas > 0) {
    return buildSalaoPriority(mesasLivres, mesasOcupadas)
  }
  return buildStablePriority(todayOrderCount)
}

function buildKitchenPriority(kitchenBadge: number): TurnPriority {
  return {
    label: 'atenção',
    headline:
      kitchenBadge === 1
        ? 'Existe 1 item pressionando a cozinha agora. Vale abrir o fluxo de preparo antes de seguir no salão.'
        : `Existem ${kitchenBadge} itens pressionando a cozinha agora. Vale abrir o fluxo de preparo antes de seguir no salão.`,
    color: '#fbbf24',
    border: 'rgba(251,191,36,0.22)',
    background: 'rgba(251,191,36,0.1)',
  }
}

function buildOpenComandasPriority(activeComandas: number): TurnPriority {
  return {
    label: 'ao vivo',
    headline:
      activeComandas === 1
        ? 'Há 1 comanda aberta no turno. PDV e comandas seguem como o foco operacional desta leitura.'
        : `Há ${activeComandas} comandas abertas no turno. PDV e comandas seguem como o foco operacional desta leitura.`,
    color: '#60a5fa',
    border: 'rgba(96,165,250,0.22)',
    background: 'rgba(96,165,250,0.1)',
  }
}

function buildSalaoPriority(mesasLivres: number, mesasOcupadas: number): TurnPriority {
  return {
    label: 'salão',
    headline:
      mesasLivres > 0
        ? `Salão sem fila crítica: ${mesasOcupadas} ocupadas e ${mesasLivres} livres para giro do próximo atendimento.`
        : `Salão cheio agora: ${mesasOcupadas} mesas ocupadas e nenhuma livre para giro imediato.`,
    color: '#a78bfa',
    border: 'rgba(167,139,250,0.22)',
    background: 'rgba(167,139,250,0.1)',
  }
}

function buildStablePriority(todayOrderCount: number): TurnPriority {
  return {
    label: 'estável',
    headline:
      todayOrderCount > 0
        ? `Turno estável até aqui, com ${todayOrderCount} pedidos já convertidos. A leitura agora pode migrar para conferência e próximos passos.`
        : 'Turno ainda sem pressão operacional. Use o app para abrir caixa, iniciar venda ou preparar o catálogo do dia.',
    color: '#36f57c',
    border: 'rgba(54,245,124,0.22)',
    background: 'rgba(54,245,124,0.1)',
  }
}

export function buildOwnerTodayChips({
  activeComandas,
  kitchenBadge,
  todayOrderCount,
}: Pick<OwnerTodayViewProps, 'activeComandas' | 'kitchenBadge' | 'todayOrderCount'>): TodayChip[] {
  return [
    `${todayOrderCount} pedidos no turno`,
    `${activeComandas} comandas abertas`,
    kitchenBadge > 0 ? `${kitchenBadge} na cozinha` : 'cozinha sem fila crítica',
  ]
}

export function buildOwnerTodayKpis({
  activeComandas,
  ticketMedio,
  todayOrderCount,
  todayRevenue,
}: Pick<OwnerTodayViewProps, 'activeComandas' | 'ticketMedio' | 'todayOrderCount' | 'todayRevenue'>): TodayKpiCard[] {
  return [
    {
      key: 'receita',
      label: 'Receita',
      value: formatCurrency(todayRevenue),
      sub: 'faturado no turno',
      color: '#36f57c',
      icon: TrendingUp,
    },
    {
      key: 'ticket-medio',
      label: 'Ticket médio',
      value: formatCurrency(ticketMedio),
      sub: 'média por atendimento',
      color: '#fb923c',
      icon: BarChart3,
    },
    {
      key: 'pedidos',
      label: 'Pedidos',
      value: String(todayOrderCount),
      sub: 'encerrados até agora',
      color: '#60a5fa',
      icon: ClipboardList,
    },
    {
      key: 'comandas',
      label: 'Comandas',
      value: String(activeComandas),
      sub: 'em aberto agora',
      color: '#a78bfa',
      icon: ShoppingCart,
    },
  ]
}

export function buildOwnerTodayActions({
  onOpenComandas,
  onOpenKitchen,
  onOpenPdv,
  onOpenQuickRegister,
}: Pick<OwnerTodayViewProps, 'onOpenComandas' | 'onOpenKitchen' | 'onOpenPdv' | 'onOpenQuickRegister'>): TodayAction[] {
  return [
    {
      label: 'Abrir PDV',
      sub: 'mesas, pedido e fluxo de venda',
      onClick: onOpenPdv,
      icon: ShoppingCart,
      accent: '#008cff',
    },
    {
      label: 'Comandas',
      sub: 'acompanhar ao vivo e fechar atendimentos',
      onClick: onOpenComandas,
      icon: ClipboardList,
      accent: '#a78bfa',
    },
    {
      label: 'Ver cozinha',
      sub: 'fila e pressão do preparo',
      onClick: onOpenKitchen,
      icon: ChefHat,
      accent: '#eab308',
    },
    {
      label: 'Cadastro rápido',
      sub: 'scan de EAN e inclusão no catálogo',
      onClick: onOpenQuickRegister,
      icon: Package,
      accent: '#36f57c',
    },
  ]
}

export function buildOwnerTodayLiveStats({
  kitchenBadge,
  mesasLivres,
  mesasOcupadas,
}: Pick<OwnerTodayViewProps, 'kitchenBadge' | 'mesasLivres' | 'mesasOcupadas'>) {
  return [
    { label: 'Livres', value: mesasLivres, tone: '#34d399' },
    { label: 'Ocupadas', value: mesasOcupadas, tone: '#f87171' },
    { label: 'Cozinha', value: kitchenBadge, tone: '#eab308' },
  ]
}

export function buildSelectedPerformerStats(snapshot: PerformerSnapshot) {
  return [
    { label: 'Receita', value: formatCurrency(snapshot.valor), tone: '#36f57c' },
    { label: 'Comandas', value: String(snapshot.comandas), tone: '#60a5fa' },
    { label: 'Abertas agora', value: String(snapshot.abertasAgora), tone: '#fb923c' },
    {
      label: 'Ticket',
      value: snapshot.comandas > 0 ? formatCurrency(snapshot.valor / snapshot.comandas) : '—',
      tone: '#c4b5fd',
    },
  ]
}

export function buildTopProductsBars(topProdutos: TopProduct[]) {
  const maxValor = topProdutos[0]?.valor ?? 1
  return topProdutos.map((produto, index) => ({
    ...produto,
    pct: maxValor > 0 ? Math.max(8, Math.round((produto.valor / maxValor) * 100)) : 8,
    tone: index === 0 ? '#36f57c' : 'rgba(96,165,250,0.6)',
  }))
}

export function getTodayRadarTitle(garconRanking: Performer[]) {
  return garconRanking.length === 0 ? 'Nenhum garçom com vendas hoje.' : null
}

export function getTodayTopProductsEmpty(topProdutos: TopProduct[]) {
  return topProdutos.length === 0 ? 'Nenhum produto vendido hoje ainda.' : null
}

export function getTodayLiveCaption(mesasOcupadas: number) {
  return mesasOcupadas > 0 ? `${mesasOcupadas} mesas em uso` : 'salão sem pressão'
}

export function getPerformerLeadLabel(index: number) {
  return index === 0 ? Crown : null
}

export function getRadarIcon() {
  return Users
}
