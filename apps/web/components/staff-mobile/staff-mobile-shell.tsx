'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChefHat, ClipboardList, Grid2x2, LogOut, ShoppingCart } from 'lucide-react'
import {
  calcSubtotal,
  isEndedComandaStatus,
  type Comanda,
  type ComandaItem,
  type ComandaStatus,
  type Mesa,
} from '@/components/pdv/pdv-types'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { BrandMark } from '@/components/shared/brand-mark'
import { ConnectionBanner } from '@/components/shared/connection-banner'
import { usePullToRefresh } from '@/components/shared/use-pull-to-refresh'
import { PullIndicator } from '@/components/shared/pull-indicator'
import { haptic } from '@/components/shared/haptic'
import dynamic from 'next/dynamic'

const KitchenOrdersView = dynamic(() => import('./kitchen-orders-view').then((mod) => mod.KitchenOrdersView), {
  ssr: false,
})
const MobileComandaList = dynamic(() => import('./mobile-comanda-list').then((mod) => mod.MobileComandaList), {
  ssr: false,
})
const MobileOrderBuilder = dynamic(() => import('./mobile-order-builder').then((mod) => mod.MobileOrderBuilder), {
  ssr: false,
})
import { MobileTableGrid } from './mobile-table-grid'
import {
  addComandaItem,
  addComandaItems,
  ApiError,
  cancelComanda,
  closeComanda,
  createComandaPayment,
  fetchOperationsKitchen,
  fetchOperationsLive,
  fetchProducts,
  logout,
  openCashSession,
  openComanda,
  replaceComanda,
  updateComandaStatus,
} from '@/lib/api'
import { useRouter } from 'next/navigation'
import {
  buildPdvComandas,
  buildPdvMesas,
  toOperationAmounts,
  toOperationsStatus,
} from '@/components/pdv/pdv-operations'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
const MobileHistoricoView = dynamic(
  () => import('@/components/staff-mobile/mobile-historico-view').then((mod) => mod.MobileHistoricoView),
  { ssr: false },
)
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import { useOfflineQueue } from '@/components/shared/use-offline-queue'
import {
  appendOptimisticComandaItem,
  appendOptimisticComandaMutation,
  appendOptimisticComandaPayment,
  buildOptimisticComandaRecord,
  buildPerformerKpis,
  buildPerformerStanding,
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  rollbackOperationsSnapshot,
  scheduleOperationsWorkspaceReconcile,
  setOptimisticComandaStatus,
} from '@/lib/operations'
import { isCashSessionRequiredError } from '@/lib/operations/operations-error-utils'

function realtimeStatusColor(status: string): string {
  if (status === 'connected') {
    return '#34f27f'
  }
  if (status === 'connecting') {
    return '#fbbf24'
  }
  return '#f87171'
}

type Tab = 'mesas' | 'cozinha' | 'pedido' | 'pedidos' | 'historico'

type PendingAction =
  | { type: 'new'; mesa: Mesa }
  | { type: 'add'; comandaId: string; mesaLabel: string }
  | { type: 'edit'; comandaId: string; mesaLabel: string; comanda: Comanda }

// null = no focus; string = scroll-to & highlight that comanda

interface StaffMobileShellProps {
  currentUser: { name?: string; fullName?: string; employeeId?: string | null } | null
}

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

