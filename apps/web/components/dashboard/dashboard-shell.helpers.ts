import { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import type { DashboardProductSectionId, DashboardSectionId } from '@/components/dashboard/dashboard-navigation'
import type { CurrencyCode } from '@contracts/contracts'

export const sectionLabels: Record<
  DashboardProductSectionId | 'settings',
  { title: string; description: string; meta: string }
> = {
  overview: {
    title: 'Overview',
    description: 'Visão geral da operação',
    meta: 'visão geral do negócio',
  },
  pdv: {
    title: 'PDV · Comandas',
    description: 'Comandas e atendimento em tempo real',
    meta: 'ponto de venda · cobrança · cozinha',
  },
  salao: {
    title: 'Salão',
    description: 'Mesas, capacidade e planta baixa',
    meta: 'mapa de mesas · ocupação · padrões',
  },
  financeiro: {
    title: 'Financeiro',
    description: 'Movimentação, fluxo de caixa e DRE',
    meta: 'receita · despesa · resultado',
  },
  pedidos: {
    title: 'Pedidos',
    description: 'Histórico, detalhe e fluxo por status',
    meta: 'histórico · detalhe · fluxo',
  },
  equipe: {
    title: 'Equipe',
    description: 'Funcionários, escala e folha de pagamento',
    meta: 'funcionários · escala · folha',
  },
  settings: {
    title: 'Configurações',
    description: 'Conta, segurança e preferências',
    meta: 'conta · segurança · sessão',
  },
}

export type ActiveNavigationSummary = {
  id: string
  label: string
  description: string
}

export type WireframeIntroFact = {
  label: string
  tone: 'accent' | 'success' | 'warning' | 'soft'
  value: string
}

type FinanceIntroData = {
  displayCurrency?: CurrencyCode
  totals?: {
    averageMarginPercent?: number
    completedOrders?: number
    currentMonthRevenue?: number
  }
} | null

type FinanceIntroTotals = NonNullable<NonNullable<FinanceIntroData>['totals']>

const settingsNavigationFallback: ActiveNavigationSummary = {
  id: 'settings',
  label: 'Conta e preferências',
  description: 'Conta, segurança e conformidade',
}

export function buildWireframeIntroFacts({
  activeDisplaySection,
  employeesCount,
  finance,
}: {
  activeDisplaySection: DashboardProductSectionId | 'settings'
  employeesCount: number
  finance: FinanceIntroData | undefined
}): WireframeIntroFact[] {
  const totals: FinanceIntroTotals | undefined = finance?.totals
  const displayCurrency = finance?.displayCurrency ?? 'BRL'

  if (activeDisplaySection === 'overview') {
    return buildOverviewIntroFacts(totals, displayCurrency)
  }

  if (activeDisplaySection === 'equipe') {
    return buildTeamIntroFacts(employeesCount)
  }

  return []
}

export function getSessionErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Conecte a API e autentique a sessão para ver o painel.'
}

export function resolveActiveNavigation(
  activeSection: DashboardSectionId,
  navigationGroups: Array<{ items: ActiveNavigationSummary[] }>,
) {
  const fallbackNavigation = activeSection === 'settings' ? settingsNavigationFallback : navigationGroups[0]?.items[0]
  return (
    navigationGroups.flatMap((group) => group.items).find((item) => item.id === activeSection) ?? fallbackNavigation
  )
}

function formatIntroPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Math.abs(value) < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

function buildOverviewIntroFacts(
  totals: FinanceIntroTotals | undefined,
  displayCurrency: CurrencyCode,
): WireframeIntroFact[] {
  const averageMarginPercent = totals?.averageMarginPercent ?? 0

  return [
    {
      label: 'receita do mês',
      tone: 'accent',
      value: formatCurrency(totals?.currentMonthRevenue ?? 0, displayCurrency),
    },
    {
      label: 'pedidos fechados',
      tone: 'soft',
      value: String(totals?.completedOrders ?? 0),
    },
    {
      label: 'margem média',
      tone: averageMarginPercent >= 30 ? 'success' : 'warning',
      value: formatIntroPercent(averageMarginPercent),
    },
  ]
}

function buildTeamIntroFacts(employeesCount: number): WireframeIntroFact[] {
  return [
    {
      label: 'time ativo',
      tone: 'soft',
      value: `${employeesCount} pessoas`,
    },
  ]
}
