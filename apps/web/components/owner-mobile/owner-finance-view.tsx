'use client'

import { ArrowUpRight, BarChart3, Receipt, Wallet } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'

export function OwnerFinanceView({
  caixaEsperado,
  errorMessage,
  isOffline,
  lucroRealizado,
  onOpenCash,
  onOpenFinanceiro,
  ticketMedio,
  todayOrderCount,
  todayRevenue,
}: Readonly<{
  caixaEsperado: number
  errorMessage: string | null
  isOffline: boolean
  lucroRealizado: number
  onOpenCash: () => void
  onOpenFinanceiro: () => void
  ticketMedio: number
  todayOrderCount: number
  todayRevenue: number
}>) {
  const marginPercent = todayRevenue > 0 ? (lucroRealizado / todayRevenue) * 100 : 0
  const priority = buildFinancePriority({ caixaEsperado, lucroRealizado, todayOrderCount, todayRevenue })

  return (
    <div className="space-y-4 p-3 pb-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
          {errorMessage}
        </div>
      ) : isOffline ? (
        <div className="rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
          Você está offline. Os valores financeiros podem estar desatualizados até a reconexão.
        </div>
      ) : null}

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Financeiro</p>
            <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Resumo móvel do caixa</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">{priority.headline}</p>
          </div>
          <span
            className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{
              color: priority.color,
              borderColor: priority.border,
              background: priority.background,
            }}
          >
            {priority.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
          {[
            { label: 'Receita', value: formatCurrency(todayRevenue), sub: 'turno atual', Icon: Wallet, color: '#36f57c' },
            { label: 'Lucro', value: formatCurrency(lucroRealizado), sub: 'resultado do recorte', Icon: BarChart3, color: '#60a5fa' },
            { label: 'Ticket médio', value: formatCurrency(ticketMedio), sub: `${todayOrderCount} pedidos`, Icon: Receipt, color: '#fb923c' },
            { label: 'Caixa esperado', value: formatCurrency(caixaEsperado), sub: 'projeção do turno', Icon: Wallet, color: '#a78bfa' },
          ].map(({ label, value, sub, Icon, color }) => (
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

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            `${todayOrderCount} pedidos convertidos`,
            marginPercent > 0 ? `margem ${formatPercent(marginPercent)}` : 'margem sem leitura útil',
            caixaEsperado > 0 ? 'caixa pronto para conferência' : 'sem caixa projetado ainda',
          ].map((label) => (
            <span
              className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Próximas ações</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">Use o mobile para controle rápido. A análise densa continua no desktop.</p>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {[
            {
              label: 'Caixa do turno',
              description: 'Abertura, conferência e fechamento do caixa atual.',
              onClick: onOpenCash,
              accent: '#36f57c',
            },
            {
              label: 'Financeiro completo',
              description: 'Movimentação, fluxo, DRE e mapa territorial.',
              onClick: onOpenFinanceiro,
              accent: '#008cff',
            },
          ].map(({ label, description, onClick, accent }) => (
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-[var(--surface-muted)]"
              key={label}
              type="button"
              onClick={onClick}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  color: accent,
                  borderColor: `${accent}33`,
                  background: `${accent}14`,
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
          ))}
        </div>
      </section>
    </div>
  )
}

function buildFinancePriority({
  caixaEsperado,
  lucroRealizado,
  todayOrderCount,
  todayRevenue,
}: {
  caixaEsperado: number
  lucroRealizado: number
  todayOrderCount: number
  todayRevenue: number
}) {
  if (todayOrderCount === 0 && todayRevenue <= 0) {
    return {
      label: 'sem giro',
      headline: 'Ainda não houve conversão financeira no turno. O foco aqui é abrir caixa ou iniciar a venda.',
      color: '#fbbf24',
      border: 'rgba(251,191,36,0.22)',
      background: 'rgba(251,191,36,0.1)',
    }
  }

  if (caixaEsperado <= 0) {
    return {
      label: 'atenção',
      headline: 'Há movimento no turno, mas o caixa esperado ainda está sem leitura útil para conferência.',
      color: '#fb923c',
      border: 'rgba(251,146,60,0.22)',
      background: 'rgba(251,146,60,0.1)',
    }
  }

  if (lucroRealizado > 0) {
    return {
      label: 'saudável',
      headline: 'Receita, lucro e caixa já formam uma leitura consistente para o acompanhamento móvel do turno.',
      color: '#36f57c',
      border: 'rgba(54,245,124,0.22)',
      background: 'rgba(54,245,124,0.1)',
    }
  }

  return {
    label: 'monitorar',
    headline: 'O turno já tem movimento, mas ainda precisa de mais leitura antes do fechamento financeiro.',
    color: '#60a5fa',
    border: 'rgba(96,165,250,0.22)',
    background: 'rgba(96,165,250,0.1)',
  }
}

function formatPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0%'
  }

  return `${value.toFixed(1).replace('.', ',')}%`
}
