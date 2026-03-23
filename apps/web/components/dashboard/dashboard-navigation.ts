import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  CalendarRange,
  CirclePlus,
  LayoutDashboard,
  Map,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Tags,
} from 'lucide-react'

export type DashboardSectionId =
  | 'overview'
  | 'sales'
  | 'portfolio'
  | 'compliance'
  | 'pdv'
  | 'calendario'
  | 'map'

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

export const dashboardNavigationGroups: DashboardNavigationGroup[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'overview',
        label: 'Dashboard',
        description: 'Visão executiva consolidada',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'commercial',
    label: 'Operação comercial',
    items: [
      {
        id: 'sales',
        label: 'Operação',
        description: 'Pedidos, vendas e equipe',
        icon: ShoppingCart,
      },
      {
        id: 'pdv',
        label: 'PDV / Comandas',
        description: 'Atendimento e preparo',
        icon: Tags,
      },
      {
        id: 'calendario',
        label: 'Calendário',
        description: 'Agenda comercial e eventos',
        icon: CalendarRange,
      },
    ],
  },
  {
    id: 'portfolio',
    label: 'Portfólio e inteligência',
    items: [
      {
        id: 'portfolio',
        label: 'Portfólio',
        description: 'Produtos, margem e estoque',
        icon: Boxes,
      },
      {
        id: 'map',
        label: 'Mapa',
        description: 'Território e concentração de vendas',
        icon: Map,
      },
    ],
  },
  {
    id: 'governance',
    label: 'Governança',
    items: [
      {
        id: 'compliance',
        label: 'Conformidade',
        description: 'LGPD, consentimento e segurança',
        icon: ShieldCheck,
      },
    ],
  },
]

export const dashboardQuickActions: DashboardQuickAction[] = []
