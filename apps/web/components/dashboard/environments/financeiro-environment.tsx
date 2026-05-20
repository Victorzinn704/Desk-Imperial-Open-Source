'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import { LabPanel } from '@/components/design-lab/lab-primitives'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { ApiError } from '@/lib/api'
import { type FinanceiroSurface, resolveFinanceView } from './financeiro-model'
import { buildFinanceSnapshot } from './financeiro-snapshot.model'
import { FinanceiroAuthState, FinanceiroHeader, FinanceiroLabSummary } from './financeiro-summary-panels'
import { FinanceiroTabBody } from './financeiro-tab-panels'

export function FinanceiroEnvironment({
  activeTab,
  surface = 'legacy',
}: Readonly<{ activeTab: DashboardTabId | null; surface?: FinanceiroSurface }>) {
  const { sessionQuery, financeQuery, productsQuery } = useDashboardQueries({ section: 'financeiro' })
  const user = sessionQuery.data?.user
  const view = resolveFinanceView(activeTab)

  if (!user) {
    return <FinanceiroAuthState view={view} />
  }

  const finance = financeQuery.data
  const displayCurrency = (finance?.displayCurrency ??
    user.preferredCurrency) as FinanceSummaryResponse['displayCurrency']
  const products = productsQuery.data?.items ?? []
  const snapshot = buildFinanceSnapshot({ displayCurrency, finance, view })
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null

  return (
    <section className="space-y-5">
      <FinanceiroHeader snapshot={snapshot} />

      {!financeError && surface === 'lab' ? (
        <FinanceiroLabSummary finance={finance} products={products} snapshot={snapshot} />
      ) : null}

      {financeError ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">{financeError}</p>
        </LabPanel>
      ) : null}

      {!financeError ? (
        <FinanceiroTabBody
          displayCurrency={displayCurrency}
          finance={finance}
          isLoading={financeQuery.isLoading}
          products={products}
          view={view}
        />
      ) : null}
    </section>
  )
}
