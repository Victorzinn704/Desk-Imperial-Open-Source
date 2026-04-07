'use client'

import { Box, LayoutDashboard, ShieldCheck, ShoppingCart, UserRound } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { formatAccountStatus } from '@/lib/dashboard-format'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { EmployeeRankingCard } from '@/components/dashboard/employee-ranking-card'
import { FinanceCategoriesSidebar } from '@/components/dashboard/finance-categories-sidebar'
import { FinanceChannelsPanel } from '@/components/dashboard/finance-channels-panel'
import { FinanceChart } from '@/components/dashboard/finance-chart'
import { FinanceOverviewTotal } from '@/components/dashboard/finance-overview-total'
import { MarketIntelligenceCard } from '@/components/dashboard/market-intelligence-card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { SalesMapCard } from '@/components/dashboard/sales-map-card'
import { SalesPerformanceCard } from '@/components/dashboard/sales-performance-card'

export function OverviewEnvironment() {
  const { sessionQuery, financeQuery, ordersQuery, employeesQuery, productsQuery } = useDashboardQueries({
    section: 'overview',
  })

  const user = sessionQuery.data?.user
  const finance = financeQuery.data
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
  const ordersTotals = ordersQuery.data?.totals
  const employeesTotals = employeesQuery.data?.totals
  const productsTotals = productsQuery.data?.totals

  const revenueTrend = finance?.revenueTimeline.map((t) => t.revenue) ?? []
  const profitTrend = finance?.revenueTimeline.map((t) => t.profit) ?? []
  const ordersTrend = finance?.revenueTimeline.map((t) => t.orders) ?? []

  if (!user) return null

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Receita realizada, pedidos por canal e distribuição de categorias em um painel financeiro detalhado."
        eyebrow="Visão financeira"
        icon={LayoutDashboard}
        title="Dashboard financeiro da operação"
      />

      {/* Metric cards row */}
      <div className="grid gap-4 xl:grid-cols-5">
        <MetricCard
          color="var(--accent)"
          hint={user.fullName}
          icon={UserRound}
          label="Conta"
          value={user.companyName || 'Conta Demo'}
        />
        <MetricCard
          color="var(--success)"
          hint="Status da identidade no portal"
          icon={ShieldCheck}
          label="Status"
          value={formatAccountStatus(user.status)}
        />
        <MetricCard
          color="var(--info)"
          hint="Produtos ativos com sessão autenticada"
          icon={Box}
          label="Portfólio"
          loading={financeQuery.isLoading}
          trend={revenueTrend}
          value={String(productsTotals?.activeProducts ?? 0)}
        />
        <MetricCard
          color="var(--warning)"
          hint="Pedidos concluídos considerados no financeiro"
          icon={ShoppingCart}
          label="Pedidos"
          loading={ordersQuery.isLoading}
          trend={ordersTrend}
          value={String(ordersTotals?.completedOrders ?? 0)}
        />
        <MetricCard
          color="var(--accent-strong)"
          hint="Equipe apta a registrar vendas"
          icon={ShieldCheck}
          label="Equipe ativa"
          loading={employeesQuery.isLoading}
          trend={profitTrend}
          value={String(employeesTotals?.activeEmployees ?? 0)}
        />
      </div>

      {finance ? (
        <>
          {/* Painel Executivo: Revenue hero + métricas */}
          <FinanceOverviewTotal finance={finance} isLoading={financeQuery.isLoading} variant="embedded" />

          {/* Composição Financeira: canais + categorias */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <FinanceChannelsPanel finance={finance} isLoading={financeQuery.isLoading} />
            <FinanceCategoriesSidebar finance={finance} isLoading={financeQuery.isLoading} variant="embedded" />
          </div>

          {/* Performance: sales + chart side by side */}
          <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
            <SalesPerformanceCard finance={finance} isLoading={financeQuery.isLoading} variant="embedded" />
            <FinanceChart
              error={financeError}
              finance={finance}
              isLoading={financeQuery.isLoading}
              ordersTotals={ordersTotals}
              variant="embedded"
            />
          </div>

          {/* Equipe + Inteligência */}
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
            <EmployeeRankingCard
              error={financeError}
              finance={finance}
              isLoading={financeQuery.isLoading}
              variant="embedded"
            />
            <MarketIntelligenceCard variant="embedded" />
          </div>
        </>
      ) : financeQuery.isLoading ? (
        <div className="imperial-card flex animate-pulse items-center justify-center p-16">
          <p className="text-sm text-[var(--text-soft)]">Carregando dados financeiros...</p>
        </div>
      ) : financeError ? (
        <div className="imperial-card p-8">
          <p className="text-sm text-[var(--danger)]">{financeError}</p>
        </div>
      ) : null}

      {/* Mapa: full width */}
      <SalesMapCard error={financeError} finance={finance} isLoading={financeQuery.isLoading} />
    </section>
  )
}
