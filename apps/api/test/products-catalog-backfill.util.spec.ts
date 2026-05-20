import { buildProductCatalogBackfillPatch } from '../src/modules/products/products-catalog-backfill.util'

describe('buildProductCatalogBackfillPatch', () => {
  it('preenche a base canônica quando os campos estão ausentes', () => {
    const result = buildProductCatalogBackfillPatch({
      name: 'Heineken 350ml',
      brand: null,
      measurementUnit: 'ML',
      measurementValue: 350,
      quantityLabel: null,
      imageUrl: null,
      catalogSource: null,
    })

    expect(result).toEqual({
      patch: {
        brand: 'Heineken',
        quantityLabel: '350ml',
        catalogSource: 'manual',
      },
      invalidImageDropped: false,
    })
  })

  it('não propõe patch quando o produto já está consistente', () => {
    const result = buildProductCatalogBackfillPatch({
      name: 'Coca-Cola Lata',
      brand: 'Coca-Cola',
      measurementUnit: 'ML',
      measurementValue: 350,
      quantityLabel: '350ml',
      imageUrl: 'https://static.example.com/coca-cola-350.png',
      catalogSource: 'open-food-facts',
    })

    expect(result).toEqual({
      patch: {},
      invalidImageDropped: false,
    })
  })

  it('remove imagem inválida legada e registra saneamento', () => {
    const result = buildProductCatalogBackfillPatch({
      name: 'Guaravita',
      brand: null,
      measurementUnit: 'ML',
      measurementValue: 290,
      quantityLabel: null,
      imageUrl: 'ftp://legacy.invalid/guaravita.png',
      catalogSource: '',
    })

    expect(result).toEqual({
      patch: {
        brand: 'Guaravita',
        quantityLabel: '290ml',
        catalogSource: 'manual',
        imageUrl: null,
      },
      invalidImageDropped: true,
    })
  })
})
