'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ClipboardList } from 'lucide-react'
import type { Comanda } from '@/components/pdv/pdv-types'
import { calcTotal } from '@/components/pdv/pdv-types'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

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

interface Props {
  comandas: Comanda[]
}

export function OwnerComandasView({ comandas }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('tudo')

  const filtered = useMemo(
    () =>
      comandas.filter((c) => {
        if (filtro === 'abertas') return c.status !== 'fechada'
        if (filtro === 'fechadas') return c.status === 'fechada'
        return true
      }),
    [comandas, filtro],
  )

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.abertaEm.getTime() - a.abertaEm.getTime()), [filtered])

  const countAbertas = useMemo(() => comandas.filter((c) => c.status !== 'fechada').length, [comandas])
  const countFechadas = useMemo(() => comandas.filter((c) => c.status === 'fechada').length, [comandas])

  return (
    <div className="p-4">
      {/* Filtros */}
      <div className="mb-4 flex gap-2">
        {(
          [
            { id: 'tudo', label: `Tudo (${comandas.length})` },
            { id: 'abertas', label: `Abertas (${countAbertas})` },
            { id: 'fechadas', label: `Fechadas (${countFechadas})` },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95"
            style={{
              background: filtro === id ? 'rgba(155,132,96,0.2)' : 'rgba(255,255,255,0.04)',
              color: filtro === id ? '#9b8460' : '#7a8896',
              border: `1px solid ${filtro === id ? 'rgba(155,132,96,0.4)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <OperationEmptyState
          title={`Nenhuma comanda ${filtro === 'abertas' ? 'aberta' : filtro === 'fechadas' ? 'fechada' : 'disponível'}`}
          description="Nenhum registro encontrado para este filtro."
          Icon={ClipboardList}
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((comanda) => (
            <ComandaCard key={comanda.id} comanda={comanda} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ComandaCard({ comanda }: { comanda: Comanda }) {
  const [open, setOpen] = useState(false)
  const total = calcTotal(comanda)
  const subtotal = comanda.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)
  const descontoVal = subtotal * (comanda.desconto / 100)
  const acrescimoVal = subtotal * (comanda.acrescimo / 100)
  const badge = STATUS_MAP[comanda.status] ?? STATUS_MAP.aberta

  return (
    <li className="overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
      <button
        type="button"
        className="flex w-full items-start justify-between px-4 py-3 transition-colors active:bg-[rgba(255,255,255,0.04)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="text-left flex-1 min-w-0">
          {/* Linha 1: Mesa + Badge */}
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-white">Mesa {comanda.mesa ?? '—'}</p>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.label}
            </span>
          </div>
          {/* Linha 2: Garçom + Data/hora */}
          <div className="flex items-center gap-2 flex-wrap">
            {comanda.garcomNome && (
              <span className="text-[11px] text-[#a78bfa] font-medium">👤 {comanda.garcomNome}</span>
            )}
            <span className="text-[11px] text-[#7a8896]">🕐 {formatDateTime(comanda.abertaEm)}</span>
            <span className="text-[11px] text-[#7a8896]">
              {comanda.itens.reduce((s, i) => s + i.quantidade, 0)} itens
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2 pt-1">
          <span className="text-sm font-bold" style={{ color: badge.color }}>
            {formatCurrency(total)}
          </span>
          {open ? (
            <ChevronDown className="size-4 text-[#7a8896]" />
          ) : (
            <ChevronRight className="size-4 text-[#7a8896]" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-4 pb-4 pt-3">
          {comanda.itens.length === 0 ? (
            <p className="py-3 text-center text-xs text-[#7a8896]">Sem itens registrados</p>
          ) : (
            <ul className="space-y-1.5 mb-3">
              {comanda.itens.map((item, idx) => (
                <li key={idx} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {item.quantidade}× {item.nome}
                    </p>
                    {item.observacao && <p className="text-[10px] italic text-[#7a8896]">{`"${item.observacao}"`}</p>}
                  </div>
                  <span className="text-xs font-semibold text-white shrink-0">
                    {formatCurrency(item.quantidade * item.precoUnitario)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1 border-t border-[rgba(255,255,255,0.06)] pt-3 text-xs">
            <div className="flex justify-between text-[#7a8896]">
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
