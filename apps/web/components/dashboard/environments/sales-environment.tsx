'use client'

import { LockKeyhole, ShoppingCart, Tags, UserRound } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDashboardQueries } from '../hooks/useDashboardQueries'
import { useDashboardMutations } from '../hooks/useDashboardMutations'
import type { AuthUser } from '@/lib/api'
import { ApiError, fetchOrders } from '@/lib/api'
import { EmployeeManagementCard } from '@/components/dashboard/employee-management-card'
import dynamic from 'next/dynamic'
import { MetricCardSkeleton } from '@/components/shared/skeleton'

const MetricCard = dynamic(() => import('@/components/dashboard/metric-card').then((m) => m.MetricCard), {
  ssr: false,
  loading: () => <MetricCardSkeleton />,
})
import { OrderCard } from '@/components/dashboard/order-card'
import { OrderForm } from '@/components/dashboard/order-form'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'

type SalesEnvironmentProps = {
  user: AuthUser
}

export function SalesEnvironment({ user }: Readonly<SalesEnvironmentProps>) {
  const { productsQuery, employeesQuery } = useDashboardQueries()
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
  })

  const products = productsQuery.data?.items ?? []
  const orders = ordersQuery.data?.items ?? []
  const ordersTotals = ordersQuery.data?.totals
  const employees = employeesQuery.data?.items ?? []
  const employeesTotals = employeesQuery.data?.totals

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
        description="Pedidos concluídos alimentam o financeiro realizado. Aqui o operador registra vendas e acompanha o ritmo da operação."
        eyebrow="Gestão comercial"
        icon={ShoppingCart}
        title="Módulo de vendas e pedidos"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          hint="Pedidos concluídos"
          icon={ShoppingCart}
          label="Concluídos"
          value={String(ordersTotals?.completedOrders ?? 0)}
        />
        <MetricCard
          hint="Pedidos cancelados"
          icon={LockKeyhole}
          label="Cancelados"
          value={String(ordersTotals?.cancelledOrders ?? 0)}
        />
        <MetricCard
          hint="Unidades vendidas"
          icon={Tags}
          label="Itens vendidos"
          value={String(ordersTotals?.soldUnits ?? 0)}
        />
        <MetricCard
          hint={user.role === 'OWNER' ? 'Funcionarios com vendas atribuidas' : 'Seu acesso operacional no workspace'}
          icon={UserRound}
          label={user.role === 'OWNER' ? 'Equipe ativa' : 'Perfil'}
          value={user.role === 'OWNER' ? String(employeesTotals?.activeEmployees ?? 0) : 'Staff'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_360px] xl:items-start">
        <div>
          <OrderForm
            employees={employees}
            loading={createOrderMutation.isPending}
            onSubmit={createOrderMutation.mutate}
            products={products.filter((product) => product.active)}
            userRole={user.role}
          />
        </div>

        {user.role === 'OWNER' ? (
          <div className="space-y-4">
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
          </div>
        ) : (
          <div className="imperial-card p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(143,183,255,0.18)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
                <UserRound className="size-5" />
              </span>
              <div>
                <p className="text-sm text-[var(--text-soft)]">Acesso operacional</p>
                <h2 className="text-xl font-semibold text-white">Conta compacta do funcionário</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="imperial-card-soft px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
                Você opera vendas, PDV e calendário com trilha de auditoria vinculada ao seu acesso.
              </div>
              <div className="imperial-card-soft px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
                Cadastros sensíveis, estrutura da equipe, edição e exclusão ficam restritos ao dono da empresa.
              </div>
              <div className="imperial-card-soft px-4 py-4 text-sm leading-7 text-[var(--text-soft)]">
                Descontos com preço manual pedem validação do dono por PIN quando essa proteção estiver ativa.
              </div>
            </div>
          </div>
        )}
      </div>

      <article className="imperial-card p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <ShoppingCart className="size-5" />
          </span>
          <div>
            <p className="text-sm text-[var(--text-soft)]">Vendas recentes</p>
            <h2 className="text-xl font-semibold text-white">Pedidos da operação</h2>
          </div>
        </div>

        {ordersError ? <p className="mt-4 text-sm text-[var(--danger)]">{ordersError}</p> : null}
        {orderMutationError ? <p className="mt-4 text-sm text-[var(--danger)]">{orderMutationError.message}</p> : null}

        <div className="mt-6 space-y-4">
          {orders.length > 0 ? (
            orders.map((order) => (
              <OrderCard
                busy={createOrderMutation.isPending || cancelOrderMutation.isPending}
                canCancel={user.role === 'OWNER'}
                key={order.id}
                onCancel={cancelOrderMutation.mutate}
                order={order}
              />
            ))
          ) : (
            <p className="imperial-card-soft px-4 py-3 text-sm text-[var(--text-soft)]">
              Nenhuma venda registrada ainda. Use o formulario acima para criar o primeiro pedido.
            </p>
          )}
        </div>
      </article>
    </section>
  )
}
