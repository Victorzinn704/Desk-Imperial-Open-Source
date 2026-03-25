'use client'

import type { Comanda, ComandaStatus } from '@/components/pdv/pdv-types'
import { calcTotal, formatElapsed } from '@/components/pdv/pdv-types'

interface MobileComandaListProps {
  comandas: Comanda[]
  onUpdateStatus: (id: string, status: ComandaStatus) => void
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

export function MobileComandaList({ comandas, onUpdateStatus }: MobileComandaListProps) {
  const active = comandas.filter((c) => c.status !== 'fechada')

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
      </div>
    )
  }

  return (
    <div className="p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
        Comandas ativas — {active.length}
      </p>

      <ul className="space-y-3">
        {active.map((comanda) => {
          const config = STATUS_CONFIG[comanda.status as Exclude<ComandaStatus, 'fechada'>]
          const total = calcTotal(comanda)
          const elapsed = formatElapsed(comanda.abertaEm)
          const itemCount = comanda.itens.reduce((sum, i) => sum + i.quantidade, 0)

          return (
            <li
              key={comanda.id}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white">
                      Mesa {comanda.mesa ?? '—'}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                      style={{
                        color: config.chipColor,
                        backgroundColor: config.chipBg,
                      }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">
                    {itemCount} {itemCount === 1 ? 'item' : 'itens'} · aberta há {elapsed}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrency(total)}</p>
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

              {/* Action button */}
              {config.nextStatus && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(comanda.id, config.nextStatus!)}
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity active:opacity-75"
                  style={{ backgroundColor: config.nextBg, border: `1px solid ${config.chipColor}22` }}
                >
                  {config.nextLabel}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
