'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ClipboardList, LoaderCircle, TriangleAlert, WifiOff } from 'lucide-react'
import { calcSubtotal, calcTotal, type Comanda, formatElapsed } from '@/components/pdv/pdv-types'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { toPdvComanda } from '@/components/pdv/pdv-operations'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { fetchComandaDetails } from '@/lib/api'

function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

type Filtro = 'tudo' | 'abertas' | 'fechadas'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aberta: { label: 'Aberta', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  em_preparo: { label: 'Em preparo', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  pronta: { label: 'Pronta', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  fechada: { label: 'Paga', color: '#36f57c', bg: 'rgba(54,245,124,0.12)' },
}

type Props = Readonly<{
  comandas: Comanda[]
  focusedId?: string | null
  onCloseComanda?: (id: string, discountAmount: number, serviceFeeAmount: number) => Promise<unknown> | void
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
  isBusy?: boolean
}>

export function OwnerComandasView({
  comandas,
  focusedId,
  onCloseComanda,
  isLoading = false,
  isOffline = false,
  errorMessage = null,
  isBusy = false,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>('tudo')

  const filtered = useMemo(
    () =>
      comandas.filter((c) => {
        if (filtro === 'abertas') {return c.status !== 'fechada'}
        if (filtro === 'fechadas') {return c.status === 'fechada'}
        return true
      }),
    [comandas, filtro],
  )

  const sorted = useMemo(() => {
    const ordered = [...filtered].sort((a, b) => b.abertaEm.getTime() - a.abertaEm.getTime())
    if (!focusedId) {return ordered}

    return ordered.sort((a, b) => {
      if (a.id === focusedId) {return -1}
      if (b.id === focusedId) {return 1}
      return 0
    })
  }, [filtered, focusedId])

  const countAbertas = useMemo(() => comandas.filter((c) => c.status !== 'fechada').length, [comandas])
  const countFechadas = useMemo(() => comandas.filter((c) => c.status === 'fechada').length, [comandas])

  return (
    <div className="p-3 sm:p-4">
      {errorMessage ? (
        <div className="mb-4 rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
          {errorMessage}
        </div>
      ) : isOffline ? (
        <div className="mb-4 rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
          Você está offline. O extrato das comandas pode estar desatualizado até a reconexão.
        </div>
      ) : null}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: 'tudo', label: `Tudo (${comandas.length})` },
            { id: 'abertas', label: `Abertas (${countAbertas})` },
            { id: 'fechadas', label: `Fechadas (${countFechadas})` },
          ] as const
        ).map(({ id, label }) => (
          <button
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95"
            key={id}
            style={{
              background: filtro === id ? 'rgba(0,140,255,0.2)' : 'var(--surface)',
              color: filtro === id ? '#008cff' : 'var(--text-soft, #7a8896)',
              border: `1px solid ${filtro === id ? 'rgba(0,140,255,0.4)' : 'var(--border)'}`,
            }}
            type="button"
            onClick={() => setFiltro(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        isLoading ? (
          <OperationEmptyState
            Icon={LoaderCircle}
            description="Buscando comandas e comprovantes."
            title="Carregando comandas"
          />
        ) : errorMessage ? (
          <OperationEmptyState
            Icon={TriangleAlert}
            description={errorMessage}
            title="Não foi possível carregar as comandas"
          />
        ) : isOffline ? (
          <OperationEmptyState
            Icon={WifiOff}
            description="Reconecte para sincronizar o extrato atual das comandas."
            title="Sem conexão para listar comandas"
          />
        ) : (
          <OperationEmptyState
            Icon={ClipboardList}
            description="Nenhum registro encontrado para este filtro."
            title={`Nenhuma comanda ${filtro === 'abertas' ? 'aberta' : filtro === 'fechadas' ? 'fechada' : 'disponível'}`}
          />
        )
      ) : (
        <ul className="space-y-2">
          {sorted.map((comanda) => (
            <ComandaCard
              comanda={comanda}
              defaultOpen={comanda.id === focusedId}
              key={`${comanda.id}-${comanda.id === focusedId ? 'focused' : 'idle'}`}
              isBusy={isBusy}
              onCloseComanda={onCloseComanda}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ComandaCard({
  comanda,
  defaultOpen = false,
  onCloseComanda,
  isBusy = false,
}: {
  comanda: Comanda
  defaultOpen?: boolean
  onCloseComanda?: (id: string, discountAmount: number, serviceFeeAmount: number) => Promise<unknown> | void
  isBusy?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const { data: detailsData, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['comanda-details', comanda.id],
    queryFn: async () => {
      const response = await fetchComandaDetails(comanda.id)
      return toPdvComanda(response.comanda)
    },
    enabled: open,
    staleTime: 5_000,
  })

  const activeComanda = detailsData ?? comanda
  const total = calcTotal(activeComanda)
  const subtotal = calcSubtotal(activeComanda)
  const descontoVal = subtotal * (activeComanda.desconto / 100)
  const acrescimoVal = subtotal * (activeComanda.acrescimo / 100)
  const badge = STATUS_MAP[activeComanda.status] ?? STATUS_MAP.aberta
  const itemCount = activeComanda.itens.reduce((sum, item) => sum + item.quantidade, 0)
  const canClose = activeComanda.status !== 'fechada'
  const detailHint =
    itemCount > 0
      ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
      : open
        ? isLoadingDetails
          ? 'Carregando extrato...'
          : 'Extrato pronto'
        : 'Extrato sob demanda'

  return (
    <li
      className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]"
      data-testid={`owner-comanda-card-${comanda.id}`}
    >
      <button
        className="flex w-full items-start justify-between gap-3 px-4 py-4 transition-colors active:bg-[var(--surface-muted)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Mesa {activeComanda.mesa ?? '—'}</p>
            <span
              className="shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeComanda.garcomNome && (
              <span className="rounded-full bg-[rgba(167,139,250,0.14)] px-2 py-0.5 text-[10px] font-semibold text-[#c4b5fd]">
                {activeComanda.garcomNome}
              </span>
            )}
            <span className="text-[11px] text-[var(--text-soft)]">
              Aberta em {formatDateTime(activeComanda.abertaEm)}
            </span>
            <span className="text-[11px] text-[var(--text-soft)]">
              {detailHint} · há {formatElapsed(activeComanda.abertaEm)}
            </span>
          </div>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-2 pt-0.5">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Total final</p>
            <span className="text-sm font-bold" style={{ color: badge.color }}>
              {formatCurrency(total)}
            </span>
          </div>
          {open ? (
            <ChevronDown className="size-4 text-[var(--text-soft)]" />
          ) : (
            <ChevronRight className="size-4 text-[var(--text-soft)]" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-4">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Responsável
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                {activeComanda.garcomNome ?? 'Operação geral'}
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Itens</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{itemCount}</p>
            </div>
          </div>

          {canClose && onCloseComanda ? (
            <button
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-[14px] border border-accent/20 bg-accent px-4 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-sm transition active:scale-[0.98] disabled:opacity-50"
              disabled={isBusy}
              type="button"
              onClick={() => {
                onCloseComanda(activeComanda.id, descontoVal, acrescimoVal)
              }}
            >
              Fechar
            </button>
          ) : null}

          {isLoadingDetails ? (
            <div className="mb-4 flex items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-6 text-xs text-[var(--text-soft)]">
              Carregando extrato detalhado...
            </div>
          ) : activeComanda.itens.length === 0 ? (
            <div className="mb-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-center text-xs text-[var(--text-soft)]">
              Nenhum item detalhado para esta comanda.
            </div>
          ) : (
            <ul className="mb-4 space-y-2" data-testid={`owner-comanda-items-${comanda.id}`}>
              {activeComanda.itens.map((item, idx) => (
                <li
                  className="flex items-start justify-between gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3"
                  key={`${item.produtoId}-${idx}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {item.quantidade}× {item.nome}
                    </p>
                    {item.observacao && (
                      <p className="mt-1 text-[10px] italic text-[var(--text-soft)]">{`"${item.observacao}"`}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[var(--text-primary)]">
                    {formatCurrency(item.quantidade * item.precoUnitario)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs">
            <div className="flex justify-between text-[var(--text-soft)]">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {activeComanda.desconto > 0 && (
              <div className="mt-2 flex justify-between text-[#fca5a5]">
                <span>Desconto ({activeComanda.desconto}%)</span>
                <span>– {formatCurrency(descontoVal)}</span>
              </div>
            )}
            {activeComanda.acrescimo > 0 && (
              <div className="mt-2 flex justify-between text-[#fdba74]">
                <span>Serviço ({activeComanda.acrescimo}%)</span>
                <span>+ {formatCurrency(acrescimoVal)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between border-t border-[var(--border)] pt-3 font-semibold text-[var(--text-primary)]">
              <span>Total final</span>
              <span style={{ color: badge.color }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
