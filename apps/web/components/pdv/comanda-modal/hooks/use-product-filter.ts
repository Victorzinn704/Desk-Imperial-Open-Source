'use client'

import { useMemo, useState } from 'react'
import { normalizeTextForSearch } from '@/lib/normalize-text-for-search'
import type { SimpleProduct } from '../types'

export function useProductFilter(products: SimpleProduct[]) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const trimmedSearch = search.trim()

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base', numeric: true })),
    [products],
  )

  const filtered = useMemo(
    () => {
      const normalizedSearch = normalizeTextForSearch(search)

      return products.filter((p) => {
        const matchSearch =
          normalizedSearch.length === 0 ||
          normalizeTextForSearch(p.name).includes(normalizedSearch) ||
          normalizeTextForSearch(p.category).includes(normalizedSearch)
        const matchCat = selectedCategory ? p.category === selectedCategory : true
        return matchSearch && matchCat
      })
    },
    [products, search, selectedCategory],
  )

  return {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    categories,
    filtered,
    showProducts: selectedCategory !== null || trimmedSearch.length > 0 || categories.length === 0,
  }
}
