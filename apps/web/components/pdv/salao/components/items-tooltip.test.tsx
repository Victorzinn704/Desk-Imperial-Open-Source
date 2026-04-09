/**
 * @file items-tooltip.test.tsx
 *
 * Coverage for ItemsTooltip component.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ItemsTooltip } from './items-tooltip'
import type { Comanda } from '../../pdv-types'

function makeComanda(overrides: Partial<Comanda> = {}): Comanda {
  return {
    id: 'comanda-1',
    status: 'aberta',
    mesa: '1',
    itens: [],
    desconto: 0,
    acrescimo: 0,
    abertaEm: new Date(),
    ...overrides,
  }
}

describe('ItemsTooltip', () => {
  it('retorna null quando comanda nao tem itens', () => {
    const { container } = render(<ItemsTooltip comanda={makeComanda({ itens: [] })} />)
    expect(container.innerHTML).toBe('')
  })

  it('exibe ate 3 ultimos itens da comanda', () => {
    const comanda = makeComanda({
      itens: [
        { produtoId: 'p1', nome: 'Café', quantidade: 1, precoUnitario: 5 },
        { produtoId: 'p2', nome: 'Suco', quantidade: 2, precoUnitario: 8 },
        { produtoId: 'p3', nome: 'Pão', quantidade: 3, precoUnitario: 3 },
      ],
    })
    render(<ItemsTooltip comanda={comanda} />)

    expect(screen.getByText(/1× Café/)).toBeDefined()
    expect(screen.getByText(/2× Suco/)).toBeDefined()
    expect(screen.getByText(/3× Pão/)).toBeDefined()
  })

  it('mostra indicador de "+ N mais itens" quando tem mais de 3 itens', () => {
    const comanda = makeComanda({
      itens: [
        { produtoId: 'p1', nome: 'Café', quantidade: 1, precoUnitario: 5 },
        { produtoId: 'p2', nome: 'Suco', quantidade: 2, precoUnitario: 8 },
        { produtoId: 'p3', nome: 'Pão', quantidade: 3, precoUnitario: 3 },
        { produtoId: 'p4', nome: 'Bolo', quantidade: 1, precoUnitario: 12 },
        { produtoId: 'p5', nome: 'Agua', quantidade: 1, precoUnitario: 4 },
      ],
    })
    render(<ItemsTooltip comanda={comanda} />)

    // Should show last 3 items and "+2 mais itens"
    expect(screen.getByText(/\+2 mais itens/)).toBeDefined()
    // Should show only the last 3 items
    expect(screen.getByText(/3× Pão/)).toBeDefined()
    expect(screen.getByText(/1× Bolo/)).toBeDefined()
    expect(screen.getByText(/1× Agua/)).toBeDefined()
  })

  it('nao mostra indicador quando tem exatamente 3 itens', () => {
    const comanda = makeComanda({
      itens: [
        { produtoId: 'p1', nome: 'Café', quantidade: 1, precoUnitario: 5 },
        { produtoId: 'p2', nome: 'Suco', quantidade: 2, precoUnitario: 8 },
        { produtoId: 'p3', nome: 'Pão', quantidade: 3, precoUnitario: 3 },
      ],
    })
    render(<ItemsTooltip comanda={comanda} />)

    expect(screen.queryByText(/mais itens/)).toBeNull()
  })
})
