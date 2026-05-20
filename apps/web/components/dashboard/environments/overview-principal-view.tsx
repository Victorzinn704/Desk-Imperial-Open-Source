import { Sparkles } from 'lucide-react'
import { OverviewTopProducts } from '@/components/dashboard/overview-top-products'
import { OverviewRecentOrders } from '@/components/dashboard/overview-recent-orders'
import { formatCurrency } from '@/lib/currency'
import type { OverviewViewProps } from './overview-environment.model'
import { signedPercent } from './overview-environment.content'
import {
  buildPrincipalLedger,
  buildPrincipalRadarEntries,
  buildPrincipalSignalEntries,
  principalRevenueNarrative,
} from './overview-principal.content'
import {
  ChartOrError,
  DataLedger,
  InlineStat,
  OverviewBriefPanel,
  SectionEyebrow,
  StandardMetricGrid,
} from './overview-environment.shared'

export function OverviewPrincipalView({
  finance,
  financeError,
  isLoading,
  products,
  snapshot,
}: Readonly<OverviewViewProps>) {
  return (
    <section className="space-y-5">
      <article className="imperial-card workspace-notebook-split workspace-notebook-split--main-145 workspace-notebook-split--rail-320 p-5">
        <div>
          <SectionEyebrow icon={Sparkles} label="principal desk imperial" />
          <h2 className="mt-2 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[2rem] font-semibold leading-tight text-[var(--text-primary)]">
            A leitura que abre o Desk Imperial sem peso de dashboard genérico
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-soft)]">
            Receita, lucro, ritmo de pedidos e sinais de atenção em uma composição mais editorial. O foco aqui é
            entender o negócio em segundos e só depois aprofundar.
          </p>

          <PrincipalInsightGrid snapshot={snapshot} />
        </div>

        <OverviewBriefPanel entries={buildPrincipalRadarEntries(snapshot)} title="radar do turno" />
      </article>

      <StandardMetricGrid isLoading={isLoading} snapshot={snapshot} />

      <div className="workspace-notebook-split workspace-notebook-split--rail-320">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewBriefPanel entries={buildPrincipalSignalEntries(snapshot)} title="sinais rápidos" />
      </div>

      <div className="workspace-notebook-split workspace-notebook-split--rail-340">
        <OverviewRecentOrders
          displayCurrency={snapshot.displayCurrency}
          isLoading={isLoading}
          orders={finance?.recentOrders ?? []}
          summaryText={snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos` : null}
        />
        <OverviewTopProducts finance={finance} isLoading={isLoading} products={products} />
      </div>
    </section>
  )
}

function PrincipalInsightGrid({ snapshot }: Pick<OverviewViewProps, 'snapshot'>) {
  return (
    <div className="workspace-notebook-duo mt-5">
      <div className="border-b border-dashed border-[var(--border)] pb-5 min-[1080px]:border-b-0 min-[1080px]:border-r min-[1080px]:pb-0 min-[1080px]:pr-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">receita do mês</p>
        <p className="mt-2 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[clamp(2.6rem,5vw,4rem)] leading-none text-[var(--text-primary)]">
          {formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency)}
        </p>
        <p className="mt-4 text-sm leading-6 text-[var(--text-soft)]">{principalRevenueNarrative(snapshot)}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InlineStat label="crescimento" value={signedPercent({ value: snapshot.revenueGrowth })} />
          <InlineStat label="lucro" value={formatCurrency(snapshot.currentProfit, snapshot.displayCurrency)} />
        </div>
      </div>
      <DataLedger columns={3} items={buildPrincipalLedger(snapshot)} />
    </div>
  )
}
