/* eslint-disable max-lines */
import type { OperationsKitchenItemRecord } from '@contracts/contracts'
import {
  BannerBox,
  KitchenEmptyError,
  KitchenEmptyFree,
  KitchenEmptyLoader,
  KitchenEmptyOffline,
  KitchenEmptyTab,
} from './kitchen-orders-view.empty-state'
import {
  getTonePanelStyle,
  resolveKitchenContentState,
  resolveToneColor,
  STATUS_CONFIG,
} from './kitchen-orders-view.helpers'
import type { KitchenTab } from './kitchen-orders-view.types'
import { KitchenOrdersVirtualList } from './kitchen-orders-view.virtual-list'

type KitchenStatusCounts = { IN_PREPARATION: number; QUEUED: number; READY: number }
type KitchenSnapshot = {
  activeMesas: number
  nextAction: string
  oldestQueuedLabel: string
  ownItems: number
  pressureLabel: string
  pressureTone: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
}

type KitchenOrdersLayoutProps = {
  activeTab: KitchenTab
  counts: KitchenStatusCounts
  currentEmployeeId: string | null
  error: string | null
  errorMessage: string | null
  hasItems: boolean
  isLoading: boolean
  isOffline: boolean
  isPending: boolean
  onAdvance: (itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') => void
  onDismissError: () => void
  onTabChange: (tab: KitchenTab) => void
  snapshot: KitchenSnapshot
  tabItems: OperationsKitchenItemRecord[]
}

export function KitchenOrdersLayout({
  activeTab,
  counts,
  currentEmployeeId,
  error,
  errorMessage,
  hasItems,
  isLoading,
  isOffline,
  isPending,
  onAdvance,
  onDismissError,
  onTabChange,
  snapshot,
  tabItems,
}: Readonly<KitchenOrdersLayoutProps>) {
  return (
    <div className="flex h-full flex-col">
      <KitchenStatusBanner errorMessage={errorMessage} isOffline={isOffline} />
      <KitchenHeaderPanel counts={counts} currentEmployeeId={currentEmployeeId} snapshot={snapshot} />
      <KitchenTabs activeTab={activeTab} counts={counts} onTabChange={onTabChange} />
      {error ? <KitchenInlineError error={error} onDismiss={onDismissError} /> : null}
      <KitchenContentState
        activeTab={activeTab}
        currentEmployeeId={currentEmployeeId}
        errorMessage={errorMessage}
        hasItems={hasItems}
        isLoading={isLoading}
        isOffline={isOffline}
        isPending={isPending}
        tabItems={tabItems}
        onAdvance={onAdvance}
      />
    </div>
  )
}

function KitchenStatusBanner({
  errorMessage,
  isOffline,
}: Readonly<{
  errorMessage: string | null
  isOffline: boolean
}>) {
  if (errorMessage) {
    return <BannerBox text={errorMessage} tone="danger" />
  }
  if (isOffline) {
    return (
      <BannerBox text="Você está offline. A fila da cozinha pode estar desatualizada até a reconexão." tone="warning" />
    )
  }
  return null
}

function KitchenHeaderPanel({
  counts,
  currentEmployeeId,
  snapshot,
}: Readonly<{
  counts: KitchenStatusCounts
  currentEmployeeId: string | null
  snapshot: KitchenSnapshot
}>) {
  return (
    <section className="mx-4 mt-4 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">Cozinha</p>
          <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Fila compartilhada do salão</h1>
          <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
            O foco aqui é tirar pedido da fila, acompanhar preparo e despachar pratos com responsável visível.
          </p>
        </div>
        <span
          className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ ...getTonePanelStyle(snapshot.pressureTone), color: resolveToneColor(snapshot.pressureTone) }}
        >
          {snapshot.pressureLabel}
        </span>
      </div>
      <KitchenPrimaryStats counts={counts} snapshot={snapshot} />
      <KitchenSecondaryStats currentEmployeeId={currentEmployeeId} snapshot={snapshot} />
    </section>
  )
}

function KitchenPrimaryStats({
  counts,
  snapshot,
}: Readonly<{
  counts: KitchenStatusCounts
  snapshot: Pick<KitchenSnapshot, 'activeMesas'>
}>) {
  const items = [
    { label: 'Na fila', tone: '#fb923c', value: counts.QUEUED },
    { label: 'Em preparo', tone: '#60a5fa', value: counts.IN_PREPARATION },
    { label: 'Prontos', tone: '#36f57c', value: counts.READY },
    { label: 'Mesas', tone: '#c4b5fd', value: snapshot.activeMesas },
  ]
  return <KitchenStatGrid columns={4} items={items.map((item) => ({ ...item, hint: null }))} />
}

