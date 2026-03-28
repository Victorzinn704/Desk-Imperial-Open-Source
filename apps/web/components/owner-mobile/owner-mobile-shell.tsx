'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Mesa, ComandaItem } from '@/components/pdv/pdv-types'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  Building2,
  ChefHat,
  ClipboardList,
  Cog,
  Crown,
  LogOut,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { BrandMark } from '@/components/shared/brand-mark'
import { KitchenOrdersView } from '../staff-mobile/kitchen-orders-view'
import { MobileTableGrid } from '../staff-mobile/mobile-table-grid'
import { OwnerComandasView } from './owner-comandas-view'
import { ConnectionBanner } from '@/components/shared/connection-banner'
import { usePullToRefresh } from '@/components/shared/use-pull-to-refresh'
import { PullIndicator } from '@/components/shared/pull-indicator'
import { haptic } from '@/components/shared/haptic'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import { MobileOrderBuilder } from '../staff-mobile/mobile-order-builder'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import { useRouter } from 'next/navigation'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import {
  fetchOperationsLive,
  fetchOrders,
  fetchProducts,
  closeComanda,
  logout,
  openComanda,
  openCashSession,
  updateComandaStatus,
  addComandaItem,
  ApiError,
} from '@/lib/api'
import {
  buildOperationsExecutiveKpis,
  buildPerformerRanking,
  buildTopProducts,
  countKitchenPendingItems,
  invalidateOperationsWorkspace,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
} from '@/lib/operations'

type Tab = 'mesas' | 'cozinha' | 'comandas' | 'resumo' | 'pedido'

