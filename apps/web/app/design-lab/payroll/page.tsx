'use client'

import { PayrollEnvironment } from '@/components/dashboard/payroll-environment'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'

export default function DesignLabPayrollPage() {
  const { employeesQuery, financeQuery } = useDashboardQueries({ section: 'payroll' })

  return <PayrollEnvironment employees={employeesQuery.data?.items ?? []} finance={financeQuery.data} />
}
