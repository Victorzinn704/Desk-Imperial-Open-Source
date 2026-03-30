import { describe, expect, it } from 'vitest'
import { calcSubtotal, calcTotal, type Comanda } from './pdv-types'

describe('pdv-types', () => {
  it('usa subtotal do backend quando a comanda compacta não traz itens', () => {
    expect(
      calcSubtotal({
        itens: [],
        subtotalBackend: 84.5,
      }),
    ).toBe(84.5)
  })

  it('calcula o total final a partir do subtotalBackend em comandas compactas', () => {
    const compactComanda: Comanda = {
      id: 'compact-1',
      status: 'aberta',
      mesa: '7',
      itens: [],
      desconto: 10,
      acrescimo: 5,
      abertaEm: new Date('2026-03-30T14:00:00.000Z'),
      subtotalBackend: 100,
      totalBackend: 94.5,
    }

    expect(calcTotal(compactComanda)).toBe(94.5)
  })
})
