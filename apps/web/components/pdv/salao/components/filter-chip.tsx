import type { ReactNode } from 'react'

export interface FilterChipProps {
  label: string
  count: number
  active: boolean
  color: string
  icon?: ReactNode
  onClick: () => void
}

export function FilterChip({ label, count, active, color, icon, onClick }: FilterChipProps) {
  return (
    <button
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150"
      style={{
        background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? `${color}50` : 'rgba(255,255,255,0.08)'}`,
        color: active ? color : 'var(--text-soft)',
        transform: active ? 'scale(1.04)' : 'scale(1)',
      }}
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
      <span
        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
        style={{
          background: active ? `${color}25` : 'rgba(255,255,255,0.06)',
          color: active ? color : 'var(--text-muted)',
        }}
      >
        {count}
      </span>
    </button>
  )
}
