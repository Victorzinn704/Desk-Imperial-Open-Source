'use client'
/* eslint-disable no-restricted-imports */

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { ChartResponsiveContainer } from '@/components/dashboard/chart-responsive-container'
import { formatCompactCurrency } from '@/lib/currency'
import { buildFinanceCategoryMixRows, type FinanceCategoryMixRow } from './finance-category-mix'

type FinanceCategoryStructureChartProps = Readonly<{
  activeCategory?: string | null
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  onSelectCategory?: (category: string) => void
}>

const FOCUS_TONE_COLORS = {
  info: '#60a5fa',
  neutral: 'var(--text-primary)',
  success: '#36f57c',
  warning: '#C9A84C',
} as const

export function FinanceCategoryStructureChart({
  activeCategory = null,
  categoryBreakdown,
  displayCurrency,
  onSelectCategory,
}: FinanceCategoryStructureChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const rows = useMemo(() => buildFinanceCategoryMixRows(categoryBreakdown, 6), [categoryBreakdown])
  const focusedCategory = getFocusedCategory(rows, hoveredCategory, activeCategory)

  if (rows.length === 0) {
    return <FinanceCategoryStructureEmptyState />
  }

  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <FinanceCategoryStructureHeader count={rows.length} />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_260px]">
        <FinanceCategoryStructureBars
          displayCurrency={displayCurrency}
          rows={rows}
          setHoveredCategory={setHoveredCategory}
          onSelectCategory={onSelectCategory}
        />
        <FinanceCategoryStructureFocus displayCurrency={displayCurrency} focusedCategory={focusedCategory} />
      </div>
    </section>
  )
}

function FinanceCategoryStructureEmptyState() {
  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="rounded-[16px] border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--text-soft)]">
        Sem categorias suficientes para montar a composição comercial.
      </div>
    </section>
  )
}

function FinanceCategoryStructureHeader({ count }: Readonly<{ count: number }>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          Arquitetura do mix
        </p>
        <p className="mt-2 max-w-[36rem] text-sm leading-6 text-[var(--text-soft)]">
          Leitura de custo e potencial por categoria. A barra mostra o peso real da venda, sem repetir o gráfico do
          overview.
        </p>
      </div>
      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-soft)]">
        {count} faixas
      </span>
    </div>
  )
}

function FinanceCategoryStructureBars({
  displayCurrency,
  onSelectCategory,
  rows,
  setHoveredCategory,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  onSelectCategory?: (category: string) => void
  rows: FinanceCategoryMixRow[]
  setHoveredCategory: (category: string | null) => void
}>) {
  return (
    <div className="h-[260px]">
      <ChartResponsiveContainer
        fallback={<div aria-hidden="true" className="h-full w-full rounded-[16px] bg-[var(--surface-soft)]" />}
      >
        <BarChart data={rows} layout="vertical" margin={{ top: 6, right: 20, left: 8, bottom: 6 }}>
          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis hide type="number" />
          <YAxis
            axisLine={false}
            dataKey="category"
            tick={{ fill: 'var(--text-soft)', fontSize: 11 }}
            tickLine={false}
            type="category"
            width={96}
          />
          <FinanceCategoryStructureBar
            dataKey="inventoryCostValue"
            fill="rgba(255,255,255,0.12)"
            rows={rows}
            setHoveredCategory={setHoveredCategory}
            onSelectCategory={onSelectCategory}
          />
          <FinanceCategoryStructureBar
            dataKey="potentialProfit"
            fill={undefined}
            labelCurrency={displayCurrency}
            rows={rows}
            setHoveredCategory={setHoveredCategory}
            onSelectCategory={onSelectCategory}
          />
        </BarChart>
      </ChartResponsiveContainer>
    </div>
  )
}

function FinanceCategoryStructureBar({
  dataKey,
  fill,
  labelCurrency,
  onSelectCategory,
  rows,
  setHoveredCategory,
}: Readonly<{
  dataKey: 'inventoryCostValue' | 'potentialProfit'
  fill?: string
  labelCurrency?: FinanceSummaryResponse['displayCurrency']
  onSelectCategory?: (category: string) => void
  rows: FinanceCategoryMixRow[]
  setHoveredCategory: (category: string | null) => void
}>) {
  const radius: [number, number, number, number] =
    dataKey === 'inventoryCostValue' ? [999, 0, 0, 999] : [0, 999, 999, 0]

  return (
    <Bar dataKey={dataKey} maxBarSize={26} radius={radius} stackId="mix" onMouseLeave={() => setHoveredCategory(null)}>
      {rows.map((row) => (
        <Cell
          fill={fill ?? row.color}
          key={`${row.category}-${dataKey}`}
          onClick={() => onSelectCategory?.(row.category)}
          onMouseEnter={() => setHoveredCategory(row.category)}
        />
      ))}
      {labelCurrency ? (
        <LabelList
          content={(props) => renderSalesLabel({ ...props, displayCurrency: labelCurrency })}
          dataKey="inventorySalesValue"
          position="insideRight"
        />
      ) : null}
    </Bar>
  )
}

function FinanceCategoryStructureFocus({
  displayCurrency,
  focusedCategory,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  focusedCategory: FinanceCategoryMixRow | null
}>) {
  if (!focusedCategory) {
    return null
  }

  return (
    <div className="space-y-3 border-t border-dashed border-[var(--border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
      <FocusedMetric label="categoria em foco" tone="neutral" value={focusedCategory.category} />
      <FocusedMetric
        label="valor realizado"
        tone="success"
        value={formatCompactCurrency(focusedCategory.inventorySalesValue, displayCurrency)}
      />
      <FocusedMetric
        label="lucro potencial"
        tone="warning"
        value={formatCompactCurrency(focusedCategory.potentialProfit, displayCurrency)}
      />
      <FocusedMetric
        label="custo base"
        tone="neutral"
        value={formatCompactCurrency(focusedCategory.inventoryCostValue, displayCurrency)}
      />
      <FocusedMetric label="mix" tone="info" value={`${focusedCategory.share.toFixed(0)}% da venda`} />
      <FocusedMetric
        label="volume"
        tone="neutral"
        value={`${focusedCategory.units} un. · ${focusedCategory.products} produtos`}
      />
    </div>
  )
}

function FocusedMetric({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: keyof typeof FOCUS_TONE_COLORS
  value: string
}>) {
  return (
    <div className="border-b border-dashed border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-sm font-semibold" style={{ color: FOCUS_TONE_COLORS[tone] }}>
        {value}
      </p>
    </div>
  )
}

function getFocusedCategory(
  rows: FinanceCategoryMixRow[],
  hoveredCategory: string | null,
  activeCategory: string | null,
) {
  return (
    rows.find((row) => row.category === hoveredCategory) ??
    rows.find((row) => row.category === activeCategory) ??
    rows[0] ??
    null
  )
}

function renderSalesLabel({
  displayCurrency,
  ...props
}: Readonly<Record<string, unknown>> & {
  displayCurrency: FinanceSummaryResponse['displayCurrency']
}) {
  const height = props.height
  const value = props.value
  const width = props.width
  const x = props.x
  const y = props.y

  if (
    typeof value !== 'number' ||
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number'
  ) {
    return null
  }

  return (
    <text fill="var(--text-primary)" fontSize={11} textAnchor="end" x={x + width - 8} y={y + height / 2 + 4}>
      {formatCompactCurrency(value, displayCurrency)}
    </text>
  )
}
