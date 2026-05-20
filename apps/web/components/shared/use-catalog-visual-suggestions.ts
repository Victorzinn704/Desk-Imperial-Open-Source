'use client'

import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { type CatalogImageCandidate, lookupBarcodeCatalog, searchCatalogImages } from '@/lib/api'
import { buildProductImageSearchQueryWithOptions } from '@/lib/product-image-search'

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
  catalogSource: 'pexels' | 'open_food_facts' | 'national_beverage_catalog'
}

type UseCatalogVisualSuggestionsOptions = {
  includePackagedBeverages?: boolean
  maxItems?: number
  useBarcodeLookup?: boolean
}

const DEFAULT_MAX_ITEMS = 18
const VISUAL_SUGGESTION_STALE_TIME = 86_400_000

export function useCatalogVisualSuggestions<TProduct extends ProductWithVisual>(
  products: readonly TProduct[],
  options: UseCatalogVisualSuggestionsOptions = {},
) {
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS
  const candidates = useMemo(() => {
    const candidateMap = new Map<string, SuggestionCandidate>()

    for (const product of products.filter((entry) => !entry.imageUrl)) {
      const barcode = product.barcode?.trim() || null
      const query = buildProductImageSearchQueryWithOptions(product, {
        includePackagedBeverages: options.includePackagedBeverages,
      })
      const candidate = buildSuggestionCandidate({
        barcode,
        productId: product.id,
        query,
        useBarcodeLookup: options.useBarcodeLookup,
      })
      if (!candidate) {
        continue
      }

      const existingCandidate = candidateMap.get(candidate.key)
      if (existingCandidate) {
        existingCandidate.productIds.push(product.id)
        continue
      }

      candidateMap.set(candidate.key, {
        ...candidate,
        productIds: [product.id],
      })
    }

    return [...candidateMap.values()].slice(0, maxItems)
  }, [maxItems, options.includePackagedBeverages, options.useBarcodeLookup, products])

  const queries = useQueries({
    queries: candidates.map((candidate) => ({
      queryKey: ['catalog-image-suggestion', candidate.kind, candidate.key],
      queryFn: () => resolveCandidateVisual(candidate),
      staleTime: VISUAL_SUGGESTION_STALE_TIME,
      retry: false,
    })),
  })

  const suggestionsByProductId = useMemo(() => {
    const map = new Map<string, VisualSuggestion>()

    candidates.forEach((candidate, index) => {
      const result = queries[index]?.data as VisualSuggestion | null | undefined
      if (!result) {
        return
      }

      candidate.productIds.forEach((productId) => {
        map.set(productId, result)
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

type SuggestionCandidate = {
  key: string
  kind: 'barcode' | 'search'
  productIds: string[]
  barcode?: string
  query?: string
}

function buildSuggestionCandidate({
  barcode,
  productId,
  query,
  useBarcodeLookup,
}: Readonly<{
  barcode: string | null
  productId: string
  query: string | null
  useBarcodeLookup?: boolean
}>): SuggestionCandidate | null {
  if (useBarcodeLookup && barcode) {
    return {
      key: `barcode:${barcode}`,
      kind: 'barcode',
      productIds: [productId],
      barcode,
      query: query ?? undefined,
    }
  }

  if (!query) {
    return null
  }

  return {
    key: `query:${query}`,
    kind: 'search',
    productIds: [productId],
    query,
  }
}

async function resolveCandidateVisual(candidate: SuggestionCandidate): Promise<VisualSuggestion | null> {
  if (candidate.kind === 'barcode' && candidate.barcode) {
    const barcodeSuggestion = await resolveBarcodeVisual(candidate)
    if (barcodeSuggestion) {
      return barcodeSuggestion
    }
  }

  if (!candidate.query) {
    return null
  }

  return resolveSearchVisual(candidate.query)
}

async function resolveBarcodeVisual(candidate: SuggestionCandidate): Promise<VisualSuggestion | null> {
  try {
    const result = await lookupBarcodeCatalog(candidate.barcode!)
    if (!result.imageUrl) {
      return null
    }

    return {
      imageUrl: result.imageUrl,
      catalogSource: result.source,
    }
  } catch {
    return null
  }
}

async function resolveSearchVisual(query: string): Promise<VisualSuggestion | null> {
  try {
    const items = await searchCatalogImages(query, 1)
    const result = items[0] as CatalogImageCandidate | undefined
    if (!result?.imageUrl) {
      return null
    }

    return {
      imageUrl: result.imageUrl,
      catalogSource: 'pexels',
    }
  } catch {
    return null
  }
}
