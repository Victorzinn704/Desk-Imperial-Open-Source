/**
 * @file pdv-types.coverage.test.ts
 *
 * Additional coverage for pdv-types.ts utility functions.
 * Covers branches in calcSubtotal, calcTotal, and formatElapsed
 * that are not exercised by the existing pdv-types.test.ts.
 */

import { describe, expect, it } from 'vitest'
import { calcSubtotal, calcTotal, formatElapsed, type Comanda } from './pdv-types'

function makeComanda(overrides: Partial<Comanda> = {}): Comanda {
  return {
    id: 'test-1',
    status: 'aberta',
    mesa: '5',
    itens: [{ produtoId: 'p1', nome: 'Café', quantidade: 2, precoUnitario: 10 }],
    desconto: 0,
    acrescimo: 0,
    abertaEm: new Date('2026-04-01T10:00:00.000Z'),
    ...overrides,
  }
}

describe('calcSubtotal — branch coverage', () => {
  it('calcula subtotal a partir dos itens quando itens estao presentes', () => {
    expect(
      calcSubtotal({
        itens: [
          { produtoId: 'p1', nome: 'Café', quantidade: 2, precoUnitario: 10 },
          { produtoId: 'p2', nome: 'Pão', quantidade: 3, precoUnitario: 5 },
        ],
      }),
    ).toBe(35)
  })

  it('retorna 0 quando nao tem itens e nao tem subtotalBackend', () => {
    expect(calcSubtotal({ itens: [] })).toBe(0)
  })

  it('usa subtotalBackend quando itens resultam em bruto zero', () => {
    expect(
      calcSubtotal({
        itens: [{ produtoId: 'p1', nome: 'Item', quantidade: 0, precoUnitario: 10 }],
        subtotalBackend: 50,
      }),
    ).toBe(50)
  })

  it('ignora subtotalBackend quando subtotalBackend e zero ou negativo', () => {
    expect(
      calcSubtotal({
        itens: [],
        subtotalBackend: 0,
      }),
    ).toBe(0)

    expect(
      calcSubtotal({
        itens: [],
        subtotalBackend: -5,
      }),
    ).toBe(0)
  })

  it('trata quantidade e precoUnitario nao finitos como zero', () => {
    expect(
      calcSubtotal({
        itens: [
          { produtoId: 'p1', nome: 'Item NaN', quantidade: NaN, precoUnitario: 10 },
          { produtoId: 'p2', nome: 'Item Inf', quantidade: 2, precoUnitario: Infinity },
        ],
      }),
    ).toBe(0)
  })

  it('trata quantidades negativas como zero via Math.max', () => {
    expect(
      calcSubtotal({
        itens: [{ produtoId: 'p1', nome: 'Neg', quantidade: -2, precoUnitario: 10 }],
      }),
    ).toBe(0)
  })

  it('usa itens calculados quando bruto e positivo e subtotalBackend existe', () => {
    // When items give a positive subtotal, we use items even if subtotalBackend is set
    expect(
      calcSubtotal({
        itens: [{ produtoId: 'p1', nome: 'Café', quantidade: 2, precoUnitario: 10 }],
        subtotalBackend: 999,
      }),
    ).toBe(20)
  })
})

describe('calcTotal — branch coverage', () => {
  it('calcula total com desconto e acrescimo', () => {
    const comanda = makeComanda({
      itens: [{ produtoId: 'p1', nome: 'Café', quantidade: 1, precoUnitario: 100 }],
      desconto: 10,
      acrescimo: 5,
    })
    // bruto = 100, com desconto = 90, com acrescimo = 94.5
    expect(calcTotal(comanda)).toBe(94.5)
  })

  it('retorna total sem modificacoes quando desconto e acrescimo sao zero', () => {
    const comanda = makeComanda({
      itens: [{ produtoId: 'p1', nome: 'Café', quantidade: 2, precoUnitario: 15 }],
      desconto: 0,
      acrescimo: 0,
    })
    expect(calcTotal(comanda)).toBe(30)
  })

  it('usa totalBackend quando calculo resulta em zero ou negativo', () => {
    const comanda = makeComanda({
      itens: [],
      desconto: 100,
      acrescimo: 0,
      subtotalBackend: 0,
      totalBackend: 75,
    })
    expect(calcTotal(comanda)).toBe(75)
  })

  it('retorna zero quando total e zero e nao tem totalBackend', () => {
    const comanda = makeComanda({
      itens: [],
      desconto: 0,
      acrescimo: 0,
    })
    expect(calcTotal(comanda)).toBe(0)
  })

  it('retorna total calculado quando positivo mesmo com totalBackend definido', () => {
    const comanda = makeComanda({
      itens: [{ produtoId: 'p1', nome: 'Café', quantidade: 1, precoUnitario: 100 }],
      desconto: 0,
      acrescimo: 0,
      totalBackend: 999,
    })
    expect(calcTotal(comanda)).toBe(100)
  })

  it('trata desconto e acrescimo NaN como zero', () => {
    const comanda = makeComanda({
      itens: [{ produtoId: 'p1', nome: 'Café', quantidade: 1, precoUnitario: 50 }],
      desconto: NaN,
      acrescimo: NaN,
    })
    expect(calcTotal(comanda)).toBe(50)
  })

  it('usa totalBackend quando desconto 100% zera o total', () => {
    const comanda = makeComanda({
      itens: [{ produtoId: 'p1', nome: 'Café', quantidade: 1, precoUnitario: 50 }],
      desconto: 100,
      acrescimo: 0,
      totalBackend: 25,
    })
    expect(calcTotal(comanda)).toBe(25)
  })
})

describe('formatElapsed — branch coverage', () => {
  it('retorna "0min" para comanda aberta agora', () => {
    const now = new Date()
    expect(formatElapsed(now)).toBe('0min')
  })

  it('retorna minutos para comanda aberta ha menos de 1 hora', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60_000)
    expect(formatElapsed(thirtyMinAgo)).toBe('30min')
  })

  it('retorna horas e minutos para comanda aberta ha mais de 1 hora', () => {
    const ninetyMinAgo = new Date(Date.now() - 90 * 60_000)
    expect(formatElapsed(ninetyMinAgo)).toBe('1h 30min')
  })

  it('retorna apenas horas quando minutos restantes sao zero', () => {
    const twoHoursAgo = new Date(Date.now() - 120 * 60_000)
    expect(formatElapsed(twoHoursAgo)).toBe('2h')
  })

  it('retorna "59min" para comanda aberta ha 59 minutos', () => {
    const fiftyNineMinAgo = new Date(Date.now() - 59 * 60_000)
    expect(formatElapsed(fiftyNineMinAgo)).toBe('59min')
  })
})
