import {
  Armchair,
  Cog,
  History,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'

export type DashboardProductSectionId = 'overview' | 'pdv' | 'salao' | 'financeiro' | 'pedidos' | 'equipe'
export type DashboardLegacySectionId = 'sales' | 'portfolio' | 'calendario' | 'map' | 'payroll'

export type DashboardSectionId = DashboardProductSectionId | DashboardLegacySectionId | 'settings'

export type DashboardTabId =
  | 'principal'
  | 'layout'
  | 'meta'
  | 'operacional'
  | 'editorial'
  | 'grid'
  | 'comandas'
  | 'kds'
  | 'cobranca'
  | 'mesas'
  | 'planta'
  | 'permanencia'
  | 'padroes'
  | 'movimentacao'
  | 'fluxo'
  | 'dre'
  | 'contas'
  | 'tabela'
  | 'timeline'
  | 'kanban'
  | 'detalhe'
  | 'cards'
  | 'escala'
  | 'folha'
  | 'perfil'

export type DashboardSettingsSectionId = 'account' | 'security' | 'preferences' | 'compliance' | 'session'

export type DashboardNavigationItem = {
  id: DashboardProductSectionId
  label: string
  description: string
  icon: LucideIcon
}

export type DashboardNavigationGroup = {
  id: string
  label: string
  items: DashboardNavigationItem[]
}

export type DashboardSectionTab = {
  id: DashboardTabId
  code: `B${1 | 2 | 3 | 4 | 5}`
  emoji?: string
  label: string
  description: string
}

export type DashboardQuickAction = {
  id: 'new-sale' | 'new-product' | 'new-event'
  label: string
  description: string
  icon: LucideIcon
  target: DashboardSectionId
  anchorId?: string
}

export const dashboardDefaultSection: DashboardProductSectionId = 'overview'
export const dashboardDefaultTab: DashboardTabId = 'principal'
export const dashboardDefaultSettingsSection: DashboardSettingsSectionId = 'account'

const DASHBOARD_PRODUCT_SECTIONS: DashboardProductSectionId[] = [
  'overview',
  'pdv',
  'salao',
  'financeiro',
  'pedidos',
  'equipe',
]

const DASHBOARD_LEGACY_SECTIONS: DashboardLegacySectionId[] = ['sales', 'portfolio', 'calendario', 'map', 'payroll']

const DASHBOARD_SECTIONS: DashboardSectionId[] = [
  ...DASHBOARD_PRODUCT_SECTIONS,
  ...DASHBOARD_LEGACY_SECTIONS,
  'settings',
]

const DASHBOARD_SETTINGS_SECTIONS: DashboardSettingsSectionId[] = [
  'account',
  'security',
  'preferences',
  'compliance',
  'session',
]

export const dashboardSectionTabs: Record<DashboardProductSectionId, DashboardSectionTab[]> = {
  overview: [
    {
      id: 'principal',
      code: 'B1',
      emoji: '🏛️',
      label: 'Principal Desk Imperial',
      description: 'Leitura autoral do produto · visão padrão do sistema',
    },
    {
      id: 'layout',
      code: 'B2',
      emoji: '📊',
      label: 'Layout padrão refinado',
      description: 'Clássico · 4 KPIs + gráfico + top produtos',
    },
    {
      id: 'meta',
      code: 'B3',
      emoji: '🎯',
      label: 'KPI hero com meta',
      description: 'Hierarquia · 1 número dominante + progresso',
    },
    {
      id: 'operacional',
      code: 'B4',
      emoji: '⚙️',
      label: 'Denso operacional',
      description: 'Tipo terminal · tudo na dobra',
    },
    {
      id: 'editorial',
      code: 'B5',
      emoji: '🗓️',
      label: 'Editorial diário',
      description: 'Tipografia grande · menos chrome',
    },
  ],
  pdv: [
    {
      id: 'grid',
      code: 'B1',
      emoji: '🍽️',
      label: 'Grid de produtos + comanda lateral',
      description: 'Clássico · garçom no balcão',
    },
    {
      id: 'comandas',
      code: 'B2',
      emoji: '🧾',
      label: 'Cards de comandas abertas',
      description: 'Para tablet · visão gerente de salão',
    },
    {
      id: 'kds',
      code: 'B3',
      emoji: '🔥',
      label: 'KDS para cozinha',
      description: 'Denso · tickets por tempo',
    },
    {
      id: 'cobranca',
      code: 'B4',
      emoji: '💳',
      label: 'Fluxo de cobrança focado',
      description: 'Teclado numérico · uma mesa por vez',
    },
  ],
  salao: [
    {
      id: 'mesas',
      code: 'B1',
      emoji: '🪑',
      label: 'Grid de mesas com status',
      description: 'Clássico · escaneável em 1s',
    },
    {
      id: 'planta',
      code: 'B2',
      emoji: '📍',
      label: 'Planta baixa',
      description: 'Mapa real · drag para reorganizar',
    },
    {
      id: 'permanencia',
      code: 'B3',
      emoji: '⏱️',
      label: 'Timeline de permanência',
      description: 'Giro de mesa · tempo em foco',
    },
    {
      id: 'padroes',
      code: 'B4',
      emoji: '⭐',
      label: 'Heatmap de padrões',
      description: 'Histórico · quando a casa enche',
    },
  ],
  financeiro: [
    {
      id: 'movimentacao',
      code: 'B1',
      emoji: '💰',
      label: 'Overview com movimentação',
      description: 'Clássico · 3 totalizadores + extrato',
    },
    {
      id: 'fluxo',
      code: 'B2',
      emoji: '🌊',
      label: 'Fluxo de caixa com waterfall',
      description: 'Saldo em foco · origem/destino',
    },
    {
      id: 'dre',
      code: 'B3',
      emoji: '📈',
      label: 'DRE',
      description: 'Estilo planilha · real × previsto',
    },
    {
      id: 'contas',
      code: 'B4',
      emoji: '🗂️',
      label: 'Contas a pagar e receber',
      description: 'Inbox · vencimentos',
    },
  ],
  pedidos: [
    {
      id: 'tabela',
      code: 'B1',
      emoji: '📋',
      label: 'Tabela com filtros',
      description: 'Clássico · auditoria',
    },
    {
      id: 'timeline',
      code: 'B2',
      emoji: '🕒',
      label: 'Linha do tempo vertical',
      description: 'Narrativo · ordem cronológica',
    },
    {
      id: 'kanban',
      code: 'B3',
      emoji: '🗃️',
      label: 'Kanban por status',
      description: 'Drag & drop · fluxo operacional',
    },
    {
      id: 'detalhe',
      code: 'B4',
      emoji: '🔎',
      label: 'Detalhe de um pedido',
      description: 'Deep dive · histórico do ticket',
    },
  ],
  equipe: [
    {
      id: 'cards',
      code: 'B1',
      emoji: '👥',
      label: 'Cards de equipe',
      description: 'Clássico · grid de pessoas',
    },
    {
      id: 'escala',
      code: 'B2',
      emoji: '📆',
      label: 'Escala semanal',
      description: 'Planejamento · arraste turnos',
    },
    {
      id: 'folha',
      code: 'B3',
      emoji: '💼',
      label: 'Folha de pagamento',
      description: 'Contábil · fechamento do mês',
    },
    {
      id: 'perfil',
      code: 'B4',
      emoji: '🙋',
      label: 'Perfil individual',
      description: 'Deep dive · performance pessoal',
    },
  ],
}

export const dashboardLegacySectionAliases: Record<
  DashboardLegacySectionId,
  { section: DashboardProductSectionId; tab: DashboardTabId }
> = {
  sales: { section: 'financeiro', tab: 'movimentacao' },
  portfolio: { section: 'pdv', tab: 'grid' },
  calendario: { section: 'overview', tab: 'editorial' },
  map: { section: 'financeiro', tab: 'fluxo' },
  payroll: { section: 'equipe', tab: 'folha' },
}

export const dashboardSettingsNav = [
  {
    id: 'account',
    label: 'Conta',
    description: 'Identidade da conta e dados principais',
    icon: UserRound,
  },
  {
    id: 'security',
    label: 'Segurança',
    description: 'PIN administrativo e proteção de acesso',
    icon: Lock,
  },
  {
    id: 'preferences',
    label: 'Preferências',
    description: 'Leituras do workspace e rotina da operação',
    icon: SlidersHorizontal,
  },
  {
    id: 'compliance',
    label: 'Conformidade',
    description: 'Consentimento, cookies e governança',
    icon: Cog,
  },
  {
    id: 'session',
    label: 'Sessão',
    description: 'Acessos recentes e controle da sessão ativa',
    icon: History,
  },
] as const satisfies ReadonlyArray<{
  id: DashboardSettingsSectionId
  label: string
  description: string
  icon: LucideIcon
}>

export const dashboardNavigationGroups: DashboardNavigationGroup[] = [
  {
    id: 'sections',
    label: 'Seções',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        description: 'Visão geral do negócio',
        icon: LayoutDashboard,
      },
      {
        id: 'pdv',
        label: 'PDV · Comandas',
        description: 'Ponto de venda, cobrança e cozinha',
        icon: Tags,
      },
      {
        id: 'salao',
        label: 'Salão',
        description: 'Mapa de mesas, ocupação e padrões',
        icon: Armchair,
      },
      {
        id: 'financeiro',
        label: 'Financeiro',
        description: 'Movimentação, fluxo, DRE e contas',
        icon: Wallet,
      },
      {
        id: 'pedidos',
        label: 'Pedidos',
        description: 'Histórico, status e detalhe',
        icon: ShoppingCart,
      },
      {
        id: 'equipe',
        label: 'Equipe',
        description: 'Funcionários, escala e folha',
        icon: Users,
      },
    ],
  },
]

