'use client'

import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { searchCatalogImages, type CatalogImageCandidate } from '@/lib/api'
import { buildProductImageSearchQuery } from '@/lib/product-image-search'

type ProductWithVisual = {
  id: string
  name: string
  brand?: string | null
  category?: string | null
  barcode?: string | null
  packagingClass?: string | null
  quantityLabel?: string | null
  imageUrl?: string | null
  catalogSource?: string | null
  isCombo?: boolean | null
}

type VisualSuggestion = {
  imageUrl: string
  catalogSource: 'pexels'
}

const DEFAULT_MAX_ITEMS = 12
const VISUAL_SUGGESTION_STALE_TIME = 86_400_000

export function useCatalogVisualSuggestions<TProduct extends ProductWithVisual>(
  products: readonly TProduct[],
  maxItems = DEFAULT_MAX_ITEMS,
) {
  const candidates = useMemo(() => {
    const uniqueQueries = new Set<string>()

    return products
      .filter((product) => !product.imageUrl)
      .map((product) => {
        const query = buildProductImageSearchQuery(product)
        if (!query || uniqueQueries.has(query)) {
          return null
        }

        uniqueQueries.add(query)
        return {
          productId: product.id,
          query,
        }
      })
      .filter((candidate): candidate is { productId: string; query: string } => candidate !== null)
      .slice(0, maxItems)
  }, [maxItems, products])

  const queries = useQueries({
    queries: candidates.map((candidate) => ({
      queryKey: ['catalog-image-suggestion', candidate.query],
      queryFn: async () => {
        const items = await searchCatalogImages(candidate.query, 1)
        return items[0] ?? null
      },
      staleTime: VISUAL_SUGGESTION_STALE_TIME,
      retry: false,
    })),
  })

  const suggestionsByProductId = useMemo(() => {
    const map = new Map<string, VisualSuggestion>()

    candidates.forEach((candidate, index) => {
      const result = queries[index]?.data as CatalogImageCandidate | null | undefined
      if (!result?.imageUrl) {
        return
      }

      map.set(candidate.productId, {
        imageUrl: result.imageUrl,
        catalogSource: 'pexels',
      })
    })

    return map
  }, [candidates, queries])

  return useMemo(
    () => ({
      decorateProduct(product: TProduct): TProduct {
        const suggestion = suggestionsByProductId.get(product.id)
        if (!suggestion || product.imageUrl) {
          return product
        }

        return {
          ...product,
          imageUrl: suggestion.imageUrl,
          catalogSource: product.catalogSource ?? suggestion.catalogSource,
        }
      },
      hasSuggestions: suggestionsByProductId.size > 0,
    }),
    [suggestionsByProductId],
  )
}
