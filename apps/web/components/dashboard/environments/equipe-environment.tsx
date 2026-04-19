'use client'

import { BadgeDollarSign, IdCard, ShieldCheck, TrendingUp, Users, Wallet } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import {
  LabEmptyState,
  LabMetric,
  LabPageHeader,
  LabPanel,
  LabStatusPill,
  LabTable,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { PayrollEnvironment } from '@/components/dashboard/payroll-environment'
import type { EmployeeRecord } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'

type EquipeView = 'cards' | 'folha' | 'perfil'

type EquipeRow = {
  employee: EmployeeRecord
  baseSalary: number
  commission: number
  payout: number
  revenue: number
  orders: number
  averageTicket: number
  profit: number
}

const viewCopy: Record<EquipeView, { eyebrow: string; title: string; description: string }> = {
  cards: {
    eyebrow: 'Equipe ativa',
    title: 'Equipe e desempenho',
    description: 'Uma leitura operacional da equipe, com receita atribuida, acesso ao sistema e previsao de folha sem visual legado vazando.',
  },
  folha: {
    eyebrow: 'Gestao salarial',
    title: 'Folha da equipe',
    description: 'Configuracao salarial, comissoes e status de fechamento no padrao do design-lab.',
  },
  perfil: {
    eyebrow: 'Perfil individual',
    title: 'Leitura por colaborador',
    description: 'Foco em um colaborador por vez, mantendo dados reais e uma superficie desktop coerente com o lab.',
  },
}

export function EquipeEnvironment({
  activeTab,
  employees,
  finance,
}: Readonly<{
  activeTab: DashboardTabId | null
  employees: EmployeeRecord[]
  finance?: FinanceSummaryResponse
}>) {
  const view = resolveEquipeView(activeTab)

  if (view === 'folha') {
    return <PayrollEnvironment employees={employees} finance={finance} />
  }

  const copy = viewCopy[view]
  const currency = finance?.displayCurrency ?? 'BRL'
  const rows = buildEquipeRows(employees, finance)
  const activeRows = rows.filter((row) => row.employee.active)
  const highlightedRow = resolveHighlightedRow(activeRows)
  const totalRevenue = activeRows.reduce((sum, row) => sum + row.revenue, 0)
  const totalOrders = activeRows.reduce((sum, row) => sum + row.orders, 0)
  const totalPayout = activeRows.reduce((sum, row) => sum + row.payout, 0)
  const totalCommission = activeRows.reduce((sum, row) => sum + row.commission, 0)
  const averageTicket = totalOrders > 0 ? totalRevenue / Math.max(1, totalOrders) : 0
  const loginCoverage = activeRows.length > 0 ? (activeRows.filter((row) => row.employee.hasLogin).length / activeRows.length) * 100 : 0

  return (
    <section className="space-y-5">
      <LabPageHeader
        description={copy.description}
        eyebrow={copy.eyebrow}
        meta={<EquipeMetaSummary highlightedRow={highlightedRow} rows={activeRows} />}
        title={copy.title}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EquipeMetricTile
          hint="colaboradores ativos no workspace"
          icon={Users}
          label="ativos"
          progress={activeRows.length > 0 ? 100 : 0}
          value={String(activeRows.length)}
        />
        <EquipeMetricTile
          hint="receita atribuida no consolidado atual"
          icon={BadgeDollarSign}
          label="receita atribuida"
          tone={totalRevenue > 0 ? 'success' : 'neutral'}
          value={formatCurrency(totalRevenue, currency)}
        />
        <EquipeMetricTile
          hint="valor estimado entre salario base e comissao"
          icon={Wallet}
          label="folha estimada"
          tone="info"
          value={formatCurrency(totalPayout, currency)}
        />
        <EquipeMetricTile
          hint="cobertura de acesso no desktop"
          icon={ShieldCheck}
          label="acesso habilitado"
          progress={loginCoverage}
          tone={loginCoverage >= 80 ? 'success' : 'warning'}
          value={
            activeRows.length > 0
              ? `${activeRows.filter((row) => row.employee.hasLogin).length}/${activeRows.length}`
              : '0/0'
          }
        />
      </div>

      {view === 'cards' ? (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <EquipeRankingPanel currency={currency} rows={activeRows} />
            <EquipeSignalsPanel
              averageTicket={averageTicket}
              currency={currency}
              rows={activeRows}
              totalCommission={totalCommission}
            />
          </div>
          <EquipeDirectoryPanel currency={currency} rows={rows} />
        </>
      ) : (
        <ProfileSpotlight currency={currency} row={highlightedRow} />
      )}
    </section>
  )
}

function resolveEquipeView(activeTab: DashboardTabId | null): EquipeView {
  if (activeTab === 'folha') {
    return 'folha'
  }

  if (activeTab === 'perfil') {
    return 'perfil'
  }

  return 'cards'
}

function buildEquipeRows(employees: EmployeeRecord[], finance?: FinanceSummaryResponse): EquipeRow[] {
  return employees.map((employee) => {
    const financeRow = finance?.topEmployees.find(
      (row) => row.employeeId === employee.id || row.employeeCode === employee.employeeCode,
    )
    const baseSalary = employee.salarioBase / 100
    const revenue = financeRow?.revenue ?? 0
    const commission = (revenue * employee.percentualVendas) / 100

    return {
      employee,
      baseSalary,
      commission,
      payout: baseSalary + commission,
      revenue,
      orders: financeRow?.orders ?? 0,
      averageTicket: financeRow?.averageTicket ?? 0,
      profit: financeRow?.profit ?? 0,
    }
  })
}

function resolveHighlightedRow(rows: EquipeRow[]) {
  if (rows.length === 0) {
    return null
  }

  return [...rows].sort((left, right) => right.revenue - left.revenue || right.orders - left.orders)[0] ?? rows[0]
}

function EquipeMetaSummary({
  highlightedRow,
  rows,
}: Readonly<{
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
}>) {
  const items = [
    { label: 'ativos', value: String(rows.length), tone: 'neutral' as const },
    {
      label: 'com acesso',
      value: String(rows.filter((row) => row.employee.hasLogin).length),
      tone: rows.some((row) => row.employee.hasLogin) ? ('info' as const) : ('neutral' as const),
    },
    {
      label: 'destaque',
      value: highlightedRow ? highlightedRow.employee.displayName : 'sem leitura',
      tone: highlightedRow?.revenue ? ('success' as const) : ('neutral' as const),
    },
  ]

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0"
          key={item.label}
        >
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{item.label}</span>
          <LabStatusPill tone={item.tone}>{item.value}</LabStatusPill>
        </div>
      ))}
    </div>
  )
}

