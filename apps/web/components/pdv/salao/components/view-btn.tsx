import type { ReactNode } from 'react'

export interface ViewBtnProps {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}

export function ViewBtn({ active, onClick, icon, label }: ViewBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-all"
      style={{
        background: active ? 'rgba(52,242,127,0.1)' : 'transparent',
        color: active ? '#36f57c' : 'var(--text-soft)',
        border: active ? '1px solid rgba(52,242,127,0.25)' : '1px solid transparent',
      }}
    >
      {icon} {label}
    </button>
  )
}
