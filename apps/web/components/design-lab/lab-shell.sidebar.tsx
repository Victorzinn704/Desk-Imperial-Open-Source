'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'
import { cn } from '@/lib/utils'
import { LabShellAccountChip } from './lab-shell.account-chip'
import type { LabNavigationGroup } from './lab-shell.shared'

type LabShellSidebarProps = Readonly<{
  accountInitials: string
  accountLabel: string
  accountMeta: string
  collapsed: boolean
  configHref: string
  isConfigRoute: boolean
  mobileOpen: boolean
  navigation: readonly LabNavigationGroup[]
  pathname: string
  setCollapsed: (value: boolean) => void
  setMobileOpen: (value: boolean) => void
}>

// eslint-disable-next-line max-lines-per-function
export function LabShellSidebar({
  accountInitials,
  accountLabel,
  accountMeta,
  collapsed,
  configHref,
  isConfigRoute,
  mobileOpen,
  navigation,
  pathname,
  setCollapsed,
  setMobileOpen,
}: LabShellSidebarProps) {
  return (
    <aside
      className={cn(
        'lab-sidebar flex h-full flex-col transition-all duration-300',
        collapsed ? 'lab-sidebar--collapsed' : 'lab-sidebar--expanded',
        'fixed xl:relative',
        'z-50 xl:z-auto',
        mobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0',
      )}
    >
      <div className="lab-sidebar__header">
        <BrandMark href="/design-lab/overview" presentation="lab" wordmark={collapsed ? 'hidden' : 'always'} />
        {!collapsed ? (
          <button
            className="lab-icon-btn hidden xl:flex"
            title="Recolher"
            type="button"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="size-4" />
          </button>
        ) : (
          <button
            className="lab-icon-btn hidden xl:flex"
            title="Expandir"
            type="button"
            onClick={() => setCollapsed(false)}
          >
            <ChevronRight className="size-4" />
          </button>
        )}
        <button
          aria-label="Fechar"
          className="lab-icon-btn xl:hidden"
          type="button"
          onClick={() => setMobileOpen(false)}
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="lab-sidebar__nav">
        {navigation.map((group) => (
          <LabShellNavGroup
            collapsed={collapsed}
            group={group}
            key={group.group}
            pathname={pathname}
            setMobileOpen={setMobileOpen}
          />
        ))}
      </nav>

      <div className="lab-sidebar__footer">
        <LabShellAccountChip
          compact
          accountInitials={accountInitials}
          accountLabel={accountLabel}
          accountMeta={accountMeta}
          configHref={configHref}
          isActive={isConfigRoute}
        />
      </div>
    </aside>
  )
}

function LabShellNavGroup({
  collapsed,
  group,
  pathname,
  setMobileOpen,
}: Readonly<{
  collapsed: boolean
  group: LabNavigationGroup
  pathname: string
  setMobileOpen: (value: boolean) => void
}>) {
  return (
    <div className="lab-nav-group">
      {!collapsed ? <p className="lab-nav-group__label">{group.group}</p> : null}
      {group.items.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            className={cn('lab-nav-item', active && 'lab-nav-item--active')}
            href={item.href}
            key={item.id}
            title={collapsed ? item.label : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <span className="lab-nav-item__icon">
              <Icon className="size-4" />
            </span>
            {!collapsed ? <span className="lab-nav-item__label">{item.label}</span> : null}
          </Link>
        )
      })}
    </div>
  )
}
