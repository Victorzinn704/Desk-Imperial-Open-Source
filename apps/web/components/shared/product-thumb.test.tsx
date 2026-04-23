import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductThumb } from './product-thumb'

describe('ProductThumb', () => {
  it('renderiza foto do catálogo quando a imagem existe', () => {
    render(
      <ProductThumb
        product={{
          name: 'Guaraná Lata',
          category: 'Bebidas',
          imageUrl: 'https://images.openfoodfacts.org/images/products/789/490/001/1517/front.jpg',
          isCombo: false,
        }}
      />,
    )

    const image = screen.getByAltText('Foto de Guaraná Lata')
    expect(image).toBeInTheDocument()
    expect(image.closest('[data-product-visual-source="catalog"]')).toBeInTheDocument()
  })

  it('renderiza capa ilustrativa para combo sem foto', () => {
    render(
      <ProductThumb
        product={{
          name: 'Combo Pizza + Refri',
          category: 'Combos',
          imageUrl: null,
          isCombo: true,
        }}
      />,
    )

    const image = screen.getByAltText('Imagem ilustrativa de Combo Pizza + Refri')
    expect(image).toBeInTheDocument()
    expect(image.closest('[data-product-visual-source="combo-fallback"]')).toBeInTheDocument()
  })

  it('usa packshot nacional para bebida embalada sem foto valida', () => {
    render(
      <ProductThumb
        product={{
          name: 'Coca-Cola Lata',
          brand: 'Coca-Cola',
          category: 'Bebidas',
          packagingClass: 'Lata 350ml',
          quantityLabel: '350ml',
          imageUrl: null,
          isCombo: false,
        }}
      />,
    )

    const image = screen.getByAltText('Packshot de Coca-Cola Lata')
    expect(image).toBeInTheDocument()
    expect(image.closest('[data-product-visual-source="national-beverage-catalog"]')).toBeInTheDocument()
  })

  it('faz fallback para iniciais quando a imagem falha ao carregar', () => {
    render(
      <ProductThumb
        product={{
          name: 'Item Manual',
          category: 'Bebidas',
          imageUrl: 'https://images.example.invalid/quebrada.jpg',
          isCombo: false,
        }}
      />,
    )

    fireEvent.error(screen.getByAltText('Foto de Item Manual'))

    const initials = screen.getByText('IM')
    expect(initials).toBeInTheDocument()
    expect(initials.closest('[data-product-visual-source="initials"]')).toBeInTheDocument()
  })
})
