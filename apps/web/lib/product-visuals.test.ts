import { describe, expect, it } from 'vitest'
import { resolveProductVisual } from './product-visuals'

describe('resolveProductVisual', () => {
  it('prioriza a imagem real do catálogo quando ela existe', () => {
    const visual = resolveProductVisual({
      name: 'Guaraná Lata',
      category: 'Bebidas',
      imageUrl: 'https://images.openfoodfacts.org/images/products/789/490/001/1517/front.jpg',
      isCombo: false,
    })

    expect(visual).toEqual({
      src: 'https://images.openfoodfacts.org/images/products/789/490/001/1517/front.jpg',
      alt: 'Foto de Guaraná Lata',
      source: 'catalog',
    })
  })

  it('usa fallback visual para combo quando ainda nao existe foto própria', () => {
    const visual = resolveProductVisual({
      name: 'Combo Burger da Casa',
      category: 'Combos',
      imageUrl: null,
      isCombo: true,
    })

    expect(visual?.source).toBe('combo-fallback')
    expect(visual?.alt).toBe('Imagem ilustrativa de Combo Burger da Casa')
    expect(visual?.src).toContain('images.unsplash.com')
  })

  it('usa fallback mais aderente para combo de petisco com cerveja', () => {
    const visual = resolveProductVisual({
      name: 'Combo Petisco Mais 2 Cervejas',
      category: 'Combos',
      imageUrl: null,
      isCombo: true,
    })

    expect(visual?.source).toBe('combo-fallback')
    expect(visual?.src).toContain('images.pexels.com')
  })

  it('usa packshot nacional para cerveja de marca sem foto real', () => {
    const visual = resolveProductVisual({
      name: 'Heineken 350ml',
      brand: 'Heineken',
      category: 'Cervejas',
      packagingClass: 'Lata 350ml',
      quantityLabel: '350ml',
      imageUrl: null,
      isCombo: false,
    })

    expect(visual?.source).toBe('national-beverage-catalog')
    expect(visual?.alt).toBe('Packshot de Heineken 350ml')
    expect(visual?.src).toContain('data:image/svg+xml')
  })

  it('mantem foto real acima do packshot nacional quando os dois existem', () => {
    const visual = resolveProductVisual({
      name: 'Coca-Cola Lata',
      brand: 'Coca-Cola',
      category: 'Outros',
      packagingClass: 'Lata 350ml',
      quantityLabel: '350ml',
      imageUrl: 'https://images.openfoodfacts.org/images/products/789/490/001/1326/front_pt.3.200.jpg',
      catalogSource: 'national_beverage_catalog',
      isCombo: false,
    })

    expect(visual).toEqual({
      src: 'https://images.openfoodfacts.org/images/products/789/490/001/1326/front_pt.3.200.jpg',
      alt: 'Foto de Coca-Cola Lata',
      source: 'catalog',
    })
  })

  it('usa foto de combo quando a categoria indica combo mesmo sem flag persistida', () => {
    const visual = resolveProductVisual({
      name: 'Balde Heineken',
      category: 'Combos',
      imageUrl: null,
      isCombo: false,
    })

    expect(visual?.source).toBe('combo-fallback')
    expect(visual?.src).toContain('images.pexels.com')
  })

  it('ignora url insegura e usa packshot local quando a bebida é reconhecida', () => {
    const visual = resolveProductVisual({
      name: 'Água Mineral 500ml',
      category: 'Bebidas',
      packagingClass: 'Garrafa 500ml',
      imageUrl: 'http://insecure.example/image.jpg',
      isCombo: false,
    })

    expect(visual?.source).toBe('national-beverage-catalog')
  })

  it('usa packshot local para Guaravita sem foto real', () => {
    const visual = resolveProductVisual({
      name: 'Guaravita',
      brand: 'Guaravita',
      category: 'Outros',
      packagingClass: 'carton',
      quantityLabel: '290ml',
      imageUrl: null,
      isCombo: false,
    })

    expect(visual?.source).toBe('national-beverage-catalog')
  })

  it('usa packshot local para Bohemia sem foto real', () => {
    const visual = resolveProductVisual({
      name: 'Bohemia 600ml',
      brand: 'Bohemia',
      category: 'Cervejas',
      packagingClass: 'Long neck 600ml',
      quantityLabel: '600ml',
      imageUrl: null,
      isCombo: false,
    })

    expect(visual?.source).toBe('national-beverage-catalog')
  })

  it('usa packshot local para cerveja generica sem foto real', () => {
    const visual = resolveProductVisual({
      name: 'Cerveja sem Alcool 350ml',
      category: 'Cervejas',
      packagingClass: 'Lata 350ml',
      quantityLabel: '350ml',
      imageUrl: null,
      isCombo: false,
    })

    expect(visual?.source).toBe('national-beverage-catalog')
  })
})
