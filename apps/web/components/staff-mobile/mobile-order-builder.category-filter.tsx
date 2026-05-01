'use client'

import { Beer, Coffee, Package, Pizza, UtensilsCrossed, Wine } from 'lucide-react'
import { getCategoryIconKey } from './mobile-order-builder.helpers'

const CATEGORY_ICONS = {
  beer: Beer,
  combo: Package,
  drink: Coffee,
  food: UtensilsCrossed,
  pizza: Pizza,
  wine: Wine,
} as const

function CategoryFilterButton({
  category,
  isActive,
  onClick,
}: Readonly<{
  category: string
  isActive: boolean
  onClick: () => void
}>) {
  const Icon = CATEGORY_ICONS[getCategoryIconKey(category)]

  return (
    <button
      className="inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]"
      style={{
        background: isActive ? 'rgba(0,140,255,0.12)' : 'var(--surface-muted)',
        borderColor: isActive ? 'rgba(0,140,255,0.28)' : 'var(--border)',
        color: isActive ? 'var(--accent,#008cff)' : 'var(--text-primary)',
      }}
      type="button"
      onClick={onClick}
    >
      <Icon className="mb-1 size-5 opacity-80 transition-opacity group-hover:opacity-100" />
      <span>{category}</span>
    </button>
  )
}

export function MobileOrderCategoryFilter({
  categories,
  onSelectAll,
  onSelectCategory,
  selectedCategory,
}: Readonly<{
  categories: string[]
  onSelectAll: () => void
  onSelectCategory: (category: string) => void
  selectedCategory: string | null
}>) {
  if (categories.length === 0) {
    return null
  }

  return (
    <div className="-mx-1 mt-3 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2 px-1">
        <button
          className="min-h-[40px] rounded-full border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]"
          style={{
            background: selectedCategory === null ? 'rgba(0,140,255,0.12)' : 'var(--surface-muted)',
            borderColor: selectedCategory === null ? 'rgba(0,140,255,0.28)' : 'var(--border)',
            color: selectedCategory === null ? 'var(--accent,#008cff)' : 'var(--text-primary)',
          }}
          type="button"
          onClick={onSelectAll}
        >
          Todos
        </button>
        {categories.map((category) => (
          <CategoryFilterButton
            category={category}
            isActive={selectedCategory === category}
            key={category}
            onClick={() => onSelectCategory(category)}
          />
        ))}
      </div>
    </div>
  )
}
