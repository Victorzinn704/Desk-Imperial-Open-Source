'use client'

import { ArrowUpRight, BarChart3, Receipt, Wallet } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'
import {
  buildFinanceMarginPercent,
  buildFinancePriority,
  buildFinanceStatusMessage,
  formatPercent,
  type OwnerFinanceViewProps,
} from './owner-finance-view-model'

export function OwnerFinanceStatusBanner({
  errorMessage,
  isOffline,
}: Pick<OwnerFinanceViewProps, 'errorMessage' | 'isOffline'>) {
  const status = buildFinanceStatusMessage({ errorMessage, isOffline })

  if (!status) {
    return null
  }

  return (
    <div className={`rounded-2xl border px-4 py-3 text-xs ${status.border} ${status.surface} ${status.tone}`}>
      {status.description}
    </div>
  )
}

export function OwnerFinanceHero({
  caixaEsperado,
  lucroRealizado,
  ticketMedio,
  todayOrderCount,
  todayRevenue,
}: Pick<
  OwnerFinanceViewProps,
  'caixaEsperado' | 'lucroRealizado' | 'ticketMedio' | 'todayOrderCount' | 'todayRevenue'
>) {
  const priority = buildFinancePriority({ caixaEsperado, lucroRealizado, todayOrderCount, todayRevenue })
  const marginPercent = buildFinanceMarginPercent(lucroRealizado, todayRevenue)

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <OwnerFinanceHeroHeader headline={priority.headline} priority={priority} />
      <OwnerFinanceHeroMetrics
        caixaEsperado={caixaEsperado}
        lucroRealizado={lucroRealizado}
        ticketMedio={ticketMedio}
        todayOrderCount={todayOrderCount}
        todayRevenue={todayRevenue}
      />
      <OwnerFinanceHeroChips
        caixaEsperado={caixaEsperado}
        marginPercent={marginPercent}
        todayOrderCount={todayOrderCount}
      />
    </section>
  )
}

function OwnerFinanceHeroHeader({
  headline,
  priority,
}: {
  headline: string
  priority: ReturnType<typeof buildFinancePriority>
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Financeiro</p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Resumo móvel do caixa</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">{headline}</p>
      </div>
      <span
        className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{
          background: priority.background,
          borderColor: priority.border,
          color: priority.color,
        }}
      >
        {priority.label}
      </span>
    </div>
  )
}

function OwnerFinanceHeroMetrics({
  caixaEsperado,
  lucroRealizado,
  ticketMedio,
  todayOrderCount,
  todayRevenue,
}: Pick<
  OwnerFinanceViewProps,
  'caixaEsperado' | 'lucroRealizado' | 'ticketMedio' | 'todayOrderCount' | 'todayRevenue'
>) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
      {[
        { Icon: Wallet, color: '#36f57c', label: 'Receita', sub: 'turno atual', value: formatCurrency(todayRevenue) },
        {
          Icon: BarChart3,
          color: '#60a5fa',
          label: 'Lucro',
          sub: 'resultado do recorte',
          value: formatCurrency(lucroRealizado),
        },
        {
          Icon: Receipt,
          color: '#fb923c',
          label: 'Ticket médio',
          sub: `${todayOrderCount} pedidos`,
          value: formatCurrency(ticketMedio),
        },
        {
          Icon: Wallet,
          color: '#a78bfa',
          label: 'Caixa esperado',
          sub: 'projeção do turno',
          value: formatCurrency(caixaEsperado),
        },
      ].map(({ Icon, color, label, sub, value }) => (
        <div className="bg-[var(--surface-muted)] p-3.5" key={label}>
          <div className="mb-1 flex items-center gap-1.5">
            <Icon className="size-3.5" style={{ color }} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
          </div>
          <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
          <p className="mt-1 text-[10px] text-[var(--text-soft)]">{sub}</p>
        </div>
      ))}
    </div>
  )
}

function OwnerFinanceHeroChips({
  caixaEsperado,
  marginPercent,
  todayOrderCount,
}: {
  caixaEsperado: number
  marginPercent: number
  todayOrderCount: number
}) {
  const chips = [
    `${todayOrderCount} pedidos convertidos`,
    marginPercent > 0 ? `margem ${formatPercent(marginPercent)}` : 'margem sem leitura útil',
    caixaEsperado > 0 ? 'caixa pronto para conferência' : 'sem caixa projetado ainda',
  ]

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map((label) => (
        <span
          className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]"
          key={label}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

export function OwnerFinanceActions({
  onOpenCash,
  onOpenFinanceiro,
}: Pick<OwnerFinanceViewProps, 'onOpenCash' | 'onOpenFinanceiro'>) {
  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Próximas ações
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
          Use o mobile para controle rápido. A análise densa continua no desktop.
        </p>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {[
          {
            accent: '#36f57c',
            description: 'Abertura, conferência e fechamento do caixa atual.',
            label: 'Caixa do turno',
            onClick: onOpenCash,
          },
          {
            accent: '#008cff',
            description: 'Movimentação, fluxo, DRE e mapa territorial.',
            label: 'Financeiro completo',
            onClick: onOpenFinanceiro,
          },
        ].map(({ accent, description, label, onClick }) => (
          <OwnerFinanceActionRow
            accent={accent}
            description={description}
            key={label}
            label={label}
            onClick={onClick}
          />
        ))}
      </div>
    </section>
  )
}

function OwnerFinanceActionRow({
  accent,
  description,
  label,
  onClick,
}: {
  accent: string
  description: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[var(--surface-muted)]"
      type="button"
      onClick={onClick}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
        style={{
          background: `${accent}14`,
          borderColor: `${accent}33`,
          color: accent,
        }}
      >
        <ArrowUpRight className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        <span className="mt-1 block text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{description}</span>
      </span>
      <span className="text-xs font-semibold text-[var(--text-soft)]">Abrir</span>
    </button>
  )
}
