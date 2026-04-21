'use client'

import { memo, useMemo } from 'react'
import type { Mesa, MesaStatus } from '@/components/pdv/pdv-types'
import { LayoutGrid, Plus, TriangleAlert, WifiOff } from 'lucide-react'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'

interface MobileTableGridProps {
  mesas: Mesa[]
  onSelectMesa: (mesa: Mesa) => void
  currentEmployeeId?: string | null
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
  currentEmployeeId = null,
  isLoading = false,
  isOffline = false,
  errorMessage = null,
}: MobileTableGridProps) {
  const { livres, ocupadas, reservadas, suasMesas } = useMemo(
    () => ({
      livres: mesas.filter((m) => m.status === 'livre'),
      ocupadas: mesas.filter((m) => m.status !== 'livre'),
      reservadas: mesas.filter((m) => m.status === 'reservada'),
      suasMesas: currentEmployeeId ? mesas.filter((m) => m.garcomId === currentEmployeeId).length : 0,
    }),
    [currentEmployeeId, mesas],
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
        description="As mesas são configuradas no painel web."
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

      <section className="mb-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
              Salão
            </p>
            <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Mapa compartilhado do salão</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
              Abra mesa livre, retome comandas em curso e veja o responsável principal antes de apoiar outro atendimento.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[rgba(0,140,255,0.22)] bg-[rgba(0,140,255,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
            {mesas.length} mesas
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
          {[
            { label: 'Livres', value: livres.length, tone: '#36f57c' },
            { label: 'Em uso', value: ocupadas.length - reservadas.length, tone: '#f87171' },
            { label: 'Reservadas', value: reservadas.length, tone: '#60a5fa' },
            { label: 'Suas', value: suasMesas, tone: '#c4b5fd' },
          ].map((item) => (
            <div className="bg-[var(--surface-muted)] px-3 py-3" data-testid={`mesa-summary-${item.label.toLowerCase()}`} key={item.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft,#7a8896)]">{item.label}</p>
              <p className="mt-1 text-lg font-bold" style={{ color: item.tone }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Mesas livres — principal ação do funcionário */}
      {livres.length > 0 && (
        <>
          <p className="mb-3 ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-soft,#7a8896)]">
            Mesas livres — {livres.length}
          </p>
          <div className="mb-7 grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-3">
            {livres.map((mesa) => (
              <button
                className="group relative flex min-h-[104px] flex-col items-start justify-between overflow-hidden rounded-[18px] border px-3 py-3 text-left transition-all active:scale-95 min-[420px]:min-h-[108px]"
                data-testid={`mobile-mesa-${mesa.id}`}
                key={mesa.id}
                style={{
                  borderColor: 'rgba(54,245,124,0.3)',
                  backgroundColor: 'rgba(54,245,124,0.06)',
                  WebkitTapHighlightColor: 'transparent',
                }}
                type="button"
                onClick={() => onSelectMesa(mesa)}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-[rgba(54,245,124,0.25)]" />
                <div className="relative z-10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#36f57c] opacity-90">
                    Mesa livre
                  </span>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-[26px] font-extrabold tracking-tighter text-[#36f57c] min-[420px]:text-[28px]">
                      {mesa.numero}
                    </span>
                    <span className="pb-1 text-[10px] font-medium text-[var(--text-soft,#7a8896)]">{mesa.capacidade} lugares</span>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--text-soft,#7a8896)]">Pronta para abrir atendimento agora.</p>
                </div>
                <div className="relative z-10">
                  <span className="inline-flex items-center rounded-full border border-[rgba(54,245,124,0.28)] bg-[rgba(54,245,124,0.12)] px-2.5 py-1 text-[10px] font-semibold text-[#36f57c]">
                    Abrir comanda
                  </span>
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
            Mesas em atendimento — {ocupadas.length}
          </p>
          <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 min-[420px]:gap-3">
            {ocupadas.map((mesa) => {
              const isOcupada = mesa.status === 'ocupada'
              const color = STATUS_COLOR[mesa.status]
              const waiterName = mesa.garcomNome
              const isOwnTable = currentEmployeeId && mesa.garcomId === currentEmployeeId
              // Deterministic color from waiter name
              const waiterColor = waiterName
                ? `hsl(${[...waiterName].reduce((a, b) => a + b.charCodeAt(0), 0) % 360}, 70%, 60%)`
                : undefined
              return (
                <button
                  className="relative flex min-h-[116px] flex-col items-start justify-between overflow-hidden rounded-[18px] border px-3 py-3 text-left transition-all active:scale-95 min-[420px]:min-h-[120px]"
                  data-testid={`mobile-mesa-${mesa.id}`}
                  key={mesa.id}
                  style={{
                    borderColor: isOcupada ? 'rgba(248,113,113,0.45)' : `${color}44`,
                    backgroundColor: isOcupada ? 'rgba(248,113,113,0.1)' : `${color}08`,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  type="button"
                  onClick={() => onSelectMesa(mesa)}
                >
                  <div className="relative z-10">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.16em]"
                      style={{ color }}
                    >
                      {isOcupada ? 'Mesa ocupada' : 'Mesa reservada'}
                    </span>
                    <div className="mt-1 flex items-end gap-2">
                      <span
                        className="text-[26px] font-extrabold tracking-tighter min-[420px]:text-[28px]"
                        style={{ color }}
                  >
                      {mesa.numero}
                      </span>
                      {!isOcupada && (
                        <span className="pb-1 text-[10px] font-medium text-[var(--text-soft,#7a8896)]">
                          {mesa.capacidade} lugares
                        </span>
                      )}
                    </div>
                    {isOcupada ? (
                      <p className="mt-1 text-[10px] text-[var(--text-soft,#7a8896)]">
                        {mesa.comandaId ? `Comanda ${mesa.comandaId.slice(0, 6).toUpperCase()}` : 'Comanda em andamento'}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-[var(--text-soft,#7a8896)]">Reserva aguardando atendimento</p>
                    )}
                  </div>

                  <div className="relative z-10 flex w-full flex-col items-start gap-1.5 max-w-full">
                    <span
                      className="rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.15em] whitespace-nowrap"
                      style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}
                    >
                      {STATUS_LABEL[mesa.status]}
                    </span>

                    {isOcupada && waiterName && (
                      <div className="flex max-w-full items-center gap-1">
                        <span
                          className="flex size-4 items-center justify-center rounded-full text-[7px] font-bold text-black shrink-0"
                          style={{ backgroundColor: waiterColor }}
                        >
                          {waiterName.charAt(0).toUpperCase()}
                        </span>
                        <span className="max-w-[92px] truncate text-[9px] font-semibold text-[var(--text-primary)]/80">
                          {waiterName.split(' ')[0]}
                        </span>
                      </div>
                    )}

                    {isOcupada ? (
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[9px] font-semibold text-[var(--text-soft)]">
                        {isOwnTable ? 'Sua mesa' : waiterName ? `Responsável ${waiterName.split(' ')[0]}` : 'Sem responsável'}
                      </span>
                    ) : null}

                    {isOcupada && mesa.comandaId && !waiterName && (
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold tracking-wide text-[var(--accent,#008cff)]">
                        <Plus className="size-2.5" strokeWidth={3} />
                        ITENS
                      </span>
                    )}

                    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
                      {isOcupada ? 'Retomar comanda' : 'Abrir reserva'}
                    </span>
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
