'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { MobileOrderBuilderProps } from './mobile-order-builder.types'
import { MobileOrderProductItem } from './mobile-order-builder.product-item'

type BuilderProduct = MobileOrderBuilderProps['produtos'][number]
type BuilderVirtualizer = ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>
type BuilderVirtualItem = ReturnType<BuilderVirtualizer['getVirtualItems']>[number]

function useMobileOrderBuilderVirtualizer(filtered: MobileOrderBuilderProps['produtos']) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: filtered.length,
    estimateSize: () => 92,
    getScrollElement: () => parentRef.current,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 92,
    overscan: 6,
  })

  return { parentRef, rowVirtualizer, virtualItems: rowVirtualizer.getVirtualItems() }
}

function ProductRow({
  busy,
  onAdd,
  onRemove,
  produto,
  qty,
}: Readonly<{
  busy?: boolean
  onAdd: () => void
  onRemove: () => void
  produto: BuilderProduct
  qty: number
}>) {
  return <MobileOrderProductItem busy={busy} produto={produto} qty={qty} onAdd={onAdd} onRemove={onRemove} />
}

function StaticRows({
  addItem,
  busy,
  filtered,
  getQty,
  removeItem,
}: Readonly<{
  addItem: (produto: BuilderProduct) => void
  busy?: boolean
  filtered: MobileOrderBuilderProps['produtos']
  getQty: (produtoId: string) => number
  removeItem: (produtoId: string) => void
}>) {
  return filtered.slice(0, 12).map((produto) => (
    <div className="border-b border-[var(--border)]" key={produto.id}>
      <ProductRow
        busy={busy}
        produto={produto}
        qty={getQty(produto.id)}
        onAdd={() => addItem(produto)}
        onRemove={() => removeItem(produto.id)}
      />
    </div>
  ))
}

function VirtualRows({
  addItem,
  busy,
  filtered,
  getQty,
  removeItem,
  rowVirtualizer,
  virtualItems,
}: Readonly<{
  addItem: (produto: BuilderProduct) => void
  busy?: boolean
  filtered: MobileOrderBuilderProps['produtos']
  getQty: (produtoId: string) => number
  removeItem: (produtoId: string) => void
  rowVirtualizer: BuilderVirtualizer
  virtualItems: BuilderVirtualItem[]
}>) {
  return virtualItems.map((virtualItem) => {
    const produto = filtered[virtualItem.index]
    return (
      <div
        className="border-b border-[var(--border)]"
        key={produto.id}
        ref={rowVirtualizer.measureElement}
        style={{
          left: 0,
          position: 'absolute',
          top: 0,
          transform: `translateY(${virtualItem.start}px)`,
          width: '100%',
        }}
      >
        <ProductRow
          busy={busy}
          produto={produto}
          qty={getQty(produto.id)}
          onAdd={() => addItem(produto)}
          onRemove={() => removeItem(produto.id)}
        />
      </div>
    )
  })
}

function VirtualListCanvas({
  addItem,
  busy,
  filtered,
  getQty,
  removeItem,
  rowVirtualizer,
  totalItems,
  virtualItems,
}: Readonly<{
  addItem: (produto: BuilderProduct) => void
  busy?: boolean
  filtered: MobileOrderBuilderProps['produtos']
  getQty: (produtoId: string) => number
  removeItem: (produtoId: string) => void
  rowVirtualizer: BuilderVirtualizer
  totalItems: number
  virtualItems: BuilderVirtualItem[]
}>) {
  return (
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize() + (totalItems > 0 ? 118 : 0)}px`,
        position: 'relative',
      }}
    >
      {virtualItems.length > 0 ? (
        <VirtualRows
          addItem={addItem}
          busy={busy}
          filtered={filtered}
          getQty={getQty}
          removeItem={removeItem}
          rowVirtualizer={rowVirtualizer}
          virtualItems={virtualItems}
        />
      ) : (
        <StaticRows addItem={addItem} busy={busy} filtered={filtered} getQty={getQty} removeItem={removeItem} />
      )}
    </div>
  )
}

export function MobileOrderBuilderVirtualList({
  addItem,
  busy,
  filtered,
  getQty,
  removeItem,
  totalItems,
}: Readonly<{
  addItem: (produto: BuilderProduct) => void
  busy?: boolean
  filtered: MobileOrderBuilderProps['produtos']
  getQty: (produtoId: string) => number
  removeItem: (produtoId: string) => void
  totalItems: number
}>) {
  const { parentRef, rowVirtualizer, virtualItems } = useMobileOrderBuilderVirtualizer(filtered)

  return (
    <div
      className={`min-h-0 flex-1 overflow-y-auto scroll-optimized custom-scrollbar ${totalItems > 0 ? 'pb-28 md:pb-0' : ''}`}
      ref={parentRef}
    >
      <VirtualListCanvas
        addItem={addItem}
        busy={busy}
        filtered={filtered}
        getQty={getQty}
        removeItem={removeItem}
        rowVirtualizer={rowVirtualizer}
        totalItems={totalItems}
        virtualItems={virtualItems}
      />
    </div>
  )
}
