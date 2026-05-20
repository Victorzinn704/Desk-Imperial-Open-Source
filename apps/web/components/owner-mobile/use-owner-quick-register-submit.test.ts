import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildOwnerProductPayload } from './use-owner-quick-register-submit'

vi.mock('@/lib/api', () => ({
  searchCatalogImages: vi.fn(),
}))

describe('buildOwnerProductPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mantem imagem do EAN quando ela já existe', async () => {
    const api = await import('@/lib/api')

    const payload = await buildOwnerProductPayload(
      {
        name: 'Brahma Lata',
        brand: 'Brahma',
        category: 'Cervejas',
        packagingClass: 'Cadastro rápido móvel',
        measurementUnit: 'UN',
        measurementValue: 1,
        unitsPerPackage: 1,
        quantityLabel: '',
        servingSize: '',
        unitCost: 0,
        unitPrice: 7.5,
        currency: 'BRL',
        stock: 24,
        description: '',
        requiresKitchen: false,
        lowStockThreshold: null,
      },
      '7891234567890',
      true,
      {
        barcode: '7891234567890',
        name: 'Brahma Lata',
        description: 'Cerveja lager',
        brand: 'Brahma',
        category: 'Cervejas',
        quantityLabel: '350ml',
        measurementUnit: 'ML',
        measurementValue: 350,
        packagingClass: 'Lata 350ml',
        servingSize: '269ml',
        imageUrl: 'https://images.example/brahma.jpg',
        source: 'open_food_facts',
      },
    )

    expect(payload.imageUrl).toBe('https://images.example/brahma.jpg')
    expect(payload.catalogSource).toBe('open_food_facts')
    expect(vi.mocked(api.searchCatalogImages)).not.toHaveBeenCalled()
  })

  it('busca imagem no Pexels para item sem foto de catálogo quando for comida/combo', async () => {
    const api = await import('@/lib/api')
    vi.mocked(api.searchCatalogImages).mockResolvedValue([
      {
        id: 'pexels-1',
        alt: 'Combo burger',
        photographer: 'Pexels',
        photographerUrl: 'https://pexels.test/photographer',
        previewUrl: 'https://images.pexels.com/photos/1/preview.jpeg',
        imageUrl: 'https://images.pexels.com/photos/1/large.jpeg',
        color: '#111111',
        sourceUrl: 'https://pexels.test/photo/1',
      },
    ])

    const payload = await buildOwnerProductPayload(
      {
        name: 'Batata Frita G',
        brand: '',
        category: 'Porções',
        packagingClass: 'Cadastro rápido móvel',
        measurementUnit: 'UN',
        measurementValue: 1,
        unitsPerPackage: 1,
        quantityLabel: '',
        servingSize: '',
        unitCost: 0,
        unitPrice: 18,
        currency: 'BRL',
        stock: 10,
        description: '',
        requiresKitchen: false,
        lowStockThreshold: null,
      },
      '',
      false,
      null,
    )

    expect(api.searchCatalogImages).toHaveBeenCalledWith('Batata Frita G comida restaurante', 1)
    expect(payload.imageUrl).toBe('https://images.pexels.com/photos/1/large.jpeg')
    expect(payload.catalogSource).toBe('pexels')
  })
})
