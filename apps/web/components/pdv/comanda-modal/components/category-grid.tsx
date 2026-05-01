'use client'

import { memo } from 'react'
import { Beer, Coffee, Package, Pizza, Search, UtensilsCrossed, Wine } from 'lucide-react'

type CategoryGridProps = {
  categories: string[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  showAllOption?: boolean
}

function getCategoryIcon(cat: string) {
  const low = cat.toLowerCase()
  if (low.includes('alco') || low.includes('cerveja') || low.includes('chopp'))
    {return <Beer className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  if (low.includes('vinho'))
    {return <Wine className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  if (low.includes('bebida') || low.includes('suco') || low.includes('refr'))
    {return <Coffee className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  if (low.includes('combo') || low.includes('kit'))
    {return <Package className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  if (low.includes('pizza') || low.includes('lanche') || low.includes('burger'))
    {return <Pizza className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />}
  return <UtensilsCrossed className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
}

export const CategoryGrid = memo(function CategoryGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  showAllOption = true,
}: CategoryGridProps) {
  if (categories.length === 0) {return null}

  return (
    <>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
        {showAllOption ? (
          <button
            className={`group flex min-h-[76px] flex-col items-center justify-center rounded-[14px] border px-3 py-3 transition-all hover:-translate-y-0.5 ${
              selectedCategory === null
                ? 'border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => onSelectCategory(null)}
          >
            <Search
              className={`mb-1 size-5 opacity-80 transition-opacity group-hover:opacity-100 ${selectedCategory === null ? 'text-[var(--accent)]' : ''}`}
            />
            <span
              className={`text-[9px] uppercase font-bold tracking-wider ${selectedCategory === null ? 'text-[var(--accent)]' : ''}`}
            >
              Todos
            </span>
          </button>
        ) : null}

        {categories.map((cat) => {
          const isActive = selectedCategory === cat
          return (
            <button
              className={`group flex min-h-[76px] flex-col items-center justify-center rounded-[14px] border px-3 py-3 transition-all hover:-translate-y-0.5 ${
                isActive
                  ? 'border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
              key={cat}
              onClick={() => onSelectCategory(cat)}
            >
              {getCategoryIcon(cat)}
              <span className={`text-[9px] uppercase font-bold tracking-wider ${isActive ? 'text-[var(--accent)]' : ''}`}>
                {cat.length > 10 ? `${cat.substring(0, 10)}...` : cat}
              </span>
            </button>
          )
        })}
      </div>
      {selectedCategory ? (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
          Subitens de {selectedCategory}
        </p>
      ) : null}
    </>
  )
})
