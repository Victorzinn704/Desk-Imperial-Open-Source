'use client'

import { EquipeEnvironment } from '@/components/dashboard/environments/equipe-environment'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'

export default function DesignLabEquipePage() {
  const { employeesQuery, financeQuery } = useDashboardQueries({ section: 'equipe' })

  return (
    <EquipeEnvironment
      activeTab="cards"
      employees={employeesQuery.data?.items ?? []}
      finance={financeQuery.data}
    />
  )
}
