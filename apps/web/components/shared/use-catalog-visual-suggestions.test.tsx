'use client'

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BarcodeCatalogLookupResponse, CatalogImageCandidate } from '@/lib/api'
import { useCatalogVisualSuggestions } from './use-catalog-visual-suggestions'

const { lookupBarcodeCatalogMock, searchCatalogImagesMock } = vi.hoisted(() => ({
  lookupBarcodeCatalogMock: vi.fn<(...args: never[]) => Promise<BarcodeCatalogLookupResponse>>(),
  searchCatalogImagesMock: vi.fn<(...args: never[]) => Promise<CatalogImageCandidate[]>>(),
}))

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual('@/lib/api')
  return {
    ...actual,
    lookupBarcodeCatalog: lookupBarcodeCatalogMock,
    searchCatalogImages: searchCatalogImagesMock,
  }
})

describe('useCatalogVisualSuggestions', () => {
  beforeEach(() => {
    lookupBarcodeCatalogMock.mockReset()
    searchCatalogImagesMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('prioriza imagem real do EAN quando o produto tem barcode', async () => {
    lookupBarcodeCatalogMock.mockResolvedValue({
      barcode: '7894900011517',
      name: 'Coca-Cola Lata',
      description: null,
      brand: 'Coca-Cola',
      category: 'Bebidas',
      quantityLabel: '350ml',
      measurementUnit: 'ML',
      measurementValue: 350,
      packagingClass: 'Lata 350ml',
      servingSize: null,
      imageUrl: 'https://images.openfoodfacts.org/images/products/789/490/001/1517/front_pt.3.200.jpg',
      source: 'open_food_facts',
    })
    searchCatalogImagesMock.mockResolvedValue([])

    const product = {
      id: 'product-1',
      name: 'Coca-Cola Lata',
      brand: 'Coca-Cola',
      barcode: '7894900011517',
      category: 'Bebidas',
      packagingClass: 'Lata 350ml',
      quantityLabel: '350ml',
      imageUrl: null,
      isCombo: false,
    }

    const { result } = renderHook(
      () =>
        useCatalogVisualSuggestions([product], {
          includePackagedBeverages: true,
          maxItems: 1,
          useBarcodeLookup: true,
        }),
      { wrapper: createQueryWrapper() },
    )

    await waitFor(() => {
      expect(result.current.decorateProduct(product).imageUrl).toContain('openfoodfacts.org')
    })

    expect(searchCatalogImagesMock).not.toHaveBeenCalled()
  })

  it('nao usa Pexels para bebida embalada quando o EAN nao retorna foto', async () => {
    lookupBarcodeCatalogMock.mockResolvedValue({
      barcode: '7891991000830',
      name: 'Guaraná Antarctica Lata',
      description: null,
      brand: 'Antarctica',
      category: 'Bebidas',
      quantityLabel: '350ml',
      measurementUnit: 'ML',
      measurementValue: 350,
      packagingClass: 'Lata 350ml',
      servingSize: null,
      imageUrl: null,
      source: 'open_food_facts',
    })
    searchCatalogImagesMock.mockResolvedValue([
      {
        id: 'pexels-1',
        alt: 'Guaraná em lata gelado',
        color: '#00aa55',
        imageUrl: 'https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg',
        photographer: 'Pexels Tester',
        photographerUrl: 'https://pexels.com/@tester',
        previewUrl: 'https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?h=200',
        sourceUrl: 'https://pexels.com/photo/123456',
      },
    ])

    const product = {
      id: 'product-2',
      name: 'Guaraná Antarctica Lata',
      brand: 'Antarctica',
      barcode: '7891991000830',
      category: 'Bebidas',
      packagingClass: 'Lata 350ml',
      quantityLabel: '350ml',
      imageUrl: null,
      isCombo: false,
    }

    const { result } = renderHook(
      () =>
        useCatalogVisualSuggestions([product], {
          maxItems: 1,
          useBarcodeLookup: true,
        }),
      { wrapper: createQueryWrapper() },
    )

    await waitFor(() => {
      expect(lookupBarcodeCatalogMock).toHaveBeenCalledTimes(1)
    })

    expect(result.current.decorateProduct(product).imageUrl).toBeNull()
    expect(searchCatalogImagesMock).not.toHaveBeenCalled()
  })
})

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}
