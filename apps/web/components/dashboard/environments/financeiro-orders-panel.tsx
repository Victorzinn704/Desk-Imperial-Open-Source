'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { FinanceOrdersTable } from '@/components/dashboard/finance-orders-table'
import { LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'

export function FinanceOrdersBlock({
  displayCurrency,
  orders,
  subtitle,
  title,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  orders: FinanceSummaryResponse['recentOrders']
  subtitle?: string
  title: string
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{orders.length} itens</LabStatusPill>}
      padding="md"
      subtitle={subtitle}
      title={title}
    >
      <FinanceOrdersTable currency={{ code: displayCurrency }} orders={orders} />
    </LabPanel>
  )
}
