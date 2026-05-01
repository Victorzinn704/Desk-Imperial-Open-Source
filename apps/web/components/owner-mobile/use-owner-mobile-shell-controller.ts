'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ComandaItem } from '@/components/pdv/pdv-types'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import { haptic } from '@/components/shared/haptic'
import { usePullToRefresh } from '@/components/shared/use-pull-to-refresh'
import { toast } from 'sonner'
import { openCashSession } from '@/lib/api'
import {
  buildOperationsExecutiveKpis,
  invalidateOperationsWorkspace,
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations'
import { isCashSessionRequiredError } from '@/lib/operations/operations-error-utils'
import type { OwnerCurrentUser, OwnerMobileTab, OwnerPdvView, PendingAction } from './owner-mobile-shell-types'
import {
  buildGarconSnapshots,
  buildOwnerMobileShellControllerValue,
  mapOrderItemPayload,
} from './owner-mobile-shell-model'
import { useOwnerMobileShellMutations } from './use-owner-mobile-shell-mutations'
import { useOwnerMobileShellQueries } from './use-owner-mobile-shell-queries'

function useRealtimeRefresh(
  enabled: boolean,
  queryClient: ReturnType<typeof useQueryClient>,
  currentUserId?: string | null,
) {
  const { status: realtimeStatus } = useOperationsRealtime(enabled, queryClient, {
    currentUserId: currentUserId ?? null,
    notificationChannel: 'MOBILE_TOAST',
  })
  const isOffline = realtimeStatus === 'disconnected'
  const handlePullRefresh = useCallback(async () => {
    haptic.light()
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY }),
    ])
  }, [queryClient])

  return {
    isOffline,
    realtimeStatus,
    ...usePullToRefresh({ onRefresh: handlePullRefresh }),
  }
}

function useOwnerMetrics(queries: ReturnType<typeof useOwnerMobileShellQueries>) {
  const mesas = useMemo(() => buildPdvMesas(queries.operationsQuery.data), [queries.operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(queries.operationsQuery.data), [queries.operationsQuery.data])
  const activeComandas = useMemo(() => comandas.filter((comanda) => comanda.status !== 'fechada'), [comandas])
  const executiveKpis = useMemo(
    () => queries.summaryQuery.data?.kpis ?? buildOperationsExecutiveKpis(queries.operationsQuery.data),
    [queries.operationsQuery.data, queries.summaryQuery.data],
  )
  const kitchenBadge = useMemo(
    () =>
      (queries.kitchenQuery.data?.statusCounts.queued ?? 0) +
      (queries.kitchenQuery.data?.statusCounts.inPreparation ?? 0),
    [queries.kitchenQuery.data],
  )
  const today = new Date().toISOString().slice(0, 10)
  const todayOrders = useMemo(
    () =>
      (queries.ordersQuery.data?.items ?? []).filter(
        (order) => order.createdAt.slice(0, 10) === today && order.status === 'COMPLETED',
      ),
    [queries.ordersQuery.data?.items, today],
  )
  const todayRevenue = useMemo(() => todayOrders.reduce((sum, order) => sum + order.totalRevenue, 0), [todayOrders])
  const ticketMedio = useMemo(
    () => (todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0),
    [todayOrders.length, todayRevenue],
  )
  const garconRanking = useMemo(() => queries.summaryQuery.data?.performers ?? [], [queries.summaryQuery.data])
  const garconSnapshots = useMemo(
    () => buildGarconSnapshots(activeComandas, garconRanking),
    [activeComandas, garconRanking],
  )
  const topProdutos = useMemo(() => queries.summaryQuery.data?.topProducts ?? [], [queries.summaryQuery.data])

  return {
    activeComandas,
    comandas,
    executiveKpis,
    garconRanking,
    garconSnapshots,
    kitchenBadge,
    mesas,
    mesasLivres: mesas.filter((mesa) => mesa.status === 'livre').length,
    mesasOcupadas: mesas.filter((mesa) => mesa.status === 'ocupada').length,
    ticketMedio,
    todayOrderCount: todayOrders.length,
    todayRevenue,
    topProdutos,
  }
}

async function submitExistingComanda(
  comandaId: string,
  items: ComandaItem[],
  mutateAsync: ReturnType<typeof useOwnerMobileShellMutations>['addComandaItemsMutation']['mutateAsync'],
) {
  await mutateAsync({ comandaId, items: items.map(mapOrderItemPayload) })
}

async function replaceExistingComanda(
  pendingAction: Extract<PendingAction, { type: 'edit' }>,
  items: ComandaItem[],
  mutateAsync: ReturnType<typeof useOwnerMobileShellMutations>['replaceComandaMutation']['mutateAsync'],
) {
  await mutateAsync({
    comandaId: pendingAction.comandaId,
    payload: {
      tableLabel: pendingAction.mesaLabel,
      customerName: pendingAction.comanda.clienteNome,
      customerDocument: pendingAction.comanda.clienteDocumento,
      participantCount: pendingAction.comanda.participantCount,
      notes: pendingAction.comanda.notes,
      items: items.map(mapOrderItemPayload),
    },
  })
}

async function submitNewComanda(
  queryClient: ReturnType<typeof useQueryClient>,
  pendingAction: Extract<PendingAction, { type: 'new' }>,
  items: ComandaItem[],
  mutateAsync: ReturnType<typeof useOwnerMobileShellMutations>['openComandaMutation']['mutateAsync'],
) {
  const payload = {
    mesaId: pendingAction.mesa.id,
    tableLabel: normalizeTableLabel(pendingAction.mesa.numero),
    items: items.map(mapOrderItemPayload),
  }

  try {
    await mutateAsync(payload)
    return
  } catch (error) {
    if (!isCashSessionRequiredError(error)) {
      throw error
    }
  }

  toast.dismiss()
  toast.info('Abrindo caixa automaticamente...')
  await openCashSession({ openingCashAmount: 0 }, { includeSnapshot: false })
  await invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
    includeSummary: true,
  })
  await mutateAsync(payload)
}

