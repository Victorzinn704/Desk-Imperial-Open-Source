'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Comanda } from '@/components/pdv/pdv-types'
import { calcTotal, formatElapsed } from '@/components/pdv/pdv-types'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  aberta: { label: 'Em aberto', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  em_preparo: { label: 'Em preparo', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  pronta: { label: 'Pronta', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  fechada: { label: 'Paga', color: '#36f57c', bg: 'rgba(54,245,124,0.12)' },
}

interface Props {
  comandas: Comanda[]
}

export function MobileHistoricoView({ comandas }: Props) {
  // Mais recente primeiro
  const sorted = [...comandas].sort((a, b) => b.abertaEm.getTime() - a.abertaEm.getTime())

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
          <span className="text-3xl">📋</span>
        </div>
        <p className="text-sm font-medium text-white">Nenhum atendimento hoje</p>
        <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">Os atendimentos do dia aparecerão aqui</p>
      </div>
    )
  }

  return (
    <div className="p-4">
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
  const subtotal = comanda.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)
  const descontoVal = subtotal * (comanda.desconto / 100)
  const acrescimoVal = subtotal * (comanda.acrescimo / 100)
  const badge = STATUS_BADGE[comanda.status] ?? STATUS_BADGE.aberta

  return (
    <li className="overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 transition-colors active:bg-[rgba(255,255,255,0.04)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-white">Mesa {comanda.mesa ?? '—'}</p>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-[var(--text-soft,#7a8896)]">
            {comanda.itens.reduce((s, i) => s + i.quantidade, 0)} itens · {formatElapsed(comanda.abertaEm)} atrás
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: badge.color }}>
            {formatCurrency(total)}
          </span>
          {open ? (
            <ChevronDown className="size-4 text-[var(--text-soft,#7a8896)]" />
          ) : (
            <ChevronRight className="size-4 text-[var(--text-soft,#7a8896)]" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-4 pb-4 pt-3">
          {comanda.itens.length === 0 ? (
            <p className="py-3 text-center text-xs text-[var(--text-soft,#7a8896)]">Sem itens registrados</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {comanda.itens.map((item, idx) => (
                <li key={idx} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {item.quantidade}× {item.nome}
                    </p>
                    {item.observacao && (
                      <p className="text-[10px] italic text-[var(--text-soft,#7a8896)]">{`"${item.observacao}"`}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white shrink-0">
                    {formatCurrency(item.quantidade * item.precoUnitario)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1 border-t border-[rgba(255,255,255,0.06)] pt-3 text-xs">
            <div className="flex justify-between text-[var(--text-soft,#7a8896)]">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {comanda.desconto > 0 && (
              <div className="flex justify-between text-[#f87171]">
                <span>Desconto ({comanda.desconto}%)</span>
                <span>– {formatCurrency(descontoVal)}</span>
              </div>
            )}
            {comanda.acrescimo > 0 && (
              <div className="flex justify-between text-[#fb923c]">
                <span>Serviço ({comanda.acrescimo}%)</span>
                <span>+ {formatCurrency(acrescimoVal)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 font-semibold text-white">
              <span>Total</span>
              <span style={{ color: badge.color }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
