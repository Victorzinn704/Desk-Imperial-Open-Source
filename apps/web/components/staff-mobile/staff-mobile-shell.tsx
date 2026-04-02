'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChefHat, ClipboardList, Grid2x2, LogOut, ShoppingCart } from 'lucide-react'
import { calcSubtotal, type Mesa, type Comanda, type ComandaItem, type ComandaStatus } from '@/components/pdv/pdv-types'
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
  fetchOperationsLive,
  fetchOperationsKitchen,
  fetchProducts,
  closeComanda,
  cancelComanda,
  logout,
  openComanda,
  openCashSession,
  updateComandaStatus,
  addComandaItem,
  addComandaItems,
  ApiError,
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
  appendOptimisticComandaMutation,
  buildOptimisticComandaRecord,
  buildPerformerKpis,
  buildOperationsLiveQueryKey,
  invalidateOperationsWorkspace,
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  rollbackOperationsSnapshot,
  appendOptimisticComandaItem,
  setOptimisticComandaStatus,
} from '@/lib/operations'

type Tab = 'mesas' | 'cozinha' | 'pedido' | 'pedidos' | 'historico'

type PendingAction = { type: 'new'; mesa: Mesa } | { type: 'add'; comandaId: string; mesaLabel: string }

// null = no focus; string = scroll-to & highlight that comanda

interface StaffMobileShellProps {
  currentUser: { name?: string; fullName?: string; employeeId?: string | null } | null
}

