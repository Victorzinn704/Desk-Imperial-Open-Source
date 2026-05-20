import { OverviewTopProducts } from '@/components/dashboard/overview-top-products'
import { OverviewRecentOrders } from '@/components/dashboard/overview-recent-orders'
import type { OverviewViewProps } from './overview-environment.model'
import { ChartOrError, StandardMetricGrid } from './overview-environment.shared'

export function OverviewLayoutView({
  finance,
  financeError,
  isLoading,
  products,
  snapshot,
}: Readonly<OverviewViewProps>) {
  return (
    <section className="space-y-5">
      <StandardMetricGrid isLoading={isLoading} snapshot={snapshot} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewTopProducts finance={finance} isLoading={isLoading} products={products} />
      </div>

      <OverviewRecentOrders
        displayCurrency={snapshot.displayCurrency}
        isLoading={isLoading}
        orders={finance?.recentOrders ?? []}
        summaryText={snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos` : null}
      />
    </section>
  )
}