type PendingAction = { type: 'new'; mesa: Mesa } | { type: 'add'; comandaId: string; mesaLabel: string }
interface OwnerMobileShellProps {
  currentUser: { name?: string; fullName?: string; companyName?: string | null } | null
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function OwnerMobileShell({ currentUser }: OwnerMobileShellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('mesas')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [screenError, setScreenError] = useState<string | null>(null)
  const [, setFocusedComandaId] = useState<string | null>(null)

  const { status: realtimeStatus } = useOperationsRealtime(Boolean(currentUser), queryClient)

  const handlePullRefresh = useCallback(async () => {
    haptic.light()
    await queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY })
  }, [queryClient])

  const {
    containerRef: pullRef,
    indicatorStyle: pullIndicatorStyle,
    isRefreshing,
    progress: pullProgress,
  } = usePullToRefresh({ onRefresh: handlePullRefresh })

  const operationsQuery = useQuery({
    queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false }),
    enabled: Boolean(currentUser),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: realtimeStatus !== 'connected',
    // socket ativo = sem polling; socket offline = fallback a cada 20s
    refetchInterval: realtimeStatus === 'connected' ? false : 20_000,
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
    queryKey: ['orders'],
    queryFn: () => fetchOrders(),
    enabled: Boolean(currentUser),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

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
      invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY)
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
      toast.success('Item adicionado')
      haptic.light()
    },
    onError: () => {
      toast.error('Erro ao adicionar item')
      haptic.error()
    },
  })

  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status, { includeSnapshot: false }),
    onSuccess: () => {
      invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY)
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
      invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY)
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
  const kitchenBadge = useMemo(() => countKitchenPendingItems(operationsQuery.data), [operationsQuery.data])

  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Proprietário'
  const companyName = currentUser?.companyName ?? 'Desk Imperial'
  const executiveKpis = useMemo(() => buildOperationsExecutiveKpis(operationsQuery.data), [operationsQuery.data])

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
  const garconRanking = useMemo(
    () => buildPerformerRanking(operationsQuery.data, displayName),
    [displayName, operationsQuery.data],
  )

  // Top produtos — a partir do snapshot (todos os itens do dia)
  const topProdutos = useMemo(() => buildTopProducts(operationsQuery.data), [operationsQuery.data])

  const isBusy =
    openComandaMutation.isPending ||
    addComandaItemMutation.isPending ||
    updateComandaStatusMutation.isPending ||
    closeComandaMutation.isPending

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
        await invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY)
        setPendingAction(null)
        setActiveTab('comandas')
        return
      }

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
        const isCaixaError =
          (err instanceof ApiError && err.status === 409) ||
          (err instanceof Error && err.message.toLowerCase().includes('caixa'))
        if (isCaixaError) {
          toast.dismiss()
          toast.info('Abrindo caixa automaticamente...')
          await openCashSession({ openingCashAmount: 0 }, { includeSnapshot: false })
          await invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_COMPACT_QUERY_KEY)
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
    <div className="flex h-dvh flex-col overflow-hidden bg-[#000000] text-white">
      {/* Header */}
      {/* Header Minimalista */}
      <header
        data-testid="owner-header"
        className="relative z-50 flex shrink-0 items-center justify-between bg-[#000000] px-5 pb-3"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#9b8460)]">
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
            <span data-testid="user-display-name" className="text-sm font-medium text-white">
              {displayName.split(' ')[0]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard?view=settings&panel=account')}
            className="flex size-10 items-center justify-center rounded-full bg-[rgba(155,132,96,0.12)] text-[var(--accent,#9b8460)] transition-transform active:scale-95"
            aria-label="Configurações"
          >
            <Cog className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex size-10 items-center justify-center rounded-full bg-[rgba(155,132,96,0.12)] text-[var(--accent,#9b8460)] transition-transform active:scale-95"
            aria-label="Abrir painel completo"
          >
            <Building2 className="size-4" />
          </button>
          <button
            type="button"
            data-testid="logout-button"
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

      {/* Main content */}
      <main ref={pullRef} className="flex-1 overflow-y-auto relative">
        <PullIndicator style={pullIndicatorStyle} isRefreshing={isRefreshing} progress={pullProgress} />
        {activeTab === 'mesas' ? (
          <MobileTableGrid
            mesas={mesas}
            isLoading={operationsQuery.isLoading && !operationsQuery.data}
            onSelectMesa={(mesa: Mesa) => {
              if (mesa.status === 'ocupada' && mesa.comandaId) {
                setFocusedComandaId(mesa.comandaId)
                setActiveTab('comandas')
              } else {
                setPendingAction({ type: 'new', mesa })
                setFocusedComandaId(null)
                setActiveTab('pedido')
              }
            }}
          />
        ) : null}

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
                setActiveTab('mesas')
              }}
            />
          ) : null}
        </div>

        {activeTab === 'cozinha' ? (
          <KitchenOrdersView snapshot={operationsQuery.data} operationsQueryKey={OPERATIONS_LIVE_COMPACT_QUERY_KEY} />
        ) : null}

        {activeTab === 'comandas' ? <OwnerComandasView comandas={comandas} /> : null}

        {activeTab === 'resumo' ? (
          <OwnerResumoTab
            todayRevenue={executiveKpis.receitaRealizada}
            ticketMedio={ticketMedio}
            todayOrderCount={todayOrders.length}
            activeComandas={executiveKpis.openComandasCount}
            mesasLivres={mesasLivres}
            mesasOcupadas={mesasOcupadas}
            kitchenBadge={kitchenBadge}
            garconRanking={garconRanking}
            topProdutos={topProdutos}
            isLoading={ordersQuery.isLoading || operationsQuery.isLoading}
            onOpenFullDashboard={() => router.push('/dashboard')}
          />
        ) : null}
      </main>

      {/* Bottom nav Moderna (iFood style) */}
      <nav
        className="shrink-0 bg-[#000000] px-2 pb-2 pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom,0px))' }}
      >
        <div className="grid h-16 grid-cols-4 gap-0.5 rounded-[2rem] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-0.5 relative">
          {(
            [
              { id: 'mesas', label: 'Mesas', Icon: Building2, badge: 0 },
              { id: 'cozinha', label: 'Cozinha', Icon: ChefHat, badge: kitchenBadge },
              { id: 'comandas', label: 'Comandas', Icon: ClipboardList, badge: activeComandas.length },
              { id: 'resumo', label: 'Resumo', Icon: BarChart3, badge: 0 },
            ] as const
          ).map(({ id, label, Icon, badge }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id)
                  if (id !== 'comandas') setFocusedComandaId(null)
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

function OwnerResumoTab({
  todayRevenue,
  ticketMedio,
  todayOrderCount,
  activeComandas,
  mesasLivres,
  mesasOcupadas,
  kitchenBadge,
  garconRanking,
  topProdutos,
  isLoading,
  onOpenFullDashboard,
}: {
  todayRevenue: number
  ticketMedio: number
  todayOrderCount: number
  activeComandas: number
  mesasLivres: number
  mesasOcupadas: number
  kitchenBadge: number
  garconRanking: { nome: string; valor: number; comandas: number }[]
  topProdutos: { nome: string; qtd: number; valor: number }[]
  isLoading: boolean
  onOpenFullDashboard: () => void
}) {
  return (
    <div className="p-4 pb-8 space-y-5">
      {/* KPIs do dia */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">Hoje</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Receita',
              value: formatCurrency(todayRevenue),
              sub: 'faturado',
              color: '#36f57c',
              Icon: TrendingUp,
            },
            {
              label: 'Ticket médio',
              value: formatCurrency(ticketMedio),
              sub: 'por atendimento',
              color: '#fb923c',
              Icon: BarChart3,
            },
            {
              label: 'Pedidos',
              value: String(todayOrderCount),
              sub: 'encerrados',
              color: '#60a5fa',
              Icon: ClipboardList,
            },
            {
              label: 'Comandas',
              value: String(activeComandas),
              sub: 'abertas agora',
              color: '#a78bfa',
              Icon: Building2,
            },
          ].map(({ label, value, sub, color, Icon }) => (
            <div
              key={label}
              data-testid={`owner-kpi-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4"
            >
              <div className="mb-1 flex items-center gap-1.5">
                <Icon className="size-3.5" style={{ color }} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a8896]">{label}</p>
              </div>
              {isLoading ? (
                <div className="h-6 w-20 animate-pulse rounded bg-[rgba(255,255,255,0.08)]" />
              ) : (
                <p className="text-lg font-bold text-white">{value}</p>
              )}
              <p className="mt-1 text-[10px] text-[#7a8896]">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mesas + Cozinha ao vivo */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          Ao vivo
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-3 text-center">
            <p className="text-2xl font-bold text-[#34d399]">{mesasLivres}</p>
            <p className="text-[10px] text-[#7a8896] mt-0.5">Livres</p>
          </div>
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-3 text-center">
            <p className="text-2xl font-bold text-[#f87171]">{mesasOcupadas}</p>
            <p className="text-[10px] text-[#7a8896] mt-0.5">Ocupadas</p>
          </div>
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-3 text-center">
            <p className="text-2xl font-bold text-[#eab308]">{kitchenBadge}</p>
            <p className="text-[10px] text-[#7a8896] mt-0.5">Cozinha</p>
          </div>
        </div>
      </div>

      {/* Ranking garçons */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          <Users className="inline size-3 mr-1" />
          Ranking garçons
        </p>
        {garconRanking.length === 0 ? (
          <p className="text-xs text-[#7a8896] py-2 text-center">Nenhum garçom com vendas hoje</p>
        ) : (
          <ul className="space-y-2">
            {garconRanking.map((g, i) => (
              <li
                key={g.nome}
                className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold" style={{ color: i === 0 ? '#eab308' : '#7a8896' }}>
                    {i === 0 ? <Crown className="size-3" /> : `#${i + 1}`}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{g.nome}</p>
                    <p className="text-[10px] text-[#7a8896]">{g.comandas} comandas</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#36f57c]">{formatCurrency(g.valor)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top produtos */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
          <Package className="inline size-3 mr-1" />
          Top produtos
        </p>
        {topProdutos.length === 0 ? (
          <p className="text-xs text-[#7a8896] py-2 text-center">Nenhum produto vendido hoje ainda</p>
        ) : (
          <ul className="space-y-2">
            {topProdutos.map((p, i) => {
              const maxValor = topProdutos[0]?.valor ?? 1
              const pct = Math.round((p.valor / maxValor) * 100)
              return (
                <li
                  key={p.nome}
                  className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-white truncate max-w-[65%]">{p.nome}</p>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#60a5fa]">{formatCurrency(p.valor)}</span>
                      <span className="ml-2 text-[10px] text-[#7a8896]">×{p.qtd}</span>
                    </div>
                  </div>
                  <div className="h-1 w-full rounded-full bg-[rgba(255,255,255,0.06)]">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: i === 0 ? '#36f57c' : 'rgba(96,165,250,0.6)' }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenFullDashboard}
        className="w-full rounded-2xl border border-[rgba(155,132,96,0.3)] bg-[rgba(155,132,96,0.08)] px-4 py-3 text-sm font-semibold text-[var(--accent,#9b8460)] transition-opacity active:opacity-70"
      >
        Painel completo →
      </button>
    </div>
  )
}
