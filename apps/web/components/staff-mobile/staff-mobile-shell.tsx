'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChefHat, ClipboardList, Grid2x2, LogOut, ShoppingCart } from 'lucide-react'
import type { Mesa, Comanda, ComandaItem, ComandaStatus } from '@/components/pdv/pdv-types'
import type { ProductRecord } from '@contracts/contracts'
import { BrandMark } from '@/components/shared/brand-mark'
import { ConnectionBanner } from '@/components/shared/connection-banner'
import { usePullToRefresh } from '@/components/shared/use-pull-to-refresh'
import { PullIndicator } from '@/components/shared/pull-indicator'
import { haptic } from '@/components/shared/haptic'
import { KitchenOrdersView } from './kitchen-orders-view'
import { MobileComandaList } from './mobile-comanda-list'
import { MobileOrderBuilder } from './mobile-order-builder'
import { MobileTableGrid } from './mobile-table-grid'
import {
  fetchOperationsLive,
  fetchProducts,
  closeComanda,
  cancelComanda,
  logout,
  openComanda,
  openCashSession,
  updateComandaStatus,
  addComandaItem,
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
import { MobileHistoricoView } from '@/components/staff-mobile/mobile-historico-view'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import { useOfflineQueue } from '@/components/shared/use-offline-queue'

type Tab = 'mesas' | 'cozinha' | 'pedido' | 'pedidos' | 'historico'

type PendingAction = { type: 'new'; mesa: Mesa } | { type: 'add'; comandaId: string; mesaLabel: string }

// null = no focus; string = scroll-to & highlight that comanda

interface StaffMobileShellProps {
  currentUser: { name?: string; fullName?: string } | null
  produtos: ProductRecord[]
}

export function StaffMobileShell({ currentUser, produtos }: StaffMobileShellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('mesas')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)
  const [focusedComandaId, setFocusedComandaId] = useState<string | null>(null)

  const { status: realtimeStatus } = useOperationsRealtime(Boolean(currentUser), queryClient)
  const { enqueue, drainQueue } = useOfflineQueue()

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
    await queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
  }, [queryClient])

  const {
    containerRef: pullRef,
    indicatorStyle: pullIndicatorStyle,
    isRefreshing,
    progress: pullProgress,
  } = usePullToRefresh({ onRefresh: handlePullRefresh })

  const operationsQuery = useQuery({
    queryKey: ['operations', 'live'],
    queryFn: () => fetchOperationsLive(),
    enabled: Boolean(currentUser),
    // socket ativo = sem polling; socket offline = fallback a cada 20s
    refetchInterval: realtimeStatus === 'connected' ? false : 20_000,
  })

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(),
    enabled: Boolean(currentUser),
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
    mutationFn: openComanda,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['operations', 'live'] })
      const snapshot = queryClient.getQueryData<import('@contracts/contracts').OperationsLiveResponse>([
        'operations',
        'live',
      ])
      // Insert optimistic comanda into snapshot.unassigned.comandas
      if (snapshot) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const optimistic = {
          id: `optimistic-${Date.now()}`,
          companyOwnerId: '',
          mesaId: null,
          status: 'OPEN',
          tableLabel: vars.tableLabel,
          customerName: vars.customerName ?? null,
          customerDocument: vars.customerDocument ?? null,
          participantCount: vars.participantCount ?? 1,
          notes: vars.notes ?? null,
          cashSessionId: vars.cashSessionId ?? null,
          currentEmployeeId: null,
          discountAmount: 0,
          serviceFeeAmount: 0,
          subtotalAmount: 0,
          totalAmount: 0,
          openedAt: new Date().toISOString(),
          closedAt: null,
          items: (vars.items ?? []).map((it, idx) => ({
            id: `opt-item-${idx}`,
            productId: it.productId ?? null,
            productName: it.productName ?? 'Item',
            quantity: it.quantity,
            unitPrice: it.unitPrice ?? 0,
            totalAmount: (it.quantity ?? 0) * (it.unitPrice ?? 0),
            notes: it.notes ?? null,
            kitchenStatus: null,
            kitchenQueuedAt: null,
            kitchenReadyAt: null,
          })),
        } as import('@contracts/contracts').ComandaRecord
        queryClient.setQueryData(['operations', 'live'], {
          ...snapshot,
          unassigned: {
            ...snapshot.unassigned,
            comandas: [...snapshot.unassigned.comandas, optimistic],
          },
        })
      }
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(['operations', 'live'], ctx.snapshot)
      haptic.error()
    },
    onSuccess: () => {
      invalidateMobileWorkspace(queryClient)
      toast.success('Comanda aberta com sucesso')
      haptic.success()
    },
  })
  const addComandaItemMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: Parameters<typeof addComandaItem>[1] }) =>
      addComandaItem(comandaId, payload),
    onMutate: async ({ comandaId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['operations', 'live'] })
      const snapshot = queryClient.getQueryData<import('@contracts/contracts').OperationsLiveResponse>([
        'operations',
        'live',
      ])
      if (snapshot) {
        const newItem: import('@contracts/contracts').ComandaItemRecord = {
          id: `opt-item-${Date.now()}`,
          productId: payload.productId ?? null,
          productName: payload.productName ?? 'Item',
          quantity: payload.quantity,
          unitPrice: payload.unitPrice ?? 0,
          totalAmount: (payload.quantity ?? 0) * (payload.unitPrice ?? 0),
          notes: payload.notes ?? null,
          kitchenStatus: null,
          kitchenQueuedAt: null,
          kitchenReadyAt: null,
        }
        const groups = [...snapshot.employees, snapshot.unassigned]
        for (const group of groups) {
          const comandaIdx = group.comandas.findIndex((c) => c.id === comandaId)
          if (comandaIdx !== -1) {
            const updatedComanda = {
              ...group.comandas[comandaIdx],
              items: [...group.comandas[comandaIdx].items, newItem],
            }
            const updatedComandas = [...group.comandas]
            updatedComandas[comandaIdx] = updatedComanda
            if (group === snapshot.unassigned) {
              queryClient.setQueryData(['operations', 'live'], {
                ...snapshot,
                unassigned: { ...snapshot.unassigned, comandas: updatedComandas },
              })
            } else {
              const empIdx = snapshot.employees.findIndex((e) => e === group)
              const updatedEmployees = [...snapshot.employees]
              updatedEmployees[empIdx] = { ...group, comandas: updatedComandas }
              queryClient.setQueryData(['operations', 'live'], { ...snapshot, employees: updatedEmployees })
            }
            break
          }
        }
      }
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(['operations', 'live'], ctx.snapshot)
      toast.error('Erro ao adicionar item')
      haptic.error()
    },
    onSuccess: () => {
      toast.success('Item adicionado')
      haptic.light()
    },
  })
  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status),
    onMutate: async ({ comandaId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['operations', 'live'] })
      const snapshot = queryClient.getQueryData<import('@contracts/contracts').OperationsLiveResponse>([
        'operations',
        'live',
      ])
      if (snapshot) {
        const groups = [...snapshot.employees, snapshot.unassigned]
        for (const group of groups) {
          const comandaIdx = group.comandas.findIndex((c) => c.id === comandaId)
          if (comandaIdx !== -1) {
            const updatedComandas = [...group.comandas]
            updatedComandas[comandaIdx] = { ...group.comandas[comandaIdx], status }
            if (group === snapshot.unassigned) {
              queryClient.setQueryData(['operations', 'live'], {
                ...snapshot,
                unassigned: { ...snapshot.unassigned, comandas: updatedComandas },
              })
            } else {
              const empIdx = snapshot.employees.findIndex((e) => e === group)
              const updatedEmployees = [...snapshot.employees]
              updatedEmployees[empIdx] = { ...group, comandas: updatedComandas }
              queryClient.setQueryData(['operations', 'live'], { ...snapshot, employees: updatedEmployees })
            }
            break
          }
        }
      }
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(['operations', 'live'], ctx.snapshot)
      toast.error('Erro ao atualizar status')
      haptic.error()
    },
    onSuccess: () => {
      invalidateMobileWorkspace(queryClient)
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
    }) => closeComanda(comandaId, { discountAmount, serviceFeeAmount }),
    onMutate: async ({ comandaId }) => {
      await queryClient.cancelQueries({ queryKey: ['operations', 'live'] })
      const snapshot = queryClient.getQueryData<import('@contracts/contracts').OperationsLiveResponse>([
        'operations',
        'live',
      ])
      if (snapshot) {
        const groups = [...snapshot.employees, snapshot.unassigned]
        for (const group of groups) {
          const comandaIdx = group.comandas.findIndex((c) => c.id === comandaId)
          if (comandaIdx !== -1) {
            const updatedComandas = [...group.comandas]
            updatedComandas[comandaIdx] = { ...group.comandas[comandaIdx], status: 'CLOSED' }
            if (group === snapshot.unassigned) {
              queryClient.setQueryData(['operations', 'live'], {
                ...snapshot,
                unassigned: { ...snapshot.unassigned, comandas: updatedComandas },
              })
            } else {
              const empIdx = snapshot.employees.findIndex((e) => e === group)
              const updatedEmployees = [...snapshot.employees]
              updatedEmployees[empIdx] = { ...group, comandas: updatedComandas }
              queryClient.setQueryData(['operations', 'live'], { ...snapshot, employees: updatedEmployees })
            }
            break
          }
        }
      }
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(['operations', 'live'], ctx.snapshot)
      toast.error('Erro ao fechar comanda')
      haptic.error()
    },
    onSuccess: () => {
      invalidateMobileWorkspace(queryClient)
      toast.success('Comanda fechada — pagamento efetuado')
      haptic.heavy()
    },
  })
  const cancelComandaMutation = useMutation({
    mutationFn: cancelComanda,
    onMutate: async (comandaId) => {
      await queryClient.cancelQueries({ queryKey: ['operations', 'live'] })
      const snapshot = queryClient.getQueryData<import('@contracts/contracts').OperationsLiveResponse>([
        'operations',
        'live',
      ])
      if (snapshot) {
        const groups = [...snapshot.employees, snapshot.unassigned]
        for (const group of groups) {
          const comandaIdx = group.comandas.findIndex((c) => c.id === comandaId)
          if (comandaIdx !== -1) {
            const updatedComandas = [...group.comandas]
            updatedComandas[comandaIdx] = { ...group.comandas[comandaIdx], status: 'CANCELLED' }
            if (group === snapshot.unassigned) {
              queryClient.setQueryData(['operations', 'live'], {
                ...snapshot,
                unassigned: { ...snapshot.unassigned, comandas: updatedComandas },
              })
            } else {
              const empIdx = snapshot.employees.findIndex((e) => e === group)
              const updatedEmployees = [...snapshot.employees]
              updatedEmployees[empIdx] = { ...group, comandas: updatedComandas }
              queryClient.setQueryData(['operations', 'live'], { ...snapshot, employees: updatedEmployees })
            }
            break
          }
        }
      }
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(['operations', 'live'], ctx.snapshot)
      toast.error('Erro ao cancelar comanda')
      haptic.error()
    },
    onSuccess: () => {
      invalidateMobileWorkspace(queryClient)
      toast.success('Comanda cancelada')
      haptic.heavy()
    },
  })

  const mesas = useMemo(() => buildPdvMesas(operationsQuery.data), [operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(operationsQuery.data), [operationsQuery.data])
  const activeComandas = comandas.filter((comanda) => comanda.status !== 'fechada')
  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Funcionário'

  const kitchenBadge = useMemo(() => {
    const snapshot = operationsQuery.data
    if (!snapshot) return 0
    const groups = [...snapshot.employees, snapshot.unassigned]
    let count = 0
    for (const group of groups) {
      for (const comanda of group.comandas) {
        if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') continue
        for (const item of comanda.items) {
          if (item.kitchenStatus === 'QUEUED' || item.kitchenStatus === 'IN_PREPARATION') count++
        }
      }
    }
    return count
  }, [operationsQuery.data])

  const isBusy =
    openComandaMutation.isPending ||
    addComandaItemMutation.isPending ||
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
        for (const item of items) {
          await addComandaItemMutation.mutateAsync({
            comandaId: pendingAction.comandaId,
            payload: {
              productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
              productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
              quantity: item.quantidade,
              unitPrice: item.precoUnitario,
              notes: item.observacao,
            },
          })
        }
        await invalidateMobileWorkspace(queryClient)
        setPendingAction(null)
        setActiveTab('pedidos')
        return
      }

      // type === 'new' — tenta abrir comanda, com auto-open caixa se necessário
      const comParams = {
        tableLabel: normalizeTableLabel(pendingAction.mesa.numero),
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
          await openCashSession({ openingCashAmount: 0 })
          await invalidateMobileWorkspace(queryClient)
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
    const comanda = comandas.find((item) => item.id === id)
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
    const comanda = comandas.find((item) => item.id === id)
    if (!comanda) return
    try {
      setScreenError(null)
      // Calculate amounts from percentages
      const subtotal = comanda.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0)
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

      <main ref={pullRef} className="flex-1 overflow-y-auto relative">
        <PullIndicator style={pullIndicatorStyle} isRefreshing={isRefreshing} progress={pullProgress} />
        <div style={{ display: activeTab === 'mesas' ? undefined : 'none' }}>
          <MobileTableGrid mesas={mesas} onSelectMesa={handleSelectMesa} />
        </div>

        <div style={{ display: activeTab === 'cozinha' ? undefined : 'none' }}>
          <KitchenOrdersView snapshot={operationsQuery.data} />
        </div>

        {/* MobileOrderBuilder fica montado (hidden) para preservar estado do pedido */}
        <div style={{ display: activeTab === 'pedido' ? undefined : 'none' }}>
          {pendingAction ? (
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
          )}
        </div>

        {/* Pedidos — comandas ativas */}
        <div style={{ display: activeTab === 'pedidos' ? undefined : 'none' }}>
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
        </div>

        {/* Histórico — todos os atendimentos do dia */}
        <div style={{ display: activeTab === 'historico' ? undefined : 'none' }}>
          <MobileHistoricoView comandas={comandas} />
        </div>
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

async function invalidateMobileWorkspace(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['operations', 'live'] }),
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] }),
  ])
}
