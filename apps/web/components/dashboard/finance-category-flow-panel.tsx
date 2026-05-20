'use client'

import { useMemo, useState } from 'react'
import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import { cn } from '@/lib/utils'
import { FinanceCategoryDetail } from './finance-category-flow-detail'
import { FinanceCategoryFlowList } from './finance-category-flow-list'
import type { FinanceCategoryFlowTab } from './finance-category-flow.shared'
import { FinanceCategoryTopProducts } from './finance-category-flow-top-products'

export type { FinanceCategoryFlowTab } from './finance-category-flow.shared'

type FinanceCategoryFlowPanelProps = Readonly<{
  className?: string
  finance: FinanceSummaryResponse
  onSelectedCategoryChange?: (category: string | null) => void
  onSelectedTabChange?: (tab: FinanceCategoryFlowTab) => void
  products?: ProductRecord[]
  selectedCategory?: string | null
  selectedTab?: FinanceCategoryFlowTab
  title?: string
}>

export function FinanceCategoryFlowPanel({
  className,
  finance,
  onSelectedCategoryChange,
  onSelectedTabChange,
  products = [],
  selectedCategory: selectedCategoryProp,
  selectedTab: selectedTabProp,
  title = 'Registro de fluxo por categoria',
}: FinanceCategoryFlowPanelProps) {
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const selection = useFinanceCategoryFlowSelection({
    onSelectedCategoryChange,
    onSelectedTabChange,
    selectedCategoryProp,
    selectedTabProp,
  })

  return (
    <section className={cn('rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4', className)}>
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{title}</h2>
      <FinanceCategoryFlowPanelBody finance={finance} productsById={productsById} selection={selection} />
    </section>
  )
}

function FinanceCategoryFlowPanelBody({
  finance,
  productsById,
  selection,
}: Readonly<{
  finance: FinanceSummaryResponse
  productsById: Map<string, ProductRecord>
  selection: ReturnType<typeof useFinanceCategoryFlowSelection>
}>) {
  const total = finance.categoryBreakdown.reduce((sum, category) => sum + category.inventorySalesValue, 0)
  const selectedIndex = finance.categoryBreakdown.findIndex(
    (category) => category.category === selection.selectedCategory,
  )
  const selected = selectedIndex >= 0 ? finance.categoryBreakdown[selectedIndex] : null

  if (selection.selectedCategory && selected) {
    return (
      <FinanceCategoryDetail
        activeTab={selection.selectedTab}
        category={selected}
        categoryProducts={finance.categoryTopProducts[selection.selectedCategory] ?? []}
        currency={finance.displayCurrency}
        productsById={productsById}
        selectedIndex={selectedIndex}
        total={total}
        onBack={() => selection.updateSelectedCategory(null)}
        onSetActiveTab={selection.updateSelectedTab}
      />
    )
  }

  return (
    <>
      <FinanceCategoryFlowList
        currency={finance.displayCurrency}
        rows={finance.categoryBreakdown}
        total={total}
        onSelectCategory={(category) => {
          selection.updateSelectedTab('products')
          selection.updateSelectedCategory(category)
        }}
      />
      <FinanceCategoryTopProducts finance={finance} productsById={productsById} />
    </>
  )
}

function useFinanceCategoryFlowSelection({
  onSelectedCategoryChange,
  onSelectedTabChange,
  selectedCategoryProp,
  selectedTabProp,
}: Readonly<{
  onSelectedCategoryChange?: (category: string | null) => void
  onSelectedTabChange?: (tab: FinanceCategoryFlowTab) => void
  selectedCategoryProp?: string | null
  selectedTabProp?: FinanceCategoryFlowTab
}>) {
  const [internalSelectedCategory, setInternalSelectedCategory] = useState<string | null>(null)
  const [internalSelectedTab, setInternalSelectedTab] = useState<FinanceCategoryFlowTab>('products')
  const selectedCategory = selectedCategoryProp ?? internalSelectedCategory
  const selectedTab = selectedTabProp ?? internalSelectedTab

  const updateSelectedCategory = (category: string | null) => {
    onSelectedCategoryChange?.(category)
    if (selectedCategoryProp === undefined) {
      setInternalSelectedCategory(category)
    }
  }
  const updateSelectedTab = (tab: FinanceCategoryFlowTab) => {
    onSelectedTabChange?.(tab)
    if (selectedTabProp === undefined) {
      setInternalSelectedTab(tab)
    }
  }

  return {
    selectedCategory,
    selectedTab,
    updateSelectedCategory,
    updateSelectedTab,
  }
}