function KitchenSecondaryStats({
  currentEmployeeId,
  snapshot,
}: Readonly<{
  currentEmployeeId: string | null
  snapshot: Pick<KitchenSnapshot, 'nextAction' | 'oldestQueuedLabel' | 'ownItems'>
}>) {
  return (
    <KitchenStatGrid
      columns={3}
      items={[
        { label: 'Próxima ação', tone: null, value: snapshot.nextAction },
        { label: 'Fila mais antiga', tone: null, value: snapshot.oldestQueuedLabel },
        { label: 'Sua pressão', tone: null, value: currentEmployeeId ? String(snapshot.ownItems) : '—' },
      ]}
    />
  )
}

function KitchenStatGrid({
  columns,
  items,
}: Readonly<{
  columns: 3 | 4
  items: Array<{ hint?: string | null; label: string; tone: string | null; value: string | number }>
}>) {
  const gridClass = columns === 4 ? 'grid-cols-4' : 'grid-cols-3'

  return (
    <div className={`mt-4 grid ${gridClass} gap-px overflow-hidden rounded-[18px] bg-[var(--border)]`}>
      {items.map((item) => (
        <div className="bg-[var(--surface-muted)] px-3 py-3" key={item.label}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{item.label}</p>
          <p
            className={`mt-1 ${item.tone ? 'text-lg font-bold' : 'text-xs font-semibold'} text-[var(--text-primary)]`}
            style={item.tone ? { color: item.tone } : undefined}
          >
            {item.value}
          </p>
          {item.hint ? <p className="mt-1 text-[11px] leading-5 text-[var(--text-soft,#7a8896)]">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}

function KitchenTabs({
  activeTab,
  counts,
  onTabChange,
}: Readonly<{
  activeTab: KitchenTab
  counts: KitchenStatusCounts
  onTabChange: (tab: KitchenTab) => void
}>) {
  return (
    <div className="flex shrink-0 gap-1 px-4 pb-3 pt-4">
      {(Object.entries(STATUS_CONFIG) as [KitchenTab, (typeof STATUS_CONFIG)[KitchenTab]][]).map(([tab, config]) => (
        <button
          className="flex-1 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wide transition-all active:scale-95"
          key={tab}
          style={resolveKitchenTabStyle(activeTab === tab, config.colorVar, config.tone)}
          type="button"
          onClick={() => onTabChange(tab)}
        >
          {config.label}
          {counts[tab] > 0 ? (
            <span
              className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full text-[10px]"
              style={{ background: config.colorVar, color: 'var(--on-accent)' }}
            >
              {counts[tab]}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function KitchenInlineError({
  error,
  onDismiss,
}: Readonly<{
  error: string
  onDismiss: () => void
}>) {
  return (
    <div
      className="mx-4 mb-3 rounded-xl border px-4 py-2 text-sm text-[var(--danger)]"
      style={getTonePanelStyle('danger')}
    >
      {error}
      <button className="ml-3 text-xs font-semibold underline opacity-70" type="button" onClick={onDismiss}>
        OK
      </button>
    </div>
  )
}

function KitchenContentState({
  activeTab,
  currentEmployeeId,
  errorMessage,
  hasItems,
  isLoading,
  isOffline,
  isPending,
  tabItems,
  onAdvance,
}: Readonly<{
  activeTab: KitchenTab
  currentEmployeeId: string | null
  errorMessage: string | null
  hasItems: boolean
  isLoading: boolean
  isOffline: boolean
  isPending: boolean
  tabItems: OperationsKitchenItemRecord[]
  onAdvance: (itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') => void
}>) {
  const bodyState = resolveKitchenContentState({
    errorMessage,
    hasItems,
    isLoading,
    isOffline,
    tabItemsCount: tabItems.length,
  })

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6">
      {bodyState === 'loading' ? <KitchenEmptyLoader /> : null}
      {bodyState === 'error' ? <KitchenEmptyError errorMessage={errorMessage ?? 'Erro ao carregar cozinha'} /> : null}
      {bodyState === 'offline' ? <KitchenEmptyOffline /> : null}
      {bodyState === 'free' ? <KitchenEmptyFree /> : null}
      {bodyState === 'empty-tab' ? <KitchenEmptyTab activeTab={activeTab} /> : null}
      {bodyState === 'items' ? (
        <KitchenItemsList
          currentEmployeeId={currentEmployeeId}
          isPending={isPending}
          items={tabItems}
          onAdvance={onAdvance}
        />
      ) : null}
    </div>
  )
}

function KitchenItemsList({
  currentEmployeeId,
  isPending,
  items,
  onAdvance,
}: Readonly<{
  currentEmployeeId: string | null
  isPending: boolean
  items: OperationsKitchenItemRecord[]
  onAdvance: (itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') => void
}>) {
  return (
    <KitchenOrdersVirtualList
      currentEmployeeId={currentEmployeeId}
      isPending={isPending}
      items={items}
      onAdvance={onAdvance}
    />
  )
}

function resolveKitchenTabStyle(
  isActive: boolean,
  colorVar: string,
  tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral',
) {
  return {
    ...(isActive ? getTonePanelStyle(tone) : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }),
    border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
    color: isActive ? colorVar : 'var(--text-soft)',
  }
}
