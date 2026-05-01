'use client'

import type { OperationsLiveResponse } from '@contracts/contracts'
import { Landmark, LoaderCircle } from 'lucide-react'
import { formatBRL } from '@/lib/currency'

type OwnerCashViewProps = Readonly<{
  data: OperationsLiveResponse | undefined
  errorMessage: string | null
  isBusy: boolean
  isLoading: boolean
  isOffline: boolean
  onOpenCash: () => void
  onOpenFullCash: () => void
}>

type CashRow = {
  id: string
  employeeName: string
  expectedCashAmount: number
  grossRevenueAmount: number
  openingCashAmount: number
  status: 'OPEN' | 'CLOSED' | 'FORCE_CLOSED'
}

function buildCashRows(data: OperationsLiveResponse | undefined): CashRow[] {
  if (!data) {
    return []
  }

  const rows: CashRow[] = []

  for (const group of [data.unassigned, ...data.employees]) {
    if (!group.cashSession) {
      continue
    }

    rows.push({
      id: group.cashSession.id,
      employeeName: group.displayName,
      expectedCashAmount: group.cashSession.expectedCashAmount,
      grossRevenueAmount: group.cashSession.grossRevenueAmount,
      openingCashAmount: group.cashSession.openingCashAmount,
      status: group.cashSession.status,
    })
  }

  return rows
}

export function OwnerCashView({
  data,
  errorMessage,
  isBusy,
  isLoading,
  isOffline,
  onOpenCash,
  onOpenFullCash,
}: OwnerCashViewProps) {
  const rows = buildCashRows(data)
  const openRows = rows.filter((row) => row.status === 'OPEN')
  const totalExpected = openRows.reduce((sum, row) => sum + row.expectedCashAmount, 0)
  const totalRevenue = openRows.reduce((sum, row) => sum + row.grossRevenueAmount, 0)
  const closure = data?.closure ?? null

  return (
    <div className="space-y-4 p-3 pb-[8.5rem]">
      {errorMessage ? (
        <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
          {errorMessage}
        </div>
      ) : isOffline ? (
        <div className="rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
          Você está offline. O caixa pode estar desatualizado até a reconexão.
        </div>
      ) : null}

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Caixa</p>
            <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Caixa do turno</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
              Abra o caixa, acompanhe esperado e veja quais operadores estão com sessão ativa.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
            {openRows.length} aberto{openRows.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
          <CashMetric label="esperado" value={formatBRL(closure?.expectedCashAmount ?? totalExpected)} />
          <CashMetric label="realizado" value={formatBRL(closure?.grossRevenueAmount ?? totalRevenue)} />
          <CashMetric label="sessões" value={String(openRows.length)} />
          <CashMetric label="comandas" value={String(closure?.openComandasCount ?? 0)} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[var(--accent,#008cff)] px-4 py-3 text-sm font-semibold text-[var(--on-accent,#fff)] transition active:scale-[0.98] disabled:opacity-50"
            disabled={isBusy}
            type="button"
            onClick={onOpenCash}
          >
            {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Landmark className="size-4" />}
            Abrir caixa
          </button>
          <button
            className="flex min-h-12 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition active:scale-[0.98]"
            type="button"
            onClick={onOpenFullCash}
          >
            Caixa completo
          </button>
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
            Sessões ativas
          </p>
        </div>

        {isLoading && rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-soft)]">Carregando caixa...</div>
        ) : rows.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <div className="flex items-center justify-between gap-3 px-4 py-3" key={row.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{row.employeeName}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-soft)]">
                    abertura {formatBRL(row.openingCashAmount)} · vendas {formatBRL(row.grossRevenueAmount)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatBRL(row.expectedCashAmount)}
                  </p>
                  <p className="mt-1 text-[10px] text-[#36f57c]">{row.status === 'OPEN' ? 'aberto' : 'fechado'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-soft)]">
            Nenhum caixa aberto agora. Use o botão acima para iniciar o turno.
          </div>
        )}
      </section>
    </div>
  )
}

function CashMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface-muted)] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}
