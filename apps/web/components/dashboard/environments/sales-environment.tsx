'use client'

import dynamic from 'next/dynamic'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ShoppingCart, Store, Tags, TrendingUp, UserRound, Wallet } from 'lucide-react'
import type { OrderRecord } from '@contracts/contracts'
import type { AuthUser } from '@/lib/api'
import { ApiError, fetchOrders } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { useDashboardQueries } from '../hooks/useDashboardQueries'
import { useDashboardMutations } from '../hooks/useDashboardMutations'
import { EmployeeManagementCard } from '@/components/dashboard/employee-management-card'
import { FinanceCategoriesSidebar } from '@/components/dashboard/finance-categories-sidebar'
import { OrderForm } from '@/components/dashboard/order-form'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { MetricCardSkeleton } from '@/components/shared/skeleton'

const MetricCard = dynamic(() => import('@/components/dashboard/metric-card').then((m) => m.MetricCard), {
  ssr: false,
  loading: () => <MetricCardSkeleton />,
})

type SalesEnvironmentProps = {
  user: AuthUser
}

export function SalesEnvironment({ user }: Readonly<SalesEnvironmentProps>) {
  const { productsQuery, employeesQuery, financeQuery } = useDashboardQueries({ section: 'sales' })
  const {
    createOrderMutation,
    cancelOrderMutation,
    createEmployeeMutation,
    archiveEmployeeMutation,
    restoreEmployeeMutation,
  } = useDashboardMutations()
  const ordersQuery = useQuery({
    queryKey: ['orders', 'detail'],
    queryFn: () => fetchOrders({ includeCancelled: true, includeItems: true }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
  })

  const products = productsQuery.data?.items ?? []
  const orders = ordersQuery.data?.items ?? []
  const ordersTotals = ordersQuery.data?.totals
  const employees = employeesQuery.data?.items ?? []
  const employeesTotals = employeesQuery.data?.totals
  const finance = financeQuery.data
  const displayCurrency = finance?.displayCurrency ?? user.preferredCurrency
  const averageTicket =
    (ordersTotals?.completedOrders ?? 0) > 0
      ? (ordersTotals?.realizedRevenue ?? 0) / Math.max(1, ordersTotals?.completedOrders ?? 0)
      : 0

  const ordersError = ordersQuery.error instanceof ApiError ? ordersQuery.error.message : null
  const employeesError = employeesQuery.error instanceof ApiError ? employeesQuery.error.message : null
  const orderMutationError = [createOrderMutation.error, cancelOrderMutation.error].find(
    (error) => error instanceof ApiError,
  )
  const employeeMutationError = [
    createEmployeeMutation.error,
    archiveEmployeeMutation.error,
    restoreEmployeeMutation.error,
  ].find((error) => error instanceof ApiError)

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="A operação agora fica mais legível: um eixo para venda, um eixo para mix de categorias e um trilho manual para os últimos pedidos."
        eyebrow="Gestão comercial"
        icon={ShoppingCart}
        title="Central de operação comercial"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          color="#36f57c"
          hint="Receita realizada nas vendas concluídas"
          icon={Wallet}
          label="Receita realizada"
          value={formatCurrency(ordersTotals?.realizedRevenue ?? 0, displayCurrency)}
        />
        <MetricCard
          color="#C9A84C"
          hint="Lucro líquido consolidado das vendas concluídas"
          icon={TrendingUp}
          label="Lucro realizado"
          value={formatCurrency(ordersTotals?.realizedProfit ?? 0, displayCurrency)}
        />
        <MetricCard
          color="#60a5fa"
          hint="Média real por pedido concluído"
          icon={Store}
          label="Ticket médio"
          value={formatCurrency(averageTicket, displayCurrency)}
        />
        <MetricCard
          color="#a78bfa"
          hint={user.role === 'OWNER' ? 'Funcionários com vendas atribuídas' : 'Seu acesso operacional no workspace'}
          icon={user.role === 'OWNER' ? UserRound : Tags}
          label={user.role === 'OWNER' ? 'Equipe ativa' : 'Itens vendidos'}
          value={user.role === 'OWNER' ? String(employeesTotals?.activeEmployees ?? 0) : String(ordersTotals?.soldUnits ?? 0)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_380px] xl:items-start">
        <div className="space-y-4">
          <OrderForm
            employees={employees}
            loading={createOrderMutation.isPending}
            onSubmit={createOrderMutation.mutate}
            products={products.filter((product) => product.active)}
            userRole={user.role}
          />

          <OperationRecentOrdersPanel
            busy={createOrderMutation.isPending || cancelOrderMutation.isPending}
            currency={displayCurrency}
            emptyMessage="Nenhuma venda registrada ainda. Quando os pedidos entrarem, o trilho operacional aparece aqui em ordem cronológica."
            errorMessage={orderMutationError?.message ?? ordersError}
            onCancel={user.role === 'OWNER' ? cancelOrderMutation.mutate : undefined}
            orders={orders}
          />
        </div>

        <div className="space-y-4">
          {finance ? <FinanceCategoriesSidebar finance={finance} isLoading={financeQuery.isLoading} /> : null}

          {user.role === 'OWNER' ? (
            <EmployeeManagementCard
              busy={
                createEmployeeMutation.isPending ||
                archiveEmployeeMutation.isPending ||
                restoreEmployeeMutation.isPending
              }
              employees={employees}
              error={employeeMutationError?.message ?? employeesError}
              loading={createEmployeeMutation.isPending}
              onArchive={archiveEmployeeMutation.mutate}
              onCreate={createEmployeeMutation.mutate}
              onRestore={restoreEmployeeMutation.mutate}
              totals={employeesTotals}
            />
          ) : (
            <article className="imperial-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Ritmo da operação</p>
              <h2 className="mt-3 text-xl font-semibold text-white">Seu foco aqui é vender, registrar e manter o fluxo vivo.</h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-[18px] border border-[rgba(54,245,124,0.16)] bg-[rgba(54,245,124,0.08)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36f57c]">Pedido</p>
                  <p className="mt-1 text-sm text-white">Monte o carrinho sem sair da mesma superfície operacional.</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(96,165,250,0.16)] bg-[rgba(96,165,250,0.08)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">Equipe</p>
                  <p className="mt-1 text-sm text-white">Cada venda fica atribuída ao operador e entra no ranking do dia.</p>
                </div>
                <div className="rounded-[18px] border border-[rgba(201,168,76,0.16)] bg-[rgba(201,168,76,0.08)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C9A84C]">PIN</p>
                  <p className="mt-1 text-sm text-white">Preço manual e desconto continuam pedindo validação do dono quando protegido.</p>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  )
}

function OperationRecentOrdersPanel({
  busy,
  currency,
  emptyMessage,
  errorMessage,
  onCancel,
  orders,
}: Readonly<{
  busy: boolean
  currency: string
  emptyMessage: string
  errorMessage: string | null
  onCancel?: (orderId: string) => void
  orders: OrderRecord[]
}>) {
  return (
    <article className="imperial-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Pulso de vendas</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Últimos registros da operação</h2>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Lista manual, mais densa e mais próxima do ritmo do caixa do que cartões repetidos.
          </p>
        </div>
        <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
          {orders.length} visíveis
        </span>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-[14px] border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.06)] px-4 py-3 text-sm text-[#f87171]">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div
              className="grid gap-3 rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_auto_auto]"
              key={order.id}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">
                    {order.customerName || order.sellerName || 'Venda sem identificação'}
                  </p>
                  <span
                    className={
                      order.status === 'CANCELLED'
                        ? 'rounded-full border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f87171]'
                        : 'rounded-full border border-[rgba(54,245,124,0.22)] bg-[rgba(54,245,124,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#36f57c]'
                    }
                  >
                    {order.status === 'CANCELLED' ? 'Cancelado' : 'Concluído'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  {order.totalItems} item(ns) • {order.channel || 'canal não informado'} • {formatRelativeSalesTime(order.createdAt)}
                </p>
                <p className="mt-2 truncate text-xs text-[var(--text-soft)]">
                  {order.items.slice(0, 3).map((item) => item.productName).join(' • ') || 'Sem itens detalhados'}
                </p>
              </div>

              <div className="min-w-[132px] rounded-[14px] border border-[rgba(201,168,76,0.16)] bg-[rgba(201,168,76,0.06)] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Receita</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatCurrency(order.totalRevenue, currency as never)}</p>
                <p className="mt-1 text-[11px] text-[var(--text-soft)]">Lucro {formatCurrency(order.totalProfit, currency as never)}</p>
              </div>

              <div className="flex items-center justify-end">
                {order.status === 'COMPLETED' && onCancel ? (
                  <button
                    className="rounded-[14px] border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.06)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f87171] transition hover:bg-[rgba(248,113,113,0.12)] disabled:opacity-50"
                    disabled={busy}
                    onClick={() => onCancel(order.id)}
                    type="button"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/8 px-5 py-10 text-center">
            <p className="text-sm text-[var(--text-soft)]">{emptyMessage}</p>
          </div>
        )}
      </div>
    </article>
  )
}

function formatRelativeSalesTime(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)

  if (diffMinutes < 1) return 'agora mesmo'
  if (diffMinutes < 60) return `há ${diffMinutes} min`
  if (diffHours < 24) return `há ${diffHours} h`
  return date.toLocaleDateString('pt-BR')
}
