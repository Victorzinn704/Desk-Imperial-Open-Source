'use client'
/* eslint-disable complexity, max-lines, max-lines-per-function, no-nested-ternary */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { OrderRecord } from '@contracts/contracts'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import {
  calcSubtotal,
  type Comanda,
  type ComandaItem,
  type ComandaStatus,
  isEndedComandaStatus,
  type Mesa,
} from '@/components/pdv/pdv-types'
import {
  buildPdvComandas,
  buildPdvMesas,
  toOperationAmounts,
  toOperationsStatus,
} from '@/components/pdv/pdv-operations'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import { haptic } from '@/components/shared/haptic'
import { usePullToRefresh } from '@/components/shared/use-pull-to-refresh'
import { useOfflineQueue } from '@/components/shared/use-offline-queue'
import { type addComandaItem, ApiError, type createComandaPayment, openCashSession, type openComanda } from '@/lib/api'
import {
  buildPerformerKpis,
  buildPerformerStanding,
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  scheduleOperationsWorkspaceReconcile,
} from '@/lib/operations'
import { isCashSessionRequiredError } from '@/lib/operations/operations-error-utils'
import { useStaffMobileShellMutations } from './use-staff-mobile-shell-mutations'
import { useStaffMobileShellQueries } from './use-staff-mobile-shell-queries'
import type { PendingAction, StaffMobileCurrentUser, StaffMobileTab } from './staff-mobile-shell-types'

function toApiItemPayload(item: ComandaItem) {
  const isManual = item.produtoId.startsWith('manual-')
  return {
    productId: isManual ? undefined : item.produtoId,
    productName: isManual ? item.nome : undefined,
    quantity: item.quantidade,
    unitPrice: item.precoUnitario,
    notes: item.observacao,
  }
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 0) {
    return true
  }
  if (error instanceof Error && error.message.toLowerCase().includes('fetch')) {
    return true
  }
  return false
}

function orderToHistoricComanda(order: OrderRecord): Comanda {
  const subtotal = order.items.reduce((sum, item) => sum + item.lineRevenue, 0)
  const total = order.totalRevenue

  return {
    id: order.comandaId ?? order.id,
    status: order.status === 'CANCELLED' ? 'cancelada' : 'fechada',
    mesa: order.channel ?? 'Venda',
    clienteNome: order.customerName ?? undefined,
    clienteDocumento: order.buyerDocument ?? undefined,
    garcomId: order.employeeId ?? undefined,
    garcomNome: order.sellerName ?? order.sellerCode ?? undefined,
    itens: order.items.map((item) => ({
      produtoId: item.productId ?? item.id,
      nome: item.productName,
      quantidade: item.quantity,
      precoUnitario: item.unitPrice,
    })),
    desconto: 0,
    acrescimo: 0,
    abertaEm: new Date(order.createdAt),
    subtotalBackend: subtotal > 0 ? subtotal : total,
    totalBackend: total,
  }
}

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

function useRealtimeRefresh(enabled: boolean, queryClient: ReturnType<typeof useQueryClient>) {
  const { status: realtimeStatus } = useOperationsRealtime(enabled, queryClient)
  const isOffline = realtimeStatus === 'disconnected'
  const handlePullRefresh = useCallback(async () => {
    haptic.light()
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['staff-orders-history'] }),
    ])
  }, [queryClient])

  return {
    isOffline,
    realtimeStatus,
    ...usePullToRefresh({ onRefresh: handlePullRefresh }),
  }
}

