import { Trophy } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { buildRankingHeadline, slugifyHistoricoCard } from './mobile-historico-view.helpers'
import type { OperationPerformerStanding } from '@/lib/operations'

type MobileHistoricoSummary = {
  receitaRealizada: number
  receitaEsperada: number
  openComandasCount: number
  ranking?: OperationPerformerStanding
}

export function MobileHistoricoSummaryPanel({
  summary,
}: Readonly<{
  summary: MobileHistoricoSummary
}>) {
  const rankingHeadline = buildRankingHeadline(summary.ranking)
  const items = buildSummaryItems(summary)

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
            Histórico próprio
          </p>
          <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Suas vendas e atendimentos</h1>
          <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
            Fechamentos atribuídos a você, com posição no turno e leitura curta do que ainda está em aberto.
          </p>
        </div>
        {summary.ranking?.position ? (
          <span className="shrink-0 rounded-full border border-[rgba(0,140,255,0.22)] bg-[rgba(0,140,255,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent,#008cff)]">
            {summary.ranking.position}º no turno
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
        {items.map((item) => (
          <div
            className="bg-[var(--surface-muted)] px-3 py-3"
            data-testid={`summary-card-${slugifyHistoricoCard(item.label)}`}
            key={item.label}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft,#7a8896)]">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold" style={{ color: item.tone }}>
              {item.value}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{item.hint}</p>
          </div>
        ))}
      </div>

      {rankingHeadline ? (
        <HistoricoRankingBanner description={rankingHeadline.description} title={rankingHeadline.title} />
      ) : null}
    </section>
  )
}

function buildSummaryItems(summary: MobileHistoricoSummary) {
  return [
    {
      hint: 'vendas fechadas por você',
      label: 'Receita realizada',
      tone: '#36f57c',
      value: formatCurrency(summary.receitaRealizada),
    },
    {
      hint:
        summary.openComandasCount > 0
          ? `${summary.openComandasCount} comanda${summary.openComandasCount !== 1 ? 's' : ''} em aberto`
          : 'sem comanda aberta agora',
      label: 'Receita esperada',
      tone: '#60a5fa',
      value: formatCurrency(summary.receitaEsperada),
    },
    {
      hint: summary.ranking?.totalPerformers
        ? `${summary.ranking.totalPerformers} pessoas no turno`
        : 'sem ranking útil',
      label: 'Posição',
      tone: '#fbbf24',
      value: summary.ranking?.position ? `${summary.ranking.position}º` : '—',
    },
  ]
}

function HistoricoRankingBanner({
  description,
  title,
}: Readonly<{
  description: string
  title: string
}>) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.12)] text-[#fbbf24]">
        <Trophy className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft,#7a8896)]">
          Ranking do turno
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{description}</p>
      </div>
    </div>
  )
}
