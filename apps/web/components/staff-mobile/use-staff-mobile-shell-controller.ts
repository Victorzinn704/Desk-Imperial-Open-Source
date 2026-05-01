'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useOfflineQueue } from '@/components/shared/use-offline-queue'
import { useStaffMetrics } from './use-staff-mobile-shell-metrics'
import { useStaffMobileShellMutations } from './use-staff-mobile-shell-mutations'
import { resolveBuilderContext, useNavigationActions } from './use-staff-mobile-shell-navigation'
import { useStaffMobileShellQueries } from './use-staff-mobile-shell-queries'
import { useOfflineDrain, useRealtimeRefresh } from './use-staff-mobile-shell-realtime'
import { useStatusHandlers } from './use-staff-mobile-shell-status-handlers'
import { useSubmitHandler } from './use-staff-mobile-shell-submit'
import type { PendingAction, StaffMobileCurrentUser, StaffMobileTab } from './staff-mobile-shell-types'

function useStaffMobileShellState() {
  const [activeTab, setActiveTab] = useState<StaffMobileTab>('mesas')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)
  const [focusedComandaId, setFocusedComandaId] = useState<string | null>(null)

  return {
    activeTab,
    focusedComandaId,
    pendingAction,
    screenError,
    setActiveTab,
    setFocusedComandaId,
    setPendingAction,
    setScreenError,
  }
}

function useBuilderViewModel(args: {
  currentEmployeeId: string | null
  kitchenBadge: number
  pendingAction: PendingAction | null
  comandasById: Map<string, ReturnType<typeof useStaffMetrics>['comandas'][number]>
}) {
  return useMemo(
    () => resolveBuilderContext(args.pendingAction, args.comandasById, args.currentEmployeeId, args.kitchenBadge),
    [args],
  )
}

function useStaffMobileShellModules(
  currentUser: StaffMobileCurrentUser,
  shellState: ReturnType<typeof useStaffMobileShellState>,
) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const queue = useOfflineQueue()
  const realtime = useRealtimeRefresh(Boolean(currentUser), currentUser?.userId ?? null)
  const queries = useStaffMobileShellQueries(currentUser, {
    activeTab: shellState.activeTab,
    pendingAction: shellState.pendingAction,
  })
  const mutations = useStaffMobileShellMutations(queryClient, router, currentUser?.employeeId ?? null)
  const metrics = useStaffMetrics(
    currentUser,
    queries.operationsQuery,
    queries.kitchenQuery,
    queries.ordersHistoryQuery,
  )

  return { metrics, mutations, queries, queryClient, queue, realtime }
}

function useStaffMobileShellActions(args: {
  currentEmployeeId: string | null
  metrics: ReturnType<typeof useStaffMetrics>
  mutations: ReturnType<typeof useStaffMobileShellMutations>
  pendingAction: PendingAction | null
  queryClient: ReturnType<typeof useQueryClient>
  queue: ReturnType<typeof useOfflineQueue>
  shellState: ReturnType<typeof useStaffMobileShellState>
}) {
  const navigation = useNavigationActions({
    setActiveTab: args.shellState.setActiveTab,
    setFocusedComandaId: args.shellState.setFocusedComandaId,
    setPendingAction: args.shellState.setPendingAction,
  })
  const builder = useBuilderViewModel({
    comandasById: args.metrics.comandasById,
    currentEmployeeId: args.currentEmployeeId,
    kitchenBadge: args.metrics.kitchenBadge,
    pendingAction: args.pendingAction,
  })
  const handleSubmit = useSubmitHandler({
    enqueue: args.queue.enqueue,
    mutations: args.mutations,
    pendingAction: args.pendingAction,
    queryClient: args.queryClient,
    setActiveTab: args.shellState.setActiveTab,
    setFocusedComandaId: args.shellState.setFocusedComandaId,
    setPendingAction: args.shellState.setPendingAction,
    setScreenError: args.shellState.setScreenError,
  })
  const statusHandlers = useStatusHandlers({
    comandasById: args.metrics.comandasById,
    mutations: args.mutations,
    setScreenError: args.shellState.setScreenError,
  })

  return { builder, handleSubmit, navigation, statusHandlers }
}

export function useStaffMobileShellController(currentUser: StaffMobileCurrentUser) {
  const shellState = useStaffMobileShellState()
  const modules = useStaffMobileShellModules(currentUser, shellState)
  const actions = useStaffMobileShellActions({
    currentEmployeeId: currentUser?.employeeId ?? null,
    metrics: modules.metrics,
    mutations: modules.mutations,
    pendingAction: shellState.pendingAction,
    queryClient: modules.queryClient,
    queue: modules.queue,
    shellState,
  })

  useOfflineDrain({
    addComandaItemMutation: modules.mutations.addComandaItemMutation,
    drainQueue: modules.queue.drainQueue,
    openComandaMutation: modules.mutations.openComandaMutation,
    realtimeStatus: modules.realtime.realtimeStatus,
  })

  return {
    ...actions.builder,
    ...actions.navigation,
    ...actions.statusHandlers,
    ...modules.metrics,
    ...modules.mutations,
    ...modules.queries,
    ...modules.realtime,
    ...shellState,
    currentEmployeeId: currentUser?.employeeId ?? null,
    handleSubmit: actions.handleSubmit,
    isOffline: modules.realtime.isOffline,
  }
}

export type StaffMobileShellController = ReturnType<typeof useStaffMobileShellController>
export type StaffMobileShellViewModel = Omit<
  StaffMobileShellController,
  'containerRef' | 'indicatorStyle' | 'isRefreshing' | 'progress' | 'screenError' | 'setScreenError'
>