function useOfflineDrain(args: {
  drainQueue: ReturnType<typeof useOfflineQueue>['drainQueue']
  realtimeStatus: ReturnType<typeof useRealtimeRefresh>['realtimeStatus']
  addComandaItemMutation: ReturnType<typeof useStaffMobileShellMutations>['addComandaItemMutation']
  openComandaMutation: ReturnType<typeof useStaffMobileShellMutations>['openComandaMutation']
}) {
  const runDrain = useCallback(() => {
    return args
      .drainQueue(async (action) => {
        if (action.type === 'add-item') {
          const { comandaId, payload } = action.payload as {
            comandaId: string
            payload: Parameters<typeof addComandaItem>[1]
          }
          await args.addComandaItemMutation.mutateAsync({ comandaId, payload })
        } else if (action.type === 'open-comanda') {
          await args.openComandaMutation.mutateAsync(action.payload as Parameters<typeof openComanda>[0])
        }
      })
      .then((result) => {
        if (result.expiredCount > 0) {
          const message =
            result.expiredCount === 1
              ? '1 ação offline expirou após 10 minutos sem conexão e foi descartada.'
              : `${result.expiredCount} ações offline expiraram após 10 minutos sem conexão e foram descartadas.`
          toast.error(message)
        }

        return result
      })
  }, [args])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'DRAIN_QUEUE') {
        void runDrain()
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [runDrain])

  useEffect(() => {
    if (args.realtimeStatus !== 'connected') {
      return
    }
    void runDrain()
  }, [args.realtimeStatus, runDrain])
}

