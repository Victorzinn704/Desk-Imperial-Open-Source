import { isKitchenCategory } from '../src/common/utils/is-kitchen-category.util'

describe('isKitchenCategory', () => {
  it.each(['Pizza', 'Refeição', 'Porção', 'Bolinho de bacalhau'])(
    'retorna true para categoria de preparo "%s"',
    (category) => {
      expect(isKitchenCategory(category)).toBe(true)
    },
  )

  it.each(['Cerveja', 'Água', 'Energético', 'Smoothie'])('retorna false para categoria de bebida "%s"', (category) => {
    expect(isKitchenCategory(category)).toBe(false)
  })

  it('mantem bebida com precedencia quando a categoria tambem contem termo de comida', () => {
    expect(isKitchenCategory('Bebida com comida')).toBe(false)
  })

  it('retorna false para categoria vazia ou desconhecida', () => {
    expect(isKitchenCategory('')).toBe(false)
    expect(isKitchenCategory('Acessorios')).toBe(false)
  })
})
