'use client'

import { forwardRef, memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  calcSubtotal,
  calcTotal,
  type Comanda,
  type ComandaStatus,
  formatElapsed,
} from '@/components/pdv/pdv-types'
import { ChevronRight, ClipboardList, Edit2, LoaderCircle, Plus, Trash2, TriangleAlert, WifiOff } from 'lucide-react'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { useQuery } from '@tanstack/react-query'
import { fetchComandaDetails } from '@/lib/api'
import { toPdvComanda } from '@/components/pdv/pdv-operations'

interface MobileComandaListProps {
  comandas: Comanda[]
  currentEmployeeId?: string | null
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  onAddItems?: (comanda: Comanda) => void
  onNewComanda?: () => void
  onCancelComanda?: (id: string) => Promise<void> | void
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  focusedId?: string | null
  onFocus?: (id: string | null) => void
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
  isBusy?: boolean
  summary?: {
    activeCount: number
    preparingCount: number
    readyCount: number
  }
}

type StatusConfig = {
  label: string
  chipColor: string
  chipBg: string
  nextStatus: ComandaStatus | null
  nextLabel: string | null
  nextBg: string
}

const STATUS_CONFIG: Record<Exclude<ComandaStatus, 'fechada' | 'cancelada'>, StatusConfig> = {
  aberta: {
    label: 'Aberta',
    chipColor: '#60a5fa',
    chipBg: 'rgba(96, 165, 250, 0.12)',
    nextStatus: 'em_preparo',
    nextLabel: 'Iniciar preparo',
    nextBg: 'rgba(251, 146, 60, 0.15)',
  },
  em_preparo: {
    label: 'Em Preparo',
    chipColor: '#fb923c',
    chipBg: 'rgba(251, 146, 60, 0.12)',
    nextStatus: 'pronta',
    nextLabel: 'Marcar pronta',
    nextBg: 'rgba(54, 245, 124, 0.12)',
  },
  pronta: {
    label: 'Pronta',
    chipColor: '#36f57c',
    chipBg: 'rgba(54, 245, 124, 0.12)',
    nextStatus: 'fechada',
    nextLabel: 'Fechar',
    nextBg: 'rgba(122, 136, 150, 0.12)',
  },
}

interface ComandaCardProps {
  comanda: Comanda
  currentEmployeeId?: string | null
  isFocused: boolean
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  onAddItems?: (comanda: Comanda) => void
  onCancelComanda?: (id: string) => Promise<void> | void
  onCloseComanda?: (id: string, discountPercent: number, surchargePercent: number) => Promise<void> | void
  onFocus?: (id: string | null) => void
  isBusy?: boolean
}

