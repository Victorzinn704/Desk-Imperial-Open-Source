'use client'

import { BadgeDollarSign, IdCard, ShieldCheck, TrendingUp, Users, Wallet } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import {
  LabEmptyState,
  LabFactPill,
  LabMiniStat,
  LabMetric,
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
  LabTable,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { PayrollEnvironment } from '@/components/dashboard/payroll-environment'
import type { EmployeeRecord } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'

type EquipeView = 'cards' | 'folha' | 'perfil'
type EquipeSurface = 'legacy' | 'lab'

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
    description: 'Equipe, receita, folha e acesso.',
  },
  folha: {
    eyebrow: 'Gestao salarial',
    title: 'Folha da equipe',
    description: 'Salários, comissões e fechamento.',
  },
  perfil: {
    eyebrow: 'Perfil individual',
    title: 'Leitura por colaborador',
    description: 'Resultado e acesso por pessoa.',
  },
}

export function EquipeEnvironment({
  activeTab,
  employees,
  finance,
  surface = 'legacy',
}: Readonly<{
  activeTab: DashboardTabId | null
  employees: EmployeeRecord[]
  finance?: FinanceSummaryResponse
  surface?: EquipeSurface
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
  const showLabEmptyState = surface === 'lab' && view === 'cards' && activeRows.length === 0

  return (
    <section className="space-y-5">
      <LabPageHeader
        description={copy.description}
        eyebrow={copy.eyebrow}
        meta={
          <EquipeMetaSummary
            averageTicket={averageTicket}
            currency={currency}
            highlightedRow={highlightedRow}
            rows={activeRows}
            totalCommission={totalCommission}
          />
        }
        title={copy.title}
      >
        <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          <LabMiniStat label="ativos" value={String(activeRows.length)} />
          <LabMiniStat label="receita atribuída" value={formatCurrency(totalRevenue, currency)} />
          <LabMiniStat label="folha estimada" value={formatCurrency(totalPayout, currency)} />
          <LabMiniStat label="acesso web" value={activeRows.length > 0 ? `${activeRows.filter((row) => row.employee.hasLogin).length}/${activeRows.length}` : '0/0'} />
        </div>
      </LabPageHeader>

      {surface === 'legacy' ? (
        <div className={`grid gap-4 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
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
      ) : null}

      {view === 'cards' ? (
        <>
          {showLabEmptyState ? (
            <>
              <LabPanel
                action={<LabStatusPill tone="warning">aguardando equipe</LabStatusPill>}
                padding="md"
                title="Equipe ainda não configurada"
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-[var(--lab-fg)]">Sem colaboradores ativos no workspace</p>
                      <p className="max-w-2xl text-sm leading-6 text-[var(--lab-fg-soft)]">
                        Cadastre ou reative colaboradores para liberar ranking, leitura por pessoa, cobertura de acesso e ponte direta com a folha.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <LabFactPill label="ativos" value="0" />
                      <LabFactPill label="receita" value={formatCurrency(totalRevenue, currency)} />
                      <LabFactPill label="folha" value={formatCurrency(totalPayout, currency)} />
                      <LabFactPill label="acesso" value="0/0" />
                    </div>

                    <div className="space-y-0">
                      <LabSignalRow
                        label="desempenho por pessoa"
                        note="receita, pedidos e ticket médio aparecem assim que houver ao menos um colaborador ativo"
                        tone="neutral"
                        value="travado"
                      />
                      <LabSignalRow
                        label="ponte com a folha"
                        note="salário base, comissão e pagamento estimado nascem da mesma base da equipe"
                        tone="info"
                        value="aguardando base"
                      />
                      <LabSignalRow
                        label="diretório operacional"
                        note="a lista volta com status, acesso e pagamento estimado por pessoa"
                        tone="neutral"
                        value="sem leitura"
                      />
                    </div>
                  </div>

                  <div className="space-y-0">
                    <LabSignalRow
                      label="cadastro base"
                      note="nome, código e status precisam existir antes de qualquer leitura comercial"
                      tone="warning"
                      value="pendente"
                    />
                    <LabSignalRow
                      label="salário base"
                      note="a folha começa a ficar útil assim que o valor inicial estiver definido"
                      tone="neutral"
                      value="pendente"
                    />
                    <LabSignalRow
                      label="acesso web"
                      note="habilite login só para quem realmente precisa entrar no desktop"
                      tone="neutral"
                      value="pendente"
                    />
                    <LabSignalRow
                      label="comissão"
                      note="o percentual entra só quando fizer sentido para a rotina comercial"
                      tone="neutral"
                      value="opcional"
                    />
                  </div>
                </div>
              </LabPanel>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                <LabPanel
                  action={<LabStatusPill tone="info">ao ativar</LabStatusPill>}
                  padding="md"
                  title="O que a equipe destrava"
                >
                  <div className="space-y-0">
                    <LabSignalRow
                      label="ranking comercial"
                      note="ordena quem mais vende, quantos pedidos puxou e qual ticket sustenta o período"
                      tone="success"
                      value="sim"
                    />
                    <LabSignalRow
                      label="status de acesso"
                      note="mostra quem já entra no sistema e quem ainda depende de habilitação"
                      tone="info"
                      value="sim"
                    />
                    <LabSignalRow
                      label="folha da equipe"
                      note="salários, comissões e pagamento estimado voltam a nascer da mesma base"
                      tone="neutral"
                      value="sim"
                    />
                    <LabSignalRow
                      label="perfil individual"
                      note="o detalhamento por colaborador reaparece com lucro, receita e pagamento estimado"
                      tone="warning"
                      value="sim"
                    />
                  </div>
                </LabPanel>

                <LabPanel
                  action={<LabStatusPill tone="neutral">0 ativos</LabStatusPill>}
                  padding="md"
                  title="Leitura inicial"
                >
                  <div className="flex flex-wrap gap-2">
                    <LabFactPill label="líder" value="sem leitura" />
                    <LabFactPill label="ticket" value="—" />
                    <LabFactPill label="comissão" value="R$ 0,00" />
                  </div>

                  <div className="mt-5 space-y-0">
                    <LabSignalRow
                      label="primeiro passo"
                      note="trazer ao menos um colaborador ativo já libera a leitura estrutural da equipe"
                      tone="info"
                      value="cadastrar equipe"
                    />
                    <LabSignalRow
                      label="segunda camada"
                      note="depois entram acesso, salário base e regras de comissão"
                      tone="neutral"
                      value="configurar"
                    />
                  </div>
                </LabPanel>
              </div>
            </>
          ) : surface === 'lab' ? (
            <div className="grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start">
              <EquipePeriodPanel
                averageTicket={averageTicket}
                currency={currency}
                highlightedRow={highlightedRow}
                rows={activeRows}
                totalPayout={totalPayout}
                totalRevenue={totalRevenue}
              />
              <EquipeRadarPanel
                averageTicket={averageTicket}
                currency={currency}
                highlightedRow={highlightedRow}
                rows={activeRows}
                totalCommission={totalCommission}
              />
            </div>
          ) : null}
          {!showLabEmptyState ? (
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
          ) : null}
        </>
      ) : (
        <ProfileSpotlight currency={currency} row={highlightedRow} />
      )}
    </section>
  )
}

function EquipePeriodPanel({
  averageTicket,
  currency,
  highlightedRow,
  rows,
  totalPayout,
  totalRevenue,
}: Readonly<{
  averageTicket: number
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
  totalPayout: number
  totalRevenue: number
}>) {
  const rowsData = [
    {
      label: 'receita atribuída',
      note: 'consolidado da equipe ativa',
      tone: totalRevenue > 0 ? ('success' as const) : ('neutral' as const),
      value: formatCurrency(totalRevenue, currency),
    },
    {
      label: 'folha estimada',
      note: 'base salarial com comissões',
      tone: 'info' as const,
      value: formatCurrency(totalPayout, currency),
    },
    {
      label: 'ticket médio',
      note: 'média por pedido atribuído',
      tone: averageTicket > 0 ? ('info' as const) : ('neutral' as const),
      value: formatCurrency(averageTicket, currency),
    },
    {
      label: 'destaque',
      note: 'quem mais puxa a operação',
      tone: highlightedRow?.revenue ? ('success' as const) : ('neutral' as const),
      value: highlightedRow?.employee.displayName ?? 'sem leitura',
    },
  ]

  return (
    <LabPanel
      action={<LabStatusPill tone="info">{rows.length} ativos</LabStatusPill>}
      padding="md"
      title="Leitura da equipe"
    >
      <div className="space-y-0">
        {rowsData.map((row) => (
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0" key={row.label}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--lab-fg)]">{row.label}</p>
              <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{row.note}</p>
            </div>
            <LabStatusPill tone={row.tone}>{row.value}</LabStatusPill>
          </div>
        ))}
      </div>
    </LabPanel>
  )
}

function EquipeRadarPanel({
  averageTicket,
  currency,
  highlightedRow,
  rows,
  totalCommission,
}: Readonly<{
  averageTicket: number
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
  totalCommission: number
}>) {
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
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <EquipeMiniStat label="ticket médio" value={formatCurrency(averageTicket, currency)} />
            <EquipeMiniStat label="comissão" value={formatCurrency(totalCommission, currency)} />
            <EquipeMiniStat label="com acesso" value={`${withLogin}/${rows.length || 0}`} />
            <EquipeMiniStat label="destaque" value={highlightedRow?.employee.employeeCode ?? 'sem leitura'} />
          </div>

          {sortedRows.length > 0 ? (
            <div className="space-y-1">
              {sortedRows.slice(0, 4).map((row) => (
                <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0" key={row.employee.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{row.employee.displayName}</p>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{row.orders} pedidos · {row.employee.employeeCode}</p>
                  </div>
                  <LabStatusPill tone="info">{formatCurrency(row.revenue, currency)}</LabStatusPill>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 border-t border-dashed border-[var(--lab-border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <EquipeSignalRow label="acesso web" tone={withLogin === rows.length && rows.length > 0 ? 'success' : 'warning'} value={`${withLogin}/${rows.length || 0}`} />
          <EquipeSignalRow label="sem receita" tone={noRevenue > 0 ? 'warning' : 'success'} value={String(noRevenue)} />
          <EquipeSignalRow label="comissão" tone={totalCommission > 0 ? 'success' : 'neutral'} value={formatCurrency(totalCommission, currency)} />
          <EquipeSignalRow label="líder" tone={highlightedRow?.revenue ? 'info' : 'neutral'} value={highlightedRow?.employee.displayName ?? 'sem leitura'} />
        </div>
      </div>
    </LabPanel>
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
  averageTicket,
  currency,
  highlightedRow,
  rows,
  totalCommission,
}: Readonly<{
  averageTicket: number
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
  totalCommission: number
}>) {
  const noRevenue = rows.filter((row) => row.revenue <= 0).length
  const items = [
    {
      label: 'ticket médio',
      value: averageTicket > 0 ? formatCurrency(averageTicket, currency) : 'R$ 0,00',
      tone: averageTicket > 0 ? ('info' as const) : ('neutral' as const),
    },
    {
      label: 'comissão',
      value: totalCommission > 0 ? formatCurrency(totalCommission, currency) : 'R$ 0,00',
      tone: totalCommission > 0 ? ('success' as const) : ('neutral' as const),
    },
    { label: 'sem receita', value: String(noRevenue), tone: noRevenue > 0 ? ('warning' as const) : ('success' as const) },
    { label: 'destaque', value: highlightedRow ? highlightedRow.employee.displayName : 'sem leitura', tone: highlightedRow?.revenue ? ('success' as const) : ('neutral' as const) },
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
      title="Quem puxa a operacao"
    >
      {sortedRows.length > 0 ? (
        <div className="space-y-1">
          {sortedRows.slice(0, 5).map((row, index) => {
            const progress = topRevenue > 0 ? (row.revenue / topRevenue) * 100 : 0
            return (
              <div className="border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0" key={row.employee.id}>
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
              </div>
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
    <LabPanel padding="md" title="Radar da equipe">
      <div className="space-y-1">
        {items.map((item) => (
          <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0" key={item.label}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--lab-fg)]">{item.label}</p>
            </div>
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
        description="Selecione um colaborador ativo."
        icon={IdCard}
        title="Sem colaborador para detalhar"
      />
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
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
              <ProfileSummaryRow label="pedidos" tone="neutral" value={String(row.orders)} />
              <ProfileSummaryRow label="ticket medio" tone="info" value={formatCurrency(row.averageTicket, currency)} />
              <ProfileSummaryRow label="pagamento estimado" tone="success" value={formatCurrency(row.payout, currency)} />
            </div>
          </div>
        </div>
      </LabPanel>

      <LabPanel padding="md" title="Sinais do perfil">
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
    <div className="rounded-[14px] border border-dashed border-[var(--lab-border)] px-4 py-3">
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
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-4 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      </div>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function EquipeMiniStat({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}

function EquipeSignalRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-4 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      </div>
      <LabStatusPill size="md" tone={tone}>
        {value}
      </LabStatusPill>
    </div>
  )
}
