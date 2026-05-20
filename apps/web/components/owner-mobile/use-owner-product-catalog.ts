import type { ProductRecord } from '@contracts/contracts'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchProducts } from '@/lib/api'

export function useOwnerProductCatalog() {
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data?.items])
  const recentProducts = useMemo(() => sortRecentProducts(products), [products])
  const totals = productsQuery.data?.totals
  const categoriesCount = totals?.categories.length ?? new Set(products.map((product) => product.category)).size
  const productsError = productsQuery.error instanceof Error ? productsQuery.error.message : null

  return {
    categoriesCount,
    lowStockCount: products.filter((product) => product.isLowStock).length,
    products,
    productsError,
    recentProducts,
    totals,
  }
}

function sortRecentProducts(products: ProductRecord[]) {
  return [...products]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 6)
}