export function MobileComandaList({
  comandas,
  currentEmployeeId = null,
  onUpdateStatus,
  onAddItems,
  onNewComanda,
  onCancelComanda,
  onCloseComanda,
  focusedId,
  onFocus,
  isLoading = false,
  isOffline = false,
  errorMessage = null,
  isBusy = false,
  summary,
}: MobileComandaListProps) {
  const active = useMemo(() => comandas, [comandas])
  const focusedRef = useRef<HTMLLIElement | null>(null)

  // scroll focused comanda into view when it changes
  useEffect(() => {
    if (focusedId && focusedRef.current) {
      focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focusedId])

  // sort: focused first, then by openedAt desc
  const sorted = useMemo(() => {
    if (!focusedId) {
      return active
    }

    return [...active].sort((a, b) => {
      if (a.id === focusedId) {return -1}
      if (b.id === focusedId) {return 1}
      return b.abertaEm.getTime() - a.abertaEm.getTime()
    })
  }, [active, focusedId])

  if (active.length === 0) {
    if (isLoading) {
      return (
        <OperationEmptyState
          Icon={LoaderCircle}
          description="Buscando comandas abertas do salão."
          title="Carregando comandas"
        />
      )
    }

    if (errorMessage) {
      return (
        <OperationEmptyState
          Icon={TriangleAlert}
          description={errorMessage}
          title="Não foi possível carregar as comandas"
        />
      )
    }

    if (isOffline) {
      return (
        <OperationEmptyState
          Icon={WifiOff}
          description="Reconecte para consultar o estado atual das comandas do salão."
          title="Sem conexão para listar comandas"
        />
      )
    }

    return (
      <OperationEmptyState
        Icon={ClipboardList}
        action={
          onNewComanda ? (
            <button
              className="flex items-center gap-2 rounded-xl bg-[rgba(0,140,255,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--accent,#008cff)] transition-opacity active:opacity-70 disabled:opacity-50"
              disabled={isBusy}
              type="button"
              onClick={onNewComanda}
            >
              <Plus className="size-4" />
              Nova comanda
            </button>
          ) : null
        }
        description="Abra uma mesa ou retome uma comanda em andamento para continuar a operação."
        title="Nenhuma comanda ativa no salão"
      />
    )
  }

  return (
    <div className="p-3 sm:p-4">
      {errorMessage ? (
        <div className="mb-4 rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
          {errorMessage}
        </div>
      ) : isOffline ? (
        <div className="mb-4 rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
          Você está offline. As comandas exibidas podem estar desatualizadas até a reconexão.
        </div>
      ) : null}

      <section className="mb-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
              Comandas do salão
            </p>
            <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Operação aberta do turno</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
              Retome, avance status e feche comandas abertas do salão, com responsável principal visível em cada mesa.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[rgba(0,140,255,0.22)] bg-[rgba(0,140,255,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
            {active.length} ativas
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
          {[
            { label: 'Ativas', value: summary?.activeCount ?? active.length, hint: 'em curso agora', tone: '#60a5fa' },
            { label: 'Em preparo', value: summary?.preparingCount ?? 0, hint: 'pedidos correndo', tone: '#fb923c' },
            { label: 'Prontas', value: summary?.readyCount ?? 0, hint: 'aguardando fechamento', tone: '#36f57c' },
          ].map((item) => (
            <div className="bg-[var(--surface-muted)] px-3 py-3" data-testid={`summary-card-${item.label.toLowerCase().replaceAll(' ', '-')}`} key={item.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft,#7a8896)]">{item.label}</p>
              <p className="mt-2 text-lg font-semibold" style={{ color: item.tone }}>
                {item.value}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{item.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Em curso — {active.length}
        </p>
        {onNewComanda && (
          <button
            className="flex items-center gap-1.5 rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.1)] px-3 py-1.5 text-xs font-semibold text-[var(--accent,#008cff)] transition-colors active:bg-[rgba(0,140,255,0.2)] disabled:opacity-50"
            disabled={isBusy}
            type="button"
            onClick={onNewComanda}
          >
            <Plus className="size-3.5" />
            Nova
          </button>
        )}
      </div>

      <ul className="space-y-4">
        {sorted.map((comanda) => {
          const isFocused = comanda.id === focusedId

          return (
            <ComandaCard
              comanda={comanda}
              currentEmployeeId={currentEmployeeId}
              isFocused={isFocused}
              key={comanda.id}
              ref={isFocused ? focusedRef : undefined}
              onAddItems={onAddItems}
              onCancelComanda={onCancelComanda}
              onCloseComanda={onCloseComanda}
              onFocus={onFocus}
              onUpdateStatus={onUpdateStatus}
              isBusy={isBusy}
            />
          )
        })}
      </ul>
    </div>
  )
}

const ComandaCard = memo(
  forwardRef<HTMLLIElement, ComandaCardProps>(function ComandaCard(
    {
      comanda,
      currentEmployeeId = null,
      isFocused,
      onUpdateStatus,
      onAddItems,
      onCancelComanda,
      onCloseComanda,
      onFocus,
      isBusy = false,
    },
    ref,
  ) {
    const [discountPercent, setDiscountPercent] = useState(() => comanda.desconto ?? 0)
    const [surchargePercent, setSurchargePercent] = useState(() => comanda.acrescimo ?? 0)
    const { data: detailsData, isLoading: isLoadingDetails } = useQuery({
      queryKey: ['comanda-details', comanda.id],
      queryFn: async () => {
        const res = await fetchComandaDetails(comanda.id)
        return toPdvComanda(res.comanda)
      },
      enabled: isFocused,
      staleTime: 5000,
    })

    const activeComanda = detailsData ?? comanda

    const config = STATUS_CONFIG[activeComanda.status as Exclude<ComandaStatus, 'fechada' | 'cancelada'>]
    const total = useMemo(() => calcTotal(activeComanda), [activeComanda])
    const subtotal = useMemo(() => calcSubtotal(activeComanda), [activeComanda])
    const elapsed = useMemo(() => formatElapsed(activeComanda.abertaEm), [activeComanda.abertaEm])
    const itemCount = useMemo(
      () => activeComanda.itens.reduce((sum, i) => sum + i.quantidade, 0),
      [activeComanda.itens],
    )
    const isOwnedByCurrentEmployee = Boolean(currentEmployeeId && comanda.garcomId === currentEmployeeId)
    const primaryWaiterName = comanda.garcomNome ?? null
    const canAddItems = activeComanda.status === 'aberta' || activeComanda.status === 'em_preparo'
    const showDirectClose = activeComanda.status === 'aberta' || activeComanda.status === 'em_preparo'
    const adjustedTotal = useMemo(
      () => subtotal * (1 - discountPercent / 100) * (1 + surchargePercent / 100),
      [discountPercent, surchargePercent, subtotal],
    )

    return (
      <li
        className="group relative overflow-hidden rounded-[20px] transition-all duration-300"
        ref={ref}
        style={{
          background: isFocused ? 'var(--surface-muted)' : 'var(--surface)',
          border: `1px solid ${isFocused ? `${config.chipColor}55` : 'var(--border)'}`,
          boxShadow: isFocused ? `0 0 24px ${config.chipColor}15` : undefined,
          backdropFilter: isFocused ? 'blur(16px)' : 'blur(8px)',
        }}
      >
        {!isFocused && onFocus && (
          <button
            aria-label={`Abrir detalhes da ${activeComanda.mesa ?? 'comanda'}`}
            className="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            type="button"
            onClick={() => onFocus(comanda.id)}
          />
        )}

        {isFocused && (
          <div
            className="pointer-events-none absolute -right-[20%] -top-[50%] size-[150%] rounded-full opacity-[0.08] blur-3xl transition-opacity"
            style={{ background: `radial-gradient(circle, ${config.chipColor} 0%, transparent 70%)` }}
          />
        )}

        <div className="relative z-20 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  {activeComanda.mesa ?? 'Comanda'}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] border"
                  style={{
                    color: config.chipColor,
                    backgroundColor: config.chipBg,
                    borderColor: `${config.chipColor}33`,
                  }}
                >
                  {config.label}
                </span>
              </div>
              {activeComanda.clienteNome && (
                <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5 truncate">
                  {activeComanda.clienteNome}
                </p>
              )}
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em]"
                  style={{
                    color: isOwnedByCurrentEmployee ? '#36f57c' : 'var(--text-soft,#7a8896)',
                    backgroundColor: isOwnedByCurrentEmployee ? 'rgba(54,245,124,0.12)' : 'rgba(122,136,150,0.1)',
                    borderColor: isOwnedByCurrentEmployee ? 'rgba(54,245,124,0.22)' : 'var(--border)',
                  }}
                >
                  {isOwnedByCurrentEmployee ? 'Sua mesa' : primaryWaiterName ? `Responsável ${primaryWaiterName}` : 'Sem responsável'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-soft,#7a8896)] flex items-center gap-1.5 opacity-80">
                <span>
                  {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                </span>
                <span className="text-[10px] opacity-40">•</span>
                <span>há {elapsed}</span>
              </p>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {formatCurrency(total)}
              </span>
              {isFocused && (
                <button
                  className="mt-2 text-[10px] text-[var(--text-soft)] underline underline-offset-2"
                  type="button"
                  onClick={() => onFocus?.(null)}
                >
                  Recolher
                </button>
              )}
            </div>
          </div>

          {isFocused && (
            <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-300 fill-mode-forwards">
              <div className="mb-5 flex gap-2">
                {onAddItems && canAddItems && (
                  <button
                    className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.1)] px-4 py-3 text-sm font-semibold text-[var(--accent,#008cff)] transition-all active:scale-95 disabled:opacity-50"
                    disabled={isBusy}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    type="button"
                    onClick={() => onAddItems(activeComanda)}
                  >
                    <Edit2 className="size-4" />
                    Itens
                  </button>
                )}

                {onCancelComanda && (
                  <button
                    aria-label="Cancelar comanda"
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] text-[#f87171] transition-all active:scale-95 disabled:opacity-50"
                    disabled={isBusy}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    type="button"
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja cancelar esta comanda inteira?')) {
                        onCancelComanda(activeComanda.id)
                      }
                    }}
                  >
                    <Trash2 className="size-4.5" />
                  </button>
                )}
              </div>

              {isLoadingDetails ? (
                <div className="mb-5 flex justify-center py-4">
                  <div className="size-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                </div>
              ) : (
                activeComanda.itens.length > 0 && (
                  <div className="mb-5 rounded-[14px] bg-[var(--surface-muted)] p-3 border border-[var(--border)]">
                    <ul className="space-y-2.5">
                      {activeComanda.itens.map((item, idx) => (
                        <li className="flex items-center justify-between text-[13px]" key={`${item.produtoId}-${idx}`}>
                          <div className="flex gap-2.5 items-start">
                            <span className="font-bold text-[var(--accent,#008cff)] w-4 text-center">
                              {item.quantidade}x
                            </span>
                            <div className="flex flex-col">
                              <span className="font-medium text-[var(--text-primary)]/90">{item.nome}</span>
                              {item.observacao && (
                                <span className="text-[10px] text-[var(--text-primary)]/40 italic">{`"${item.observacao}"`}</span>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 font-medium text-[var(--text-soft,#7a8896)] ml-3">
                            {formatCurrency(item.quantidade * item.precoUnitario)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-soft,#7a8896)]">
                    Desconto %
                  </label>
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[rgba(0,140,255,0.4)]"
                    disabled={isBusy}
                    max={100}
                    min={0}
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-soft,#7a8896)]">
                    Acréscimo %
                  </label>
                  <input
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[rgba(0,140,255,0.4)]"
                    disabled={isBusy}
                    max={100}
                    min={0}
                    type="number"
                    value={surchargePercent}
                    onChange={(e) => setSurchargePercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  />
                </div>
              </div>

              {(discountPercent > 0 || surchargePercent > 0) && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-[rgba(0,140,255,0.2)] bg-[rgba(0,140,255,0.06)] px-4 py-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft,#7a8896)]">
                      Total Final
                    </p>
                    <p className="text-xs text-[var(--text-soft,#7a8896)] line-through">{formatCurrency(total)}</p>
                  </div>
                  <span className="text-xl font-bold text-[var(--accent,#008cff)]">
                    {formatCurrency(adjustedTotal)}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {config.nextStatus && (
                  <button
                    className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-bold text-[var(--text-primary)] transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
                    disabled={isBusy}
                    style={{
                      backgroundColor: config.nextBg,
                      border: `1px solid ${config.chipColor}44`,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    type="button"
                    onClick={() => {
                      if (config.nextStatus === 'fechada' && onCloseComanda) {
                        onCloseComanda(comanda.id, discountPercent, surchargePercent)
                        return
                      }

                      onUpdateStatus(comanda.id, config.nextStatus!)
                    }}
                  >
                    {config.nextLabel}
                    <ChevronRight className="size-4 opacity-70" />
                  </button>
                )}

                {showDirectClose && onCloseComanda && (
                  <button
                    className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[var(--on-accent)] transition-all active:scale-[0.98] disabled:opacity-50"
                    disabled={isBusy}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    type="button"
                    onClick={() => {
                      onCloseComanda(comanda.id, discountPercent, surchargePercent)
                    }}
                  >
                    Fechar
                  </button>
                )}

                {showDirectClose && !onCloseComanda && (
                  <button
                    className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[var(--on-accent)] transition-all active:scale-[0.98] disabled:opacity-50"
                    disabled={isBusy}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    type="button"
                    onClick={() => {
                      onUpdateStatus(comanda.id, 'fechada')
                    }}
                  >
                    Pagar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </li>
    )
  }),
)
