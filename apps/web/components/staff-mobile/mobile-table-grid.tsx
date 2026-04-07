'use client'

import { memo, useMemo } from 'react'
import { STATUS_COLORS } from '@/lib/design-tokens'
import type { Mesa, MesaStatus } from '@/components/pdv/pdv-types'
import { Plus } from 'lucide-react'

interface MobileTableGridProps {
  mesas: Mesa[]
  onSelectMesa: (mesa: Mesa) => void
  isLoading?: boolean
}

const STATUS_COLOR: Record<MesaStatus, string> = {
  livre: STATUS_COLORS.livre.solid,
  ocupada: STATUS_COLORS.ocupada.solid,
  reservada: STATUS_COLORS.reservada.solid,
}

const STATUS_LABEL: Record<MesaStatus, string> = {
  livre: 'Livre',
  ocupada: 'Em Atendimento',
  reservada: 'Reservada',
}

export const MobileTableGrid = memo(function MobileTableGrid({
  mesas,
  onSelectMesa,
  isLoading = false,
}: MobileTableGridProps) {
  const { livres, ocupadas } = useMemo(
    () => ({
      livres: mesas.filter((m) => m.status === 'livre'),
      ocupadas: mesas.filter((m) => m.status !== 'livre'),
    }),
    [mesas],
  )

  if (isLoading && mesas.length === 0) {
    return (
      <div className="p-4 pb-6">
        <div className="mb-3 ml-1 h-3 w-32 animate-pulse rounded bg-[rgba(255,255,255,0.08)]" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="min-h-[96px] rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (mesas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">Nenhuma mesa cadastrada</p>
        <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">O dono pode adicionar mesas pelo painel web</p>
      </div>
    )
  }

  return (
    <div className="p-4 pb-6">
      {/* Mesas livres — principal ação do funcionário */}
      {livres.length > 0 && (
        <>
          <p className="mb-3 ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-soft,#7a8896)]">
            Disponíveis — {livres.length}
          </p>
          <div className="mb-7 grid grid-cols-3 gap-3">
            {livres.map((mesa) => (
              <button
                key={mesa.id}
                type="button"
                onClick={() => onSelectMesa(mesa)}
                className="group relative flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-[18px] border transition-all active:scale-95 overflow-hidden"
                style={{
                  borderColor: 'rgba(54,245,124,0.3)',
                  backgroundColor: 'rgba(54,245,124,0.06)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div className="absolute -inset-2 rounded-full bg-[rgba(54,245,124,0.15)] opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                <span className="relative z-10 text-[26px] font-extrabold text-[var(--success)] tracking-tighter">
                  {mesa.numero}
                </span>
                <div className="relative z-10 flex flex-col items-center justify-center gap-0.5 mt-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--success)] opacity-90">
                    Livre
                  </span>
                  <span className="text-[10px] font-medium text-[var(--accent,#9b8460)]">Novo PdV</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Mesas ocupadas/reservadas — adicionar itens */}
      {ocupadas.length > 0 && (
        <>
          <p className="mb-3 ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-soft,#7a8896)]">
            Em uso — {ocupadas.length}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {ocupadas.map((mesa) => {
              const isOcupada = mesa.status === 'ocupada'
              const color = STATUS_COLOR[mesa.status]
              const waiterName = mesa.garcomNome
              // Deterministic color from waiter name
              const waiterColor = waiterName
                ? `hsl(${[...waiterName].reduce((a, b) => a + b.charCodeAt(0), 0) % 360}, 70%, 60%)`
                : undefined
              return (
                <button
                  key={mesa.id}
                  type="button"
                  onClick={() => onSelectMesa(mesa)}
                  className="relative flex min-h-[110px] flex-col items-center justify-center gap-1 rounded-[18px] border p-2 transition-all active:scale-95 overflow-hidden"
                  style={{
                    borderColor: isOcupada ? 'rgba(248,113,113,0.45)' : `${color}44`,
                    backgroundColor: isOcupada ? 'rgba(248,113,113,0.1)' : `${color}08`,
                    boxShadow: isOcupada
                      ? '0 0 20px rgba(248,113,113,0.15), inset 0 0 30px rgba(248,113,113,0.04)'
                      : 'none',
                    backdropFilter: 'blur(12px)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* Glow vermelho pulsante para mesas ocupadas */}
                  {isOcupada && (
                    <div
                      className="pointer-events-none absolute -bottom-4 -right-4 size-20 rounded-full opacity-[0.2] blur-xl animate-pulse"
                      style={{ background: 'radial-gradient(circle, #f87171 0%, transparent 70%)' }}
                    />
                  )}

                  <span className="relative z-10 text-[26px] font-extrabold tracking-tighter" style={{ color }}>
                    {mesa.numero}
                  </span>

                  <div className="relative z-10 flex flex-col items-center justify-center gap-1 mt-0.5 mx-auto max-w-full">
                    <span
                      className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] border whitespace-nowrap"
                      style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}
                    >
                      {STATUS_LABEL[mesa.status]}
                    </span>

                    {/* Nome do Garçom */}
                    {isOcupada && waiterName && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className="flex size-4 items-center justify-center rounded-full text-[7px] font-bold text-black shrink-0"
                          style={{ backgroundColor: waiterColor }}
                        >
                          {waiterName.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-[9px] font-semibold text-[var(--text-primary)]/80 truncate max-w-[60px]">
                          {waiterName.split(' ')[0]}
                        </span>
                      </div>
                    )}

                    {isOcupada && mesa.comandaId && !waiterName && (
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold tracking-wide text-[var(--accent,#9b8460)]">
                        <Plus className="size-2.5" strokeWidth={3} />
                        ITENS
                      </span>
                    )}

                    {!isOcupada && (
                      <span className="text-[10px] font-medium text-[var(--text-soft,#7a8896)]">
                        {mesa.capacidade} lug.
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
})