const OWNER_TABS = new Set<OwnerMobileTab>(['today', 'comandas', 'pdv', 'caixa', 'financeiro', 'conta'])

function resolveOwnerTab(value: string | null): OwnerMobileTab {
  return value && OWNER_TABS.has(value as OwnerMobileTab) ? (value as OwnerMobileTab) : 'today'
}

function useOwnerMobileShellState(initialTab: OwnerMobileTab) {
  const [activeTab, setActiveTab] = useState<OwnerMobileTab>(initialTab)
  const [pdvView, setPdvView] = useState<OwnerPdvView>('mesas')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)
  const [focusedComandaId, setFocusedComandaId] = useState<string | null>(null)

  return {
    activeTab,
    focusedComandaId,
    pdvView,
    pendingAction,
    screenError,
    setActiveTab,
    setFocusedComandaId,
    setPdvView,
    setPendingAction,
    setScreenError,
  }
}

function useOwnerHandleSubmit({
  pendingAction,
  queryClient,
  setActiveTab,
  setPendingAction,
  setScreenError,
  mutations,
}: {
  pendingAction: PendingAction | null
  queryClient: ReturnType<typeof useQueryClient>
  setActiveTab: (tab: OwnerMobileTab) => void
  setPendingAction: (action: PendingAction | null) => void
  setScreenError: (value: string | null) => void
  mutations: ReturnType<typeof useOwnerMobileShellMutations>
}) {
  return useCallback(
    async (items: ComandaItem[]) => {
      if (!pendingAction) {
        return
      }
      setScreenError(null)

      try {
        if (pendingAction.type === 'edit') {
          await replaceExistingComanda(pendingAction, items, mutations.replaceComandaMutation.mutateAsync)
        } else if (pendingAction.type === 'add') {
          await submitExistingComanda(pendingAction.comandaId, items, mutations.addComandaItemsMutation.mutateAsync)
        } else {
          await submitNewComanda(queryClient, pendingAction, items, mutations.openComandaMutation.mutateAsync)
        }
        setPendingAction(null)
        setActiveTab('comandas')
      } catch (error) {
        setScreenError(error instanceof Error ? error.message : 'Não foi possível processar o pedido.')
      }
    },
    [
      mutations.addComandaItemsMutation.mutateAsync,
      mutations.openComandaMutation.mutateAsync,
      mutations.replaceComandaMutation.mutateAsync,
      pendingAction,
      queryClient,
      setActiveTab,
      setPendingAction,
      setScreenError,
    ],
  )
}

export function useOwnerMobileShellController(currentUser: OwnerCurrentUser | null) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const queryClient = useQueryClient()
  const initialTab = resolveOwnerTab(tabParam)
  const shellState = useOwnerMobileShellState(initialTab)
  const realtime = useRealtimeRefresh(Boolean(currentUser), queryClient, currentUser?.userId ?? null)
  const queries = useOwnerMobileShellQueries(currentUser, {
    activeTab: shellState.activeTab,
    pdvView: shellState.pdvView,
    pendingAction: shellState.pendingAction,
  })
  const mutations = useOwnerMobileShellMutations(queryClient, router)
  const metrics = useOwnerMetrics(queries)
  const handleSubmit = useOwnerHandleSubmit({ ...shellState, mutations, queryClient })
  const { setActiveTab } = shellState

  useEffect(() => {
    setActiveTab(resolveOwnerTab(tabParam))
  }, [setActiveTab, tabParam])

  return buildOwnerMobileShellControllerValue({
    currentUser,
    handleSubmit,
    metrics,
    mutations,
    queries,
    realtime,
    router,
    ...shellState,
  })
}

export type OwnerMobileShellController = ReturnType<typeof useOwnerMobileShellController>
