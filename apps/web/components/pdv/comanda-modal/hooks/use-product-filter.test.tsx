import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SimpleProduct } from '../types'
import { useProductFilter } from './use-product-filter'

describe('useProductFilter', () => {
  const products: SimpleProduct[] = [
    { id: '1', name: 'Água com gás', category: 'Água', unitPrice: 7, currency: 'BRL', stock: 10, isLowStock: false },
    {
      id: '2',
      name: 'Cerveja Pilsen',
      category: 'Bebidas',
      unitPrice: 12,
      currency: 'BRL',
      stock: 10,
      isLowStock: false,
    },
    { id: '3', name: 'Zabaione', category: 'Zebra', unitPrice: 9, currency: 'BRL', stock: 10, isLowStock: false },
  ]

  it('sorts categories with pt-BR locale semantics', () => {
    const { result } = renderHook(() => useProductFilter(products))

    expect(result.current.categories).toEqual(['Água', 'Bebidas', 'Zebra'])
  })

  it('filters products by selected category and search', () => {
    const { result } = renderHook(() => useProductFilter(products))

    act(() => {
      result.current.setSelectedCategory('Bebidas')
    })

    expect(result.current.filtered.map((product) => product.name)).toEqual(['Cerveja Pilsen'])

    act(() => {
      result.current.setSearch('agua')
      result.current.setSelectedCategory(null)
    })

    expect(result.current.filtered.map((product) => product.name)).toEqual(['Água com gás'])
  })
})
