'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { LabPanel } from '@/components/design-lab/lab-primitives'
import { CaixaPanel } from '@/components/dashboard/caixa-panel'
import { ApiError, fetchOperationsLive } from '@/lib/api'
import { OPERATIONS_LIVE_COMPACT_QUERY_KEY } from '@/lib/operations'

export default function DesignLabCaixaPage() {
  const operationsQuery = useQuery({
    queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })
  const errorMessage = operationsQuery.error instanceof ApiError ? operationsQuery.error.message : null

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        </LabPanel>
      ) : null}
      <CaixaPanel operations={operationsQuery.data} />
    </div>
  )
}
