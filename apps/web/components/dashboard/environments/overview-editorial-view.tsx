import { Newspaper } from 'lucide-react'
import { OverviewTopProducts } from '@/components/dashboard/overview-top-products'
import { OverviewRecentOrders } from '@/components/dashboard/overview-recent-orders'
import type { OverviewViewProps } from './overview-environment.model'
import { buildEditorialContent } from './overview-editorial.content'
import {
  ChartOrError,
  DataLedger,
  EditorialChip,
  OverviewBriefPanel,
  SectionEyebrow,
} from './overview-environment.shared'

export function OverviewEditorialView({
  finance,
  financeError,
  isLoading,
  products,
  snapshot,
}: Readonly<OverviewViewProps>) {
  const content = buildEditorialContent(snapshot)

  return (
    <section className="space-y-5">
      <article className="imperial-card grid gap-5 p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)_300px] xl:items-start">
        <EditorialHero chips={content.chips} narrative={content.narrative} titleProduct={content.titleProduct} />

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">caderno do dia</p>
          <div className="mt-3">
            <DataLedger columns={2} items={content.ledger} />
          </div>
        </div>

        <OverviewBriefPanel entries={content.briefEntries} title="recortes do dia" />
      </article>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewRecentOrders
          displayCurrency={snapshot.displayCurrency}
          isLoading={isLoading}
          orders={finance?.recentOrders ?? []}
          summaryText={snapshot.topProductName ? `destaque · ${snapshot.topProductName}` : null}
        />
      </div>

      <OverviewTopProducts finance={finance} isLoading={isLoading} products={products} />
    </section>
  )
}

function EditorialHero({
  chips,
  narrative,
  titleProduct,
}: Readonly<{
  chips: string[]
  narrative: string
  titleProduct: string
}>) {
  return (
    <div>
      <SectionEyebrow icon={Newspaper} label="editorial diário" />
      <h2 className="mt-3 max-w-4xl font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[clamp(2rem,4.2vw,3.2rem)] font-semibold leading-tight text-[var(--text-primary)]">
        Hoje o produto principal é {titleProduct}, e o painel precisa contar isso com clareza.
      </h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--text-soft)]">{narrative}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <EditorialChip key={chip} label={chip} />
        ))}
      </div>
    </div>
  )
}
