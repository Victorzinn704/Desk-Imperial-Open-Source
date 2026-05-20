import { LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { EquipeSignalsPanelProps } from './equipe-environment-panel.types'

export function EquipeSignalsPanel({
  averageTicket,
  currency,
  rows,
  totalCommission,
}: Readonly<EquipeSignalsPanelProps>) {
  const totalPayout = rows.reduce((sum, row) => sum + row.payout, 0)
  const noLogin = rows.filter((row) => !row.employee.hasLogin).length
  const noRevenue = rows.filter((row) => row.revenue <= 0).length
  const items = [
    { label: 'folha estimada', tone: 'info' as const, value: formatCurrency(totalPayout, currency) },
    {
      label: 'comissao projetada',
      tone: totalCommission > 0 ? ('success' as const) : ('neutral' as const),
      value: formatCurrency(totalCommission, currency),
    },
    {
      label: 'ticket medio equipe',
      tone: averageTicket > 0 ? ('info' as const) : ('neutral' as const),
      value: formatCurrency(averageTicket, currency),
    },
    {
      label: 'sem acesso web',
      tone: noLogin > 0 ? ('warning' as const) : ('success' as const),
      value: String(noLogin),
    },
    {
      label: 'sem receita atribuida',
      tone: noRevenue > 0 ? ('warning' as const) : ('success' as const),
      value: String(noRevenue),
    },
  ]

  return (
    <LabPanel padding="md" title="Radar da equipe">
      <div className="space-y-1">
        {items.map((item) => (
          <div
            className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0"
            key={item.label}
          >
            <p className="text-sm font-medium text-[var(--lab-fg)]">{item.label}</p>
            <LabStatusPill tone={item.tone}>{item.value}</LabStatusPill>
          </div>
        ))}
      </div>
    </LabPanel>
  )
}