export const dashboardQuickActions: DashboardQuickAction[] = []

export function buildDashboardHref(
  sectionId: DashboardSectionId,
  settingsSectionId: DashboardSettingsSectionId = dashboardDefaultSettingsSection,
  tabId?: DashboardTabId | null,
  basePath = '/dashboard',
) {
  const params = new URLSearchParams()

  if (sectionId === 'settings') {
    params.set('view', 'settings')
    params.set('panel', settingsSectionId)
    return `${basePath}?${params.toString()}`
  }

  const resolvedTab = tabId ?? getDashboardDisplayTab(sectionId)
  params.set('view', sectionId)
  if (resolvedTab) {
    params.set('tab', resolvedTab)
  }

  return `${basePath}?${params.toString()}`
}

export function getDashboardDisplaySection(sectionId: DashboardSectionId): DashboardProductSectionId | 'settings' {
  if (sectionId === 'settings') {
    return 'settings'
  }

  if (isDashboardLegacySection(sectionId)) {
    return dashboardLegacySectionAliases[sectionId].section
  }

  return sectionId
}

export function getDashboardDefaultTab(sectionId: DashboardSectionId | DashboardProductSectionId) {
  const displaySection = getDashboardDisplaySection(sectionId as DashboardSectionId)
  if (displaySection === 'settings') {
    return null
  }

  return dashboardSectionTabs[displaySection][0].id
}

