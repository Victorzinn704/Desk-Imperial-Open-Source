'use client'

import { memo, type ReactNode } from 'react'
import { Beer, Coffee, Package, Pizza, Search, UtensilsCrossed, Wine } from 'lucide-react'

type CategoryGridProps = {
  categories: string[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  showAllOption?: boolean
}

function getCategoryIcon(cat: string) {
  const low = cat.toLowerCase()
  if (low.includes('alco') || low.includes('cerveja') || low.includes('chopp')) {
    return <Beer className="size-4 opacity-80 transition-opacity group-hover:opacity-100" />
  }
  if (low.includes('vinho')) {
    return <Wine className="size-4 opacity-80 transition-opacity group-hover:opacity-100" />
  }
  if (low.includes('bebida') || low.includes('suco') || low.includes('refr')) {
    return <Coffee className="size-4 opacity-80 transition-opacity group-hover:opacity-100" />
  }
  if (low.includes('combo') || low.includes('kit')) {
    return <Package className="size-4 opacity-80 transition-opacity group-hover:opacity-100" />
  }
  if (low.includes('pizza') || low.includes('lanche') || low.includes('burger')) {
    return <Pizza className="size-4 opacity-80 transition-opacity group-hover:opacity-100" />
  }
  return <UtensilsCrossed className="size-4 opacity-80 transition-opacity group-hover:opacity-100" />
}

export const CategoryGrid = memo(function CategoryGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  showAllOption = true,
}: CategoryGridProps) {
  if (categories.length === 0) {
    return null
  }

  const showSelectedCategory = Boolean(selectedCategory)

  return (
    <>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {showAllOption ? (
          <AllCategoryButton active={selectedCategory === null} onSelect={() => onSelectCategory(null)} />
        ) : null}

        {categories.map((cat) => (
          <CategoryButton
            active={selectedCategory === cat}
            category={cat}
            key={cat}
            onSelect={() => onSelectCategory(cat)}
          />
        ))}
      </div>
      {showSelectedCategory ? (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
          Subitens de {selectedCategory}
        </p>
      ) : null}
    </>
  )
})

function AllCategoryButton({ active, onSelect }: Readonly<{ active: boolean; onSelect: () => void }>) {
  return (
    <CategoryShell active={active} onSelect={onSelect}>
      <Search
        className={`size-4 opacity-80 transition-opacity group-hover:opacity-100 ${active ? 'text-[var(--accent)]' : ''}`}
      />
      <CategoryLabel active={active} value="Todos" />
    </CategoryShell>
  )
}

function CategoryButton({
  active,
  category,
  onSelect,
}: Readonly<{
  active: boolean
  category: string
  onSelect: () => void
}>) {
  return (
    <CategoryShell active={active} onSelect={onSelect}>
      {getCategoryIcon(category)}
      <CategoryLabel active={active} value={shortenCategory(category)} />
    </CategoryShell>
  )
}

function CategoryShell({
  active,
  children,
  onSelect,
}: Readonly<{
  active: boolean
  children: ReactNode
  onSelect: () => void
}>) {
  const stateClassName = active
    ? 'border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent)]'
    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'

  return (
    <button
      className={`group flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 py-2 transition-all ${stateClassName}`}
      type="button"
      onClick={onSelect}
    >
      {children}
    </button>
  )
}

function CategoryLabel({ active, value }: Readonly<{ active: boolean; value: string }>) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${active ? 'text-[var(--accent)]' : ''}`}>
      {value}
    </span>
  )
}

function shortenCategory(category: string) {
  return category.length > 18 ? `${category.substring(0, 18)}...` : category
}
