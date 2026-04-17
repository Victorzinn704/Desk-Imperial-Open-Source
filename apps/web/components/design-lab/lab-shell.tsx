'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Bell,
  Search,
  LogOut,
  Building2,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  {
    group: 'Operação',
    items: [
      { id: 'overview', label: 'Overview', href: '/design-lab/overview', icon: LayoutDashboard },
      { id: 'pdv', label: 'PDV / Comandas', href: '/design-lab/pdv', icon: ShoppingCart },
      { id: 'salao', label: 'Salão', href: '/design-lab/salao', icon: UtensilsCrossed },
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
]

const COLLAPSED_KEY = 'lab_sidebar_collapsed'
const DARK_KEY = 'lab_dark'

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

export function LabShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(() => getStoredBoolean(COLLAPSED_KEY, false))
  const [dark, setDark] = useState(() => getStoredBoolean(DARK_KEY, true))
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  useEffect(() => {
    localStorage.setItem(DARK_KEY, String(dark))
  }, [dark])

  return (
    <div className={cn('lab-root flex h-screen overflow-hidden', dark ? 'lab-dark' : 'lab-light')} data-lab>
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
          <Link href="/design-lab/overview" className="lab-brand">
            <span className="lab-brand__icon">
              <Building2 className="size-4" />
            </span>
            {!collapsed && <span className="lab-brand__name">Desk Imperial</span>}
          </Link>
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
          {NAV.map((group) => (
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
          <Link href="/design-lab/overview" className={cn('lab-nav-item', 'mt-auto')}>
            <span className="lab-nav-item__icon">
              <Settings className="size-4" />
            </span>
            {!collapsed && <span className="lab-nav-item__label">Configurações</span>}
          </Link>

          <div className={cn('lab-user', collapsed && 'lab-user--compact')}>
            <span className="lab-user__avatar">VI</span>
            {!collapsed && (
              <div className="lab-user__info">
                <span className="lab-user__name">Victor Imperial</span>
                <span className="lab-user__role">Admin</span>
              </div>
            )}
            {!collapsed && (
              <button className="lab-icon-btn ml-auto" type="button" title="Sair">
                <LogOut className="size-3.5" />
              </button>
            )}
          </div>
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
            <div className="lab-search">
              <Search className="lab-search__icon" />
              <input className="lab-search__input" placeholder="Buscar..." readOnly type="text" />
              <kbd className="lab-search__kbd">⌘K</kbd>
            </div>
          </div>

          <div className="lab-topbar__right">
            <button
              className="lab-icon-btn"
              onClick={() => setDark((v) => !v)}
              type="button"
              title={dark ? 'Modo claro' : 'Modo escuro'}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button className="lab-icon-btn relative" type="button" title="Notificações">
              <Bell className="size-4" />
              <span className="lab-badge">3</span>
            </button>
            <div className="lab-topbar__avatar">VI</div>
          </div>
        </header>

        {/* Content */}
        <main className="lab-content">{children}</main>
      </div>
    </div>
  )
}
