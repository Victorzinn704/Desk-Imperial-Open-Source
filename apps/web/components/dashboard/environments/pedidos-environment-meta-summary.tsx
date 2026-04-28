'use client'

import type { OrderRecord } from '@contracts/contracts'
import { LabStatusPill } from '@/components/design-lab/lab-primitives'
import { buildPedidosMetaItems } from './pedidos-environment-header'
import type { PedidosInsights, PedidosView } from './pedidos-environment.types'

export function PedidosMetaSummary(
  props: Readonly<{ currency: OrderRecord['displayCurrency']; insights: PedidosInsights; view: PedidosView }>,
) {
  const items = buildPedidosMetaItems(props)

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0"
          key={item.label}
        >
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{item.label}</span>
          <LabStatusPill tone={item.tone}>{item.value}</LabStatusPill>
        </div>
      ))}
    </div>
  )
}
