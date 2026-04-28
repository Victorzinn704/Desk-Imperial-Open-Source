'use client'

import { useDeferredRender, useLowPerformanceMode } from '@/hooks/use-performance'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { DefaultSalesPerformancePanel, LabSalesPerformancePanel } from './sales-performance-panel'

export function SalesPerformanceCard({
  finance,
  isLoading = false,
  surface = 'default',
  variant = 'revenue-profit',
}: Readonly<{
  finance?: FinanceSummaryResponse
  isLoading?: boolean
  surface?: 'default' | 'lab'
  variant?: 'revenue-profit' | 'orders-ticket'
}>) {
  const isLowPerformance = useLowPerformanceMode()
  const isChartReady = useDeferredRender({ delayMs: isLowPerformance ? 1100 : 320 })

  if (surface === 'lab') {
    return (
      <LabSalesPerformancePanel
        finance={finance}
        isChartReady={isChartReady}
        isLoading={isLoading}
        isLowPerformance={isLowPerformance}
        variant={variant}
      />
    )
  }

  return (
    <DefaultSalesPerformancePanel
      finance={finance}
      isChartReady={isChartReady}
      isLoading={isLoading}
      isLowPerformance={isLowPerformance}
    />
  )
}
