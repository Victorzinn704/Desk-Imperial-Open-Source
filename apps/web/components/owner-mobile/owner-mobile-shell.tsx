'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ComandaItem, Mesa } from '@/components/pdv/pdv-types'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, ClipboardList, Cog, LogOut, ShoppingCart, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { BrandMark } from '@/components/shared/brand-mark'
import dynamic from 'next/dynamic'

const KitchenOrdersView = dynamic(
  () => import('../staff-mobile/kitchen-orders-view').then((mod) => mod.KitchenOrdersView),
  { ssr: false },
)
const OwnerComandasView = dynamic(() => import('./owner-comandas-view').then((mod) => mod.OwnerComandasView), {
  ssr: false,
})
import { ConnectionBanner } from '@/components/shared/connection-banner'
import { usePullToRefresh } from '@/components/shared/use-pull-to-refresh'
import { PullIndicator } from '@/components/shared/pull-indicator'
import { haptic } from '@/components/shared/haptic'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
const MobileOrderBuilder = dynamic(
  () => import('../staff-mobile/mobile-order-builder').then((mod) => mod.MobileOrderBuilder),
  { ssr: false },
)
import { MobileTableGrid } from '../staff-mobile/mobile-table-grid'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import { useRouter } from 'next/navigation'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import {
  addComandaItem,
  addComandaItems,
  closeComanda,
  fetchOperationsKitchen,
  fetchOperationsLive,
  fetchOperationsSummary,
  fetchOrders,
  fetchProducts,
  logout,
  openCashSession,
  openComanda,
  updateComandaStatus,
} from '@/lib/api'
import {
  buildOperationsExecutiveKpis,
  invalidateOperationsWorkspace,
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations'
import { isCashSessionRequiredError } from '@/lib/operations/operations-error-utils'
import {
  buildDesignLabConfigHref,
  buildDesignLabFinanceiroHref,
  buildDesignLabHref,
} from '@/components/design-lab/design-lab-navigation'
import { OwnerTodayView } from './owner-today-view'
import { OwnerFinanceView } from './owner-finance-view'
import { OwnerAccountView } from './owner-account-view'

type Tab = 'today' | 'comandas' | 'pdv' | 'financeiro' | 'conta'
type PdvView = 'mesas' | 'cozinha'
const ownerQuickRegisterHref = '/app/owner/cadastro-rapido'

type PendingAction = { type: 'new'; mesa: Mesa } | { type: 'add'; comandaId: string; mesaLabel: string }
type OwnerMobileShellProps = Readonly<{
  currentUser: { name?: string; fullName?: string; companyName?: string | null } | null
}>

export function OwnerMobileShell({ currentUser }: OwnerMobileShellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [pdvView, setPdvView] = useState<PdvView>('mesas')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)
  const [focusedComandaId, setFocusedComandaId] = useState<string | null>(null)

  const { status: realtimeStatus } = useOperationsRealtime(Boolean(currentUser), queryClient)
  const isOffline = realtimeStatus === 'disconnected'

  const handlePullRefresh = useCallback(async () => {
    haptic.light()
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY }),
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
    staleTime: 10_000,
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

  const ordersQuery = useQuery({
    queryKey: ['orders', 'summary'],
    queryFn: () => fetchOrders({ includeCancelled: false, includeItems: false }),
    enabled: Boolean(currentUser),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const kitchenQuery = useQuery({
    queryKey: OPERATIONS_KITCHEN_QUERY_KEY,
    queryFn: () => fetchOperationsKitchen(),
    enabled: Boolean(currentUser),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const summaryQuery = useQuery({
    queryKey: OPERATIONS_SUMMARY_QUERY_KEY,
    queryFn: () => fetchOperationsSummary(),
    enabled: Boolean(currentUser),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const operationsLoading = operationsQuery.isLoading && !operationsQuery.data
  const kitchenLoading = kitchenQuery.isLoading && !kitchenQuery.data
  const productsLoading = productsQuery.isLoading && !productsQuery.data
  const ordersLoading = ordersQuery.isLoading && !ordersQuery.data
  const summaryLoading = summaryQuery.isLoading && !summaryQuery.data
  const operationsErrorMessage = operationsQuery.error instanceof Error ? operationsQuery.error.message : null
  const kitchenErrorMessage = kitchenQuery.error instanceof Error ? kitchenQuery.error.message : null
  const productsErrorMessage = productsQuery.error instanceof Error ? productsQuery.error.message : null
  const ordersErrorMessage = ordersQuery.error instanceof Error ? ordersQuery.error.message : null
  const summaryErrorMessage = summaryQuery.error instanceof Error ? summaryQuery.error.message : null

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      router.push('/login')
    },
    onError: () => {
      toast.error('Erro ao sair. Verifique sua conexão.')
    },
  })

  const openComandaMutation = useMutation({
    mutationFn: (payload: Parameters<typeof openComanda>[0]) => openComanda(payload, { includeSnapshot: false }),
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX)
      toast.success('Comanda aberta com sucesso')
      haptic.success()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao abrir comanda')
      haptic.error()
    },
  })

  const addComandaItemMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: Parameters<typeof addComandaItem>[1] }) =>
      addComandaItem(comandaId, payload, { includeSnapshot: false }),
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Item adicionado')
      haptic.light()
    },
    onError: () => {
      toast.error('Erro ao adicionar item')
      haptic.error()
    },
  })
  const addComandaItemsMutation = useMutation({
    mutationFn: ({ comandaId, items }: { comandaId: string; items: Parameters<typeof addComandaItems>[1] }) =>
      addComandaItems(comandaId, items, { includeSnapshot: false }),
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
        includeSummary: false,
      })
      toast.success('Itens adicionados')
      haptic.light()
    },
    onError: () => {
      toast.error('Erro ao adicionar itens')
      haptic.error()
    },
  })

  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status, { includeSnapshot: false }),
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeKitchen: true,
      })
      toast.success('Status atualizado')
      haptic.medium()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status')
      haptic.error()
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
    onSuccess: () => {
      void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeOrders: true,
        includeFinance: true,
      })
      toast.success('Comanda fechada')
      haptic.heavy()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erro ao fechar comanda')
      haptic.error()
    },
  })

  const mesas = useMemo(() => buildPdvMesas(operationsQuery.data), [operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(operationsQuery.data), [operationsQuery.data])
  const activeComandas = useMemo(() => comandas.filter((c) => c.status !== 'fechada'), [comandas])
  const kitchenBadge = useMemo(
    () => (kitchenQuery.data?.statusCounts.queued ?? 0) + (kitchenQuery.data?.statusCounts.inPreparation ?? 0),
    [kitchenQuery.data],
  )

  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Proprietário'
  const companyName = currentUser?.companyName ?? 'Desk Imperial'
  const executiveKpis = useMemo(
    () => summaryQuery.data?.kpis ?? buildOperationsExecutiveKpis(operationsQuery.data),
    [operationsQuery.data, summaryQuery.data],
  )

  const today = new Date().toISOString().slice(0, 10)
  const todayOrders = useMemo(
    () => (ordersQuery.data?.items ?? []).filter((o) => o.createdAt.slice(0, 10) === today && o.status === 'COMPLETED'),
    [ordersQuery.data?.items, today],
  )
  const todayRevenue = useMemo(() => todayOrders.reduce((sum, o) => sum + o.totalRevenue, 0), [todayOrders])
  const ticketMedio = useMemo(
    () => (todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0),
    [todayOrders, todayRevenue],
  )

  // Ranking garçons — a partir do snapshot
  const garconRanking = useMemo(() => summaryQuery.data?.performers ?? [], [summaryQuery.data])
  const garconSnapshots = useMemo(() => {
    const activeByPerformer = new Map<string, number>()
    for (const comanda of activeComandas) {
      const performerName = comanda.garcomNome?.trim()
      if (!performerName) {continue}
      activeByPerformer.set(performerName, (activeByPerformer.get(performerName) ?? 0) + 1)
    }

    const known = new Set<string>()
    const snapshots = garconRanking.map((performer) => {
      known.add(performer.nome)
      return {
        ...performer,
        abertasAgora: activeByPerformer.get(performer.nome) ?? 0,
      }
    })

    for (const [nome, abertasAgora] of activeByPerformer.entries()) {
      if (known.has(nome)) {continue}
      snapshots.push({ nome, valor: 0, comandas: 0, abertasAgora })
    }

    return snapshots.sort((left, right) => right.valor - left.valor || right.abertasAgora - left.abertasAgora)
  }, [activeComandas, garconRanking])
  const topProdutos = useMemo(() => summaryQuery.data?.topProducts ?? [], [summaryQuery.data])

  const isBusy =
    openComandaMutation.isPending ||
    addComandaItemMutation.isPending ||
    addComandaItemsMutation.isPending ||
    updateComandaStatusMutation.isPending ||
    closeComandaMutation.isPending

  async function handleSubmit(items: ComandaItem[]) {
    if (!pendingAction) {return}
    setScreenError(null)

    try {
      if (pendingAction.type === 'add') {
        await addComandaItemsMutation.mutateAsync({
          comandaId: pendingAction.comandaId,
          items: items.map((item) => ({
            productId: item.produtoId.startsWith('manual-') ? undefined : item.produtoId,
            productName: item.produtoId.startsWith('manual-') ? item.nome : undefined,
            quantity: item.quantidade,
            unitPrice: item.precoUnitario,
            notes: item.observacao,
          })),
        })
        void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
          includeKitchen: true,
          includeSummary: false,
        })
        setPendingAction(null)
        setActiveTab('comandas')
        return
      }

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
        const isCaixaError = isCashSessionRequiredError(err)
        if (isCaixaError) {
          toast.dismiss()
          toast.info('Abrindo caixa automaticamente...')
          await openCashSession({ openingCashAmount: 0 }, { includeSnapshot: false })
          void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
            includeSummary: true,
          })
          await openComandaMutation.mutateAsync(comParams)
        } else {
          throw err
        }
      }
      setPendingAction(null)
      setActiveTab('comandas')
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Não foi possível processar o pedido.')
    }
  }

  const mesaLabel = pendingAction
    ? pendingAction.type === 'new'
      ? normalizeTableLabel(pendingAction.mesa.numero)
      : pendingAction.mesaLabel
    : '?'
  const orderMode = pendingAction?.type === 'add' ? 'add' : 'new'

  // Mesas ao vivo
  const mesasLivres = useMemo(() => mesas.filter((m) => m.status === 'livre').length, [mesas])
  const mesasOcupadas = useMemo(() => mesas.filter((m) => m.status === 'ocupada').length, [mesas])

  return (
    <div className="flex min-h-screen min-h-[100svh] flex-col overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <header
        className="relative z-50 flex shrink-0 items-center justify-between gap-3 bg-[var(--bg)] px-3 pb-2.5 sm:px-5 sm:pb-3"
        data-testid="owner-header"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <BrandMark size="sm" wordmark="hidden" />
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#008cff)] sm:text-[11px]">
                {companyName}
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
            <span
              className="truncate text-xs font-medium text-[var(--text-primary)] sm:text-sm"
              data-testid="user-display-name"
            >
              {displayName.split(' ')[0]}
            </span>
          </div>
        </div>
        <button
          aria-label="Encerrar sessão"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] transition-transform active:scale-95 sm:size-10"
          data-testid="logout-button"
          disabled={logoutMutation.isPending}
          type="button"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="size-4" />
        </button>
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

      <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-[7.25rem]" ref={pullRef}>
        <PullIndicator isRefreshing={isRefreshing} progress={pullProgress} style={pullIndicatorStyle} />
        {activeTab === 'today' ? (
          <OwnerTodayView
            activeComandas={executiveKpis.openComandasCount}
            errorMessage={
              ordersErrorMessage ??
              operationsErrorMessage ??
              kitchenErrorMessage ??
              summaryErrorMessage ??
              null
            }
            garconRanking={garconRanking}
            garconSnapshots={garconSnapshots}
            isLoading={ordersLoading || operationsLoading || kitchenLoading || summaryLoading}
            isOffline={isOffline}
            kitchenBadge={kitchenBadge}
            mesasLivres={mesasLivres}
            mesasOcupadas={mesasOcupadas}
            ticketMedio={ticketMedio}
            todayOrderCount={todayOrders.length}
            todayRevenue={executiveKpis.receitaRealizada}
            topProdutos={topProdutos}
            onOpenComandas={() => {
              setFocusedComandaId(null)
              setPendingAction(null)
              setActiveTab('comandas')
            }}
            onOpenFullDashboard={() => router.push(buildDesignLabHref('overview'))}
            onOpenKitchen={() => {
              setPendingAction(null)
              setPdvView('cozinha')
              setActiveTab('pdv')
            }}
            onOpenPdv={() => {
              setFocusedComandaId(null)
              setPendingAction(null)
              setPdvView('mesas')
              setActiveTab('pdv')
            }}
            onOpenQuickRegister={() => router.push(ownerQuickRegisterHref)}
          />
        ) : null}

        {activeTab === 'pdv' ? (
          <OwnerPdvTab
            errorMessage={pdvView === 'cozinha' ? kitchenErrorMessage : operationsErrorMessage}
            isBusy={isBusy}
            isOffline={isOffline}
            kitchenData={kitchenQuery.data}
            kitchenLoading={kitchenLoading}
            mesaLabel={mesaLabel}
            mesas={mesas}
            mesasLoading={operationsLoading}
            mode={orderMode}
            onCancelBuilder={() => {
              setPendingAction(null)
              setPdvView('mesas')
            }}
            onOpenQuickRegister={() => router.push(ownerQuickRegisterHref)}
            onSelectMesa={(mesa: Mesa) => {
              if (mesa.status === 'ocupada' && mesa.comandaId) {
                setPendingAction({
                  type: 'add',
                  comandaId: mesa.comandaId,
                  mesaLabel: normalizeTableLabel(mesa.numero),
                })
                setFocusedComandaId(null)
                setPdvView('mesas')
                setActiveTab('pdv')
              } else {
                setPendingAction({ type: 'new', mesa })
                setFocusedComandaId(null)
                setPdvView('mesas')
                setActiveTab('pdv')
              }
            }}
            onSetPdvView={setPdvView}
            onSubmit={handleSubmit}
            pdvView={pdvView}
            pendingAction={pendingAction}
            products={productsQuery.data?.items ?? []}
            productsErrorMessage={productsErrorMessage}
            productsLoading={productsLoading}
            queryKey={OPERATIONS_KITCHEN_QUERY_KEY}
          />
        ) : null}

        {activeTab === 'comandas' ? (
          <OwnerComandasView
            errorMessage={operationsErrorMessage}
            comandas={comandas}
            isBusy={isBusy}
            isLoading={operationsLoading}
            focusedId={focusedComandaId}
            isOffline={isOffline}
            onCloseComanda={(comandaId, discountAmount, serviceFeeAmount) =>
              closeComandaMutation.mutateAsync({ comandaId, discountAmount, serviceFeeAmount })
            }
          />
        ) : null}

        {activeTab === 'financeiro' ? (
          <OwnerFinanceView
            caixaEsperado={executiveKpis.caixaEsperado}
            errorMessage={summaryErrorMessage ?? ordersErrorMessage ?? null}
            isOffline={isOffline}
            lucroRealizado={executiveKpis.lucroRealizado}
            ticketMedio={ticketMedio}
            todayOrderCount={todayOrders.length}
            todayRevenue={executiveKpis.receitaRealizada}
            onOpenCash={() => router.push(buildDesignLabHref('caixa'))}
            onOpenFinanceiro={() => router.push(buildDesignLabFinanceiroHref('movimentacao'))}
          />
        ) : null}

        {activeTab === 'conta' ? (
          <OwnerAccountView
            companyName={companyName}
            displayName={displayName}
            onOpenDashboard={() => router.push(buildDesignLabHref('overview'))}
            onOpenQuickRegister={() => router.push(ownerQuickRegisterHref)}
            onOpenSecurity={() => router.push(buildDesignLabConfigHref('security'))}
            onOpenSettings={() => router.push(buildDesignLabConfigHref('account'))}
          />
        ) : null}
      </main>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-1 pb-1 pt-1 sm:px-2 sm:pb-2 sm:pt-2"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom,0px))' }}
      >
        <nav className="pointer-events-auto rounded-[1.8rem] bg-[var(--bg)] shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
          <div className="relative grid min-h-[4.25rem] grid-cols-5 gap-1 rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          {(
            [
              { id: 'today', label: 'Hoje', Icon: BarChart3, badge: 0 },
              { id: 'comandas', label: 'Comandas', Icon: ClipboardList, badge: activeComandas.length },
              { id: 'pdv', label: 'PDV', Icon: ShoppingCart, badge: pendingAction ? 1 : 0 },
              { id: 'financeiro', label: 'Financeiro', Icon: TrendingUp, badge: 0 },
              { id: 'conta', label: 'Conta', Icon: Cog, badge: 0 },
            ] as const
          ).map(({ id, label, Icon, badge }) => {
            const isActive = activeTab === id
            return (
              <button
                className="relative flex h-full min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-[1.2rem] px-1 transition-all active:scale-95"
                data-testid={`nav-${id}`}
                key={id}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                type="button"
                onClick={() => {
                  setActiveTab(id)
                  if (id !== 'comandas') {
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
                    <span className="absolute -right-2.5 -top-2 flex size-[18px] items-center justify-center rounded-full bg-[var(--accent,#008cff)] text-[10px] font-bold text-white ring-2 ring-[var(--bg)]">
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
    </div>
  )
}

function OwnerPdvTab({
  errorMessage,
  isBusy,
  isOffline,
  kitchenData,
  kitchenLoading,
  mesaLabel,
  mesas,
  mesasLoading,
  mode,
  onCancelBuilder,
  onOpenQuickRegister,
  onSelectMesa,
  onSetPdvView,
  onSubmit,
  pdvView,
  pendingAction,
  products,
  productsErrorMessage,
  productsLoading,
  queryKey,
}: Readonly<{
  errorMessage: string | null
  isBusy: boolean
  isOffline: boolean
  kitchenData: Awaited<ReturnType<typeof fetchOperationsKitchen>> | undefined
  kitchenLoading: boolean
  mesaLabel: string
  mesas: Mesa[]
  mesasLoading: boolean
  mode: 'new' | 'add'
  onCancelBuilder: () => void
  onOpenQuickRegister: () => void
  onSelectMesa: (mesa: Mesa) => void
  onSetPdvView: (view: PdvView) => void
  onSubmit: (items: ComandaItem[]) => Promise<void> | void
  pdvView: PdvView
  pendingAction: PendingAction | null
  products: Awaited<ReturnType<typeof fetchProducts>>['items']
  productsErrorMessage: string | null
  productsLoading: boolean
  queryKey: typeof OPERATIONS_KITCHEN_QUERY_KEY
}>) {
  const mesasLivres = useMemo(() => mesas.filter((mesa) => mesa.status === 'livre').length, [mesas])
  const mesasEmAtendimento = useMemo(() => mesas.filter((mesa) => mesa.status !== 'livre').length, [mesas])
  const kitchenQueue =
    (kitchenData?.statusCounts.queued ?? 0) + (kitchenData?.statusCounts.inPreparation ?? 0)

  if (pendingAction) {
    return (
      <div className="space-y-4 p-3 pb-6">
        {errorMessage ? (
          <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
            {errorMessage}
          </div>
        ) : isOffline ? (
          <div className="rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
            O PDV pode estar desatualizado até a reconexão.
          </div>
        ) : null}

        <MobileOrderBuilder
          busy={isBusy}
          errorMessage={productsErrorMessage}
          isLoading={productsLoading}
          isOffline={isOffline}
          mesaLabel={mesaLabel}
          mode={mode}
          produtos={products}
          onCancel={onCancelBuilder}
          onSubmit={onSubmit}
          secondaryAction={{ label: 'Cadastro rápido', onClick: onOpenQuickRegister }}
          summaryItems={[
            { label: 'Mesa', value: mesaLabel, tone: '#008cff' },
            { label: 'Livres', value: String(mesasLivres), tone: '#36f57c' },
            { label: 'Na fila', value: String(kitchenQueue), tone: '#eab308' },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3 pb-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-xs text-[#fca5a5]">
          {errorMessage}
        </div>
      ) : isOffline ? (
        <div className="rounded-2xl border border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-xs text-[#fcd34d]">
          O PDV pode estar desatualizado até a reconexão.
        </div>
      ) : null}

      <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">PDV</p>
            <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Pedido e cozinha</h1>
            <p className="mt-1 text-sm leading-6 text-[var(--text-soft,#7a8896)]">
              Mesas, nova comanda e fila de cozinha em uma única superfície.
            </p>
          </div>
          <button
            className="shrink-0 rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.08)] px-3 py-2 text-xs font-semibold text-[var(--accent,#008cff)]"
            type="button"
            onClick={onOpenQuickRegister}
          >
            Cadastro rápido
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[18px] bg-[var(--border)]">
          {[
            { label: 'Livres', value: mesasLivres, color: '#36f57c' },
            { label: 'Em uso', value: mesasEmAtendimento, color: '#f87171' },
            { label: 'Na fila', value: kitchenQueue, color: '#eab308' },
          ].map(({ label, value, color }) => (
            <div className="bg-[var(--surface-muted)] px-3 py-3" key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft,#7a8896)]">{label}</p>
              <p className="mt-1 text-xl font-bold" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {!pendingAction ? (
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[16px] bg-[var(--border)]">
            {([
              { id: 'mesas', label: 'Mesas' },
              { id: 'cozinha', label: 'Cozinha' },
            ] as const).map(({ id, label }) => {
              const isActive = pdvView === id
              return (
                <button
                  className="bg-[var(--surface-muted)] px-3 py-3 text-sm font-semibold transition active:scale-[0.98]"
                  data-testid={`owner-pdv-${id}`}
                  key={id}
                  style={{
                    background: isActive ? 'rgba(0,140,255,0.12)' : 'var(--surface-muted)',
                    color: isActive ? 'var(--accent,#008cff)' : 'var(--text-primary)',
                  }}
                  type="button"
                  onClick={() => onSetPdvView(id)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ) : null}
      </section>

      {pdvView === 'cozinha' ? (
        <KitchenOrdersView
          data={kitchenData}
          errorMessage={errorMessage}
          isLoading={kitchenLoading}
          isOffline={isOffline}
          queryKey={queryKey}
        />
      ) : (
        <MobileTableGrid
          errorMessage={errorMessage}
          isLoading={mesasLoading}
          isOffline={isOffline}
          mesas={mesas}
          onSelectMesa={onSelectMesa}
        />
      )}
    </div>
  )
}
