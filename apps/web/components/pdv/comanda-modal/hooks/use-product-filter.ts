'use client'

import { useMemo, useState } from 'react'
import type { SimpleProduct } from '../types'

export function useProductFilter(products: SimpleProduct[]) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const trimmedSearch = search.trim()

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category)))
        .filter(Boolean)
        .sort(),
    [products],
  )

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
        const matchCat = selectedCategory ? p.category === selectedCategory : true
        return matchSearch && matchCat
      }),
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
