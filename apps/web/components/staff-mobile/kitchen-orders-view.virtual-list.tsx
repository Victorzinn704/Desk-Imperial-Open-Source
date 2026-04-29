'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { OperationsKitchenItemRecord } from '@contracts/contracts'
import { MemoKitchenCard } from './kitchen-orders-view.card'

type KitchenVirtualListProps = Readonly<{
  currentEmployeeId: string | null
  isPending: boolean
  items: OperationsKitchenItemRecord[]
  onAdvance: (itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') => void
}>

function StaticKitchenRows({ currentEmployeeId, isPending, items, onAdvance }: KitchenVirtualListProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <MemoKitchenCard
          currentEmployeeId={currentEmployeeId}
          isBusy={isPending}
          item={item}
          key={item.itemId}
          onAdvance={onAdvance}
        />
      ))}
    </div>
  )
}

export function KitchenOrdersVirtualList({ currentEmployeeId, isPending, items, onAdvance }: KitchenVirtualListProps) {
  const shouldVirtualize = items.length > 8

  if (!shouldVirtualize) {
    return (
      <div className="flex-1 overflow-y-auto">
        <StaticKitchenRows
          currentEmployeeId={currentEmployeeId}
          isPending={isPending}
          items={items}
          onAdvance={onAdvance}
        />
      </div>
    )
  }

  return (
    <VirtualizedKitchenRows
      currentEmployeeId={currentEmployeeId}
      isPending={isPending}
      items={items}
      onAdvance={onAdvance}
    />
  )
}

function VirtualizedKitchenRows({ currentEmployeeId, isPending, items, onAdvance }: KitchenVirtualListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: items.length,
    estimateSize: () => 162,
    getScrollElement: () => parentRef.current,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 162,
    overscan: 5,
  })
  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" ref={parentRef}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          return (
            <div
              key={item.itemId}
              ref={rowVirtualizer.measureElement}
              style={{
                left: 0,
                paddingBottom: '12px',
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualItem.start}px)`,
                width: '100%',
              }}
            >
              <MemoKitchenCard
                currentEmployeeId={currentEmployeeId}
                isBusy={isPending}
                item={item}
                onAdvance={onAdvance}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