export function getDashboardDisplayTab(sectionId: DashboardSectionId, tabId?: DashboardTabId | null) {
  const displaySection = getDashboardDisplaySection(sectionId)
  if (displaySection === 'settings') {
    return null
  }

  if (isDashboardLegacySection(sectionId)) {
    return dashboardLegacySectionAliases[sectionId].tab
  }

  const tabs = dashboardSectionTabs[displaySection]
  return tabs.some((tab) => tab.id === tabId) ? tabId! : tabs[0].id
}

export function getDashboardSectionTabs(sectionId: DashboardSectionId) {
  const displaySection = getDashboardDisplaySection(sectionId)
  return displaySection === 'settings' ? [] : dashboardSectionTabs[displaySection]
}

export function parseDashboardSectionParam(value: string | string[] | null | undefined) {
  const normalized = normalizeParam(value)
  if (!normalized) {
    return null
  }

  const canonicalAliases: Record<string, DashboardSectionId> = {
    finance: 'financeiro',
    financial: 'financeiro',
    orders: 'pedidos',
    order: 'pedidos',
    team: 'equipe',
    staff: 'equipe',
  }

  const section = canonicalAliases[normalized] ?? normalized
  return DASHBOARD_SECTIONS.includes(section as DashboardSectionId) ? (section as DashboardSectionId) : null
}

export function parseDashboardTabParam(sectionId: DashboardSectionId, value: string | string[] | null | undefined) {
  const normalized = normalizeParam(value)
  if (!normalized) {
    return null
  }

  const displaySection = getDashboardDisplaySection(sectionId)
  if (displaySection === 'settings') {
    return null
  }

  return dashboardSectionTabs[displaySection].some((tab) => tab.id === normalized)
    ? (normalized as DashboardTabId)
    : null
}

export function parseDashboardSettingsSectionParam(value: string | string[] | null | undefined) {
  const normalized = normalizeParam(value)
  if (!normalized) {
    return null
  }

  return DASHBOARD_SETTINGS_SECTIONS.includes(normalized as DashboardSettingsSectionId)
    ? (normalized as DashboardSettingsSectionId)
    : null
}

function isDashboardLegacySection(sectionId: DashboardSectionId): sectionId is DashboardLegacySectionId {
  return DASHBOARD_LEGACY_SECTIONS.includes(sectionId as DashboardLegacySectionId)
}

function normalizeParam(value: string | string[] | null | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value
  return normalized?.trim().toLowerCase() ?? null
}
