'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { cn } from '@/lib/utils'
import { TableSkeleton } from '@/components/shared/skeleton'
import { FinanceOrdersTable } from './finance-orders-table'

type Props = {
  finance: FinanceSummaryResponse
  isLoading?: boolean
}

const ALL_TAB = '__all__'

export function FinanceChannelsPanel({ finance, isLoading }: Props) {
  const { recentOrders, salesByChannel, displayCurrency } = finance
  const [activeChannel, setActiveChannel] = useState<string>(ALL_TAB)

  const channels = salesByChannel
    .filter((c) => c.orders > 0)
    .map((c) => c.channel)

  const filteredOrders =
    activeChannel === ALL_TAB
      ? recentOrders
      : recentOrders.filter((o) => o.channel === activeChannel)

  if (isLoading) {
    return <TableSkeleton rows={6} />
  }

  return (
    <div className="imperial-card p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <ShoppingCart className="size-5" />
          </span>
          <div>
            <p className="text-xs text-[var(--text-soft)]">Histórico financeiro</p>
            <h2 className="text-base font-semibold text-white">Pedidos recentes</h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Tab
            label="Todos"
            active={activeChannel === ALL_TAB}
            count={recentOrders.length}
            onClick={() => setActiveChannel(ALL_TAB)}
          />
          {channels.map((channel) => {
            const entry = salesByChannel.find((c) => c.channel === channel)
            return (
              <Tab
                key={channel}
                label={channel}
                active={activeChannel === channel}
                count={entry?.orders ?? 0}
                onClick={() => setActiveChannel(channel)}
              />
            )
          })}
        </div>
      </div>

      <FinanceOrdersTable orders={filteredOrders} displayCurrency={displayCurrency} />
    </div>
  )
}

function Tab({
  label,
  active,
  count,
  onClick,
}: {
  label: string
  active: boolean
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-200',
        active
          ? 'border-[rgba(52,242,127,0.4)] bg-[rgba(52,242,127,0.12)] text-[#36f57c]'
          : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] hover:border-[rgba(255,255,255,0.16)] hover:text-white',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px]',
          active ? 'bg-[rgba(52,242,127,0.2)] text-[#36f57c]' : 'bg-[rgba(255,255,255,0.06)] text-[var(--text-soft)]',
        )}
      >
        {count}
      </span>
    </button>
  )
}
