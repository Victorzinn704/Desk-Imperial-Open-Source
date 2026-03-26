'use client'

import { useEffect, useRef } from 'react'
import type { Comanda, ComandaStatus } from '@/components/pdv/pdv-types'
import { calcTotal, formatElapsed } from '@/components/pdv/pdv-types'
import { Plus, X } from 'lucide-react'

interface MobileComandaListProps {
  comandas: Comanda[]
  onUpdateStatus: (id: string, status: ComandaStatus) => Promise<void> | void
  onAddItems?: (comanda: Comanda) => void
  onNewComanda?: () => void
  focusedComandaId?: string | null
}

type StatusConfig = {
  label: string
  chipColor: string
  chipBg: string
  nextStatus: ComandaStatus | null
  nextLabel: string | null
  nextBg: string
}

const STATUS_CONFIG: Record<Exclude<ComandaStatus, 'fechada'>, StatusConfig> = {
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
    nextLabel: 'Fechar comanda',
    nextBg: 'rgba(122, 136, 150, 0.12)',
  },
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function MobileComandaList({
  comandas,
  onUpdateStatus,
  onAddItems,
  onNewComanda,
  focusedComandaId,
}: MobileComandaListProps) {
  const active = comandas.filter((c) => c.status !== 'fechada')
  const focusedRef = useRef<HTMLLIElement | null>(null)

  // scroll focused comanda into view when it changes
  useEffect(() => {
    if (focusedComandaId && focusedRef.current) {
      focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focusedComandaId])

  // sort: focused first, then by openedAt desc
  const sorted = focusedComandaId
    ? [...active].sort((a, b) => {
        if (a.id === focusedComandaId) return -1
        if (b.id === focusedComandaId) return 1
        return b.abertaEm.getTime() - a.abertaEm.getTime()
      })
    : active

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
          <span className="text-3xl">🍽️</span>
        </div>
        <p className="text-sm font-medium text-white">Nenhuma comanda ativa</p>
        <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">
          Crie um pedido em uma mesa para começar
        </p>
        {onNewComanda && (
          <button
            type="button"
            onClick={onNewComanda}
            className="mt-5 flex items-center gap-2 rounded-xl bg-[rgba(155,132,96,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--accent,#9b8460)] transition-opacity active:opacity-70"
          >
            <Plus className="size-4" />
            Nova comanda
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Comandas ativas — {active.length}
        </p>
        {onNewComanda && (
          <button
            type="button"
            onClick={onNewComanda}
            className="flex items-center gap-1.5 rounded-xl border border-[rgba(155,132,96,0.3)] bg-[rgba(155,132,96,0.1)] px-3 py-1.5 text-xs font-semibold text-[var(--accent,#9b8460)] transition-colors active:bg-[rgba(155,132,96,0.2)]"
          >
            <Plus className="size-3.5" />
            Nova
          </button>
        )}
      </div>

      <ul className="space-y-3">
        {sorted.map((comanda) => {
          const isFocused = comanda.id === focusedComandaId
          const config = STATUS_CONFIG[comanda.status as Exclude<ComandaStatus, 'fechada'>]
          const total = calcTotal(comanda)
          const elapsed = formatElapsed(comanda.abertaEm)
          const itemCount = comanda.itens.reduce((sum, i) => sum + i.quantidade, 0)
          const canAddItems = comanda.status === 'aberta' || comanda.status === 'em_preparo'
          // show direct close only for 'aberta' and 'em_preparo' (avoids duplicate on 'pronta')
          const showDirectClose = comanda.status === 'aberta' || comanda.status === 'em_preparo'

          return (
            <li
              key={comanda.id}
              ref={isFocused ? focusedRef : null}
              className="rounded-2xl border p-4 transition-all duration-200"
              style={{
                borderColor: isFocused ? `${config.chipColor}55` : 'rgba(255,255,255,0.06)',
                backgroundColor: isFocused ? `${config.chipColor}08` : 'rgba(255,255,255,0.03)',
                boxShadow: isFocused ? `0 0 0 1px ${config.chipColor}22` : undefined,
              }}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white">
                      {comanda.mesa ?? 'Comanda'}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                      style={{ color: config.chipColor, backgroundColor: config.chipBg }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">
                    {itemCount} {itemCount === 1 ? 'item' : 'itens'} · aberta há {elapsed}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onAddItems && canAddItems ? (
                    <button
                      type="button"
                      onClick={() => onAddItems(comanda)}
                      className="flex size-8 items-center justify-center rounded-xl border border-[rgba(155,132,96,0.3)] bg-[rgba(155,132,96,0.1)] text-[var(--accent,#9b8460)] transition-colors active:bg-[rgba(155,132,96,0.2)]"
                      aria-label="Adicionar itens à comanda"
                    >
                      <Plus className="size-4" />
                    </button>
                  ) : null}
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatCurrency(total)}</p>
                  </div>
                </div>
              </div>

              {/* Item summary */}
              {comanda.itens.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-[rgba(255,255,255,0.05)] pt-3">
                  {comanda.itens.slice(0, 3).map((item, idx) => (
                    <li
                      key={`${item.produtoId}-${idx}`}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate text-[var(--text-soft,#7a8896)]">
                        {item.quantidade}× {item.nome}
                      </span>
                      <span className="ml-2 shrink-0 text-[var(--text-soft,#7a8896)]">
                        {formatCurrency(item.quantidade * item.precoUnitario)}
                      </span>
                    </li>
                  ))}
                  {comanda.itens.length > 3 && (
                    <li className="text-xs text-[var(--text-soft,#7a8896)]">
                      +{comanda.itens.length - 3} item(s)...
                    </li>
                  )}
                </ul>
              )}

              {/* Primary action button */}
              {config.nextStatus && (
                <button
                  type="button"
                  onClick={() => void onUpdateStatus(comanda.id, config.nextStatus!)}
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity active:opacity-75"
                  style={{ backgroundColor: config.nextBg, border: `1px solid ${config.chipColor}22` }}
                >
                  {config.nextLabel}
                </button>
              )}

              {/* Direct close (for aberta / em_preparo) */}
              {showDirectClose && (
                <button
                  type="button"
                  onClick={() => void onUpdateStatus(comanda.id, 'fechada')}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-[#7a8896] transition-opacity active:opacity-70"
                  style={{ border: '1px solid rgba(122,136,150,0.18)', background: 'rgba(122,136,150,0.06)' }}
                >
                  <X className="size-3.5" />
                  Fechar comanda
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
