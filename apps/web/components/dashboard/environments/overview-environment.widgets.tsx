import type { FinanceSummaryResponse } from '@contracts/contracts'
import { Activity, ArrowUpRight, type LucideIcon, Radar, Wallet } from 'lucide-react'
import { LAB_RESPONSIVE_FOUR_UP_GRID, LabPanel } from '@/components/design-lab/lab-primitives'
import { MetricCard } from '@/components/dashboard/metric-card'
import { SalesPerformanceCard } from '@/components/dashboard/sales-performance-card'
import { formatCurrency } from '@/lib/currency'
import { clamp, formatPercent, type OverviewSnapshot } from './overview-environment.model'

export function StandardMetricGrid({
  isLoading,
  snapshot,
}: Readonly<{
  isLoading: boolean
  snapshot: OverviewSnapshot
}>) {
  return (
    <div className={`grid gap-4 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
      <MetricCard
        delta={snapshot.revenueGrowth}
        deltaPositive={snapshot.revenueGrowth >= 0}
        hint="vs período anterior"
        icon={Wallet}
        label="receita do mês"
        loading={isLoading}
        value={formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency)}
      />
      <MetricCard
        delta={snapshot.profitGrowth}
        deltaPositive={snapshot.profitGrowth >= 0}
        hint="resultado líquido"
        icon={ArrowUpRight}
        label="lucro do mês"
        loading={isLoading}
        value={formatCurrency(snapshot.currentProfit, snapshot.displayCurrency)}
      />
      <MetricCard
        hint="pedidos concluídos"
        icon={Activity}
        label="volume fechado"
        loading={isLoading}
        value={String(snapshot.completedOrders)}
      />
      <MetricCard
        hint={snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens com atenção` : 'sem alerta crítico'}
        icon={Radar}
        label="margem média"
        loading={isLoading}
        value={formatPercent(snapshot.averageMargin)}
      />
    </div>
  )
}

export function ChartOrError({
  finance,
  financeError,
  isLoading,
  surface = 'default',
}: Readonly<{
  finance?: FinanceSummaryResponse
  financeError: string | null
  isLoading: boolean
  surface?: 'default' | 'lab'
}>) {
  if (financeError) {
    return surface === 'lab' ? <LabChartError message={financeError} /> : <DefaultChartError message={financeError} />
  }

  return <SalesPerformanceCard finance={finance} isLoading={isLoading} />
}

export function SectionEyebrow({
  icon: Icon,
  label,
}: Readonly<{
  icon: LucideIcon
  label: string
}>) {
  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
      <Icon className="size-3.5" />
      <span>{label}</span>
    </div>
  )
}

export function InlineStat({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

export function DataLedger({
  columns = 2,
  items,
}: Readonly<{
  columns?: 2 | 3
  items: Array<{
    label: string
    note: string
    tone: 'accent' | 'success' | 'danger' | 'warning' | 'soft'
    value: string
  }>
}>) {
  const gridClass = columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'

  return (
    <div
      className={`overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] ${gridClass} grid`}
    >
      {items.map((item, index) => (
        <DataLedgerItem columns={columns} index={index} item={item} itemCount={items.length} key={item.label} />
      ))}
    </div>
  )
}

export function OverviewBriefPanel({
  entries,
  title,
}: Readonly<{
  entries: Array<{
    label: string
    tone: 'accent' | 'success' | 'danger' | 'warning' | 'soft'
    value: string
  }>
  title: string
}>) {
  return (
    <article className="imperial-card p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
      <div className="mt-4 space-y-3">
        {entries.map((entry) => (
          <div
            className="flex items-start justify-between gap-4 border-b border-dashed border-[var(--border)] pb-3 last:border-b-0 last:pb-0"
            key={entry.label}
          >
            <span className="max-w-[46%] text-[12px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {entry.label}
            </span>
            <span className={briefToneClass(entry.tone)}>{entry.value}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

export function CompactTile({
  label,
  note,
  tone,
  value,
}: Readonly<{
  label: string
  note: string
  tone: 'accent' | 'success' | 'warning' | 'soft'
  value: string
}>) {
  return (
    <article className="imperial-card p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p
        className={`mt-2 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.6rem] leading-none ${compactToneClass(tone)}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-[var(--text-soft)]">{note}</p>
    </article>
  )
}

export function EditorialChip({ label }: Readonly<{ label: string }>) {
  return (
    <span className="inline-flex rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-3 py-1.5 text-xs text-[var(--text-primary)]">
      {label}
    </span>
  )
}

export function ProgressBar({ value }: Readonly<{ value: number }>) {
  return (
    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
        style={{ width: `${clamp(value, 0, 100)}%` }}
      />
    </div>
  )
}

function LabChartError({ message }: Readonly<{ message: string }>) {
  return (
    <LabPanel padding="md" title="Receita e lucro">
      <p className="text-sm leading-6 text-[var(--lab-danger)]">{message}</p>
    </LabPanel>
  )
}

function DefaultChartError({ message }: Readonly<{ message: string }>) {
  return (
    <div className="imperial-card p-8">
      <p className="text-sm text-[var(--danger)]">{message}</p>
    </div>
  )
}

function DataLedgerItem({
  columns,
  index,
  item,
  itemCount,
}: Readonly<{
  columns: 2 | 3
  index: number
  item: { label: string; note: string; tone: 'accent' | 'success' | 'danger' | 'warning' | 'soft'; value: string }
  itemCount: number
}>) {
  const itemClassName = resolveDataLedgerItemClassName({ columns, index, itemCount })

  return (
    <div className={itemClassName}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{item.label}</p>
      <p
        className={`mt-2 text-[1.05rem] font-semibold leading-snug ${briefToneClass(item.tone).replace('text-right ', '')}`}
      >
        {item.value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">{item.note}</p>
    </div>
  )
}

function resolveDataLedgerItemClassName({
  columns,
  index,
  itemCount,
}: Readonly<{
  columns: 2 | 3
  index: number
  itemCount: number
}>) {
  const isLastItem = index === itemCount - 1
  const isLastColumn = columns === 3 ? index % 3 === 2 : index % 2 === 1
  const isLastRow = index >= itemCount - columns

  return [
    'border-b border-dashed border-[var(--border)] p-4',
    isLastItem ? 'border-b-0' : '',
    !isLastColumn ? 'lg:border-r' : '',
    isLastRow ? 'lg:border-b-0' : '',
  ].join(' ')
}

function briefToneClass(tone: 'accent' | 'success' | 'danger' | 'warning' | 'soft') {
  return {
    accent: 'text-right text-sm font-semibold text-[var(--accent-strong)]',
    danger: 'text-right text-sm font-semibold text-[var(--danger)]',
    soft: 'text-right text-sm font-semibold text-[var(--text-primary)]',
    success: 'text-right text-sm font-semibold text-[var(--success)]',
    warning: 'text-right text-sm font-semibold text-[var(--warning)]',
  }[tone]
}

function compactToneClass(tone: 'accent' | 'success' | 'warning' | 'soft') {
  return {
    accent: 'text-[var(--accent-strong)]',
    soft: 'text-[var(--text-primary)]',
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
  }[tone]
}
