'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { PayrollEnvironment } from '@/components/dashboard/payroll-environment'
import { SalaoEnvironment } from '@/components/dashboard/salao-environment'
import { CalendarioEnvironment } from './environments/calendario-environment'
import { MapEnvironment } from './environments/map-environment'
import { OverviewEnvironment } from './environments/overview-environment'
import { PdvEnvironment } from './environments/pdv-environment'
import { PortfolioEnvironment } from './environments/portfolio-environment'
import { SalesEnvironment } from './environments/sales-environment'
import { SettingsEnvironment } from './environments/settings-environment'
import type {
  DashboardSectionId,
  DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'
import type { AuthUser } from '@/lib/api'

export type EnvironmentRenderProps = {
  activeSection: DashboardSectionId
  activeSettingsSection: DashboardSettingsSectionId
  employees: Array<{
    id: string
    employeeCode: string
    displayName: string
    active: boolean
    hasLogin: boolean
    createdAt: string
    updatedAt: string
  }>
  finance?: FinanceSummaryResponse
  onNavigateSection: (sectionId: DashboardSectionId) => void
  onSettingsSectionChange: (sectionId: DashboardSettingsSectionId) => void
  user: AuthUser
}

export function renderActiveEnvironment(props: EnvironmentRenderProps) {
  switch (props.activeSection) {
    case 'sales':
      return <SalesEnvironment user={props.user} />
    case 'portfolio':
      return <PortfolioEnvironment />
    case 'pdv':
      return <PdvEnvironment />
    case 'calendario':
      return <CalendarioEnvironment />
    case 'map':
      return <MapEnvironment />
    case 'payroll':
      return <PayrollEnvironment employees={props.employees} finance={props.finance} />
    case 'salao':
      return <SalaoEnvironment />
    case 'settings':
      return (
        <SettingsEnvironment
          activeSettingsSection={props.activeSettingsSection}
          onNavigateSection={props.onNavigateSection}
          onSettingsSectionChange={props.onSettingsSectionChange}
        />
      )
    case 'overview':
    default:
      return <OverviewEnvironment />
  }
}
