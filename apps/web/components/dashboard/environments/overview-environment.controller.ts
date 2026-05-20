import { ApiError } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { buildOverviewSnapshot, type OverviewViewProps } from './overview-environment.model'

export type OverviewEnvironmentState = { kind: 'locked' } | { kind: 'ready'; props: OverviewViewProps }

export function useOverviewEnvironmentState(): OverviewEnvironmentState {
  const { sessionQuery, financeQuery, ordersQuery, productsQuery } = useDashboardQueries({
    section: 'overview',
  })
  const user = sessionQuery.data?.user

  if (!user) {
    return { kind: 'locked' }
  }

  return {
    kind: 'ready',
    props: {
      finance: financeQuery.data,
      financeError: financeQuery.error instanceof ApiError ? financeQuery.error.message : null,
      isLoading: financeQuery.isLoading,
      products: productsQuery.data?.items ?? [],
      snapshot: buildOverviewSnapshot({
        finance: financeQuery.data,
        ordersTotals: ordersQuery.data?.totals,
        user,
      }),
    },
  }
}
