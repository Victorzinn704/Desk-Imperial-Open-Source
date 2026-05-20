'use client'

import { KitchenOrdersLayout } from './kitchen-orders-view.layout'
import { useKitchenOrdersController } from './kitchen-orders-view.controller'
import type { KitchenOrdersViewProps } from './kitchen-orders-view.types'

export function KitchenOrdersView({
  currentEmployeeId = null,
  data,
  errorMessage = null,
  isLoading = false,
  isOffline = false,
  queryKey,
}: KitchenOrdersViewProps) {
  const controller = useKitchenOrdersController({ currentEmployeeId, data, queryKey })

  return (
    <KitchenOrdersLayout
      activeTab={controller.activeTab}
      counts={controller.counts}
      currentEmployeeId={currentEmployeeId}
      error={controller.error}
      errorMessage={errorMessage}
      hasItems={controller.hasItems}
      isLoading={isLoading}
      isOffline={isOffline}
      isPending={controller.isPending}
      snapshot={controller.snapshot}
      tabItems={controller.tabItems}
      onAdvance={controller.onAdvance}
      onDismissError={() => controller.setError(null)}
      onTabChange={controller.setActiveTab}
    />
  )
}
