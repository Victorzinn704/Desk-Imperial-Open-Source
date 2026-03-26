'use client'

import { useMemo, useState } from 'react'
import type { Mesa } from '@/components/pdv/pdv-types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Building2, ClipboardList, Cog, LogOut, TrendingUp } from 'lucide-react'
import type { Comanda, ComandaStatus } from '@/components/pdv/pdv-types'
import { BrandMark } from '@/components/shared/brand-mark'
import { MobileComandaList } from '../staff-mobile/mobile-comanda-list'
import { MobileTableGrid } from '../staff-mobile/mobile-table-grid'
import {
  fetchOperationsLive,
  fetchOrders,
  closeComanda,
  logout,

  updateComandaStatus,
} from '@/lib/api'
import { useRouter } from 'next/navigation'
import {
  buildPdvComandas,
  buildPdvMesas,
  toOperationAmounts,
  toOperationsStatus,
} from '@/components/pdv/pdv-operations'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'

type Tab = 'mesas' | 'comandas' | 'resumo'

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
  const [screenError, setScreenError] = useState<string | null>(null)
  const [focusedComandaId, setFocusedComandaId] = useState<string | null>(null)

  const operationsQuery = useQuery({
    queryKey: ['operations', 'live'],
    queryFn: () => fetchOperationsLive(),
    enabled: Boolean(currentUser),
    refetchInterval: 5_000,
  })

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders(),
    enabled: Boolean(currentUser),
    staleTime: 30_000,
  })

  useOperationsRealtime(Boolean(currentUser), queryClient)

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      router.push('/login')
    },
  })

  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status),
    onSuccess: () => invalidateOwnerWorkspace(queryClient),
  })

  const closeComandaMutation = useMutation({
    mutationFn: ({ comandaId, discountAmount, serviceFeeAmount }: {
      comandaId: string; discountAmount: number; serviceFeeAmount: number
    }) => closeComanda(comandaId, { discountAmount, serviceFeeAmount }),
    onSuccess: () => invalidateOwnerWorkspace(queryClient),
  })

  const mesas = useMemo(() => buildPdvMesas(operationsQuery.data), [operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(operationsQuery.data), [operationsQuery.data])
  const activeComandas = comandas.filter((c) => c.status !== 'fechada')

  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Proprietário'
  const companyName = currentUser?.companyName ?? 'Desk Imperial'

  async function handleUpdateStatus(id: string, status: ComandaStatus) {
    const comanda = comandas.find((c) => c.id === id)
    if (!comanda) return
    try {
      setScreenError(null)
      if (status === 'fechada') {
        const amounts = toOperationAmounts(comanda)
        await closeComandaMutation.mutateAsync({ comandaId: id, ...amounts })
        return
      }
      await updateComandaStatusMutation.mutateAsync({ comandaId: id, status: toOperationsStatus(status) })
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Não foi possível atualizar a comanda.')
    }
  }

  // KPIs para aba Resumo
  const today = new Date().toISOString().slice(0, 10)
  const orders = ordersQuery.data?.items ?? []
  const todayOrders = orders.filter((o) => o.createdAt.slice(0, 10) === today && o.status === 'COMPLETED')
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalRevenue, 0)

  const totalItems = activeComandas.reduce(
    (sum, c) => sum + c.itens.reduce((s, i) => s + i.quantidade, 0),
    0,
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#000000] text-white">
      {/* Header */}
      <header
        className="flex shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#000000] px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent,#9b8460)]">
              {companyName}
            </p>
            <p className="text-xs text-[#7a8896]">Olá, {displayName.split(' ')[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex size-9 items-center justify-center rounded-xl border border-[rgba(155,132,96,0.3)] bg-[rgba(155,132,96,0.1)] text-[var(--accent,#9b8460)] transition-colors active:bg-[rgba(155,132,96,0.2)]"
            aria-label="Abrir painel completo"
          >
            <Building2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex size-9 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#7a8896] transition-colors active:bg-[rgba(255,255,255,0.1)]"
            aria-label="Encerrar sessão"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

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
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'mesas' ? (
          <MobileTableGrid
            mesas={mesas}
            onSelectMesa={(mesa: Mesa) => {
              if (mesa.status === 'ocupada' && mesa.comandaId) {
                // occupied → go to that comanda directly
                setFocusedComandaId(mesa.comandaId)
              } else {
                // libre → just show all comandas, no empty comanda created
                setFocusedComandaId(null)
              }
              setActiveTab('comandas')
            }}
          />
        ) : null}

        {activeTab === 'comandas' ? (
          <MobileComandaList
            comandas={activeComandas}
            onUpdateStatus={handleUpdateStatus}
            focusedComandaId={focusedComandaId}
          />
        ) : null}

        {activeTab === 'resumo' ? (
          <OwnerResumoTab
            todayRevenue={todayRevenue}
            todayOrderCount={todayOrders.length}
            activeComandas={activeComandas.length}
            totalActiveItems={totalItems}
            isLoading={ordersQuery.isLoading || operationsQuery.isLoading}
            onOpenFullDashboard={() => router.push('/dashboard')}
          />
        ) : null}
      </main>

      {/* Bottom nav */}
      <nav
        className="shrink-0 border-t border-[rgba(255,255,255,0.06)] bg-[#000000]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom,0px)' }}
      >
        <div className="grid grid-cols-3">
          {(
            [
              { id: 'mesas', label: 'Mesas', Icon: Building2, badge: 0 },
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
                className="relative flex flex-col items-center justify-center gap-1 py-3 transition-colors"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isActive ? (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--accent,#9b8460)]" />
                ) : null}
                <div className="relative">
                  <Icon
                    className="size-5"
                    style={{ color: isActive ? 'var(--accent, #9b8460)' : '#7a8896' }}
                  />
                  {badge > 0 ? (
                    <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--accent,#9b8460)] text-[9px] font-bold text-black">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? 'var(--accent, #9b8460)' : '#7a8896' }}
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
  todayOrderCount,
  activeComandas,
  totalActiveItems,
  isLoading,
  onOpenFullDashboard,
}: {
  todayRevenue: number
  todayOrderCount: number
  activeComandas: number
  totalActiveItems: number
  isLoading: boolean
  onOpenFullDashboard: () => void
}) {
  return (
    <div className="p-4 pb-8">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
        Visão geral de hoje
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-[var(--accent,#9b8460)]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a8896]">Receita</p>
          </div>
          {isLoading ? (
            <div className="h-6 w-20 animate-pulse rounded bg-[rgba(255,255,255,0.08)]" />
          ) : (
            <p className="text-lg font-bold text-white">{formatCurrency(todayRevenue)}</p>
          )}
          <p className="mt-1 text-[10px] text-[#7a8896]">hoje</p>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <ClipboardList className="size-3.5 text-[#60a5fa]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a8896]">Pedidos</p>
          </div>
          {isLoading ? (
            <div className="h-6 w-12 animate-pulse rounded bg-[rgba(255,255,255,0.08)]" />
          ) : (
            <p className="text-lg font-bold text-white">{todayOrderCount}</p>
          )}
          <p className="mt-1 text-[10px] text-[#7a8896]">hoje</p>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <Building2 className="size-3.5 text-[#fb923c]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a8896]">Comandas</p>
          </div>
          <p className="text-lg font-bold text-white">{activeComandas}</p>
          <p className="mt-1 text-[10px] text-[#7a8896]">abertas agora</p>
        </div>

        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <Cog className="size-3.5 text-[#a78bfa]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a8896]">Itens</p>
          </div>
          <p className="text-lg font-bold text-white">{totalActiveItems}</p>
          <p className="mt-1 text-[10px] text-[#7a8896]">em andamento</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenFullDashboard}
        className="mt-6 w-full rounded-2xl border border-[rgba(155,132,96,0.3)] bg-[rgba(155,132,96,0.08)] px-4 py-4 text-sm font-semibold text-[var(--accent,#9b8460)] transition-opacity active:opacity-70"
      >
        Abrir painel completo →
      </button>

      <p className="mt-4 text-center text-[10px] text-[#7a8896]">
        Para finanças detalhadas, folha de pagamento e configurações, acesse o painel completo no desktop.
      </p>
    </div>
  )
}

async function invalidateOwnerWorkspace(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['operations', 'live'] }),
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] }),
  ])
}