function useStaffMetrics(
  currentUser: StaffMobileCurrentUser,
  operationsQuery: ReturnType<typeof useStaffMobileShellQueries>['operationsQuery'],
  kitchenQuery: ReturnType<typeof useStaffMobileShellQueries>['kitchenQuery'],
  ordersHistoryQuery: ReturnType<typeof useStaffMobileShellQueries>['ordersHistoryQuery'],
) {
  const currentEmployeeId = currentUser?.employeeId ?? null
  const mesas = useMemo(() => buildPdvMesas(operationsQuery.data), [operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(operationsQuery.data), [operationsQuery.data])
  const comandasById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const activeComandas = useMemo(() => comandas.filter((comanda) => !isEndedComandaStatus(comanda.status)), [comandas])

  const historicoComandas = useMemo(() => {
    if (!currentEmployeeId) {
      return []
    }

    const orders = ordersHistoryQuery.data?.items ?? []
    if (orders.length > 0) {
      return orders.filter((order) => order.employeeId === currentEmployeeId).map(orderToHistoricComanda)
    }

    return comandas.filter((comanda) => comanda.garcomId === currentEmployeeId && isEndedComandaStatus(comanda.status))
  }, [comandas, currentEmployeeId, ordersHistoryQuery.data?.items])

  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Funcionário'
  const performerKpis = useMemo(
    () => buildPerformerKpis(operationsQuery.data, currentEmployeeId),
    [currentEmployeeId, operationsQuery.data],
  )
  const performerStanding = useMemo(
    () => buildPerformerStanding(operationsQuery.data, currentEmployeeId),
    [currentEmployeeId, operationsQuery.data],
  )
  const kitchenBadge = useMemo(
    () => (kitchenQuery.data?.statusCounts.queued ?? 0) + (kitchenQuery.data?.statusCounts.inPreparation ?? 0),
    [kitchenQuery.data],
  )

  return {
    activeComandas,
    comandas,
    comandasById,
    displayName,
    historicoComandas,
    kitchenBadge,
    mesas,
    performerKpis,
    performerStanding,
  }
}

function resolveBuilderContext(
  pendingAction: PendingAction | null,
  comandasById: Map<string, Comanda>,
  currentEmployeeId: string | null,
  kitchenBadge: number,
) {
  const mesaLabel = pendingAction
    ? pendingAction.type === 'new'
      ? normalizeTableLabel(pendingAction.mesa.numero)
      : pendingAction.mesaLabel
    : '?'

  const orderMode: 'new' | 'add' | 'edit' =
    pendingAction?.type === 'edit' ? 'edit' : pendingAction?.type === 'add' ? 'add' : 'new'
  const pendingComanda =
    pendingAction?.type === 'add' || pendingAction?.type === 'edit'
      ? (comandasById.get(pendingAction.comandaId) ?? (pendingAction.type === 'edit' ? pendingAction.comanda : null))
      : null

  const responsibleSummary =
    pendingAction?.type === 'add' || pendingAction?.type === 'edit'
      ? {
          label: 'Responsável',
          value:
            pendingComanda?.garcomId === currentEmployeeId
              ? 'Sua mesa'
              : (pendingComanda?.garcomNome ?? 'Sem responsável'),
          tone: pendingComanda?.garcomId === currentEmployeeId ? '#c4b5fd' : '#f0f0f3',
        }
      : {
          label: 'Situação',
          value: 'Mesa livre',
          tone: '#36f57c',
        }

  const summaryItems = pendingAction
    ? [
        { label: 'Mesa', value: mesaLabel, tone: '#008cff' },
        responsibleSummary,
        {
          label: 'Na cozinha',
          value: String(kitchenBadge),
          tone: kitchenBadge > 0 ? '#eab308' : '#36f57c',
        },
      ]
    : undefined

  return { mesaLabel, orderMode, pendingComanda, summaryItems }
}

function useNavigationActions(setters: {
  setActiveTab: (tab: StaffMobileTab) => void
  setFocusedComandaId: (id: string | null) => void
  setPendingAction: (action: PendingAction | null) => void
}) {
  const handleSelectMesa = useCallback(
    (mesa: Mesa) => {
      if (mesa.status === 'ocupada' && mesa.comandaId) {
        setters.setPendingAction(null)
        setters.setFocusedComandaId(mesa.comandaId)
        setters.setActiveTab('pedidos')
        return
      }

      setters.setPendingAction({ type: 'new', mesa })
      setters.setFocusedComandaId(null)
      setters.setActiveTab('pedido')
    },
    [setters],
  )

  const handleAddItemsToComanda = useCallback(
    (comanda: Comanda) => {
      setters.setPendingAction({ type: 'edit', comandaId: comanda.id, mesaLabel: comanda.mesa ?? '?', comanda })
      setters.setActiveTab('pedido')
    },
    [setters],
  )

  const handleNewComanda = useCallback(() => {
    setters.setPendingAction(null)
    setters.setFocusedComandaId(null)
    setters.setActiveTab('mesas')
  }, [setters])

  return { handleAddItemsToComanda, handleNewComanda, handleSelectMesa }
}

async function enqueueOfflineItems(
  pendingAction: PendingAction,
  items: ComandaItem[],
  enqueue: ReturnType<typeof useOfflineQueue>['enqueue'],
  setPendingAction: (action: PendingAction | null) => void,
  setActiveTab: (tab: StaffMobileTab) => void,
) {
  if (pendingAction.type === 'add') {
    for (const item of items) {
      await enqueue({
        type: 'add-item',
        payload: { comandaId: pendingAction.comandaId, payload: toApiItemPayload(item) },
      })
    }
  } else if (pendingAction.type === 'new') {
    await enqueue({
      type: 'open-comanda',
      payload: {
        tableLabel: pendingAction.mesa.numero,
        mesaId: pendingAction.mesa.id,
        items: items.map(toApiItemPayload),
      },
    })
  }

  toast.info('Sem conexão — pedido salvo. Será enviado ao reconectar.')
  haptic.medium()
  setPendingAction(null)
  setActiveTab('mesas')
}

async function submitEditComanda(
  action: Extract<PendingAction, { type: 'edit' }>,
  items: ComandaItem[],
  mutateAsync: ReturnType<typeof useStaffMobileShellMutations>['replaceComandaMutation']['mutateAsync'],
) {
  return mutateAsync({
    comandaId: action.comandaId,
    payload: {
      tableLabel: action.mesaLabel,
      customerName: action.comanda.clienteNome,
      customerDocument: action.comanda.clienteDocumento,
      participantCount: action.comanda.participantCount,
      notes: action.comanda.notes,
      items: items.map(toApiItemPayload),
    },
  })
}

async function submitAddItems(
  comandaId: string,
  items: ComandaItem[],
  mutateAsync: ReturnType<typeof useStaffMobileShellMutations>['addComandaItemsMutation']['mutateAsync'],
) {
  return mutateAsync({
    comandaId,
    items: items.map(toApiItemPayload),
  })
}

async function submitNewComanda(args: {
  queryClient: ReturnType<typeof useQueryClient>
  mesa: Mesa
  items: ComandaItem[]
  mutateAsync: ReturnType<typeof useStaffMobileShellMutations>['openComandaMutation']['mutateAsync']
}) {
  const payload = {
    tableLabel: normalizeTableLabel(args.mesa.numero),
    mesaId: args.mesa.id,
    items: args.items.map(toApiItemPayload),
  }

  try {
    await args.mutateAsync(payload)
    return
  } catch (error) {
    if (!isCashSessionRequiredError(error)) {
      throw error
    }
  }

  toast.dismiss()
  toast.info('Abrindo caixa automaticamente...')
  await openCashSession({ openingCashAmount: 0 }, { includeSnapshot: false })
  scheduleOperationsWorkspaceReconcile(args.queryClient, OPERATIONS_LIVE_QUERY_PREFIX, { includeSummary: true })
  await args.mutateAsync(payload)
}

function useSubmitHandler(args: {
  enqueue: ReturnType<typeof useOfflineQueue>['enqueue']
  mutations: ReturnType<typeof useStaffMobileShellMutations>
  pendingAction: PendingAction | null
  queryClient: ReturnType<typeof useQueryClient>
  setActiveTab: (tab: StaffMobileTab) => void
  setFocusedComandaId: (id: string | null) => void
  setPendingAction: (action: PendingAction | null) => void
  setScreenError: (message: string | null) => void
}) {
  return useCallback(
    async (items: ComandaItem[]) => {
      if (!args.pendingAction) {
        return
      }
      args.setScreenError(null)

      try {
        if (args.pendingAction.type === 'edit') {
          const response = await submitEditComanda(
            args.pendingAction,
            items,
            args.mutations.replaceComandaMutation.mutateAsync,
          )
          args.setPendingAction(null)
          args.setFocusedComandaId(response.comanda.id)
          args.setActiveTab('pedidos')
          return
        }

        if (args.pendingAction.type === 'add') {
          const response = await submitAddItems(
            args.pendingAction.comandaId,
            items,
            args.mutations.addComandaItemsMutation.mutateAsync,
          )
          args.setPendingAction(null)
          args.setFocusedComandaId(response.comanda.id)
          args.setActiveTab('pedidos')
          return
        }

        await submitNewComanda({
          queryClient: args.queryClient,
          mesa: args.pendingAction.mesa,
          items,
          mutateAsync: args.mutations.openComandaMutation.mutateAsync,
        })
        args.setPendingAction(null)
        args.setActiveTab('pedidos')
      } catch (error) {
        if (isNetworkError(error) && args.pendingAction.type !== 'edit') {
          await enqueueOfflineItems(args.pendingAction, items, args.enqueue, args.setPendingAction, args.setActiveTab)
          return
        }
        args.setScreenError(error instanceof Error ? error.message : 'Não foi possível processar o pedido.')
      }
    },
    [args],
  )
}

function useStatusHandlers(args: {
  comandasById: Map<string, Comanda>
  mutations: ReturnType<typeof useStaffMobileShellMutations>
  setScreenError: (message: string | null) => void
}) {
  const handleUpdateStatus = useCallback(
    async (id: string, status: ComandaStatus) => {
      const comanda = args.comandasById.get(id)
      if (!comanda) {
        return
      }

      try {
        args.setScreenError(null)

        if (status === 'fechada') {
          await args.mutations.closeComandaMutation.mutateAsync({
            comandaId: id,
            ...toOperationAmounts(comanda),
          })
          return
        }

        if (status === 'cancelada') {
          await args.mutations.cancelComandaMutation.mutateAsync(id)
          return
        }

        await args.mutations.updateComandaStatusMutation.mutateAsync({
          comandaId: id,
          status: toOperationsStatus(status),
        })
      } catch (error) {
        args.setScreenError(error instanceof Error ? error.message : 'Não foi possível atualizar a comanda.')
      }
    },
    [args],
  )

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        args.setScreenError(null)
        await args.mutations.cancelComandaMutation.mutateAsync(id)
      } catch (error) {
        args.setScreenError(error instanceof Error ? error.message : 'Não foi possível cancelar a comanda.')
      }
    },
    [args],
  )

  const handleCloseWithDiscount = useCallback(
    async (id: string, discountPercent: number, surchargePercent: number) => {
      const comanda = args.comandasById.get(id)
      if (!comanda) {
        return
      }

      try {
        args.setScreenError(null)
        const subtotal = calcSubtotal(comanda)
        const discountAmount = Math.round(subtotal * discountPercent) / 100
        const serviceFeeAmount = Math.round(subtotal * surchargePercent) / 100
        await args.mutations.closeComandaMutation.mutateAsync({ comandaId: id, discountAmount, serviceFeeAmount })
      } catch (error) {
        args.setScreenError(error instanceof Error ? error.message : 'Não foi possível fechar a comanda.')
      }
    },
    [args],
  )

  const handleCreatePayment = useCallback(
    async (id: string, amount: number, method: Parameters<typeof createComandaPayment>[1]['method']) => {
      try {
        args.setScreenError(null)
        await args.mutations.createComandaPaymentMutation.mutateAsync({ amount, comandaId: id, method })
      } catch (error) {
        args.setScreenError(error instanceof Error ? error.message : 'Não foi possível registrar o pagamento.')
      }
    },
    [args],
  )

  return { handleCancel, handleCloseWithDiscount, handleCreatePayment, handleUpdateStatus }
}

