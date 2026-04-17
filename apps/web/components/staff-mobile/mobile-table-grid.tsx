'use client'

import { memo, useMemo } from 'react'
import type { Mesa, MesaStatus } from '@/components/pdv/pdv-types'
import { LayoutGrid, Plus, TriangleAlert, WifiOff } from 'lucide-react'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'

interface MobileTableGridProps {
  mesas: Mesa[]
  onSelectMesa: (mesa: Mesa) => void
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
}

const STATUS_COLOR: Record<MesaStatus, string> = {
  livre: '#36f57c',
  ocupada: '#f87171',
  reservada: '#60a5fa',
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
  isOffline = false,
  errorMessage = null,
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
      <div className="p-3 pb-6 sm:p-4">
        <div className="mb-3 ml-1 h-3 w-32 animate-pulse rounded bg-[rgba(255,255,255,0.08)]" />
        <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="min-h-[96px] rounded-[18px] border border-[var(--border)] bg-[var(--surface)] animate-pulse"
              key={index}
            />
          ))}
        </div>
      </div>
    )
  }

  if (mesas.length === 0) {
    if (errorMessage) {
      return (
        <OperationEmptyState
          Icon={TriangleAlert}
          description={errorMessage}
          title="Não foi possível carregar as mesas"
        />
      )
    }

    if (isOffline) {
      return (
        <OperationEmptyState
          Icon={WifiOff}
          description="Reconecte para buscar o mapa atual das mesas."
          title="Sem conexão para listar mesas"
        />
      )
    }

    return (
      <OperationEmptyState
        Icon={LayoutGrid}
        description="O dono pode adicionar mesas pelo painel web."
        title="Nenhuma mesa cadastrada"
      />
    )
  }

  return (
    <div className="p-3 pb-6 sm:p-4">
      {errorMessage ? (
        <div className="mb-4 rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
          {errorMessage}
        </div>
      ) : isOffline ? (
        <div className="mb-4 rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
          Você está offline. As mesas podem estar desatualizadas até a reconexão.
        </div>
      ) : null}

      {/* Mesas livres — principal ação do funcionário */}
      {livres.length > 0 && (
        <>
          <p className="mb-3 ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-soft,#7a8896)]">
            Disponíveis — {livres.length}
          </p>
          <div className="mb-7 grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-3">
            {livres.map((mesa) => (
              <button
                className="group relative flex min-h-[92px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[18px] border transition-all active:scale-95 min-[420px]:min-h-[96px]"
                key={mesa.id}
                style={{
                  borderColor: 'rgba(54,245,124,0.3)',
                  backgroundColor: 'rgba(54,245,124,0.06)',
                  WebkitTapHighlightColor: 'transparent',
                }}
                type="button"
                onClick={() => onSelectMesa(mesa)}
              >
                <div className="absolute -inset-2 rounded-full bg-[rgba(54,245,124,0.15)] opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                <span className="relative z-10 text-[24px] font-extrabold tracking-tighter text-[#36f57c] min-[420px]:text-[26px]">
                  {mesa.numero}
                </span>
                <div className="relative z-10 flex flex-col items-center justify-center gap-0.5 mt-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#36f57c] opacity-90">
                    Livre
                  </span>
                  <span className="text-[10px] font-medium text-[var(--accent,#008cff)]">Novo PdV</span>
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
          <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-3">
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
                  className="relative flex min-h-[104px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[18px] border p-2 transition-all active:scale-95 min-[420px]:min-h-[110px]"
                  key={mesa.id}
                  style={{
                    borderColor: isOcupada ? 'rgba(248,113,113,0.45)' : `${color}44`,
                    backgroundColor: isOcupada ? 'rgba(248,113,113,0.1)' : `${color}08`,
                    boxShadow: isOcupada
                      ? '0 0 20px rgba(248,113,113,0.15), inset 0 0 30px rgba(248,113,113,0.04)'
                      : 'none',
                    backdropFilter: 'blur(12px)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  type="button"
                  onClick={() => onSelectMesa(mesa)}
                >
                  {/* Glow vermelho pulsante para mesas ocupadas */}
                  {isOcupada && (
                    <div
                      className="pointer-events-none absolute -bottom-4 -right-4 size-20 rounded-full opacity-[0.2] blur-xl animate-pulse"
                      style={{ background: 'radial-gradient(circle, #f87171 0%, transparent 70%)' }}
                    />
                  )}

                  <span
                    className="relative z-10 text-[24px] font-extrabold tracking-tighter min-[420px]:text-[26px]"
                    style={{ color }}
                  >
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
                        <span className="max-w-[72px] truncate text-[9px] font-semibold text-[var(--text-primary)]/80">
                          {waiterName.split(' ')[0]}
                        </span>
                      </div>
                    )}

                    {isOcupada && mesa.comandaId && !waiterName && (
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold tracking-wide text-[var(--accent,#008cff)]">
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
