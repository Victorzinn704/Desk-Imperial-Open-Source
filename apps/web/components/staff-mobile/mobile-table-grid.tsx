'use client'

import type { Mesa, MesaStatus } from '@/components/pdv/pdv-types'
import { Plus } from 'lucide-react'

interface MobileTableGridProps {
  mesas: Mesa[]
  onSelectMesa: (mesa: Mesa) => void
}

const STATUS_COLOR: Record<MesaStatus, string> = {
  livre: '#22c55e',
  ocupada: '#fb923c',
  reservada: '#60a5fa',
}

const STATUS_LABEL: Record<MesaStatus, string> = {
  livre: 'Livre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
}

function StatusDot({ status }: { status: MesaStatus }) {
  return (
    <span
      className="inline-block size-2.5 rounded-full"
      style={{ backgroundColor: STATUS_COLOR[status] }}
    />
  )
}

export function MobileTableGrid({ mesas, onSelectMesa }: MobileTableGridProps) {
  if (mesas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-sm font-medium text-white">Nenhuma mesa cadastrada</p>
        <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">
          O dono pode adicionar mesas pelo painel web
        </p>
      </div>
    )
  }

  const livres = mesas.filter((m) => m.status === 'livre')
  const ocupadas = mesas.filter((m) => m.status !== 'livre')

  return (
    <div className="p-4 pb-6">
      {/* Mesas livres — principal ação do funcionário */}
      {livres.length > 0 && (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
            Disponíveis — {livres.length}
          </p>
          <div className="mb-5 grid grid-cols-3 gap-3">
            {livres.map((mesa) => (
              <button
                key={mesa.id}
                type="button"
                onClick={() => onSelectMesa(mesa)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] p-3 text-center transition-all active:scale-95 active:border-[rgba(34,197,94,0.45)] active:bg-[rgba(34,197,94,0.12)]"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-2xl font-bold text-[var(--accent,#9b8460)]">
                  {mesa.numero}
                </span>
                <StatusDot status="livre" />
                <span className="text-[10px] font-medium text-[#22c55e]">Novo pedido</span>
                <span className="text-[10px] text-[var(--text-soft,#7a8896)]">
                  {mesa.capacidade} lugares
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Mesas ocupadas/reservadas — adicionar itens */}
      {ocupadas.length > 0 && (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
            Em uso — {ocupadas.length}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {ocupadas.map((mesa) => {
              const isOcupada = mesa.status === 'ocupada'
              const color = STATUS_COLOR[mesa.status]
              return (
                <button
                  key={mesa.id}
                  type="button"
                  onClick={() => onSelectMesa(mesa)}
                  className="flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-all active:scale-95"
                  style={{
                    borderColor: `${color}33`,
                    backgroundColor: `${color}08`,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span className="text-2xl font-bold" style={{ color }}>
                    {mesa.numero}
                  </span>
                  <StatusDot status={mesa.status} />
                  <span className="text-[10px] font-medium" style={{ color }}>
                    {STATUS_LABEL[mesa.status]}
                  </span>
                  {isOcupada && mesa.comandaId ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--accent,#9b8460)]">
                      <Plus className="size-2.5" />
                      adicionar
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-soft,#7a8896)]">
                      {mesa.capacidade} lugares
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
