'use client'

import { ApiError } from '@/lib/api'
import { EmployeeManagementCard } from '@/components/dashboard/employee-management-card'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
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
  userRole = 'OWNER',
}: Readonly<EquipeEnvironmentProps>) {
  const {
    createEmployeeMutation,
    archiveEmployeeMutation,
    restoreEmployeeMutation,
    issueEmployeeAccessMutation,
    revokeEmployeeAccessMutation,
    rotateEmployeePasswordMutation,
  } = useDashboardMutations()
  const view = resolveEquipeView(activeTab)
  if (view === 'folha') {
    return <PayrollEnvironment employees={employees} finance={finance} />
  }

  const copy = equipeViewCopy[view]
  const currency = finance?.displayCurrency ?? 'BRL'
  const summary = buildEquipeSummary(employees, finance)
  const employeeMutationError = [
    createEmployeeMutation.error,
    archiveEmployeeMutation.error,
    restoreEmployeeMutation.error,
    issueEmployeeAccessMutation.error,
    revokeEmployeeAccessMutation.error,
    rotateEmployeePasswordMutation.error,
  ].find((error) => error instanceof ApiError)

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
        <div className="space-y-5">
          <EquipeCardsView
            averageTicket={summary.averageTicket}
            currency={currency}
            highlightedRow={summary.highlightedRow}
            rows={summary.activeRows}
            surface={surface}
            totalCommission={summary.totalCommission}
          />
          {userRole === 'OWNER' ? (
            <EmployeeManagementCard
              busy={
                createEmployeeMutation.isPending ||
                archiveEmployeeMutation.isPending ||
                restoreEmployeeMutation.isPending ||
                issueEmployeeAccessMutation.isPending ||
                revokeEmployeeAccessMutation.isPending ||
                rotateEmployeePasswordMutation.isPending
              }
              employees={employees}
              error={employeeMutationError?.message ?? null}
              loading={createEmployeeMutation.isPending}
              onArchive={archiveEmployeeMutation.mutate}
              onCreate={createEmployeeMutation.mutateAsync}
              onIssueAccess={issueEmployeeAccessMutation.mutateAsync}
              onRestore={restoreEmployeeMutation.mutate}
              onRevokeAccess={revokeEmployeeAccessMutation.mutateAsync}
              onRotatePassword={rotateEmployeePasswordMutation.mutateAsync}
            />
          ) : null}
        </div>
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
