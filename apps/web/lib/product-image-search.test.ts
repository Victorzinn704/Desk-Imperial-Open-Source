import { describe, expect, it } from 'vitest'
import { buildProductImageSearchQuery, isPackagedBeverageLike } from './product-image-search'

describe('product-image-search', () => {
  it('nao busca Pexels para bebida embalada', () => {
    expect(
      buildProductImageSearchQuery({
        name: 'Heineken 350ml',
        brand: 'Heineken',
        category: 'Cervejas',
        packagingClass: 'Lata 350ml',
        quantityLabel: '350ml',
      }),
    ).toBeNull()
  })

  it('gera busca comercial para combo', () => {
    expect(
      buildProductImageSearchQuery({
        name: 'Combo Burger da Casa',
        category: 'Combos',
        isCombo: true,
      }),
    ).toBe('Combo Burger da Casa hamburguer combo restaurante')
  })

  it('nao trata combo com cerveja como bebida embalada', () => {
    expect(
      buildProductImageSearchQuery({
        name: 'Combo Petisco Mais 2 Cervejas',
        category: 'Combos',
        isCombo: true,
      }),
    ).toBe('beer appetizers bar table')
  })

  it('gera busca de comida para prato sem foto', () => {
    expect(
      buildProductImageSearchQuery({
        name: 'Batata Frita G',
        category: 'Porções',
      }),
    ).toBe('Batata Frita G comida restaurante')
  })

  it('reconhece água como bebida embalada', () => {
    expect(
      isPackagedBeverageLike({
        name: 'Água Mineral',
        category: 'Bebidas',
        packagingClass: 'Garrafa 500ml',
        quantityLabel: '500ml',
      }),
    ).toBe(true)
  })

  it('nao marca combo como bebida embalada mesmo com palavra cerveja', () => {
    expect(
      isPackagedBeverageLike({
        name: 'Combo Petisco Mais 2 Cervejas',
        category: 'Combos',
        isCombo: true,
      }),
    ).toBe(false)
  })
})