function EquipeMetricTile({
  hint,
  icon,
  label,
  progress,
  tone = 'info',
  value,
}: Readonly<{
  hint: string
  icon: typeof Users
  label: string
  progress?: number
  tone?: LabStatusTone
  value: string
}>) {
  return (
    <LabMetric
      className="h-full"
      delta={toneLabel(tone)}
      deltaTone={tone}
      hint={hint}
      icon={icon}
      label={label}
      progress={progress}
      value={value}
    />
  )
}

function toneLabel(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return 'saudavel'
    case 'warning':
      return 'monitorar'
    case 'danger':
      return 'atencao'
    case 'neutral':
      return 'base'
    case 'info':
    default:
      return 'foco'
  }
}

function EquipeRankingPanel({
  currency,
  rows,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  rows: EquipeRow[]
}>) {
  const sortedRows = [...rows].sort((left, right) => right.revenue - left.revenue || right.orders - left.orders)
  const topRevenue = sortedRows[0]?.revenue ?? 0

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{sortedRows.length} pessoas</LabStatusPill>}
      padding="md"
      subtitle="Ranking operacional com receita atribuida, ticket medio e leitura de acesso."
      title="Quem puxa a operacao"
    >
      {sortedRows.length > 0 ? (
        <div className="space-y-3">
          {sortedRows.slice(0, 5).map((row, index) => {
            const progress = topRevenue > 0 ? (row.revenue / topRevenue) * 100 : 0
            return (
              <article
                className="rounded-[16px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4"
                key={row.employee.id}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <LabStatusPill tone={index === 0 ? 'success' : 'neutral'}>#{index + 1}</LabStatusPill>
                      <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{row.employee.displayName}</p>
                      <LabStatusPill tone={row.employee.active ? 'success' : 'neutral'}>
                        {row.employee.active ? 'ativo' : 'inativo'}
                      </LabStatusPill>
                      <LabStatusPill tone={row.employee.hasLogin ? 'info' : 'neutral'}>
                        {row.employee.hasLogin ? 'com acesso' : 'sem acesso'}
                      </LabStatusPill>
                    </div>
                    <p className="mt-2 text-sm text-[var(--lab-fg-soft)]">
                      {row.employee.employeeCode} · {row.orders} pedidos · ticket medio {formatCurrency(row.averageTicket, currency)}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-sm font-semibold text-[var(--lab-fg)]">{formatCurrency(row.revenue, currency)}</p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-muted)]">
                      pagamento estimado {formatCurrency(row.payout, currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
                  <div className="h-full rounded-full bg-[var(--lab-blue)]" style={{ width: `${Math.max(progress, 8)}%` }} />
                </div>
              </article>
            )
          })}
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

function EquipeSignalsPanel({
  averageTicket,
  currency,
  rows,
  totalCommission,
}: Readonly<{
  averageTicket: number
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  rows: EquipeRow[]
  totalCommission: number
}>) {
  const totalPayout = rows.reduce((sum, row) => sum + row.payout, 0)
  const noLogin = rows.filter((row) => !row.employee.hasLogin).length
  const noRevenue = rows.filter((row) => row.revenue <= 0).length
  const items = [
    {
      label: 'folha estimada',
      value: formatCurrency(totalPayout, currency),
      tone: 'info' as const,
    },
    {
      label: 'comissao projetada',
      value: formatCurrency(totalCommission, currency),
      tone: totalCommission > 0 ? ('success' as const) : ('neutral' as const),
    },
    {
      label: 'ticket medio equipe',
      value: formatCurrency(averageTicket, currency),
      tone: averageTicket > 0 ? ('info' as const) : ('neutral' as const),
    },
    {
      label: 'sem acesso web',
      value: String(noLogin),
      tone: noLogin > 0 ? ('warning' as const) : ('success' as const),
    },
    {
      label: 'sem receita atribuida',
      value: String(noRevenue),
      tone: noRevenue > 0 ? ('warning' as const) : ('success' as const),
    },
  ]

  return (
    <LabPanel padding="md" subtitle="Quadro curto para entender cobertura, acesso e pressao da folha." title="Radar da equipe">
      <div className="space-y-3">
        {items.map((item) => (
          <div
            className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--lab-border)] px-4 py-3"
            key={item.label}
          >
            <span className="text-sm text-[var(--lab-fg-soft)]">{item.label}</span>
            <LabStatusPill tone={item.tone}>{item.value}</LabStatusPill>
          </div>
        ))}
      </div>
    </LabPanel>
  )
}

function EquipeDirectoryPanel({
  currency,
  rows,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  rows: EquipeRow[]
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{rows.length} registros</LabStatusPill>}
      padding="none"
      subtitle="Diretorio completo com acesso, receita atribuida e previsao salarial."
      title="Diretorio operacional"
    >
      <LabTable
        className="rounded-none border-0"
        columns={[
          {
            id: 'colaborador',
            header: 'Colaborador',
            cell: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--lab-fg)]">{row.employee.displayName}</p>
                <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{row.employee.employeeCode}</p>
              </div>
            ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (row) => (
              <LabStatusPill tone={row.employee.active ? 'success' : 'neutral'}>
                {row.employee.active ? 'ativo' : 'inativo'}
              </LabStatusPill>
            ),
            width: '120px',
          },
          {
            id: 'acesso',
            header: 'Acesso',
            cell: (row) => (
              <LabStatusPill tone={row.employee.hasLogin ? 'info' : 'neutral'}>
                {row.employee.hasLogin ? 'habilitado' : 'pendente'}
              </LabStatusPill>
            ),
            width: '130px',
          },
          {
            id: 'salario',
            header: 'Salario base',
            cell: (row) => <span className="font-medium text-[var(--lab-fg)]">{formatCurrency(row.baseSalary, currency)}</span>,
            align: 'right',
            width: '140px',
          },
          {
            id: 'receita',
            header: 'Receita',
            cell: (row) => <span className="text-[var(--lab-fg-soft)]">{formatCurrency(row.revenue, currency)}</span>,
            align: 'right',
            width: '140px',
          },
          {
            id: 'pedidos',
            header: 'Pedidos',
            cell: (row) => <span className="text-[var(--lab-fg-soft)]">{row.orders}</span>,
            align: 'right',
            width: '90px',
          },
          {
            id: 'ticket',
            header: 'Ticket medio',
            cell: (row) => <span className="text-[var(--lab-fg-soft)]">{formatCurrency(row.averageTicket, currency)}</span>,
            align: 'right',
            width: '140px',
          },
          {
            id: 'pagamento',
            header: 'Pagamento estimado',
            cell: (row) => <span className="font-medium text-[var(--lab-fg)]">{formatCurrency(row.payout, currency)}</span>,
            align: 'right',
            width: '160px',
          },
        ]}
        dense
        emptyDescription="Nao existe colaborador suficiente para montar o diretorio."
        emptyTitle="Equipe vazia"
        rowKey={(row) => row.employee.id}
        rows={rows}
      />
    </LabPanel>
  )
}

