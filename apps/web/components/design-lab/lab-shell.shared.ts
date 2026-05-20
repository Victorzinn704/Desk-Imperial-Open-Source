'use client'

import {
  BarChart3,
  Bot,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ScanBarcode,
  Settings,
  ShoppingCart,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'

export type Role = 'OWNER' | 'STAFF'

export type LabNavigationItem = Readonly<{
  id: string
  label: string
  href: string
  icon: LucideIcon
}>

export type LabNavigationGroup = Readonly<{
  group: string
  items: readonly LabNavigationItem[]
}>

export const COLLAPSED_KEY = 'lab_sidebar_collapsed'
export const FORCE_DESKTOP_PARAM = 'forceDesktop'

export const NAV_OWNER: readonly LabNavigationGroup[] = [
  {
    group: 'Operação',
    items: [
      { id: 'overview', label: 'Overview', href: '/design-lab/overview', icon: LayoutDashboard },
      { id: 'pdv', label: 'PDV / Comandas', href: '/design-lab/pdv', icon: ShoppingCart },
      { id: 'salao', label: 'Salão', href: '/design-lab/salao', icon: UtensilsCrossed },
      { id: 'pedidos', label: 'Pedidos', href: '/design-lab/pedidos', icon: ClipboardList },
      { id: 'caixa', label: 'Caixa', href: '/design-lab/caixa', icon: Landmark },
      { id: 'cozinha', label: 'Cozinha (KDS)', href: '/design-lab/cozinha', icon: ChefHat },
    ],
  },
  {
    group: 'Gestão',
    items: [
      { id: 'financeiro', label: 'Financeiro', href: '/design-lab/financeiro', icon: BarChart3 },
      { id: 'calendario', label: 'Calendário', href: '/design-lab/calendario', icon: CalendarDays },
      { id: 'cadastro-rapido', label: 'Cadastro rápido', href: '/design-lab/cadastro-rapido', icon: ScanBarcode },
      { id: 'portfolio', label: 'Portfólio', href: '/design-lab/portfolio', icon: Package },
    ],
  },
  {
    group: 'Equipe',
    items: [
      { id: 'equipe', label: 'Funcionários', href: '/design-lab/equipe', icon: Users },
      { id: 'payroll', label: 'Folha de Pagamento', href: '/design-lab/payroll', icon: Wallet },
    ],
  },
  {
    group: 'Inteligência',
    items: [{ id: 'ia', label: 'IA', href: '/design-lab/ia', icon: Bot }],
  },
]

export const NAV_STAFF: readonly LabNavigationGroup[] = [
  {
    group: 'Operação',
    items: [
      { id: 'salao', label: 'Salão', href: '/design-lab/salao', icon: UtensilsCrossed },
      { id: 'pdv', label: 'PDV / Comandas', href: '/design-lab/pdv', icon: ShoppingCart },
      { id: 'caixa', label: 'Caixa', href: '/design-lab/caixa', icon: Landmark },
      { id: 'cozinha', label: 'Cozinha (KDS)', href: '/design-lab/cozinha', icon: ChefHat },
    ],
  },
]

export function getStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const rawValue = window.localStorage.getItem(key)
  if (rawValue === null) {
    return fallback
  }

  return rawValue === 'true'
}

export function getInitials(name?: string | null) {
  if (!name) {
    return 'DI'
  }

  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)

  if (parts.length === 0) {
    return 'DI'
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function getForceDesktopShellFromLocation() {
  if (typeof window === 'undefined') {
    return false
  }

  return new URLSearchParams(window.location.search).get(FORCE_DESKTOP_PARAM) === '1'
}

export function resolveActiveNavigation(
  pathname: string,
  navigation: readonly LabNavigationGroup[],
  configHref: string,
): Readonly<{
  groupLabel: string
  item: LabNavigationItem | { id: 'config'; label: 'Config'; href: string; icon: typeof Settings } | null
}> {
  if (pathname === '/design-lab/config') {
    return {
      groupLabel: 'Sistema',
      item: {
        id: 'config',
        label: 'Config',
        href: configHref,
        icon: Settings,
      },
    }
  }

  for (const group of navigation) {
    const activeItem = group.items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    if (activeItem) {
      return {
        groupLabel: group.group,
        item: activeItem,
      }
    }
  }

  return {
    groupLabel: 'Desk Imperial',
    item: navigation[0]?.items[0] ?? null,
  }
}
