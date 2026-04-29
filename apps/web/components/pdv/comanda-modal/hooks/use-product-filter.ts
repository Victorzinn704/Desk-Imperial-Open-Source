'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { normalizeTextForSearch } from '@/lib/normalize-text-for-search'
import type { SimpleProduct } from '../types'

export function useProductFilter(products: SimpleProduct[]) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const trimmedSearch = search.trim()
  const deferredSearch = useDeferredValue(search)

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base', numeric: true })),
    [products],
  )

  const searchIndex = useMemo(
    () =>
      products.map((product) => ({
        category: product.category,
        normalizedCategory: normalizeTextForSearch(product.category),
        normalizedName: normalizeTextForSearch(product.name),
        product,
      })),
    [products],
  )

  const filtered = useMemo(() => {
    const normalizedSearch = normalizeTextForSearch(deferredSearch)

    return searchIndex
      .filter((entry) => {
        const matchSearch =
          normalizedSearch.length === 0 ||
          entry.normalizedName.includes(normalizedSearch) ||
          entry.normalizedCategory.includes(normalizedSearch)
        const matchCat = selectedCategory ? entry.category === selectedCategory : true
        return matchSearch && matchCat
      })
      .map((entry) => {
        return entry.product
      })
  }, [deferredSearch, searchIndex, selectedCategory])

  return {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    categories,
    filtered,
    showProducts:
      products.length > 0 || selectedCategory !== null || trimmedSearch.length > 0 || categories.length === 0,
  }
}
