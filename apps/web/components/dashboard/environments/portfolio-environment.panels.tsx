import { type LucideIcon, Plus, ShoppingCart } from 'lucide-react'
import {
  LabMetricStrip,
  LabMetricStripItem,
  LabMiniStat,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import type { PortfolioEnvironmentContent } from './portfolio-environment.content'
import type {
  PortfolioActionCardModel,
  PortfolioMetricItem,
  PortfolioSignalItem,
} from './portfolio-environment.content-types'
import type { PortfolioRadarCategory, PortfolioRadarModel } from './portfolio-radar.content'

export function PortfolioHeaderBoard({
  metrics,
}: Readonly<{
  metrics: PortfolioMetricItem[]
}>) {
  return (
    <LabMetricStrip>
      {metrics.map((metric) => (
        <LabMetricStripItem
          description={metric.description}
          key={metric.label}
          label={metric.label}
          value={metric.value}
        />
      ))}
    </LabMetricStrip>
  )
}

export function PortfolioActionPanel({
  model,
  onOpenProduct,
  onOpenSale,
}: Readonly<{
  model: PortfolioEnvironmentContent['actionPanel']
  onOpenProduct: () => void
  onOpenSale: () => void
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="info">{model.activeProductsLabel}</LabStatusPill>}
      padding="md"
      title="Fluxos imediatos"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionLaunchCard icon={Plus} model={model.createProduct} onClick={onOpenProduct} />
        <ActionLaunchCard icon={ShoppingCart} model={model.createSale} onClick={onOpenSale} />
      </div>
    </LabPanel>
  )
}

export function PortfolioOperationalPanel({
  model,
}: Readonly<{
  model: PortfolioEnvironmentContent['operationalPanel']
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{model.actionLabel}</LabStatusPill>}
      padding="md"
      title="Leitura operacional"
    >
      <div className="space-y-0">
        {model.signals.map((signal) => (
          <LabSignalRow
            key={signal.label}
            label={signal.label}
            note={signal.note}
            tone={signal.tone}
            value={signal.value}
          />
        ))}
      </div>
    </LabPanel>
  )
}

export function PortfolioRadarPanel({
  model,
}: Readonly<{
  model: PortfolioRadarModel
}>) {
  const content = model.hasCategories ? (
    <PortfolioRadarContent model={model} />
  ) : (
    <PortfolioRadarEmptyState model={model} />
  )

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{model.actionLabel}</LabStatusPill>}
      padding="md"
      title="Radar do catálogo"
    >
      {content}
    </LabPanel>
  )
}

function PortfolioRadarContent({
  model,
}: Readonly<{
  model: PortfolioRadarModel
}>) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_280px]">
      <div className="space-y-5">
        <PortfolioRadarMetricGrid metrics={model.metrics} />
        <PortfolioRadarCategoryList categories={model.topCategories} />
      </div>
      <PortfolioRadarFactsColumn facts={model.facts} />
    </div>
  )
}

function PortfolioRadarEmptyState({
  model,
}: Readonly<{
  model: PortfolioRadarModel
}>) {
  return (
    <>
      <PortfolioRadarMetricGrid metrics={model.metrics} />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {model.facts.map((fact) => (
          <PortfolioRadarFact key={fact.label} signal={fact} />
        ))}
      </div>
    </>
  )
}

function PortfolioRadarMetricGrid({
  metrics,
}: Readonly<{
  metrics: PortfolioMetricItem[]
}>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {metrics.map((metric) => (
        <LabMiniStat key={metric.label} label={metric.label} value={metric.value} />
      ))}
    </div>
  )
}

function PortfolioRadarCategoryList({
  categories,
}: Readonly<{
  categories: PortfolioRadarCategory[]
}>) {
  return (
    <div className="space-y-1">
      {categories.map((category) => (
        <PortfolioRadarCategoryRow category={category} key={category.label} />
      ))}
    </div>
  )
}

function PortfolioRadarCategoryRow({
  category,
}: Readonly<{
  category: PortfolioRadarCategory
}>) {
  return (
    <article className="border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{category.label}</p>
          <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
            {category.productsLabel} · {category.capitalLabel} de capital
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[var(--lab-fg)]">{category.potentialProfitLabel}</p>
          <p className="mt-1 text-xs text-[var(--lab-fg-muted)]">lucro potencial</p>
        </div>
      </div>
      <PortfolioRadarProgress widthPercent={category.widthPercent} />
      <p className="mt-2 text-xs text-[var(--lab-fg-soft)]">{category.inventorySalesLabel} em venda potencial</p>
    </article>
  )
}

function PortfolioRadarProgress({
  widthPercent,
}: Readonly<{
  widthPercent: number
}>) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
      <div className="h-full rounded-full bg-[var(--lab-blue)]" style={{ width: `${widthPercent}%` }} />
    </div>
  )
}

function PortfolioRadarFactsColumn({
  facts,
}: Readonly<{
  facts: PortfolioSignalItem[]
}>) {
  return (
    <div className="space-y-4 border-t border-dashed border-[var(--lab-border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
      {facts.map((fact) => (
        <LabSignalRow key={fact.label} label={fact.label} note={fact.note} tone={fact.tone} value={fact.value} />
      ))}
    </div>
  )
}

function PortfolioRadarFact({
  signal,
}: Readonly<{
  signal: PortfolioSignalItem
}>) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3">
      <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">
        {signal.label}
      </span>
      <LabStatusPill tone={signal.tone}>{signal.value}</LabStatusPill>
    </div>
  )
}

function ActionLaunchCard({
  icon: Icon,
  model,
  onClick,
}: Readonly<{
  icon: LucideIcon
  model: PortfolioActionCardModel
  onClick: () => void
}>) {
  return (
    <button
      className="group flex min-h-[120px] w-full flex-col justify-between rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4 text-left transition hover:border-[var(--lab-blue-border)] hover:bg-[var(--lab-surface-hover)]"
      type="button"
      onClick={onClick}
    >
      <span className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue)] transition group-hover:border-[var(--lab-blue)]">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-[var(--lab-fg)]">{model.label}</span>
          <span className="mt-1 block text-sm leading-5 text-[var(--lab-fg-soft)]">{model.description}</span>
        </span>
      </span>

      <span className="flex items-end justify-between gap-3 border-t border-dashed border-[var(--lab-border)] pt-3">
        <span>
          <span className="block text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">
            {model.statLabel}
          </span>
          <span className="mt-1 block text-sm font-semibold text-[var(--lab-fg)]">{model.statValue}</span>
        </span>
        <span className="inline-flex h-9 items-center rounded-xl border border-[var(--lab-blue)] bg-[var(--lab-blue)] px-3 text-sm font-medium text-white transition group-hover:bg-[color:color-mix(in_srgb,var(--lab-blue)_82%,white_18%)]">
          Abrir
        </span>
      </span>
    </button>
  )
}