export function StaffMobileShell({ currentUser }: StaffMobileShellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('mesas')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)
  const [focusedComandaId, setFocusedComandaId] = useState<string | null>(null)
  const includeClosedInLiveSnapshot = activeTab === 'historico'
  const operationsLiveQueryKey = useMemo(
    () => buildOperationsLiveQueryKey({ compactMode: true, includeClosed: includeClosedInLiveSnapshot }),
    [includeClosedInLiveSnapshot],
  )
  const operationsLiveOptions = useMemo(
    () => ({
      includeCashMovements: false,
      compactMode: true,
      includeClosed: includeClosedInLiveSnapshot,
    }),
    [includeClosedInLiveSnapshot],
  )

  const { status: realtimeStatus } = useOperationsRealtime(Boolean(currentUser), queryClient)
  const { enqueue, drainQueue } = useOfflineQueue()
  const shouldFallbackRefetch = realtimeStatus !== 'connected'

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
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'DRAIN_QUEUE') void runDrain()
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [runDrain])

  // Canal 2 — Fallback: drena ao reconectar para browsers sem Background Sync
  useEffect(() => {
    if (realtimeStatus !== 'connected') return
    void runDrain()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeStatus])

  const handlePullRefresh = useCallback(async () => {
    haptic.light()
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX }),
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
    queryKey: operationsLiveQueryKey,
    queryFn: () => fetchOperationsLive(operationsLiveOptions),
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
    queryKey: ['products', 'active'],
    queryFn: () => fetchProducts({ includeInactive: false }),
    enabled: Boolean(currentUser) && activeTab === 'pedido',
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

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
        operationsLiveQueryKey,
        buildOptimisticComandaRecord({
          tableLabel: vars.tableLabel,
          customerName: vars.customerName ?? null,
          customerDocument: vars.customerDocument ?? null,
          participantCount: vars.participantCount ?? 1,
          notes: vars.notes ?? null,
          cashSessionId: vars.cashSessionId ?? null,
          items: vars.items,
        }),
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, operationsLiveQueryKey, ctx?.snapshot)
      haptic.error()
    },
    onSuccess: () => {
      invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
      toast.success('Comanda aberta com sucesso')
      haptic.success()
    },
  })
  const addComandaItemMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: Parameters<typeof addComandaItem>[1] }) =>
      addComandaItem(comandaId, payload, { includeSnapshot: false }),
    onMutate: async ({ comandaId, payload }) => {
      await queryClient.cancelQueries({ queryKey: operationsLiveQueryKey })
      const snapshot = appendOptimisticComandaItem(queryClient, operationsLiveQueryKey, comandaId, payload)
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, operationsLiveQueryKey, ctx?.snapshot)
      toast.error('Erro ao adicionar item')
      haptic.error()
    },
    onSuccess: () => {
      toast.success('Item adicionado')
      haptic.light()
    },
  })
  const addComandaItemsMutation = useMutation({
    mutationFn: ({ comandaId, items }: { comandaId: string; items: Parameters<typeof addComandaItems>[1] }) =>
      addComandaItems(comandaId, items, { includeSnapshot: false }),
    onMutate: async ({ comandaId, items }) => {
      await queryClient.cancelQueries({ queryKey: operationsLiveQueryKey })
      const snapshot = queryClient.getQueryData<OperationsLiveResponse>(operationsLiveQueryKey)
      for (const item of items) {
        appendOptimisticComandaItem(queryClient, operationsLiveQueryKey, comandaId, item)
      }
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, operationsLiveQueryKey, ctx?.snapshot)
      toast.error('Erro ao adicionar itens')
      haptic.error()
    },
    onSuccess: () => {
      toast.success('Itens adicionados')
      haptic.light()
    },
  })
  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status, { includeSnapshot: false }),
    onMutate: async ({ comandaId, status }) => {
      await queryClient.cancelQueries({ queryKey: operationsLiveQueryKey })
      const snapshot = setOptimisticComandaStatus(queryClient, operationsLiveQueryKey, comandaId, status)
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, operationsLiveQueryKey, ctx?.snapshot)
      toast.error('Erro ao atualizar status')
      haptic.error()
    },
    onSuccess: () => {
      if (shouldFallbackRefetch) {
        invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
      }
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
      await queryClient.cancelQueries({ queryKey: operationsLiveQueryKey })
      const snapshot = setOptimisticComandaStatus(queryClient, operationsLiveQueryKey, comandaId, 'CLOSED')
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, operationsLiveQueryKey, ctx?.snapshot)
      toast.error('Erro ao fechar comanda')
      haptic.error()
    },
    onSuccess: () => {
      if (shouldFallbackRefetch) {
        invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
      }
      toast.success('Comanda fechada — pagamento efetuado')
      haptic.heavy()
    },
  })
  const cancelComandaMutation = useMutation({
    mutationFn: (comandaId: string) => cancelComanda(comandaId, { includeSnapshot: false }),
    onMutate: async (comandaId) => {
      await queryClient.cancelQueries({ queryKey: operationsLiveQueryKey })
      const snapshot = setOptimisticComandaStatus(
        queryClient,
        operationsLiveQueryKey,
        comandaId,
        'CANCELLED',
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      rollbackOperationsSnapshot(queryClient, operationsLiveQueryKey, ctx?.snapshot)
      toast.error('Erro ao cancelar comanda')
      haptic.error()
    },
    onSuccess: () => {
      if (shouldFallbackRefetch) {
        invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
      }
      toast.success('Comanda cancelada')
      haptic.heavy()
    },
  })

  const mesas = useMemo(() => buildPdvMesas(operationsQuery.data), [operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(operationsQuery.data), [operationsQuery.data])
  const comandasById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const activeComandas = useMemo(() => comandas.filter((comanda) => comanda.status !== 'fechada'), [comandas])
  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Funcionário'
  const performerKpis = useMemo(
    () => buildPerformerKpis(operationsQuery.data, currentUser?.employeeId ?? null),
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
    updateComandaStatusMutation.isPending ||
    closeComandaMutation.isPending

  function handleSelectMesa(mesa: Mesa) {
    if (mesa.status === 'ocupada' && mesa.comandaId) {
      // Mesa ocupada → foca a comanda na aba Ativo para o garçom ver o estado atual
      // O botão "Adicionar itens" dentro do card da comanda leva ao order builder
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
    setPendingAction({ type: 'add', comandaId: comanda.id, mesaLabel: comanda.mesa ?? '?' })
    setActiveTab('pedido')
  }

  function handleNewComanda() {
    setPendingAction(null)
    setFocusedComandaId(null)
    setActiveTab('mesas')
  }

  async function handleSubmit(items: ComandaItem[]) {
    if (!pendingAction) return
    setScreenError(null)

    try {
      if (pendingAction.type === 'add') {
        const response = await addComandaItemsMutation.mutateAsync({
          comandaId: pendingAction.comandaId,
          items: items.map((item) => ({
            productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
            productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
            quantity: item.quantidade,
            unitPrice: item.precoUnitario,
            notes: item.observacao,
          })),
        })
        if (shouldFallbackRefetch) {
          void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
        }
        setPendingAction(null)
        setFocusedComandaId(response.comanda.id)
        setActiveTab('pedidos')
        return
      }

      // type === 'new' — tenta abrir comanda, com auto-open caixa se necessário
      const comParams = {
        tableLabel: normalizeTableLabel(pendingAction.mesa.numero),
        mesaId: pendingAction.mesa.id,
        items: items.map((item) => ({
          productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
          productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
          quantity: item.quantidade,
          unitPrice: item.precoUnitario,
          notes: item.observacao,
        })),
      }

      try {
        await openComandaMutation.mutateAsync(comParams)
      } catch (err: unknown) {
        // Se o erro for 409 (caixa fechado), abre o caixa automaticamente e retenta
        const isCaixaError =
          (err instanceof ApiError && err.status === 409) ||
          (err instanceof Error && err.message.toLowerCase().includes('caixa'))
        if (isCaixaError) {
          toast.dismiss() // Limpa o toast de erro do mutation
          toast.info('Abrindo caixa automaticamente...')
          await openCashSession({ openingCashAmount: 0 }, { includeSnapshot: false })
          if (shouldFallbackRefetch) {
            void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
          }
          await openComandaMutation.mutateAsync(comParams)
        } else {
          throw err
        }
      }
      setPendingAction(null)
      setActiveTab('pedidos')
    } catch (error) {
      // Erro de rede (offline) → enfileira a ação para retry ao reconectar
      const isNetworkError =
        (error instanceof ApiError && error.status === 0) ||
        (error instanceof Error && error.message.toLowerCase().includes('fetch'))

      if (isNetworkError && pendingAction) {
        if (pendingAction.type === 'add') {
          for (const item of items) {
            enqueue({
              type: 'add-item',
              payload: {
                comandaId: pendingAction.comandaId,
                payload: {
                  productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
                  productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
                  quantity: item.quantidade,
                  unitPrice: item.precoUnitario,
                  notes: item.observacao,
                },
              },
            })
          }
        } else {
          enqueue({
            type: 'open-comanda',
            payload: {
              tableLabel: pendingAction.mesa.numero,
              mesaId: pendingAction.mesa.id,
              items: items.map((item) => ({
                productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
                productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
                quantity: item.quantidade,
                unitPrice: item.precoUnitario,
                notes: item.observacao,
              })),
            },
          })
        }
        toast.info('Sem conexão — pedido salvo. Será enviado ao reconectar.')
        haptic.medium()
        setPendingAction(null)
        setActiveTab('mesas')
        return
      }

      setScreenError(error instanceof Error ? error.message : 'Não foi possível processar o pedido.')
    }
  }

  async function handleUpdateStatus(id: string, status: ComandaStatus) {
    const comanda = comandasById.get(id)
    if (!comanda) return

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
    if (!comanda) return
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

  const mesaLabel = pendingAction
    ? pendingAction.type === 'new'
      ? normalizeTableLabel(pendingAction.mesa.numero)
      : pendingAction.mesaLabel
    : '?'
  const orderMode = pendingAction?.type === 'add' ? 'add' : 'new'

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#000000] text-white">
      <header
        className="flex shrink-0 items-center justify-between bg-[#000000] px-5 pb-3"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#9b8460)]">
                Operacional
              </span>
              <span
                className="size-1.5 rounded-full"
                style={{
                  background:
                    realtimeStatus === 'connected'
                      ? '#34f27f'
                      : realtimeStatus === 'connecting'
                        ? '#fbbf24'
                        : '#f87171',
                }}
              />
            </div>
            <span className="text-sm font-medium text-white">{displayName.split(' ')[0]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex size-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] text-white transition-transform active:scale-95"
            aria-label="Encerrar sessão"
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
            type="button"
            className="ml-3 text-xs font-semibold underline opacity-70"
            onClick={() => setScreenError(null)}
          >
            OK
          </button>
        </div>
      ) : null}

      <main
        ref={pullRef}
        className={`relative ${activeTab === 'pedido' && pendingAction ? 'flex flex-col flex-1 overflow-hidden' : 'flex-1 overflow-y-auto'}`}
      >
        <PullIndicator style={pullIndicatorStyle} isRefreshing={isRefreshing} progress={pullProgress} />
        {activeTab === 'mesas' ? (
          <MobileTableGrid
            mesas={mesas}
            onSelectMesa={handleSelectMesa}
            isLoading={operationsQuery.isLoading && !operationsQuery.data}
          />
        ) : null}

        {activeTab === 'cozinha' ? (
          <KitchenOrdersView data={kitchenQuery.data} queryKey={OPERATIONS_KITCHEN_QUERY_KEY} />
        ) : null}

        {activeTab === 'pedido' ? (
          pendingAction ? (
            <MobileOrderBuilder
              mesaLabel={mesaLabel}
              mode={orderMode}
              produtos={productsQuery.data?.items ?? []}
              busy={isBusy}
              onSubmit={handleSubmit}
              onCancel={() => {
                setPendingAction(null)
                setFocusedComandaId(null)
                setActiveTab('mesas')
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]">
                <ShoppingCart className="size-7 text-[#7a8896]" />
              </div>
              <p className="text-sm font-medium text-white">Selecione uma mesa primeiro</p>
              <p className="mt-1 text-xs text-[#7a8896]">
                Vá para a aba Mesas e toque em uma mesa para criar um pedido
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('mesas')}
                className="mt-6 rounded-xl bg-[rgba(155,132,96,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--accent,#9b8460)] transition-opacity active:opacity-70"
              >
                Ver mesas
              </button>
            </div>
          )
        ) : null}

        {activeTab === 'pedidos' ? (
          <MobileComandaList
            comandas={activeComandas}
            focusedId={focusedComandaId}
            onFocus={(id: string | null) => setFocusedComandaId(id)}
            onAddItems={handleAddItemsToComanda}
            onUpdateStatus={handleUpdateStatus}
            onCancelComanda={handleCancel}
            onCloseComanda={handleCloseWithDiscount}
            onNewComanda={handleNewComanda}
          />
        ) : null}

        {activeTab === 'historico' ? (
          <MobileHistoricoView
            comandas={comandas}
            summary={{
              receitaRealizada: performerKpis.receitaRealizada,
              receitaEsperada: performerKpis.receitaEsperada,
              openComandasCount: performerKpis.openComandasCount,
            }}
          />
        ) : null}
      </main>

      <nav
        className="shrink-0 bg-[#000000] px-2 pb-2 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom,0px))' }}
      >
        <div className="grid h-16 grid-cols-4 gap-0.5 rounded-[2rem] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-0.5 relative">
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
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id)
                  if (id !== 'pedidos') setFocusedComandaId(null)
                }}
                data-testid={`nav-${id}`}
                className="relative flex h-full flex-col items-center justify-center gap-1 transition-all active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isActive && (
                  <div className="absolute inset-x-2 inset-y-1 rounded-[1.5rem] bg-[rgba(155,132,96,0.15)] pointer-events-none" />
                )}
                <div className="relative z-10">
                  <Icon
                    className="size-[22px]"
                    style={{ color: isActive ? 'var(--accent, #9b8460)' : '#7a8896' }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-2 flex size-[18px] items-center justify-center rounded-full bg-[var(--accent,#9b8460)] text-[10px] font-bold text-[#000000] ring-2 ring-black">
                      {badge}
                    </span>
                  )}
                </div>
                <span
                  className="relative z-10 text-[10px] font-semibold tracking-wide"
                  style={{ color: isActive ? 'white' : '#7a8896' }}
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
