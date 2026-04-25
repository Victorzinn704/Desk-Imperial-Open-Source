'use client'

import { BarChart3, ClipboardList, Cog, Landmark, ShoppingCart, TrendingUp } from 'lucide-react'
import type { OwnerMobileTab, PendingAction } from './owner-mobile-shell-types'

const NAV_ITEMS = [
  { id: 'today', label: 'Hoje', Icon: BarChart3 },
  { id: 'comandas', label: 'Comandas', Icon: ClipboardList },
  { id: 'pdv', label: 'PDV', Icon: ShoppingCart },
  { id: 'caixa', label: 'Caixa', Icon: Landmark },
  { id: 'financeiro', label: 'Financeiro', Icon: TrendingUp },
  { id: 'conta', label: 'Conta', Icon: Cog },
] as const

function getBadgeCount(id: OwnerMobileTab, activeComandasCount: number, pendingAction: PendingAction | null) {
  if (id === 'comandas') {
    return activeComandasCount
  }
  if (id === 'pdv') {
    return pendingAction ? 1 : 0
  }
  return 0
}

type OwnerMobileShellBottomNavProps = Readonly<{
  activeComandasCount: number
  activeTab: OwnerMobileTab
  pendingAction: PendingAction | null
  onSelectTab: (tab: OwnerMobileTab) => void
}>

function OwnerMobileShellNavButton({
  activeComandasCount,
  activeTab,
  item,
  onSelectTab,
  pendingAction,
}: Readonly<{
  activeComandasCount: number
  activeTab: OwnerMobileTab
  item: (typeof NAV_ITEMS)[number]
  onSelectTab: (tab: OwnerMobileTab) => void
  pendingAction: PendingAction | null
}>) {
  const { id, label, Icon } = item
  const badge = getBadgeCount(id, activeComandasCount, pendingAction)
  const isActive = activeTab === id

  return (
    <button
      className="relative flex h-full min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1 transition-all active:scale-95"
      data-testid={`nav-${id}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      type="button"
      onClick={() => onSelectTab(id)}
    >
      {isActive ? (
        <div className="pointer-events-none absolute inset-0 rounded-[1.2rem] bg-[rgba(0,140,255,0.15)]" />
      ) : null}
      <div className="relative z-10">
        <Icon
          className="size-[22px]"
          strokeWidth={isActive ? 2.5 : 2}
          style={{ color: isActive ? 'var(--accent, #008cff)' : 'var(--text-soft, #7a8896)' }}
        />
        {badge > 0 ? (
          <span className="absolute -right-2.5 -top-2 flex size-[18px] items-center justify-center rounded-full bg-[var(--accent,#008cff)] text-[10px] font-bold text-white ring-2 ring-[var(--bg)]">
            {badge}
          </span>
        ) : null}
      </div>
      <span
        className="relative z-10 text-[10px] font-semibold leading-none tracking-wide"
        style={{ color: isActive ? 'var(--accent, #008cff)' : 'var(--text-soft, #7a8896)' }}
      >
        {label}
      </span>
    </button>
  )
}

export function OwnerMobileShellBottomNav({
  activeComandasCount,
  activeTab,
  onSelectTab,
  pendingAction,
}: OwnerMobileShellBottomNavProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-1 pb-1 pt-1 sm:px-2 sm:pb-2 sm:pt-2"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom,0px))' }}
    >
      <nav className="pointer-events-auto rounded-[1.8rem] bg-[var(--bg)] shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
        <div className="relative grid min-h-[4.25rem] grid-cols-6 gap-0.5 rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {NAV_ITEMS.map((item) => (
            <OwnerMobileShellNavButton
              activeComandasCount={activeComandasCount}
              activeTab={activeTab}
              item={item}
              key={item.id}
              pendingAction={pendingAction}
              onSelectTab={onSelectTab}
            />
          ))}
        </div>
      </nav>
    </div>
  )
}
