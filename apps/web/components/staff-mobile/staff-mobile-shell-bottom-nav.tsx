'use client'

import { ChefHat, ClipboardList, Grid2x2, ShoppingCart } from 'lucide-react'
import type { StaffMobileShellViewModel } from './use-staff-mobile-shell-controller'

const navItems = [
  { id: 'mesas', label: 'Mesas', Icon: Grid2x2 },
  { id: 'cozinha', label: 'Cozinha', Icon: ChefHat },
  { id: 'pedidos', label: 'Pedidos', Icon: ClipboardList },
  { id: 'historico', label: 'Histórico', Icon: ShoppingCart },
] as const

function resolveBadge(id: (typeof navItems)[number]['id'], controller: StaffMobileShellViewModel) {
  if (id === 'cozinha') {
    return controller.kitchenBadge
  }
  if (id === 'pedidos') {
    return controller.activeComandas.length
  }
  return 0
}

function StaffMobileShellNavItem({
  badge,
  controller,
  Icon,
  id,
  label,
}: {
  badge: number
  controller: StaffMobileShellViewModel
  Icon: (typeof navItems)[number]['Icon']
  id: (typeof navItems)[number]['id']
  label: string
}) {
  const isActive = controller.activeTab === id || (id === 'pedidos' && controller.activeTab === 'pedido')

  return (
    <button
      className="relative flex h-full min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1 transition-all active:scale-95"
      data-testid={`nav-${id}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      type="button"
      onClick={() => {
        controller.setActiveTab(id)
        if (id !== 'pedidos') {
          controller.setFocusedComandaId(null)
        }
      }}
    >
      {isActive && <div className="pointer-events-none absolute inset-0 rounded-[1.2rem] bg-[rgba(0,140,255,0.15)]" />}
      <div className="relative z-10">
        <Icon
          className="size-[22px]"
          strokeWidth={isActive ? 2.5 : 2}
          style={{ color: isActive ? 'var(--accent, #008cff)' : 'var(--text-soft, #7a8896)' }}
        />
        {badge > 0 && (
          <span className="absolute -right-2.5 -top-2 flex size-[18px] items-center justify-center rounded-full bg-[var(--accent,#008cff)] text-[10px] font-bold text-[var(--on-accent)] ring-2 ring-[var(--bg)]">
            {badge}
          </span>
        )}
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

export function StaffMobileShellBottomNav({ controller }: { controller: StaffMobileShellViewModel }) {
  return (
    <nav
      className="relative z-50 shrink-0 bg-[var(--bg)] px-1 pb-1 pt-1 shadow-[0_-8px_24px_rgba(0,0,0,0.6)] sm:px-2 sm:pb-2 sm:pt-2"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom,0px))' }}
    >
      <div className="relative grid min-h-[4.25rem] grid-cols-4 gap-1 rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-muted)] p-1">
        {navItems.map(({ id, label, Icon }) => {
          const badge = resolveBadge(id, controller)
          return (
            <StaffMobileShellNavItem Icon={Icon} badge={badge} controller={controller} id={id} key={id} label={label} />
          )
        })}
      </div>
    </nav>
  )
}
