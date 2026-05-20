import { IdCard } from 'lucide-react'
import { LabEmptyState, LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { EquipeCurrency, EquipeRow } from './equipe-environment.types'
import { EquipeSignalRow } from './equipe-environment-shared'

export function ProfileSpotlight({
  currency,
  row,
}: Readonly<{
  currency: EquipeCurrency
  row: EquipeRow | null
}>) {
  if (!row) {
    return (
      <LabEmptyState
        description="Selecione um colaborador ativo."
        icon={IdCard}
        title="Sem colaborador para detalhar"
      />
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <ProfileMainPanel currency={currency} row={row} />
      <ProfileSignalsPanel row={row} />
    </div>
  )
}

function ProfileMainPanel({
  currency,
  row,
}: Readonly<{
  currency: EquipeCurrency
  row: EquipeRow
}>) {
  return (
    <LabPanel padding="md" title="Perfil em foco">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-semibold text-[var(--lab-fg)]">{row.employee.displayName}</p>
            <LabStatusPill tone={row.employee.active ? 'success' : 'neutral'}>
              {row.employee.active ? 'ativo' : 'inativo'}
            </LabStatusPill>
            <LabStatusPill tone={row.employee.hasLogin ? 'info' : 'neutral'}>
              {row.employee.hasLogin ? 'com acesso' : 'sem acesso'}
            </LabStatusPill>
          </div>
          <p className="mt-2 text-sm text-[var(--lab-fg-soft)]">
            Codigo {row.employee.employeeCode} · comissao configurada em {row.employee.percentualVendas}% sobre vendas.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ProfileDetail label="salario base" value={formatCurrency(row.baseSalary, currency)} />
            <ProfileDetail label="comissao projetada" value={formatCurrency(row.commission, currency)} />
            <ProfileDetail label="receita atribuida" value={formatCurrency(row.revenue, currency)} />
            <ProfileDetail label="lucro atribuido" value={formatCurrency(row.profit, currency)} />
          </div>
        </div>
        <div className="border-t border-dashed border-[var(--lab-border)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Radar do colaborador</p>
          <div className="mt-4 space-y-3">
            <EquipeSignalRow label="pedidos" tone="neutral" value={String(row.orders)} />
            <EquipeSignalRow label="ticket medio" tone="info" value={formatCurrency(row.averageTicket, currency)} />
            <EquipeSignalRow label="pagamento estimado" tone="success" value={formatCurrency(row.payout, currency)} />
          </div>
        </div>
      </div>
    </LabPanel>
  )
}

function ProfileSignalsPanel({ row }: Readonly<{ row: EquipeRow }>) {
  return (
    <LabPanel padding="md" title="Sinais do perfil">
      <div className="space-y-3">
        <EquipeSignalRow
          label="acesso ao sistema"
          tone={row.employee.hasLogin ? 'info' : 'warning'}
          value={row.employee.hasLogin ? 'habilitado' : 'pendente'}
        />
        <EquipeSignalRow
          label="status"
          tone={row.employee.active ? 'success' : 'neutral'}
          value={row.employee.active ? 'ativo' : 'inativo'}
        />
        <EquipeSignalRow
          label="ritmo comercial"
          tone={row.revenue > 0 ? 'success' : 'neutral'}
          value={row.revenue > 0 ? 'com leitura' : 'sem vendas ainda'}
        />
      </div>
    </LabPanel>
  )
}

function ProfileDetail({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[14px] border border-dashed border-[var(--lab-border)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}
