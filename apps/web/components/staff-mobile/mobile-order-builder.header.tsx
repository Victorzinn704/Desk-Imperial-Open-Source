'use client'

import { Search } from 'lucide-react'
import { MobileOrderCategoryFilter } from './mobile-order-builder.category-filter'
import type { MobileOrderBuilderProps, MobileOrderSummaryItem } from './mobile-order-builder.types'

type MobileOrderBuilderHeaderProps = Readonly<{
  categories: string[]
  headerLabel?: string
  mesaLabel: string
  mode: MobileOrderBuilderProps['mode']
  onCancel: () => void
  onSearchChange: (value: string) => void
  onSecondaryAction?: () => void
  onSelectAll: () => void
  onSelectCategory: (category: string) => void
  search: string
  secondaryActionLabel?: string
  selectedCategory: string | null
  summaryItems?: MobileOrderBuilderProps['summaryItems']
}>

function getSubtitle(mode: MobileOrderBuilderProps['mode']) {
  if (mode === 'edit') {
    return 'Revise quantidades e salve a composição atual da comanda'
  }
  if (mode === 'add') {
    return 'Adicione itens sem perder o contexto da comanda em atendimento'
  }
  return 'Monte os itens e abra a comanda da mesa'
}

function getTitle(mode: MobileOrderBuilderProps['mode']) {
  if (mode === 'edit') {
    return 'Editar comanda'
  }
  if (mode === 'add') {
    return 'Retomar pedido'
  }
  return 'Nova comanda'
}

function SummaryStrip({ summaryItems }: Readonly<{ summaryItems?: MobileOrderSummaryItem[] }>) {
  if (!summaryItems || summaryItems.length === 0) {
    return null
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-[16px] bg-[var(--border)]">
      {summaryItems.map((item) => (
        <div className="bg-[var(--surface-muted)] px-3 py-3" key={item.label}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft,#7a8896)]">
            {item.label}
          </p>
          <p className="mt-1 text-base font-bold leading-tight" style={{ color: item.tone ?? 'var(--text-primary)' }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function HeaderActions({
  onCancel,
  onSecondaryAction,
  secondaryActionLabel,
}: Readonly<{
  onCancel: () => void
  onSecondaryAction?: () => void
  secondaryActionLabel?: string
}>) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {onSecondaryAction && secondaryActionLabel ? (
        <button
          className="min-h-[40px] rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.08)] px-3 py-2 text-xs font-semibold text-[var(--accent,#008cff)] transition active:opacity-80"
          type="button"
          onClick={onSecondaryAction}
        >
          {secondaryActionLabel}
        </button>
      ) : null}
      <button
        className="min-h-[44px] shrink-0 rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-soft,#7a8896)] transition-colors active:text-[var(--text-primary)]"
        type="button"
        onClick={onCancel}
      >
        Cancelar
      </button>
    </div>
  )
}

function SearchField({
  onSearchChange,
  search,
  selectedCategory,
}: Readonly<{
  onSearchChange: (value: string) => void
  search: string
  selectedCategory: string | null
}>) {
  return (
    <div className="relative mt-3">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-soft,#7a8896)]" />
      <input
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] py-3 pl-9 pr-4 text-base text-[var(--text-primary)] placeholder-[var(--text-soft,#7a8896)] outline-none focus:border-[rgba(0,140,255,0.45)]"
        placeholder={selectedCategory ? `Buscar em ${selectedCategory}...` : 'Buscar produto...'}
        type="text"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </div>
  )
}

function HeaderCopy({
  headerLabel,
  mesaLabel,
  mode,
}: Readonly<{
  headerLabel?: string
  mesaLabel: string
  mode: MobileOrderBuilderProps['mode']
}>) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent,#008cff)]">
        {headerLabel ?? `Mesa ${mesaLabel}`}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{getTitle(mode)}</h2>
      <p className="mt-1 text-sm text-[var(--text-soft,#7a8896)]">{getSubtitle(mode)}</p>
    </div>
  )
}

export function MobileOrderBuilderHeader({
  categories,
  headerLabel,
  mesaLabel,
  mode,
  onCancel,
  onSearchChange,
  onSecondaryAction,
  onSelectAll,
  onSelectCategory,
  search,
  secondaryActionLabel,
  selectedCategory,
  summaryItems,
}: MobileOrderBuilderHeaderProps) {
  return (
    <div className="border-b border-[var(--border)] px-3.5 py-3 sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <HeaderCopy headerLabel={headerLabel} mesaLabel={mesaLabel} mode={mode} />
        <HeaderActions
          secondaryActionLabel={secondaryActionLabel}
          onCancel={onCancel}
          onSecondaryAction={onSecondaryAction}
        />
      </div>
      <SummaryStrip summaryItems={summaryItems} />
      <SearchField search={search} selectedCategory={selectedCategory} onSearchChange={onSearchChange} />
      <MobileOrderCategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectAll={onSelectAll}
        onSelectCategory={onSelectCategory}
      />
    </div>
  )
}
