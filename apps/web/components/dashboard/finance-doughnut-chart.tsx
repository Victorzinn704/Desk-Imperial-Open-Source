'use client'

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCompactCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { buildFinanceCategoryMixRows, type FinanceCategoryMixRow } from './finance-category-mix'

type Props = {
  activeCategory?: string | null
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  onSelectCategory?: (category: string) => void
  size?: 'md' | 'sm'
}

type FinanceDoughnutChartSizing = {
  chartSize: number
  innerClass: string
  innerRadius: number
  outerRadius: number
  sizeClass: string
}

export function FinanceDoughnutChart({
  activeCategory = null,
  categoryBreakdown,
  displayCurrency,
  onSelectCategory,
  size = 'md',
}: Props) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const rows = useMemo(
    () => buildFinanceCategoryMixRows(categoryBreakdown, categoryBreakdown.length),
    [categoryBreakdown],
  )
  const sizing = getFinanceDoughnutChartSizing(size)
  const totalValue = rows.reduce((sum, row) => sum + row.inventorySalesValue, 0)
  const activeRow = getActiveMixRow(rows, hoveredCategory, activeCategory)

  if (rows.length === 0) {
    return <FinanceDoughnutEmptyState sizeClass={sizing.sizeClass} />
  }

  return (
    <div className={`relative ${sizing.sizeClass} shrink-0`}>
      <FinanceDoughnutPie
        activeRow={activeRow}
        chartSize={sizing.chartSize}
        innerRadius={sizing.innerRadius}
        outerRadius={sizing.outerRadius}
        rows={rows}
        setHoveredCategory={setHoveredCategory}
        onSelectCategory={onSelectCategory}
      />
      <FinanceDoughnutCenter
        activeRow={activeRow}
        currency={displayCurrency}
        innerClass={sizing.innerClass}
        totalValue={totalValue}
      />
    </div>
  )
}

function FinanceDoughnutEmptyState({ sizeClass }: Readonly<{ sizeClass: string }>) {
  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]`}
    >
      <span className="text-xs text-[var(--text-soft)]">Sem dados</span>
    </div>
  )
}

function FinanceDoughnutPie({
  activeRow,
  chartSize,
  innerRadius,
  onSelectCategory,
  outerRadius,
  rows,
  setHoveredCategory,
}: Readonly<{
  activeRow: FinanceCategoryMixRow | null
  chartSize: number
  innerRadius: number
  onSelectCategory?: (category: string) => void
  outerRadius: number
  rows: FinanceCategoryMixRow[]
  setHoveredCategory: (category: string | null) => void
}>) {
  return (
    <PieChart height={chartSize} width={chartSize}>
      <Pie
        data={rows}
        dataKey="inventorySalesValue"
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        paddingAngle={2}
        stroke="transparent"
        onClick={(_, index) => handleFinanceDoughnutIndex(rows, index, onSelectCategory)}
        onMouseEnter={(_, index) => setHoveredCategory(rows[index]?.category ?? null)}
        onMouseLeave={() => setHoveredCategory(null)}
      >
        {rows.map((row) => (
          <Cell
            className={cn(onSelectCategory ? 'cursor-pointer' : undefined)}
            fill={row.color}
            key={row.category}
            stroke={activeRow?.category === row.category ? 'rgba(255,255,255,0.85)' : 'transparent'}
            strokeWidth={activeRow?.category === row.category ? 2 : 0}
          />
        ))}
      </Pie>
    </PieChart>
  )
}

function FinanceDoughnutCenter({
  activeRow,
  currency,
  innerClass,
  totalValue,
}: Readonly<{
  activeRow: FinanceCategoryMixRow | null
  currency: FinanceSummaryResponse['displayCurrency']
  innerClass: string
  totalValue: number
}>) {
  const centerCopy = buildFinanceDoughnutCenterCopy(activeRow, currency, totalValue)

  return (
    <div
      className={`pointer-events-none absolute ${innerClass} flex items-center justify-center rounded-full bg-[var(--surface-soft)] text-center`}
    >
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
          {centerCopy.label}
        </p>
        <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">{centerCopy.value}</p>
        <p className="mt-1 text-[10px] text-[var(--text-soft)]">{centerCopy.caption}</p>
      </div>
    </div>
  )
}

function getFinanceDoughnutChartSizing(size: Props['size']): FinanceDoughnutChartSizing {
  if (size === 'sm') {
    return {
      chartSize: 104,
      innerClass: 'inset-[16px] p-2',
      innerRadius: 28,
      outerRadius: 48,
      sizeClass: 'size-[104px]',
    }
  }

  return {
    chartSize: 120,
    innerClass: 'inset-[18px] p-3',
    innerRadius: 34,
    outerRadius: 56,
    sizeClass: 'size-[120px]',
  }
}

function getActiveMixRow(rows: FinanceCategoryMixRow[], hoveredCategory: string | null, activeCategory: string | null) {
  return (
    rows.find((row) => row.category === hoveredCategory) ?? rows.find((row) => row.category === activeCategory) ?? null
  )
}

function buildFinanceDoughnutCenterCopy(
  activeRow: FinanceCategoryMixRow | null,
  currency: FinanceSummaryResponse['displayCurrency'],
  totalValue: number,
) {
  if (!activeRow) {
    return {
      caption: 'toque para abrir',
      label: 'mix ativo',
      value: formatCompactCurrency(totalValue, currency),
    }
  }

  return {
    caption: `${activeRow.share.toFixed(0)}% da venda`,
    label: activeRow.category,
    value: formatCompactCurrency(activeRow.inventorySalesValue, currency),
  }
}

function handleFinanceDoughnutIndex(
  rows: FinanceCategoryMixRow[],
  index: number | undefined,
  onSelectCategory?: (category: string) => void,
) {
  const row = typeof index === 'number' ? rows[index] : null
  if (row) {
    onSelectCategory?.(row.category)
  }
}
