import { resolveProductQuantityLabel } from '../src/modules/products/products-catalog.util'

describe('resolveProductQuantityLabel', () => {
  it('normaliza valores decimais sem regex de backtracking', () => {
    expect(resolveProductQuantityLabel(null, 'L', 1.5)).toBe('1.5L')
    expect(resolveProductQuantityLabel(null, 'ML', 350)).toBe('350ml')
    expect(resolveProductQuantityLabel(null, 'KG', 2)).toBe('2kg')
  })
})
