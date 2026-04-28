'use client'

import { LAB_RESPONSIVE_FOUR_UP_GRID, LabMiniStat, LabPageHeader } from '@/components/design-lab/lab-primitives'
import { PayrollEnvironment } from '@/components/dashboard/payroll-environment'
import { EquipeCardsView } from './equipe-environment-cards'
import { equipeViewCopy, resolveEquipeView } from './equipe-environment.helpers'
import { buildEquipeSummary } from './equipe-environment-summary'
import type { EquipeEnvironmentProps } from './equipe-environment.types'
import { EquipeMetaSummary } from './equipe-environment-shared'
import { ProfileSpotlight } from './equipe-environment-profile'

export function EquipeEnvironment({
  activeTab,
  employees,
  finance,
  surface = 'legacy',
}: Readonly<EquipeEnvironmentProps>) {
  const view = resolveEquipeView(activeTab)
  if (view === 'folha') {
    return <PayrollEnvironment employees={employees} finance={finance} />
  }

  const copy = equipeViewCopy[view]
  const currency = finance?.displayCurrency ?? 'BRL'
  const summary = buildEquipeSummary(employees, finance)

  return (
    <section className="space-y-5">
      <LabPageHeader
        description={copy.description}
        eyebrow={copy.eyebrow}
        meta={
          <EquipeMetaSummary
            averageTicket={summary.averageTicket}
            currency={currency}
            highlightedRow={summary.highlightedRow}
            rows={summary.activeRows}
            totalCommission={summary.totalCommission}
          />
        }
        title={copy.title}
      >
        <EquipeHeaderStats currency={currency} summary={summary} />
      </LabPageHeader>
      {view === 'cards' ? (
        <EquipeCardsView
          averageTicket={summary.averageTicket}
          currency={currency}
          highlightedRow={summary.highlightedRow}
          rows={summary.activeRows}
          surface={surface}
          totalCommission={summary.totalCommission}
        />
      ) : (
        <ProfileSpotlight currency={currency} row={summary.highlightedRow} />
      )}
    </section>
  )
}

function EquipeHeaderStats({
  currency,
  summary,
}: Readonly<{
  currency: string
  summary: ReturnType<typeof buildEquipeSummary>
}>) {
  const activeLogins = summary.activeRows.filter((row) => row.employee.hasLogin).length
  const formatMoney = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value)

  return (
    <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
      <LabMiniStat label="ativos" value={String(summary.activeRows.length)} />
      <LabMiniStat label="receita atribuída" value={formatMoney(summary.totalRevenue)} />
      <LabMiniStat label="folha estimada" value={formatMoney(summary.totalPayout)} />
      <LabMiniStat
        label="acesso web"
        value={summary.activeRows.length > 0 ? `${activeLogins}/${summary.activeRows.length}` : '0/0'}
      />
    </div>
  )
}
