'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { MesaStatus } from './pdv-types'

type PdvMesaModalProps = {
  onClose: () => void
  onSave: (data: { numero: string; capacidade: number; status: MesaStatus }) => void
}

const STATUS_OPTIONS: { value: MesaStatus; label: string; color: string }[] = [
  { value: 'livre', label: 'Livre', color: '#36f57c' },
  { value: 'reservada', label: 'Reservada', color: '#60a5fa' },
]

export function PdvMesaModal({ onClose, onSave }: Readonly<PdvMesaModalProps>) {
  const [numero, setNumero] = useState('')
  const [capacidade, setCapacidade] = useState(4)
  const [status, setStatus] = useState<MesaStatus>('livre')

  function handleSave() {
    if (!numero.trim()) return
    onSave({ numero: numero.trim(), capacidade, status })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        aria-label="Fechar criação de mesa"
        className="absolute inset-0 border-0 bg-black/70 p-0 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111318] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
        <button
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-[var(--text-soft)] transition hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)]"
          type="button"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Nova Mesa</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Criar mesa</h2>

        <div className="mt-6 space-y-4">
          {/* Número / label da mesa */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">Número / Identificação</label>
            <input
              autoFocus
              className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              maxLength={20}
              placeholder="Ex: 1, VIP, Balcão..."
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>

          {/* Capacidade */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">Capacidade (pessoas)</label>
            <div className="flex items-center gap-3">
              <button
                className="flex size-9 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] transition hover:bg-[rgba(255,255,255,0.08)]"
                type="button"
                onClick={() => setCapacidade((v) => Math.max(1, v - 1))}
              >
                −
              </button>
              <span className="w-8 text-center text-lg font-bold text-[var(--text-primary)]">{capacidade}</span>
              <button
                className="flex size-9 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] transition hover:bg-[rgba(255,255,255,0.08)]"
                type="button"
                onClick={() => setCapacidade((v) => Math.min(30, v + 1))}
              >
                +
              </button>
            </div>
          </div>

          {/* Status inicial */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-soft)]">Status inicial</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="flex-1 rounded-[10px] border py-2 text-xs font-semibold transition-all"
                  style={{
                    borderColor: status === opt.value ? opt.color : 'rgba(255,255,255,0.08)',
                    background: status === opt.value ? `${opt.color}18` : 'rgba(255,255,255,0.03)',
                    color: status === opt.value ? opt.color : 'var(--text-soft)',
                  }}
                  onClick={() => setStatus(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            className="flex-1 rounded-[12px] border border-[rgba(255,255,255,0.08)] py-2.5 text-sm text-[var(--text-soft)] transition hover:border-[rgba(255,255,255,0.16)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-1 rounded-[12px] bg-[rgba(52,242,127,0.12)] py-2.5 text-sm font-semibold text-[#36f57c] transition hover:bg-[rgba(52,242,127,0.2)] disabled:opacity-40"
            type="button"
            disabled={!numero.trim()}
            onClick={handleSave}
          >
            Criar mesa
          </button>
        </div>
      </div>
    </div>
  )
}
