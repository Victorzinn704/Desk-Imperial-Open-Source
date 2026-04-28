'use client'

import { AlertCircle, Users } from 'lucide-react'
import type { Mesa } from '../../pdv-types'

interface MesaCardHeaderProps {
  mesa: Mesa
  color: string
  label: string
  urgency: number
}

export function MesaCardHeader({ mesa, color, label, urgency }: MesaCardHeaderProps) {
  return (
    <>
      {urgency === 3 && (
        <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-[#f87171]">
          <AlertCircle className="size-2.5 text-[var(--text-primary)]" />
        </span>
      )}
      {urgency === 2 && (
        <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-[#fbbf24]">
          <AlertCircle className="size-2.5 text-black" />
        </span>
      )}

      <div className="pointer-events-none relative z-10">
        <div className="flex items-center justify-between px-3 pb-1 pt-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: `${color}80` }}>
              Mesa
            </p>
            <p className="text-2xl font-bold leading-none text-[var(--text-primary)]">{mesa.numero}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
            >
              {label}
            </span>
            <div className="flex items-center gap-0.5 text-[var(--text-muted)]">
              <Users className="size-2.5" />
              <span className="text-[9px]">{mesa.capacidade}</span>
            </div>
          </div>
        </div>

        <div className="mx-3 border-t border-[rgba(255,255,255,0.05)]" />
      </div>
    </>
  )
}
