'use client'

import { X } from 'lucide-react'
import type { Comanda } from '../../pdv-types'
import { LabStatusPill } from '@/components/design-lab/lab-primitives'

export function ModalHeader({
  isEditing,
  comanda,
  onClose,
}: Readonly<{ isEditing: boolean; comanda?: Comanda | null; onClose: () => void }>) {
  const comandaIdLabel = comanda ? comanda.id.slice(-4).toUpperCase() : ''

  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] p-4 sm:p-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {isEditing ? `Comanda #${comandaIdLabel}` : 'Nova Comanda'}
          </h2>
          <LabStatusPill size="md" tone={isEditing ? 'warning' : 'success'}>
            {isEditing ? 'Modo edição' : 'Abrir comanda'}
          </LabStatusPill>
        </div>
        <p className="mt-1 text-sm text-[var(--text-soft)]">
          {isEditing
            ? 'Edite os itens dentro do PDV e acompanhe a tela lateral da comanda em tempo real.'
            : 'Adicione itens, confirme os dados e acompanhe a tela lateral antes de abrir a comanda.'}
        </p>
      </div>
      <button
        className="flex size-9 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        type="button"
        onClick={onClose}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
