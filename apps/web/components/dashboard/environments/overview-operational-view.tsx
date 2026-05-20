import { OverviewTopProducts } from '@/components/dashboard/overview-top-products'
import { OverviewRecentOrders } from '@/components/dashboard/overview-recent-orders'
import type { OverviewViewProps } from './overview-environment.model'
import { buildOperationalBriefEntries, buildOperationalTiles } from './overview-operational.content'
import { ChartOrError, CompactTile, OverviewBriefPanel } from './overview-environment.shared'

export function OverviewOperationalView({
  finance,
  financeError,
  isLoading,
  products,
  snapshot,
}: Readonly<OverviewViewProps>) {
  return (
    <section className="space-y-5">
      <div className="workspace-notebook-metrics gap-3">
        {buildOperationalTiles(snapshot).map((tile) => (
          <CompactTile key={tile.label} {...tile} />
        ))}
      </div>

      <div className="workspace-notebook-split workspace-notebook-split--main-115 workspace-notebook-split--rail-320">
        <OverviewRecentOrders
          displayCurrency={snapshot.displayCurrency}
          isLoading={isLoading}
          orders={finance?.recentOrders ?? []}
          summaryText={snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos` : null}
        />
        <OverviewBriefPanel entries={buildOperationalBriefEntries(snapshot)} title="sinais vivos" />
      </div>

      <div className="workspace-notebook-split workspace-notebook-split--rail-340">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewTopProducts finance={finance} isLoading={isLoading} products={products} />
      </div>
    </section>
  )
}
