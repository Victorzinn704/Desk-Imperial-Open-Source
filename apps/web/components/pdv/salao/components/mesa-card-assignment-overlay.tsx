'use client'

import { AlertCircle } from 'lucide-react'
import type { Garcom } from '../../pdv-types'

interface MesaCardAssignmentOverlayProps {
  garcom?: Garcom
  onCancel: () => void
  onConfirm: () => void
}

export function MesaCardAssignmentOverlay({ garcom, onCancel, onConfirm }: MesaCardAssignmentOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-[16px] bg-[rgba(14,16,24,0.92)] px-3 backdrop-blur-sm">
      <AlertCircle className="size-4 text-[#fbbf24]" />
      <p className="text-center text-[11px] font-semibold leading-snug text-[var(--text-primary)]">
        Mesa já tem garçom.
        <br />
        <span className="text-[10px] text-[var(--text-soft)]">
          Substituir por <span style={{ color: garcom?.cor ?? '#36f57c' }}>{garcom?.nome ?? '?'}</span>?
        </span>
      </p>
      <div className="flex gap-2">
        <button
          className="rounded-[8px] border border-[rgba(255,255,255,0.1)] px-3 py-1 text-[11px] text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:text-[var(--text-primary)]"
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="rounded-[8px] px-3 py-1 text-[11px] font-bold text-black transition-opacity hover:opacity-90"
          style={{ background: garcom?.cor ?? '#36f57c' }}
          type="button"
          onClick={onConfirm}
        >
          Substituir
        </button>
      </div>
    </div>
  )
}