function ProfileSpotlight({
  currency,
  row,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  row: EquipeRow | null
}>) {
  if (!row) {
    return (
      <LabEmptyState
        description="Quando houver colaborador ativo, o perfil individual aparece aqui com dados reais."
        icon={IdCard}
        title="Sem colaborador para detalhar"
      />
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <LabPanel padding="md" subtitle="Leitura sintetica do colaborador com melhor resultado no consolidado." title="Perfil em foco">
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

          <div className="rounded-[16px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Radar do colaborador</p>
            <div className="mt-4 space-y-3">
              <ProfileSummaryRow label="pedidos" tone="neutral" value={String(row.orders)} />
              <ProfileSummaryRow label="ticket medio" tone="info" value={formatCurrency(row.averageTicket, currency)} />
              <ProfileSummaryRow label="pagamento estimado" tone="success" value={formatCurrency(row.payout, currency)} />
            </div>
          </div>
        </div>
      </LabPanel>

      <LabPanel padding="md" subtitle="Sinais rapidos de acesso e resultado." title="Leitura curta">
        <div className="space-y-3">
          <ProfileSummaryRow
            label="acesso ao sistema"
            tone={row.employee.hasLogin ? 'info' : 'warning'}
            value={row.employee.hasLogin ? 'habilitado' : 'pendente'}
          />
          <ProfileSummaryRow
            label="status"
            tone={row.employee.active ? 'success' : 'neutral'}
            value={row.employee.active ? 'ativo' : 'inativo'}
          />
          <ProfileSummaryRow
            label="ritmo comercial"
            tone={row.revenue > 0 ? 'success' : 'neutral'}
            value={row.revenue > 0 ? 'com leitura' : 'sem vendas ainda'}
          />
        </div>
      </LabPanel>
    </div>
  )
}

function ProfileDetail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[14px] border border-[var(--lab-border)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}

function ProfileSummaryRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="rounded-[14px] border border-[var(--lab-border)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <div className="mt-2">
        <LabStatusPill tone={tone}>{value}</LabStatusPill>
      </div>
    </div>
  )
}
