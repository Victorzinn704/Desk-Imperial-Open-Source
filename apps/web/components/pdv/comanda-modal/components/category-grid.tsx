'use client'

import { memo } from 'react'
import { Search, Coffee, Pizza, Beer, Package, UtensilsCrossed, Wine } from 'lucide-react'

type CategoryGridProps = {
  categories: string[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  showAllOption?: boolean
}

function getCategoryIcon(cat: string) {
  const low = cat.toLowerCase()
  if (low.includes('alco') || low.includes('cerveja') || low.includes('chopp'))
    return <Beer className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  if (low.includes('vinho'))
    return <Wine className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  if (low.includes('bebida') || low.includes('suco') || low.includes('refr'))
    return <Coffee className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  if (low.includes('combo') || low.includes('kit'))
    return <Package className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  if (low.includes('pizza') || low.includes('lanche') || low.includes('burger'))
    return <Pizza className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
  return <UtensilsCrossed className="size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity" />
}

export const CategoryGrid = memo(function CategoryGrid({
  categories,
  selectedCategory,
  onSelectCategory,
  showAllOption = true,
}: CategoryGridProps) {
  if (categories.length === 0) return null

  return (
    <>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
        {showAllOption ? (
          <button
            onClick={() => onSelectCategory(null)}
            className={`group flex min-h-[76px] flex-col items-center justify-center rounded-[14px] border px-3 py-3 transition-all hover:-translate-y-0.5 ${
              selectedCategory === null
                ? 'bg-[rgba(54,245,124,0.15)] border-[rgba(54,245,124,0.5)] text-[#36f57c] shadow-[0_4px_16px_rgba(54,245,124,0.15)]'
                : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)] text-[var(--text-soft)] hover:border-[rgba(255,255,255,0.2)] hover:text-white'
            }`}
          >
            <Search
              className={`size-5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity ${selectedCategory === null ? 'text-[#36f57c]' : ''}`}
            />
            <span
              className={`text-[9px] uppercase font-bold tracking-wider ${selectedCategory === null ? 'text-[#36f57c]' : ''}`}
            >
              Todos
            </span>
          </button>
        ) : null}

        {categories.map((cat) => {
          const isActive = selectedCategory === cat
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`group flex min-h-[76px] flex-col items-center justify-center rounded-[14px] border px-3 py-3 transition-all hover:-translate-y-0.5 ${
                isActive
                  ? 'bg-[rgba(54,245,124,0.15)] border-[rgba(54,245,124,0.5)] text-[#36f57c] shadow-[0_4px_16px_rgba(54,245,124,0.15)]'
                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)] text-[var(--text-soft)] hover:border-[rgba(255,255,255,0.2)] hover:text-white'
              }`}
            >
              {getCategoryIcon(cat)}
              <span className={`text-[9px] uppercase font-bold tracking-wider ${isActive ? 'text-[#36f57c]' : ''}`}>
                {cat.length > 10 ? cat.substring(0, 10) + '...' : cat}
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
