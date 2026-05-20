import { LabEmptyState, LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { EquipeRankingPanelProps } from './equipe-environment-panel.types'

export function EquipeRankingPanel({ currency, rows }: Readonly<EquipeRankingPanelProps>) {
  const sortedRows = [...rows].sort((left, right) => right.revenue - left.revenue || right.orders - left.orders)
  const topRevenue = sortedRows[0]?.revenue ?? 0

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{sortedRows.length} pessoas</LabStatusPill>}
      padding="md"
      title="Quem puxa a operacao"
    >
      {sortedRows.length > 0 ? (
        <div className="space-y-1">
          {sortedRows.slice(0, 5).map((row, index) => (
            <EquipeRankingRow
              active={row.employee.active}
              averageTicket={row.averageTicket}
              currency={currency}
              employeeCode={row.employee.employeeCode}
              employeeName={row.employee.displayName}
              hasLogin={row.employee.hasLogin}
              index={index}
              key={row.employee.id}
              orders={row.orders}
              payout={row.payout}
              progress={topRevenue > 0 ? (row.revenue / topRevenue) * 100 : 0}
              revenue={row.revenue}
            />
          ))}
        </div>
      ) : (
        <LabEmptyState
          compact
          description="Cadastre colaboradores para liberar o ranking da equipe."
          title="Equipe sem leitura operacional"
        />
      )}
    </LabPanel>
  )
}

function EquipeRankingRow({
  active,
  averageTicket,
  currency,
  employeeCode,
  employeeName,
  hasLogin,
  index,
  orders,
  payout,
  progress,
  revenue,
}: Readonly<{
  active: boolean
  averageTicket: number
  currency: EquipeRankingPanelProps['currency']
  employeeCode: string
  employeeName: string
  hasLogin: boolean
  index: number
  orders: number
  payout: number
  progress: number
  revenue: number
}>) {
  return (
    <div className="border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <EquipeRankingIdentity
          active={active}
          averageTicket={averageTicket}
          currency={currency}
          employeeCode={employeeCode}
          employeeName={employeeName}
          hasLogin={hasLogin}
          index={index}
          orders={orders}
        />
        <EquipeRankingAmounts currency={currency} payout={payout} revenue={revenue} />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
        <div className="h-full rounded-full bg-[var(--lab-blue)]" style={{ width: `${Math.max(progress, 8)}%` }} />
      </div>
    </div>
  )
}

function EquipeRankingIdentity({
  active,
  averageTicket,
  currency,
  employeeCode,
  employeeName,
  hasLogin,
  index,
  orders,
}: Readonly<{
  active: boolean
  averageTicket: number
  currency: EquipeRankingPanelProps['currency']
  employeeCode: string
  employeeName: string
  hasLogin: boolean
  index: number
  orders: number
}>) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <LabStatusPill tone={index === 0 ? 'success' : 'neutral'}>#{index + 1}</LabStatusPill>
        <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{employeeName}</p>
        <LabStatusPill tone={active ? 'success' : 'neutral'}>{active ? 'ativo' : 'inativo'}</LabStatusPill>
        <LabStatusPill tone={hasLogin ? 'info' : 'neutral'}>{hasLogin ? 'com acesso' : 'sem acesso'}</LabStatusPill>
      </div>
      <p className="mt-2 text-sm text-[var(--lab-fg-soft)]">
        {employeeCode} · {orders} pedidos · ticket medio {formatCurrency(averageTicket, currency)}
      </p>
    </div>
  )
}

function EquipeRankingAmounts({
  currency,
  payout,
  revenue,
}: Readonly<{ currency: EquipeRankingPanelProps['currency']; payout: number; revenue: number }>) {
  return (
    <div className="text-left md:text-right">
      <p className="text-sm font-semibold text-[var(--lab-fg)]">{formatCurrency(revenue, currency)}</p>
      <p className="mt-1 text-xs text-[var(--lab-fg-muted)]">pagamento estimado {formatCurrency(payout, currency)}</p>
    </div>
  )
}
