'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ClipboardList, Trophy } from 'lucide-react'
import { calcSubtotal, calcTotal, type Comanda, formatElapsed } from '@/components/pdv/pdv-types'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { formatBRL as formatCurrency } from '@/lib/currency'
import type { OperationPerformerStanding } from '@/lib/operations'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  aberta: { label: 'Em aberto', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  em_preparo: { label: 'Em preparo', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  pronta: { label: 'Pronta', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  fechada: { label: 'Paga', color: '#36f57c', bg: 'rgba(54,245,124,0.12)' },
}

type Props = Readonly<{
  comandas: Comanda[]
  summary?: {
    receitaRealizada: number
    receitaEsperada: number
    openComandasCount: number
    ranking?: OperationPerformerStanding
  }
}>

export function MobileHistoricoView({ comandas, summary }: Props) {
  const sorted = useMemo(() => [...comandas].sort((a, b) => b.abertaEm.getTime() - a.abertaEm.getTime()), [comandas])
  const ranking = summary?.ranking
  const rankingHeadline = buildRankingHeadline(ranking)

  if (sorted.length === 0 && !summary) {
    return (
      <OperationEmptyState
        Icon={ClipboardList}
        description="Os atendimentos do dia aparecerão aqui."
        title="Nenhum atendimento hoje"
      />
    )
  }

  return (
    <div className="space-y-4 p-3 pb-6 sm:p-4">
      {summary ? (
        <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Histórico próprio</p>
              <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Suas vendas e atendimentos</h1>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
                Fechamentos atribuídos a você, com posição no turno e leitura curta do que ainda está em aberto.
              </p>
            </div>
            {ranking?.position ? (
              <span className="shrink-0 rounded-full border border-[rgba(0,140,255,0.22)] bg-[rgba(0,140,255,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
                {ranking.position}º no turno
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
            {[
              {
                label: 'Receita realizada',
                value: formatCurrency(summary.receitaRealizada),
                hint: 'vendas fechadas por você',
                tone: '#36f57c',
              },
              {
                label: 'Receita esperada',
                value: formatCurrency(summary.receitaEsperada),
                hint:
                  summary.openComandasCount > 0
                    ? `${summary.openComandasCount} comanda${summary.openComandasCount !== 1 ? 's' : ''} em aberto`
                    : 'sem comanda aberta agora',
                tone: '#60a5fa',
              },
              {
                label: 'Posição',
                value: ranking?.position ? `${ranking.position}º` : '—',
                hint: ranking?.totalPerformers ? `${ranking.totalPerformers} pessoas no turno` : 'sem ranking útil',
                tone: '#fbbf24',
              },
            ].map((item) => (
              <div className="bg-[var(--surface-muted)] px-3 py-3" data-testid={`summary-card-${slugify(item.label)}`} key={item.label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft,#7a8896)]">{item.label}</p>
                <p className="mt-2 text-lg font-semibold" style={{ color: item.tone }}>
                  {item.value}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{item.hint}</p>
              </div>
            ))}
          </div>

          {rankingHeadline ? (
            <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.12)] text-[#fbbf24]">
                <Trophy className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft,#7a8896)]">Ranking do turno</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{rankingHeadline.title}</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{rankingHeadline.description}</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
            Atendimentos — {sorted.length}
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[var(--text-soft,#7a8896)]">Nenhum atendimento próprio no recorte.</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {sorted.map((comanda) => (
              <ExtratoCard comanda={comanda} key={comanda.id} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function buildRankingHeadline(ranking: OperationPerformerStanding | undefined) {
  if (!ranking || !ranking.position || ranking.totalPerformers === 0) {
    return null
  }

  if (ranking.position === 1) {
    return {
      title: 'Você está liderando o turno.',
      description:
        ranking.performerValue > 0
          ? `Sua venda atual já soma ${formatCurrency(ranking.performerValue)} no recorte.`
          : 'Você está no topo, mas ainda sem valor consolidado relevante.',
    }
  }

  return {
    title: `Você está em ${ranking.position}º de ${ranking.totalPerformers}.`,
    description:
      ranking.deltaToLeader > 0 && ranking.leaderName
        ? `Faltam ${formatCurrency(ranking.deltaToLeader)} para alcançar ${ranking.leaderName}.`
        : 'O ranking do turno ainda está muito próximo.',
  }
}

function ExtratoCard({ comanda }: Readonly<{ comanda: Comanda }>) {
  const [open, setOpen] = useState(false)
  const total = calcTotal(comanda)
  const subtotal = calcSubtotal(comanda)
  const descontoVal = subtotal * (comanda.desconto / 100)
  const acrescimoVal = subtotal * (comanda.acrescimo / 100)
  const badge = STATUS_BADGE[comanda.status] ?? STATUS_BADGE.aberta
  const itemCount = comanda.itens.reduce((s, i) => s + i.quantidade, 0)

  return (
    <li>
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors active:bg-[var(--surface-muted)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
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
          <p className="mt-1 text-[11px] text-[var(--text-soft,#7a8896)]">
            {comanda.garcomNome ? `Garçom ${comanda.garcomNome}` : 'Garçom não identificado'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Total final</p>
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

      {open ? (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-4">
          {comanda.itens.length === 0 ? (
            <div className="mb-4 px-1 py-2 text-xs text-[var(--text-soft,#7a8896)]">
              Nenhum item detalhado nesta visualização. Totais mantidos pelo backend.
            </div>
          ) : (
            <ul className="mb-4 divide-y divide-[var(--border)]">
              {comanda.itens.map((item, idx) => (
                <li className="flex items-start justify-between gap-3 py-3" key={`${item.produtoId}-${idx}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {item.quantidade}× {item.nome}
                    </p>
                    {item.observacao ? (
                      <p className="mt-1 text-[11px] italic text-[var(--text-soft,#7a8896)]">{`"${item.observacao}"`}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                    {formatCurrency(item.quantidade * item.precoUnitario)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[var(--text-soft,#7a8896)]">
              <span>Garçom</span>
              <span>{comanda.garcomNome ?? 'Não identificado'}</span>
            </div>
            <div className="flex justify-between text-[var(--text-soft,#7a8896)]">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {comanda.desconto > 0 ? (
              <div className="flex justify-between text-[#f87171]">
                <span>Desconto ({comanda.desconto}%)</span>
                <span>– {formatCurrency(descontoVal)}</span>
              </div>
            ) : null}
            {comanda.acrescimo > 0 ? (
              <div className="flex justify-between text-[#fb923c]">
                <span>Serviço ({comanda.acrescimo}%)</span>
                <span>+ {formatCurrency(acrescimoVal)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-[var(--border)] pt-3 font-semibold text-[var(--text-primary)]">
              <span>Total final</span>
              <span style={{ color: badge.color }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function slugify(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')
}
