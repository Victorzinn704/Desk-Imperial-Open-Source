import { memo } from 'react'
import type { OperationsKitchenItemRecord } from '@contracts/contracts'
import { elapsedLabel, getTonePanelStyle, STATUS_CONFIG } from './kitchen-orders-view.helpers'
import type { KitchenTab } from './kitchen-orders-view.types'

export const MemoKitchenCard = memo(KitchenCard)

function KitchenCard({
  currentEmployeeId,
  isBusy,
  item,
  onAdvance,
}: Readonly<{
  currentEmployeeId: string | null
  isBusy: boolean
  item: OperationsKitchenItemRecord
  onAdvance: (itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') => void
}>) {
  const tab = item.kitchenStatus as KitchenTab
  const config = STATUS_CONFIG[tab]
  const tonePanelStyle = getTonePanelStyle(config.tone)

  return (
    <div className="rounded-[22px] border p-4" style={tonePanelStyle}>
      <div className="flex items-start justify-between gap-3">
        <KitchenCardContent currentEmployeeId={currentEmployeeId} item={item} />
        <button
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-opacity active:opacity-70 disabled:opacity-40"
          disabled={isBusy}
          style={{ ...tonePanelStyle, color: config.colorVar }}
          type="button"
          onClick={() => onAdvance(item.itemId, config.nextStatus)}
        >
          {config.nextLabel}
        </button>
      </div>
    </div>
  )
}

function KitchenCardContent({
  currentEmployeeId,
  item,
}: Readonly<{
  currentEmployeeId: string | null
  item: OperationsKitchenItemRecord
}>) {
  const tab = item.kitchenStatus as KitchenTab
  const config = STATUS_CONFIG[tab]
  const elapsed = elapsedLabel(item.kitchenQueuedAt)
  const responsibleLabel = resolveResponsibleLabel(currentEmployeeId, item)

  return (
    <div className="min-w-0 flex-1">
      <KitchenCardHeader
        colorVar={config.colorVar}
        elapsed={elapsed}
        mesaLabel={item.mesaLabel}
        responsibleLabel={responsibleLabel}
      />
      <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">
        {item.quantity}x {item.productName}
      </p>
      {item.notes ? <p className="mt-1 text-xs italic text-[var(--text-soft)]">{`"${item.notes}"`}</p> : null}
      <KitchenCardFooter
        chipBg={config.chipBg}
        colorVar={config.colorVar}
        label={config.label}
        nextLabel={config.nextLabel}
      />
    </div>
  )
}

function KitchenCardHeader({
  colorVar,
  elapsed,
  mesaLabel,
  responsibleLabel,
}: Readonly<{
  colorVar: string
  elapsed: string
  mesaLabel: string
  responsibleLabel: string
}>) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: colorVar }}>
        Mesa {mesaLabel}
      </span>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--text-soft)]">
        {responsibleLabel}
      </span>
      {elapsed ? <span className="text-[10px] text-[var(--text-soft)]">{elapsed}</span> : null}
    </div>
  )
}

function KitchenCardFooter({
  chipBg,
  colorVar,
  label,
  nextLabel,
}: Readonly<{
  chipBg: string
  colorVar: string
  label: string
  nextLabel: string
}>) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Próximo passo</p>
        <p className="mt-1 text-xs text-[var(--text-primary)]">{nextLabel}</p>
      </div>
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
        style={{ background: chipBg, color: colorVar }}
      >
        {label}
      </span>
    </div>
  )
}

function resolveResponsibleLabel(currentEmployeeId: string | null, item: OperationsKitchenItemRecord) {
  if (currentEmployeeId && item.employeeId === currentEmployeeId) {
    return 'Sua mesa'
  }
  if (item.employeeName?.trim()) {
    return `Responsável ${item.employeeName}`
  }
  return 'Responsável não identificado'
}
