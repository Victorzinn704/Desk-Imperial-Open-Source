'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  BarChart3,
  CalendarDays,
  Package,
  Users,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ClipboardList,
  Landmark,
  ChefHat,
  Bot,
} from 'lucide-react'
import { fetchCurrentUser } from '@/lib/api'
import { useDashboardLogout, useDashboardMutations } from '@/components/dashboard/hooks'
import { buildDesignLabConfigHref } from '@/components/design-lab/design-lab-navigation'
import { BrandMark } from '@/components/shared/brand-mark'
import { cn } from '@/lib/utils'

type Role = 'OWNER' | 'STAFF'

const NAV_OWNER = [
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

const NAV_STAFF = [
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

const COLLAPSED_KEY = 'lab_sidebar_collapsed'

function getStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const rawValue = window.localStorage.getItem(key)
  if (rawValue === null) {
    return fallback
  }

  return rawValue === 'true'
}

function getInitials(name?: string | null) {
  if (!name) {
    return 'DI'
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) {
    return 'DI'
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function LabShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(() => getStoredBoolean(COLLAPSED_KEY, false))
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const { logoutMutation } = useDashboardMutations()
  const { logout, isPending: isLoggingOut } = useDashboardLogout(logoutMutation)

  const currentUser = sessionQuery.data?.user ?? null
  const role: Role = currentUser?.role === 'STAFF' ? 'STAFF' : 'OWNER'
  const navigation = role === 'STAFF' ? NAV_STAFF : NAV_OWNER
  const isDark = mounted ? resolvedTheme !== 'light' : true
  const configHref = buildDesignLabConfigHref('account')
  const isConfigRoute = pathname === '/design-lab/config'

  const activeNavigation = useMemo(() => {
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
  }, [configHref, navigation, pathname])

  const accountLabel = currentUser?.fullName?.trim() || 'Conta'
  const accountMeta = currentUser?.role === 'STAFF' ? 'Operação' : 'Administração'
  const accountInitials = getInitials(currentUser?.fullName)

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('design-lab-shell-open')
    document.body.classList.add('design-lab-shell-open')

    return () => {
      document.documentElement.classList.remove('design-lab-shell-open')
      document.body.classList.remove('design-lab-shell-open')
    }
  }, [])

  return (
    <div className={cn('lab-root flex h-dvh min-h-dvh overflow-hidden', isDark ? 'lab-dark' : 'lab-light')} data-lab>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 xl:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'lab-sidebar flex h-full flex-col transition-all duration-300',
          collapsed ? 'lab-sidebar--collapsed' : 'lab-sidebar--expanded',
          'fixed xl:relative',
          'z-50 xl:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="lab-sidebar__header">
          <BrandMark href="/design-lab/overview" presentation="lab" wordmark={collapsed ? 'hidden' : 'always'} />
          {!collapsed && (
            <button
              className="lab-icon-btn xl:flex hidden"
              onClick={() => setCollapsed(true)}
              type="button"
              title="Recolher"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          {collapsed && (
            <button
              className="lab-icon-btn hidden xl:flex"
              onClick={() => setCollapsed(false)}
              type="button"
              title="Expandir"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
          <button
            className="lab-icon-btn xl:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="lab-sidebar__nav">
          {navigation.map((group) => (
            <div key={group.group} className="lab-nav-group">
              {!collapsed && <p className="lab-nav-group__label">{group.group}</p>}
              {group.items.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn('lab-nav-item', active && 'lab-nav-item--active')}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="lab-nav-item__icon">
                      <Icon className="size-4" />
                    </span>
                    {!collapsed && <span className="lab-nav-item__label">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="lab-sidebar__footer">
          <Link
            aria-label="Abrir configurações"
            className={cn('lab-user', collapsed && 'lab-user--compact', isConfigRoute && 'lab-user--active')}
            href={configHref}
            title="Abrir configurações"
          >
            <span className="lab-user__avatar">{accountInitials}</span>
            {!collapsed && (
              <div className="lab-user__info">
                <span className="lab-user__name">{accountLabel}</span>
                <span className="lab-user__role">{accountMeta}</span>
                <span className="lab-user__config">
                  <Settings className="size-3.5" />
                  Configurações
                </span>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* Main area */}
      <div className="lab-main flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="lab-topbar">
          <div className="lab-topbar__left">
            <button
              className="lab-icon-btn xl:hidden"
              onClick={() => setMobileOpen(true)}
              type="button"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="lab-topbar__context">
              <span className="lab-topbar__eyebrow">{activeNavigation.groupLabel}</span>
              <span className="lab-topbar__title">{activeNavigation.item?.label ?? 'Desk Imperial'}</span>
            </div>
          </div>

          <div className="lab-topbar__right">
            <button
              className="lab-icon-btn"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              type="button"
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            {currentUser ? (
              <>
                <Link className={cn('lab-account-chip', isConfigRoute && 'lab-account-chip--active')} href={configHref}>
                  <span className="lab-account-chip__avatar">{accountInitials}</span>
                  <span className="lab-account-chip__text">
                    <span className="lab-account-chip__name">{accountLabel}</span>
                    <span className="lab-account-chip__meta">{accountMeta}</span>
                  </span>
                </Link>
                <button
                  aria-label="Encerrar sessão"
                  className="lab-icon-btn"
                  disabled={isLoggingOut}
                  onClick={logout}
                  title="Sair"
                  type="button"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            ) : (
              <Link className="lab-account-chip" href="/login">
                <span className="lab-account-chip__avatar">DI</span>
                <span className="lab-account-chip__text">
                  <span className="lab-account-chip__name">Entrar</span>
                  <span className="lab-account-chip__meta">Autenticar</span>
                </span>
              </Link>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="lab-content">{children}</main>
      </div>
    </div>
  )
}
