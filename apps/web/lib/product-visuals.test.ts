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

  it('usa packshot nacional para bebida embalada reconhecida sem foto valida', () => {
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
    expect(visual?.src.startsWith('data:image/svg+xml')).toBe(true)
  })

  it('prioriza packshot nacional quando a origem marcada e o produto e bebida embalada nacional', () => {
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

    expect(visual?.source).toBe('national-beverage-catalog')
    expect(visual?.src.startsWith('data:image/svg+xml')).toBe(true)
  })

  it('ignora url insegura e usa packshot nacional quando o produto embalado e reconhecido', () => {
    const visual = resolveProductVisual({
      name: 'Água',
      category: 'Bebidas',
      imageUrl: 'http://insecure.example/image.jpg',
      isCombo: false,
    })

    expect(visual?.source).toBe('national-beverage-catalog')
    expect(visual?.src.startsWith('data:image/svg+xml')).toBe(true)
  })

  it('reconhece Guaravita como bebida nacional embalada', () => {
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
    expect(visual?.src.startsWith('data:image/svg+xml')).toBe(true)
  })
})
