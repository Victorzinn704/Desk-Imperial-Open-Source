'use client'

import { LayoutDashboard, ShieldCheck, ShoppingCart, UserRound } from 'lucide-react'
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
  const { sessionQuery, financeQuery, ordersQuery, employeesQuery } = useDashboardQueries({
    section: 'overview',
  })

  const user = sessionQuery.data?.user
  const finance = financeQuery.data
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
  const ordersTotals = ordersQuery.data?.totals
  const employeesTotals = employeesQuery.data?.totals
  const profitTrend = finance?.revenueTimeline.map((t) => t.profit) ?? []
  const ordersTrend = finance?.revenueTimeline.map((t) => t.orders) ?? []
  const timelinePoints = finance?.revenueTimeline.length ?? 0

  if (!user) return null

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-black/70 via-[#03050a]/85 to-[#050b14]/90 p-6 shadow-[0_30px_55px_rgba(0,0,0,0.65)] ring-1 ring-white/5 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--text-soft)]">Visão executiva</p>
            <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Dashboard operacional e financeiro
            </h1>
            <p className="max-w-2xl text-sm text-[var(--text-soft)]">
              Consolida métricas de caixa, performance e operação no mesmo painel para decisões rápidas e confiáveis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">
            <span className="rounded-full border border-[#008cff]/40 bg-[#008cff]/10 px-3 py-1 text-white">
              Workspace {user.companyName ?? 'Demo'}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-white">
              Status {formatAccountStatus(user.status)}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-white">
              Perfil {user.role ?? 'Operador'}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            className="bg-[#091122] border-[#008cff]/30 shadow-[0_10px_30px_rgba(0,140,255,0.15)]"
            color="#008cff"
            hint="Conta principal"
            icon={UserRound}
            label="Conta"
            value={user.companyName || 'Conta Demo'}
          />
          <MetricCard
            className="bg-[#091122] border-[#008cff]/30 shadow-[0_10px_30px_rgba(0,140,255,0.15)]"
            color="#008cff"
            hint="Perfil do workspace"
            icon={ShieldCheck}
            label="Status"
            value={formatAccountStatus(user.status)}
          />
          <MetricCard
            className="bg-[#091122] border-[#008cff]/30 shadow-[0_10px_30px_rgba(0,140,255,0.15)]"
            color="#008cff"
            hint="Pedidos registrados hoje"
            icon={ShoppingCart}
            label="Pedidos"
            loading={ordersQuery.isLoading}
            trend={ordersTrend}
            value={String(ordersTotals?.completedOrders ?? 0)}
          />
          <MetricCard
            className="bg-[#091122] border-[#008cff]/30 shadow-[0_10px_30px_rgba(0,140,255,0.15)]"
            color="#008cff"
            hint="Equipe disponível para operação"
            icon={ShieldCheck}
            label="Equipe ativa"
            loading={employeesQuery.isLoading}
            trend={profitTrend}
            value={String(employeesTotals?.activeEmployees ?? 0)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--text-soft)]">
          <span className="rounded-full border border-white/10 px-3 py-1 text-white">
            Pedidos concluídos • {ordersTotals?.completedOrders ?? 0}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-white">
            Equipe ativa • {employeesTotals?.activeEmployees ?? 0}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-white">
            {timelinePoints} checkpoints financeiros
          </span>
        </div>
      </div>

      <DashboardSectionHeading
        eyebrow="Panorama financeiro"
        icon={LayoutDashboard}
        title="Resultados em um olhar"
        description="Receita realizada, pedidos por canal e distribuição de categorias dialogam com os KPIs principais."
      />

      {finance ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <FinanceOverviewTotal finance={finance} isLoading={financeQuery.isLoading} />
            <div className="space-y-6">
              <FinanceChannelsPanel finance={finance} isLoading={financeQuery.isLoading} />
              <FinanceCategoriesSidebar finance={finance} isLoading={financeQuery.isLoading} />
            </div>
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

      <div className="space-y-6">
        <SalesPerformanceCard finance={finance} isLoading={financeQuery.isLoading} />
        <MarketIntelligenceCard />
        <FinanceChart
          error={financeError}
          finance={finance}
          isLoading={financeQuery.isLoading}
          ordersTotals={ordersTotals}
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <EmployeeRankingCard error={financeError} finance={finance} isLoading={financeQuery.isLoading} />
          <SalesMapCard error={financeError} finance={finance} isLoading={financeQuery.isLoading} />
        </div>
      </div>
    </section>
  )
}