export function StaffMobileShell({ currentUser }: StaffMobileShellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('mesas')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)
  const [focusedComandaId, setFocusedComandaId] = useState<string | null>(null)

  const { status: realtimeStatus } = useOperationsRealtime(Boolean(currentUser), queryClient)
  const { enqueue, drainQueue } = useOfflineQueue()
  const isOffline = realtimeStatus === 'disconnected'

  // Executor reutilizado pelos dois canais de drain (SW + fallback)
  const runDrain = useCallback(() => {
    return drainQueue(async (action) => {
      if (action.type === 'add-item') {
        const { comandaId, payload } = action.payload as {
          comandaId: string
          payload: Parameters<typeof addComandaItem>[1]
        }
        await addComandaItemMutation.mutateAsync({ comandaId, payload })
      } else if (action.type === 'open-comanda') {
        await openComandaMutation.mutateAsync(action.payload as Parameters<typeof openComanda>[0])
      }
    }).then((result) => {
      if (result.expiredCount > 0) {
        const message =
          result.expiredCount === 1
            ? '1 ação offline expirou após 10 minutos sem conexão e foi descartada.'
            : `${result.expiredCount} ações offline expiraram após 10 minutos sem conexão e foram descartadas.`
        toast.error(message)
      }

      return result
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drainQueue])

  // Canal 1 — Background Sync: SW acorda a aba mesmo quando está em background
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

  // Canal 2 — Fallback: drena ao reconectar para browsers sem Background Sync
  useEffect(() => {
    if (realtimeStatus !== 'connected') {
      return
    }
    void runDrain()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeStatus])

  const handlePullRefresh = useCallback(async () => {
    haptic.light()
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY }),
    ])
  }, [queryClient])

  const {
    containerRef: pullRef,
    indicatorStyle: pullIndicatorStyle,
    isRefreshing,
    progress: pullProgress,
  } = usePullToRefresh({ onRefresh: handlePullRefresh })

  const operationsQuery = useQuery({
    queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    enabled: Boolean(currentUser),
    placeholderData: keepPreviousData,
    // staleTime alinhado ao TTL do cache do backend (20s).
    // Socket.IO cuida de invalidar em qualquer mutação real.
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const kitchenQuery = useQuery({
    queryKey: OPERATIONS_KITCHEN_QUERY_KEY,
    queryFn: () => fetchOperationsKitchen(),
    enabled: Boolean(currentUser),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(),
    enabled: Boolean(currentUser),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const operationsLoading = operationsQuery.isLoading && !operationsQuery.data
  const kitchenLoading = kitchenQuery.isLoading && !kitchenQuery.data
  const productsLoading = productsQuery.isLoading && !productsQuery.data
  const operationsErrorMessage = operationsQuery.error instanceof Error ? operationsQuery.error.message : null
  const kitchenErrorMessage = kitchenQuery.error instanceof Error ? kitchenQuery.error.message : null
  const productsErrorMessage = productsQuery.error instanceof Error ? productsQuery.error.message : null

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      router.push('/login')
    },
  })
  const openComandaMutation = useMutation({
    mutationFn: (payload: Parameters<typeof openComanda>[0]) => openComanda(payload, { includeSnapshot: false }),
    onMutate: async (vars) => {
      const snapshot = await appendOptimisticComandaMutation(
        queryClient,
        OPERATIONS_LIVE_COMPACT_QUERY_KEY,
        buildOptimisticComandaRecord({
          tableLabel: vars.tableLabel,
          mesaId: vars.mesaId ?? null,
          customerName: vars.customerName ?? null,
          customerDocument: vars.customerDocument ?? null,
          participantCount: vars.participantCount ?? 1,
          notes: vars.notes ?? null,
          cashSessionId: vars.cashSessionId ?? null,
          currentEmployeeId: currentUser?.employeeId ?? null,
          items: vars.items,
        }),
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      haptic.error()
    },
    onSuccess: () => {
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
      toast.success('Comanda aberta com sucesso')
      haptic.success()
    },
  })
  const addComandaItemMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: Parameters<typeof addComandaItem>[1] }) =>
      addComandaItem(comandaId, payload, { includeSnapshot: false }),
    onMutate: async ({ comandaId, payload }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = appendOptimisticComandaItem(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, payload)
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao adicionar item')
      haptic.error()
    },
    onSuccess: () => {
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Item adicionado')
      haptic.light()
    },
  })
  const addComandaItemsMutation = useMutation({
    mutationFn: ({ comandaId, items }: { comandaId: string; items: Parameters<typeof addComandaItems>[1] }) =>
      addComandaItems(comandaId, items, { includeSnapshot: false }),
    onMutate: async ({ comandaId, items }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
      for (const item of items) {
        appendOptimisticComandaItem(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, item)
      }
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao adicionar itens')
      haptic.error()
    },
    onSuccess: () => {
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Itens adicionados')
      haptic.light()
    },
  })
  const replaceComandaMutation = useMutation({
    mutationFn: ({
      comandaId,
      payload,
    }: {
      comandaId: string
      payload: Parameters<typeof replaceComanda>[1]
    }) => replaceComanda(comandaId, payload, { includeSnapshot: false }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao salvar edição')
      haptic.error()
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['comanda-details', variables.comandaId] })
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: true,
      })
      toast.success('Comanda atualizada')
      haptic.success()
    },
  })
  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status, { includeSnapshot: false }),
    onMutate: async ({ comandaId, status }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, status)
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao atualizar status')
      haptic.error()
    },
    onSuccess: () => {
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
      })
      toast.success('Status atualizado')
      haptic.medium()
    },
  })
  const closeComandaMutation = useMutation({
    mutationFn: ({
      comandaId,
      discountAmount,
      serviceFeeAmount,
    }: {
      comandaId: string
      discountAmount: number
      serviceFeeAmount: number
    }) => closeComanda(comandaId, { discountAmount, serviceFeeAmount }, { includeSnapshot: false }),
    onMutate: async ({ comandaId }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, 'CLOSED')
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao fechar comanda')
      haptic.error()
    },
    onSuccess: () => {
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: true,
        includeOrders: true,
        includeFinance: true,
      })
      toast.success('Comanda fechada — pagamento efetuado')
      haptic.heavy()
    },
  })
  const createComandaPaymentMutation = useMutation({
    mutationFn: ({
      amount,
      comandaId,
      method,
    }: {
      amount: number
      comandaId: string
      method: Parameters<typeof createComandaPayment>[1]['method']
    }) => createComandaPayment(comandaId, { amount, method }, { includeSnapshot: false }),
    onMutate: async ({ amount, comandaId, method }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = appendOptimisticComandaPayment(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, comandaId, {
        amount,
        method,
      })
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao registrar pagamento')
      haptic.error()
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['comanda-details', variables.comandaId] })
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, { includeSummary: true })
      toast.success('Pagamento registrado')
      haptic.success()
    },
  })
  const cancelComandaMutation = useMutation({
    mutationFn: (comandaId: string) => cancelComanda(comandaId, { includeSnapshot: false }),
    onMutate: async (comandaId) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(
        queryClient,
        OPERATIONS_LIVE_COMPACT_QUERY_KEY,
        comandaId,
        'CANCELLED',
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY, ctx?.snapshot)
      toast.error('Erro ao cancelar comanda')
      haptic.error()
    },
    onSuccess: () => {
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: true,
      })
      toast.success('Comanda cancelada')
      haptic.heavy()
    },
  })

  const mesas = useMemo(() => buildPdvMesas(operationsQuery.data), [operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(operationsQuery.data), [operationsQuery.data])
  const comandasById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const activeComandas = useMemo(() => comandas.filter((comanda) => !isEndedComandaStatus(comanda.status)), [comandas])
  const historicoComandas = useMemo(() => {
    if (!currentUser?.employeeId) {
      return []
    }

    return comandas.filter(
      (comanda) => comanda.garcomId === currentUser.employeeId && isEndedComandaStatus(comanda.status),
    )
  }, [comandas, currentUser?.employeeId])
  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Funcionário'
  const performerKpis = useMemo(
    () => buildPerformerKpis(operationsQuery.data, currentUser?.employeeId ?? null),
    [currentUser?.employeeId, operationsQuery.data],
  )
  const performerStanding = useMemo(
    () => buildPerformerStanding(operationsQuery.data, currentUser?.employeeId ?? null),
    [currentUser?.employeeId, operationsQuery.data],
  )
  const kitchenBadge = useMemo(
    () => (kitchenQuery.data?.statusCounts.queued ?? 0) + (kitchenQuery.data?.statusCounts.inPreparation ?? 0),
    [kitchenQuery.data],
  )

  const isBusy =
    openComandaMutation.isPending ||
    addComandaItemMutation.isPending ||
    addComandaItemsMutation.isPending ||
    replaceComandaMutation.isPending ||
    updateComandaStatusMutation.isPending ||
    cancelComandaMutation.isPending ||
    createComandaPaymentMutation.isPending ||
    closeComandaMutation.isPending

  function handleSelectMesa(mesa: Mesa) {
    if (mesa.status === 'ocupada' && mesa.comandaId) {
      setPendingAction(null)
      setFocusedComandaId(mesa.comandaId)
      setActiveTab('pedidos')
    } else {
      // Mesa livre → cria nova comanda direto no builder de pedido
      setPendingAction({ type: 'new', mesa })
      setFocusedComandaId(null)
      setActiveTab('pedido')
    }
  }

  function handleAddItemsToComanda(comanda: Comanda) {
    setPendingAction({ type: 'edit', comandaId: comanda.id, mesaLabel: comanda.mesa ?? '?', comanda })
    setActiveTab('pedido')
  }

  function handleNewComanda() {
    setPendingAction(null)
    setFocusedComandaId(null)
    setActiveTab('mesas')
  }

  async function enqueueOfflineItems(items: ComandaItem[]) {
    if (pendingAction?.type === 'add') {
      for (const item of items) {
        await enqueue({
          type: 'add-item',
          payload: { comandaId: pendingAction.comandaId, payload: toApiItemPayload(item) },
        })
      }
    } else if (pendingAction?.type === 'new') {
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

  async function handleSubmitAddItems(items: ComandaItem[], comandaId: string) {
    const response = await addComandaItemsMutation.mutateAsync({
      comandaId,
      items: items.map(toApiItemPayload),
    })
    setPendingAction(null)
    setFocusedComandaId(response.comanda.id)
    setActiveTab('pedidos')
  }

  async function handleSubmitEditComanda(items: ComandaItem[], action: Extract<PendingAction, { type: 'edit' }>) {
    const response = await replaceComandaMutation.mutateAsync({
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
    setPendingAction(null)
    setFocusedComandaId(response.comanda.id)
    setActiveTab('pedidos')
  }

  async function handleSubmitNewComanda(items: ComandaItem[], mesa: Mesa) {
    const comParams = {
      tableLabel: normalizeTableLabel(mesa.numero),
      mesaId: mesa.id,
      items: items.map(toApiItemPayload),
    }

    try {
      await openComandaMutation.mutateAsync(comParams)
    } catch (err: unknown) {
      if (!isCashSessionRequiredError(err)) {
        throw err
      }
      toast.dismiss()
      toast.info('Abrindo caixa automaticamente...')
      await openCashSession({ openingCashAmount: 0 }, { includeSnapshot: false })
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, { includeSummary: true })
      await openComandaMutation.mutateAsync(comParams)
    }
    setPendingAction(null)
    setActiveTab('pedidos')
  }

  async function handleSubmit(items: ComandaItem[]) {
    if (!pendingAction) {
      return
    }
    setScreenError(null)

    try {
      if (pendingAction.type === 'edit') {
        await handleSubmitEditComanda(items, pendingAction)
        return
      }
      if (pendingAction.type === 'add') {
        await handleSubmitAddItems(items, pendingAction.comandaId)
        return
      }
      await handleSubmitNewComanda(items, pendingAction.mesa)
    } catch (error) {
      if (isNetworkError(error) && pendingAction && pendingAction.type !== 'edit') {
        await enqueueOfflineItems(items)
        return
      }
      setScreenError(error instanceof Error ? error.message : 'Não foi possível processar o pedido.')
    }
  }

  async function handleUpdateStatus(id: string, status: ComandaStatus) {
    const comanda = comandasById.get(id)
    if (!comanda) {
      return
    }

    try {
      setScreenError(null)

      if (status === 'fechada') {
        const amounts = toOperationAmounts(comanda)
        await closeComandaMutation.mutateAsync({
          comandaId: id,
          ...amounts,
        })
        return
      }

      if (status === 'cancelada') {
        await cancelComandaMutation.mutateAsync(id)
        return
      }

      await updateComandaStatusMutation.mutateAsync({
        comandaId: id,
        status: toOperationsStatus(status),
      })
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Não foi possível atualizar a comanda.')
    }
  }

  async function handleCancel(id: string) {
    try {
      setScreenError(null)
      await cancelComandaMutation.mutateAsync(id)
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Não foi possível cancelar a comanda.')
    }
  }

  async function handleCloseWithDiscount(id: string, discountPercent: number, surchargePercent: number) {
    const comanda = comandasById.get(id)
    if (!comanda) {
      return
    }
    try {
      setScreenError(null)
      const subtotal = calcSubtotal(comanda)
      const discountAmount = Math.round(subtotal * discountPercent) / 100
      const serviceFeeAmount = Math.round(subtotal * surchargePercent) / 100
      await closeComandaMutation.mutateAsync({ comandaId: id, discountAmount, serviceFeeAmount })
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Não foi possível fechar a comanda.')
    }
  }

  async function handleCreatePayment(
    id: string,
    amount: number,
    method: Parameters<typeof createComandaPayment>[1]['method'],
  ) {
    try {
      setScreenError(null)
      await createComandaPaymentMutation.mutateAsync({ amount, comandaId: id, method })
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Não foi possível registrar o pagamento.')
    }
  }

  const mesaLabel = pendingAction
    ? pendingAction.type === 'new'
      ? normalizeTableLabel(pendingAction.mesa.numero)
      : pendingAction.mesaLabel
    : '?'
  const orderMode = pendingAction?.type === 'edit' ? 'edit' : pendingAction?.type === 'add' ? 'add' : 'new'
  const pendingComanda =
    pendingAction?.type === 'add' || pendingAction?.type === 'edit'
      ? (comandasById.get(pendingAction.comandaId) ?? (pendingAction.type === 'edit' ? pendingAction.comanda : null))
      : null
  const builderSummaryItems = pendingAction
    ? [
        { label: 'Mesa', value: mesaLabel, tone: '#008cff' },
        pendingAction.type === 'add' || pendingAction.type === 'edit'
          ? {
              label: 'Responsável',
              value:
                pendingComanda?.garcomId === currentUser?.employeeId
                  ? 'Sua mesa'
                  : (pendingComanda?.garcomNome ?? 'Sem responsável'),
              tone: pendingComanda?.garcomId === currentUser?.employeeId ? '#c4b5fd' : '#f0f0f3',
            }
          : {
              label: 'Situação',
              value: 'Mesa livre',
              tone: '#36f57c',
            },
        {
          label: 'Na cozinha',
          value: String(kitchenBadge),
          tone: kitchenBadge > 0 ? '#eab308' : '#36f57c',
        },
      ]
    : undefined

  function renderActiveTab() {
    if (activeTab === 'mesas') {
      return (
        <MobileTableGrid
          currentEmployeeId={currentUser?.employeeId ?? null}
          errorMessage={operationsErrorMessage}
          isLoading={operationsLoading}
          isOffline={isOffline}
          mesas={mesas}
          onSelectMesa={handleSelectMesa}
        />
      )
    }

    if (activeTab === 'cozinha') {
      return (
        <KitchenOrdersView
          currentEmployeeId={currentUser?.employeeId ?? null}
          data={kitchenQuery.data}
          errorMessage={kitchenErrorMessage}
          isLoading={kitchenLoading}
          isOffline={isOffline}
          queryKey={OPERATIONS_KITCHEN_QUERY_KEY}
        />
      )
    }

    if (activeTab === 'pedido' && pendingAction) {
      return (
        <MobileOrderBuilder
          busy={isBusy}
          errorMessage={productsErrorMessage}
          initialItems={pendingAction.type === 'edit' ? pendingAction.comanda.itens : undefined}
          isLoading={productsLoading}
          mesaLabel={mesaLabel}
          mode={orderMode}
          isOffline={isOffline}
          produtos={productsQuery.data?.items ?? []}
          onCancel={() => {
            setPendingAction(null)
            setFocusedComandaId(null)
            setActiveTab('mesas')
          }}
          onSubmit={handleSubmit}
          summaryItems={builderSummaryItems}
        />
      )
    }

    if (activeTab === 'pedido') {
      return (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <ShoppingCart className="size-7 text-[var(--text-soft)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Selecione uma mesa primeiro</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">
            Vá para a aba Mesas e toque em uma mesa para criar um pedido
          </p>
          <button
            className="mt-6 rounded-xl bg-[rgba(0,140,255,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--accent,#008cff)] transition-opacity active:opacity-70"
            type="button"
            onClick={() => setActiveTab('mesas')}
          >
            Ver mesas
          </button>
        </div>
      )
    }

    if (activeTab === 'pedidos') {
      return (
        <MobileComandaList
          errorMessage={operationsErrorMessage}
          comandas={activeComandas}
          currentEmployeeId={currentUser?.employeeId ?? null}
          isBusy={isBusy}
          isLoading={operationsLoading}
          focusedId={focusedComandaId}
          isOffline={isOffline}
          onAddItems={handleAddItemsToComanda}
          onCancelComanda={handleCancel}
          onCloseComanda={handleCloseWithDiscount}
          onCreatePayment={handleCreatePayment}
          onFocus={(id: string | null) => setFocusedComandaId(id)}
          onNewComanda={handleNewComanda}
          onUpdateStatus={handleUpdateStatus}
          summary={{
            activeCount: activeComandas.length,
            preparingCount: activeComandas.filter((comanda) => comanda.status === 'em_preparo').length,
            readyCount: activeComandas.filter((comanda) => comanda.status === 'pronta').length,
          }}
        />
      )
    }

    if (activeTab === 'historico') {
      return (
        <MobileHistoricoView
          comandas={historicoComandas}
          summary={{
            receitaRealizada: performerKpis.receitaRealizada,
            receitaEsperada: performerKpis.receitaEsperada,
            openComandasCount: performerKpis.openComandasCount,
            ranking: performerStanding,
          }}
        />
      )
    }

    return null
  }

  return (
    <div className="flex min-h-screen min-h-[100svh] flex-col overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <header
        className="flex shrink-0 items-center justify-between gap-3 bg-[var(--bg)] px-3 pb-2.5 sm:px-5 sm:pb-3"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <BrandMark size="sm" wordmark="hidden" />
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#008cff)] sm:text-[11px]">
                Operacional
              </span>
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: realtimeStatusColor(realtimeStatus),
                }}
              />
            </div>
            <span className="truncate text-xs font-medium text-[var(--text-primary)] sm:text-sm">
              {displayName.split(' ')[0]}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            aria-label="Encerrar sessão"
            className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] transition-transform active:scale-95 sm:size-10"
            disabled={logoutMutation.isPending}
            type="button"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <ConnectionBanner status={realtimeStatus} />

      {screenError ? (
        <div className="border-b border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#fca5a5]">
          {screenError}
          <button
            className="ml-3 text-xs font-semibold underline opacity-70"
            type="button"
            onClick={() => setScreenError(null)}
          >
            OK
          </button>
        </div>
      ) : null}

      <main
        className={`relative min-h-0 flex-1 ${activeTab === 'pedido' && pendingAction ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-y-contain'}`}
        ref={pullRef}
      >
        <PullIndicator isRefreshing={isRefreshing} progress={pullProgress} style={pullIndicatorStyle} />
        {renderActiveTab()}
      </main>

      <nav
        className="shrink-0 bg-[var(--bg)] px-1 pb-1 pt-1 shadow-[0_-8px_24px_rgba(0,0,0,0.6)] sm:px-2 sm:pb-2 sm:pt-2"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom,0px))' }}
      >
        <div className="relative grid min-h-[4.25rem] grid-cols-4 gap-1 rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {(
            [
              { id: 'mesas', label: 'Mesas', Icon: Grid2x2, badge: 0 },
              { id: 'cozinha', label: 'Cozinha', Icon: ChefHat, badge: kitchenBadge },
              { id: 'pedidos', label: 'Pedidos', Icon: ClipboardList, badge: activeComandas.length },
              { id: 'historico', label: 'Histórico', Icon: ShoppingCart, badge: 0 },
            ] as const
          ).map(({ id, label, Icon, badge }) => {
            const isActive = activeTab === id || (id === 'pedidos' && activeTab === 'pedido')
            return (
              <button
                className="relative flex h-full min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1 transition-all active:scale-95"
                data-testid={`nav-${id}`}
                key={id}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                type="button"
                onClick={() => {
                  setActiveTab(id)
                  if (id !== 'pedidos') {
                    setFocusedComandaId(null)
                  }
                }}
              >
                {isActive && (
                  <div className="pointer-events-none absolute inset-0 rounded-[1.2rem] bg-[rgba(0,140,255,0.15)]" />
                )}
                <div className="relative z-10">
                  <Icon
                    className="size-[22px]"
                    strokeWidth={isActive ? 2.5 : 2}
                    style={{ color: isActive ? 'var(--accent, #008cff)' : 'var(--text-soft, #7a8896)' }}
                  />
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-2 flex size-[18px] items-center justify-center rounded-full bg-[var(--accent,#008cff)] text-[10px] font-bold text-[var(--on-accent)] ring-2 ring-[var(--bg)]">
                      {badge}
                    </span>
                  )}
                </div>
                <span
                  className="relative z-10 text-[10px] font-semibold leading-none tracking-wide"
                  style={{ color: isActive ? 'var(--accent, #008cff)' : 'var(--text-soft, #7a8896)' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
