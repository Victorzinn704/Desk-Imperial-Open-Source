import { ClipboardList, Sparkles, Target, TrendingUp } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/metric-card'
import { OverviewTopProducts } from '@/components/dashboard/overview-top-products'
import { OverviewRecentOrders } from '@/components/dashboard/overview-recent-orders'
import { formatCurrency } from '@/lib/currency'
import { formatPercent, type OverviewViewProps } from './overview-environment.model'
import { buildTargetPlan, signedPercent } from './overview-environment.content'
import { buildMetaBriefEntries, buildMetaLedger } from './overview-meta.content'
import {
  ChartOrError,
  DataLedger,
  OverviewBriefPanel,
  ProgressBar,
  SectionEyebrow,
} from './overview-environment.shared'

export function OverviewMetaView({
  finance,
  financeError,
  isLoading,
  products,
  snapshot,
}: Readonly<OverviewViewProps>) {
  const plan = buildTargetPlan(snapshot, { minimumGap: 1000, multiplier: 1.18, orderFactor: 20 })

  return (
    <section className="space-y-5">
      <article className="imperial-card grid gap-5 p-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)_320px] xl:items-start">
        <MetaHero snapshot={snapshot} targetProgress={plan.targetProgress} targetRevenue={plan.targetRevenue} />

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">desdobramento da meta</p>
          <div className="mt-3">
            <DataLedger columns={2} items={buildMetaLedger(snapshot, plan)} />
          </div>
        </div>

        <OverviewBriefPanel entries={buildMetaBriefEntries(snapshot)} title="contexto da meta" />
      </article>

      <MetaMetricCards isLoading={isLoading} snapshot={snapshot} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewTopProducts finance={finance} isLoading={isLoading} products={products} />
      </div>

      <OverviewRecentOrders
        displayCurrency={snapshot.displayCurrency}
        isLoading={isLoading}
        orders={finance?.recentOrders ?? []}
        summaryText={`meta ${formatPercent(plan.targetProgress)}`}
      />
    </section>
  )
}

function MetaHero({
  snapshot,
  targetProgress,
  targetRevenue,
}: Readonly<{
  snapshot: OverviewViewProps['snapshot']
  targetProgress: number
  targetRevenue: number
}>) {
  return (
    <div className="border-b border-dashed border-[var(--border)] pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5">
      <SectionEyebrow icon={Target} label="kpi hero com meta" />
      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">meta comercial do mês</p>
      <p className="mt-2 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[clamp(3rem,5.6vw,4.8rem)] leading-none text-[var(--text-primary)]">
        {formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency)}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
        Aqui a leitura favorece um único número dominante, progresso visível e contexto curto para orientar a rotina
        comercial antes de mergulhar no resto do painel.
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-[12px] text-[var(--text-soft)]">
          <span>meta projetada</span>
          <span>{formatCurrency(targetRevenue, snapshot.displayCurrency)}</span>
        </div>
        <ProgressBar value={targetProgress} />
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <span>{formatPercent(targetProgress)} atingido</span>
          <span>{snapshot.revenueGrowth >= 0 ? 'crescimento saudável' : 'atenção na conversão'}</span>
        </div>
      </div>
    </div>
  )
}

function MetaMetricCards({ isLoading, snapshot }: Pick<OverviewViewProps, 'isLoading' | 'snapshot'>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard
        delta={snapshot.revenueGrowth}
        deltaPositive={snapshot.revenueGrowth >= 0}
        hint="ritmo da receita"
        icon={TrendingUp}
        label="crescimento"
        loading={isLoading}
        value={signedPercent({ value: snapshot.revenueGrowth })}
      />
      <MetricCard
        hint="estoque baixo em leitura comercial"
        icon={ClipboardList}
        label="estoque crítico"
        loading={isLoading}
        value={snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens` : 'controlado'}
      />
      <MetricCard
        hint="produto com maior venda potencial"
        icon={Sparkles}
        label="produto destaque"
        loading={isLoading}
        value={snapshot.topProductName ?? 'sem registro'}
      />
    </div>
  )
}
