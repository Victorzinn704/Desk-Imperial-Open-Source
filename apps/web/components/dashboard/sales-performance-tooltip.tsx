'use client'

import { formatCurrency } from '@/lib/currency'

type SalesPerformanceTooltipProps = {
  active?: boolean
  displayCurrency: string
  label?: string
  payload?: Array<{ name?: string; value?: number; color?: string }>
  surface?: 'default' | 'lab'
  variant?: 'revenue-profit' | 'orders-ticket'
}

function resolveTooltipShell(surface: NonNullable<SalesPerformanceTooltipProps['surface']>) {
  return surface === 'lab'
    ? {
        wrapper:
          'min-w-[180px] rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface)] p-3.5 shadow-[var(--shadow-panel)]',
        title: 'mb-2.5 text-xs uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]',
        label: 'flex items-center gap-2 text-[var(--lab-fg-soft)]',
        value: 'font-semibold text-[var(--lab-fg)]',
      }
    : {
        wrapper:
          'min-w-[180px] rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-panel)]',
        title: 'mb-2.5 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]',
        label: 'flex items-center gap-2 text-[var(--text-soft)]',
        value: 'font-semibold text-[var(--text-primary)]',
      }
}

function formatTooltipValue(
  item: NonNullable<SalesPerformanceTooltipProps['payload']>[number],
  displayCurrency: string,
  variant: NonNullable<SalesPerformanceTooltipProps['variant']>,
) {
  if (variant === 'orders-ticket' && item.name === 'Pedidos') {
    return String(Math.round(item.value ?? 0))
  }

  return formatCurrency(item.value ?? 0, displayCurrency as 'BRL')
}

export function SalesPerformanceTooltip({
  active,
  displayCurrency,
  label,
  payload,
  surface = 'default',
  variant = 'revenue-profit',
}: SalesPerformanceTooltipProps) {
  if (!(active && payload?.length)) {
    return null
  }

  const shell = resolveTooltipShell(surface)

  return (
    <div className={shell.wrapper}>
      <p className={shell.title}>{label}</p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div className="flex items-center justify-between gap-4 text-sm" key={item.name}>
            <span className={shell.label}>
              <span className="size-2 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className={shell.value}>{formatTooltipValue(item, displayCurrency, variant)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
