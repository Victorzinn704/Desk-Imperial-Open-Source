import { LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { EquipePeriodPanelProps } from './equipe-environment-panel.types'

export function EquipePeriodPanel({
  averageTicket,
  currency,
  highlightedRow,
  rows,
  totalPayout,
  totalRevenue,
}: Readonly<EquipePeriodPanelProps>) {
  const rowsData = buildEquipePeriodRows({ averageTicket, currency, highlightedRow, totalPayout, totalRevenue })

  return (
    <LabPanel
      action={<LabStatusPill tone="info">{rows.length} ativos</LabStatusPill>}
      padding="md"
      title="Leitura da equipe"
    >
      <div className="space-y-0">
        {rowsData.map((row) => (
          <EquipePeriodRow key={row.label} {...row} />
        ))}
      </div>
    </LabPanel>
  )
}

function buildEquipePeriodRows({
  averageTicket,
  currency,
  highlightedRow,
  totalPayout,
  totalRevenue,
}: Omit<EquipePeriodPanelProps, 'rows'>) {
  return [
    {
      label: 'receita atribuída',
      note: 'consolidado da equipe ativa',
      tone: totalRevenue > 0 ? 'success' : 'neutral',
      value: formatCurrency(totalRevenue, currency),
    },
    {
      label: 'folha estimada',
      note: 'base salarial com comissões',
      tone: 'info',
      value: formatCurrency(totalPayout, currency),
    },
    {
      label: 'ticket médio',
      note: 'média por pedido atribuído',
      tone: averageTicket > 0 ? 'info' : 'neutral',
      value: formatCurrency(averageTicket, currency),
    },
    {
      label: 'destaque',
      note: 'quem mais puxa a operação',
      tone: highlightedRow?.revenue ? 'success' : 'neutral',
      value: highlightedRow?.employee.displayName ?? 'sem leitura',
    },
  ] as const
}

function EquipePeriodRow({
  label,
  note,
  tone,
  value,
}: Readonly<{ label: string; note: string; tone: 'success' | 'neutral' | 'info'; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--lab-fg)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{note}</p>
      </div>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}
