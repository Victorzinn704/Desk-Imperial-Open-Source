'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ClipboardList } from 'lucide-react'
import type { Comanda } from '@/components/pdv/pdv-types'
import { calcSubtotal, calcTotal, formatElapsed } from '@/components/pdv/pdv-types'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { formatBRL as formatCurrency } from '@/lib/currency'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  aberta: { label: 'Em aberto', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  em_preparo: { label: 'Em preparo', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  pronta: { label: 'Pronta', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  fechada: { label: 'Paga', color: '#36f57c', bg: 'rgba(54,245,124,0.12)' },
}

interface Props {
  comandas: Comanda[]
  summary?: {
    receitaRealizada: number
    receitaEsperada: number
    openComandasCount: number
  }
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  const testId = `summary-card-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <div data-testid={testId} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft,#7a8896)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{hint}</p>
    </div>
  )
}

export function MobileHistoricoView({ comandas, summary }: Props) {
  const sorted = useMemo(() => [...comandas].sort((a, b) => b.abertaEm.getTime() - a.abertaEm.getTime()), [comandas])

  if (sorted.length === 0 && !summary) {
    return (
      <OperationEmptyState
        title="Nenhum atendimento hoje"
        description="Os atendimentos do dia aparecerão aqui."
        Icon={ClipboardList}
      />
    )
  }

  return (
    <div className="p-4">
      {summary ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryCard
            label="Receita realizada"
            value={formatCurrency(summary.receitaRealizada)}
            hint="Somente vendas já fechadas por você"
          />
          <SummaryCard
            label="Receita esperada"
            value={formatCurrency(summary.receitaEsperada)}
            hint={`${summary.openComandasCount} comanda${summary.openComandasCount !== 1 ? 's' : ''} em aberto no seu atendimento`}
          />
        </div>
      ) : null}
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
        Atendimentos — {sorted.length}
      </p>
      <ul className="space-y-2">
        {sorted.map((comanda) => (
          <ExtratoCard key={comanda.id} comanda={comanda} />
        ))}
      </ul>
    </div>
  )
}

function ExtratoCard({ comanda }: { comanda: Comanda }) {
  const [open, setOpen] = useState(false)
  const total = calcTotal(comanda)
  const subtotal = calcSubtotal(comanda)
  const descontoVal = subtotal * (comanda.desconto / 100)
  const acrescimoVal = subtotal * (comanda.acrescimo / 100)
  const badge = STATUS_BADGE[comanda.status] ?? STATUS_BADGE.aberta
  const itemCount = comanda.itens.reduce((s, i) => s + i.quantidade, 0)

  return (
    <li className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_36px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-4 transition-colors active:bg-[var(--surface-muted)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 text-left">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Mesa {comanda.mesa ?? '—'}</p>
            <span
              className="rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-[var(--text-soft,#7a8896)]">
            {itemCount > 0 ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : 'Extrato resumido'} · há{' '}
            {formatElapsed(comanda.abertaEm)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
              Total final
            </p>
            <span className="text-sm font-bold" style={{ color: badge.color }}>
              {formatCurrency(total)}
            </span>
          </div>
          {open ? (
            <ChevronDown className="size-4 text-[var(--text-soft,#7a8896)]" />
          ) : (
            <ChevronRight className="size-4 text-[var(--text-soft,#7a8896)]" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-4">
          {comanda.itens.length === 0 ? (
            <div className="mb-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-center text-xs text-[var(--text-soft,#7a8896)]">
              Nenhum item detalhado nesta visualização. Totais mantidos pelo backend.
            </div>
          ) : (
            <ul className="mb-4 space-y-2">
              {comanda.itens.map((item, idx) => (
                <li
                  key={`${item.produtoId}-${idx}`}
                  className="flex items-start justify-between gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {item.quantidade}× {item.nome}
                    </p>
                    {item.observacao && (
                      <p className="mt-1 text-[10px] italic text-[var(--text-soft,#7a8896)]">{`"${item.observacao}"`}</p>
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
            <div className="flex justify-between text-[var(--text-soft,#7a8896)]">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {comanda.desconto > 0 && (
              <div className="mt-2 flex justify-between text-[#f87171]">
                <span>Desconto ({comanda.desconto}%)</span>
                <span>– {formatCurrency(descontoVal)}</span>
              </div>
            )}
            {comanda.acrescimo > 0 && (
              <div className="mt-2 flex justify-between text-[#fb923c]">
                <span>Serviço ({comanda.acrescimo}%)</span>
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