export function useStaffMobileShellController(currentUser: StaffMobileCurrentUser) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const shellState = useStaffMobileShellState()
  const realtime = useRealtimeRefresh(Boolean(currentUser), queryClient)
  const queue = useOfflineQueue()
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

  useOfflineDrain({
    drainQueue: queue.drainQueue,
    realtimeStatus: realtime.realtimeStatus,
    addComandaItemMutation: mutations.addComandaItemMutation,
    openComandaMutation: mutations.openComandaMutation,
  })

  const navigation = useNavigationActions({
    setActiveTab: shellState.setActiveTab,
    setFocusedComandaId: shellState.setFocusedComandaId,
    setPendingAction: shellState.setPendingAction,
  })

  const builder = resolveBuilderContext(
    shellState.pendingAction,
    metrics.comandasById,
    currentUser?.employeeId ?? null,
    metrics.kitchenBadge,
  )

  const handleSubmit = useSubmitHandler({
    enqueue: queue.enqueue,
    mutations,
    pendingAction: shellState.pendingAction,
    queryClient,
    setActiveTab: shellState.setActiveTab,
    setFocusedComandaId: shellState.setFocusedComandaId,
    setPendingAction: shellState.setPendingAction,
    setScreenError: shellState.setScreenError,
  })

  const statusHandlers = useStatusHandlers({
    comandasById: metrics.comandasById,
    mutations,
    setScreenError: shellState.setScreenError,
  })

  return {
    ...builder,
    ...metrics,
    ...mutations,
    ...navigation,
    ...queries,
    ...realtime,
    ...shellState,
    currentEmployeeId: currentUser?.employeeId ?? null,
    handleSubmit,
    ...statusHandlers,
    isOffline: realtime.isOffline,
  }
}

export type StaffMobileShellController = ReturnType<typeof useStaffMobileShellController>
export type StaffMobileShellViewModel = Omit<
  StaffMobileShellController,
  'containerRef' | 'indicatorStyle' | 'isRefreshing' | 'progress' | 'screenError' | 'setScreenError'
>
