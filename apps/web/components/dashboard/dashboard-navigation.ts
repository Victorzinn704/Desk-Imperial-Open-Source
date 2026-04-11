import {
  Armchair,
  Boxes,
  CalendarRange,
  Cog,
  History,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  UserRound,
  Wallet,
} from 'lucide-react'

export type DashboardSectionId =
  | 'overview'
  | 'sales'
  | 'portfolio'
  | 'pdv'
  | 'calendario'
  | 'map'
  | 'payroll'
  | 'salao'
  | 'settings'

export type DashboardSettingsSectionId = 'account' | 'security' | 'preferences' | 'compliance' | 'session'

export type DashboardNavigationItem = {
  id: DashboardSectionId
  label: string
  description: string
  icon: LucideIcon
}

export type DashboardNavigationGroup = {
  id: string
  label: string
  items: DashboardNavigationItem[]
}

export type DashboardQuickAction = {
  id: 'new-sale' | 'new-product' | 'new-event'
  label: string
  description: string
  icon: LucideIcon
  target: DashboardSectionId
  anchorId?: string
}

export const dashboardDefaultSection: DashboardSectionId = 'overview'
export const dashboardDefaultSettingsSection: DashboardSettingsSectionId = 'account'

const DASHBOARD_SECTIONS: DashboardSectionId[] = [
  'overview',
  'sales',
  'portfolio',
  'pdv',
  'calendario',
  'payroll',
  'salao',
  'settings',
]

const DASHBOARD_SETTINGS_SECTIONS: DashboardSettingsSectionId[] = [
  'account',
  'security',
  'preferences',
  'compliance',
  'session',
]

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
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'overview',
        label: 'Dashboard',
        description: 'Leitura executiva',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'commercial',
    label: 'Operação',
    items: [
      {
        id: 'sales',
        label: 'Operação',
        description: 'Pedidos, caixa e equipe',
        icon: ShoppingCart,
      },
      {
        id: 'pdv',
        label: 'PDV / Comandas',
        description: 'Kanban de comandas e preparo',
        icon: Tags,
      },
      {
        id: 'salao',
        label: 'Salão',
        description: 'Mesas, capacidade e planta baixa',
        icon: Armchair,
      },
      {
        id: 'calendario',
        label: 'Calendário',
        description: 'Agenda comercial',
        icon: CalendarRange,
      },
      {
        id: 'payroll',
        label: 'Folha de Pagamento',
        description: 'Salários e comissões',
        icon: Wallet,
      },
    ],
  },
  {
    id: 'portfolio',
    label: 'Portfólio',
    items: [
      {
        id: 'portfolio',
        label: 'Portfólio',
        description: 'Produtos, estoque e margem',
        icon: Boxes,
      },
    ],
  },
]

export const dashboardQuickActions: DashboardQuickAction[] = []

export function parseDashboardSectionParam(value: string | string[] | null | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value
  if (!normalized) {
    return null
  }

  return DASHBOARD_SECTIONS.includes(normalized as DashboardSectionId) ? (normalized as DashboardSectionId) : null
}

export function parseDashboardSettingsSectionParam(value: string | string[] | null | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value
  if (!normalized) {
    return null
  }

  return DASHBOARD_SETTINGS_SECTIONS.includes(normalized as DashboardSettingsSectionId)
    ? (normalized as DashboardSettingsSectionId)
    : null
}
