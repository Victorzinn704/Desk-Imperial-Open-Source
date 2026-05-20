import { LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { EquipeRadarPanelProps } from './equipe-environment-panel.types'
import { EquipeMiniStat, EquipeSignalRow } from './equipe-environment-shared'

export function EquipeRadarPanel({
  averageTicket,
  currency,
  highlightedRow,
  rows,
  totalCommission,
}: Readonly<EquipeRadarPanelProps>) {
  const withLogin = rows.filter((row) => row.employee.hasLogin).length
  const noRevenue = rows.filter((row) => row.revenue <= 0).length
  const sortedRows = [...rows].sort((left, right) => right.revenue - left.revenue || right.orders - left.orders)

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{sortedRows.length} registros</LabStatusPill>}
      padding="md"
      title="Radar da equipe"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_280px]">
        <EquipeRadarMain
          averageTicket={averageTicket}
          currency={currency}
          highlightedRow={highlightedRow}
          rows={sortedRows}
          totalCommission={totalCommission}
        />
        <div className="space-y-4 border-t border-dashed border-[var(--lab-border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <EquipeSignalRow
            label="acesso web"
            tone={withLogin === rows.length && rows.length > 0 ? 'success' : 'warning'}
            value={`${withLogin}/${rows.length || 0}`}
          />
          <EquipeSignalRow label="sem receita" tone={noRevenue > 0 ? 'warning' : 'success'} value={String(noRevenue)} />
          <EquipeSignalRow
            label="comissão"
            tone={totalCommission > 0 ? 'success' : 'neutral'}
            value={formatCurrency(totalCommission, currency)}
          />
          <EquipeSignalRow
            label="líder"
            tone={highlightedRow?.revenue ? 'info' : 'neutral'}
            value={highlightedRow?.employee.displayName ?? 'sem leitura'}
          />
        </div>
      </div>
    </LabPanel>
  )
}

function EquipeRadarMain({
  averageTicket,
  currency,
  highlightedRow,
  rows,
  totalCommission,
}: Readonly<EquipeRadarPanelProps>) {
  const withLogin = rows.filter((row) => row.employee.hasLogin).length

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <EquipeMiniStat label="ticket médio" value={formatCurrency(averageTicket, currency)} />
        <EquipeMiniStat label="comissão" value={formatCurrency(totalCommission, currency)} />
        <EquipeMiniStat label="com acesso" value={`${withLogin}/${rows.length || 0}`} />
        <EquipeMiniStat label="destaque" value={highlightedRow?.employee.employeeCode ?? 'sem leitura'} />
      </div>
      <div className="space-y-1">
        {rows.slice(0, 4).map((row) => (
          <EquipeRadarRow
            currency={currency}
            employeeCode={row.employee.employeeCode}
            employeeName={row.employee.displayName}
            key={row.employee.id}
            orders={row.orders}
            revenue={row.revenue}
          />
        ))}
      </div>
    </div>
  )
}

function EquipeRadarRow({
  currency,
  employeeCode,
  employeeName,
  orders,
  revenue,
}: Readonly<{
  currency: EquipeRadarPanelProps['currency']
  employeeCode: string
  employeeName: string
  orders: number
  revenue: number
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{employeeName}</p>
        <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
          {orders} pedidos · {employeeCode}
        </p>
      </div>
      <LabStatusPill tone="info">{formatCurrency(revenue, currency)}</LabStatusPill>
    </div>
  )
}
