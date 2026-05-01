'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardList, ReceiptText, Rows3, SquareKanban } from 'lucide-react'
import type { OrderRecord } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import {
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabMetricStrip,
  LabMetricStripItem,
  LabMiniStat,
  LabPageHeader,
  LabPanel,
} from '@/components/design-lab/lab-primitives'
import { ApiError, fetchOrders } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { buildPedidosHeaderStats, resolvePedidosView, viewCopy } from './pedidos-environment-header'
import { buildPedidosInsights } from './pedidos-environment-insights'
import { OrderDetailPanel, OrdersHistoryPanel, OrdersKanbanPanel } from './pedidos-environment-status-panels'
import {
  PedidosLabSummary,
  PedidosLockedState,
  PedidosMetaSummary,
  PedidosMetricTile,
} from './pedidos-environment-shell-panels'
import { OrdersTablePanel, OrdersTimelinePanel } from './pedidos-environment-table-panels'
import type { PedidosSurface, PedidosView } from './pedidos-environment.types'

type PedidosRuntimeReady = {
  copy: (typeof viewCopy)[keyof typeof viewCopy]
  displayCurrency: OrderRecord['displayCurrency']
  error: string | null
  headerStats: ReturnType<typeof buildPedidosHeaderStats>
  insights: ReturnType<typeof buildPedidosInsights>
  orders: OrderRecord[]
  status: 'ready'
  totals:
    | {
        cancelledOrders: number
        completedOrders: number
        realizedProfit: number
        realizedRevenue: number
        soldUnits: number
      }
    | undefined
  view: PedidosView
}

export function PedidosEnvironment({
  activeTab,
  surface = 'legacy',
}: Readonly<{ activeTab: DashboardTabId | 'historico' | null; surface?: PedidosSurface }>) {
  const state = usePedidosEnvironmentRuntime(activeTab)

  if (state.status === 'loading') {
    return (
      <section className="space-y-5">
        <LabPageHeader description={state.copy.description} eyebrow={state.copy.eyebrow} title={state.copy.title} />
        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir a visão de pedidos.</p>
        </LabPanel>
      </section>
    )
  }

  if (state.status === 'locked') {
    return <PedidosLockedState copy={state.copy} view={state.view} />
  }

  return <PedidosEnvironmentContent surface={surface} {...state} />
}

function usePedidosEnvironmentRuntime(activeTab: DashboardTabId | 'historico' | null) {
  const { sessionQuery } = useDashboardQueries({ section: 'pedidos' })
  const view = resolvePedidosView(activeTab)
  const copy = viewCopy[view]
  const user = sessionQuery.data?.user
  const ordersQuery = useQuery({
    queryKey: ['orders', 'detail', 'pedidos'],
    queryFn: () => fetchOrders({ includeCancelled: true, includeItems: true }),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  if (sessionQuery.isLoading) {
    return { copy, status: 'loading' as const }
  }

  if (!user) {
    return { copy, status: 'locked' as const, view }
  }

  const orders = ordersQuery.data?.items ?? []
  const totals = ordersQuery.data?.totals
  const displayCurrency = user.preferredCurrency as OrderRecord['displayCurrency']
  const error = ordersQuery.error instanceof ApiError ? ordersQuery.error.message : null
  const insights = buildPedidosInsights({ orders, totals })
  const headerStats = buildPedidosHeaderStats({ currency: displayCurrency, insights, view })

  return {
    copy,
    displayCurrency,
    error,
    headerStats,
    insights,
    orders,
    status: 'ready' as const,
    totals,
    view,
  }
}

function PedidosEnvironmentContent(props: Readonly<PedidosRuntimeReady & { surface: PedidosSurface }>) {
  const meta =
    props.surface === 'lab' ? undefined : (
      <PedidosMetaSummary currency={props.displayCurrency} insights={props.insights} view={props.view} />
    )
  const headerContent =
    props.surface === 'lab' ? (
      <LabMetricStrip>
        {props.headerStats.map((stat) => (
          <LabMetricStripItem description={stat.description} key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </LabMetricStrip>
    ) : (
      <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
        {props.headerStats.map((stat) => (
          <LabMiniStat description={stat.description} key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    )
  const bodyPanel = props.error ? (
    <PedidosErrorPanel message={props.error} />
  ) : (
    <PedidosViewPanel currency={props.displayCurrency} orders={props.orders} view={props.view} />
  )

  return (
    <section className="space-y-5">
      <LabPageHeader
        description={props.copy.description}
        eyebrow={props.copy.eyebrow}
        meta={meta}
        title={props.copy.title}
      >
        {headerContent}
      </LabPageHeader>
      {props.surface === 'legacy' ? (
        <PedidosLegacyMetrics currency={props.displayCurrency} insights={props.insights} totals={props.totals} />
      ) : null}
      {!props.error && props.surface === 'lab' ? (
        <PedidosLabSummary currency={props.displayCurrency} insights={props.insights} view={props.view} />
      ) : null}
      {bodyPanel}
    </section>
  )
}

function PedidosLegacyMetrics(
  props: Readonly<{
    currency: OrderRecord['displayCurrency']
    insights: ReturnType<typeof buildPedidosInsights>
    totals:
      | {
          cancelledOrders: number
          completedOrders: number
          realizedProfit: number
          realizedRevenue: number
          soldUnits: number
        }
      | undefined
  }>,
) {
  return (
    <div className={`grid gap-4 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
      <PedidosMetricTile
        hint="pedidos liquidados no periodo"
        icon={ClipboardList}
        label="concluidos"
        value={String(props.totals?.completedOrders ?? 0)}
      />
      <PedidosMetricTile
        hint="pedidos cancelados"
        icon={Rows3}
        label="cancelados"
        tone="danger"
        value={String(props.totals?.cancelledOrders ?? 0)}
      />
      <PedidosMetricTile
        hint="receita realizada pelo historico atual"
        icon={ReceiptText}
        label="receita"
        tone="success"
        value={formatCurrency(props.totals?.realizedRevenue ?? 0, props.currency)}
      />
      <PedidosMetricTile
        hint="media por pedido concluido"
        icon={SquareKanban}
        label="ticket medio"
        value={formatCurrency(props.insights.averageTicket, props.currency)}
      />
    </div>
  )
}

function PedidosErrorPanel({ message }: Readonly<{ message: string }>) {
  return (
    <LabPanel padding="md">
      <p className="text-sm text-[var(--danger)]">{message}</p>
    </LabPanel>
  )
}

function PedidosViewPanel(
  props: Readonly<{ currency: OrderRecord['displayCurrency']; orders: OrderRecord[]; view: PedidosView }>,
) {
  if (props.view === 'tabela') {
    return <OrdersTablePanel currency={props.currency} orders={props.orders} />
  }

  if (props.view === 'timeline') {
    return <OrdersTimelinePanel currency={props.currency} orders={props.orders} />
  }

  if (props.view === 'kanban') {
    return <OrdersKanbanPanel currency={props.currency} orders={props.orders} />
  }

  if (props.view === 'detalhe') {
    return <OrderDetailPanel currency={props.currency} order={props.orders[0] ?? null} />
  }

  return <OrdersHistoryPanel currency={props.currency} orders={props.orders} />
}
