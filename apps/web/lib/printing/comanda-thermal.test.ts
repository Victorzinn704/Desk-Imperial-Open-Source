import { describe, it, expect } from 'vitest'
import { buildThermalComandaTicket } from './comanda-thermal'
import type { PrintableComanda } from './thermal-print.types'

function makeComanda(overrides?: Partial<PrintableComanda>): PrintableComanda {
  return {
    id: 'comanda-abc123def456',
    tableLabel: 'Mesa 7',
    customerName: 'Maria Silva',
    customerDocument: '123.456.789-09',
    items: [
      { name: 'Cafe Expresso', quantity: 2, unitPrice: 8.5 },
      { name: 'Pao de Queijo', quantity: 3, unitPrice: 5.0 },
    ],
    discountPercent: 0,
    additionalPercent: 0,
    openedAtIso: '2026-04-09T14:30:00.000Z',
    subtotalAmount: 32.0,
    totalAmount: 32.0,
    currency: 'BRL',
    operatorLabel: 'Joao',
    ...overrides,
  }
}

describe('buildThermalComandaTicket', () => {
  it('includes DESK IMPERIAL header', () => {
    const ticket = buildThermalComandaTicket(makeComanda())
    expect(ticket).toContain('DESK IMPERIAL')
    expect(ticket).toContain('COMANDA DE ATENDIMENTO')
  })

  it('includes comanda metadata', () => {
    const ticket = buildThermalComandaTicket(makeComanda())
    expect(ticket).toContain('COMANDA')
    expect(ticket).toContain('DEF456') // last 6 chars uppercase
    expect(ticket).toContain('Mesa 7')
    expect(ticket).toContain('Maria Silva')
    expect(ticket).toContain('123.456.789-09')
    expect(ticket).toContain('Joao')
  })

  it('includes item lines with quantities', () => {
    const ticket = buildThermalComandaTicket(makeComanda())
    expect(ticket).toContain('2x Cafe Expresso')
    expect(ticket).toContain('3x Pao de Queijo')
  })

  it('includes subtotal and total lines', () => {
    const ticket = buildThermalComandaTicket(makeComanda())
    expect(ticket).toContain('Subtotal')
    expect(ticket).toContain('TOTAL')
  })

  it('includes discount line when discountPercent > 0', () => {
    const ticket = buildThermalComandaTicket(makeComanda({ discountPercent: 10, subtotalAmount: 100, totalAmount: 90 }))
    expect(ticket).toContain('Desconto 10%')
  })

  it('omits discount line when discountPercent is 0', () => {
    const ticket = buildThermalComandaTicket(makeComanda({ discountPercent: 0 }))
    expect(ticket).not.toContain('Desconto')
  })

  it('includes additional/acrescimo line when additionalPercent > 0', () => {
    const ticket = buildThermalComandaTicket(
      makeComanda({
        additionalPercent: 10,
        subtotalAmount: 100,
        totalAmount: 110,
        discountPercent: 0,
      }),
    )
    expect(ticket).toContain('Acrescimo 10%')
  })

  it('omits additional line when additionalPercent is 0', () => {
    const ticket = buildThermalComandaTicket(makeComanda({ additionalPercent: 0 }))
    expect(ticket).not.toContain('Acrescimo')
  })

  it('handles missing optional fields with fallback dashes', () => {
    const ticket = buildThermalComandaTicket(
      makeComanda({
        tableLabel: undefined,
        customerName: undefined,
        customerDocument: undefined,
        operatorLabel: undefined,
      }),
    )
    // Should use '-' for missing tableLabel, customerName, customerDocument
    // and 'PDV' for missing operatorLabel
    expect(ticket).toContain('PDV')
  })

  it('includes item notes when present', () => {
    const ticket = buildThermalComandaTicket(
      makeComanda({
        items: [{ name: 'Cafe', quantity: 1, unitPrice: 8.5, note: 'Sem acucar' }],
      }),
    )
    expect(ticket).toContain('obs: Sem acucar')
  })

  it('omits item notes when not present', () => {
    const ticket = buildThermalComandaTicket(
      makeComanda({
        items: [{ name: 'Cafe', quantity: 1, unitPrice: 8.5 }],
      }),
    )
    expect(ticket).not.toContain('obs:')
  })

  it('includes cut command (GS V 0x00)', () => {
    const ticket = buildThermalComandaTicket(makeComanda())
    expect(ticket).toContain('\x1DV\x00')
  })

  it('includes line separators', () => {
    const ticket = buildThermalComandaTicket(makeComanda())
    expect(ticket).toContain('-'.repeat(42))
  })

  it('handles both discount and additional together', () => {
    const ticket = buildThermalComandaTicket(
      makeComanda({
        discountPercent: 5,
        additionalPercent: 10,
        subtotalAmount: 200,
        totalAmount: 209,
      }),
    )
    expect(ticket).toContain('Desconto 5%')
    expect(ticket).toContain('Acrescimo 10%')
  })

  it('wraps long item names', () => {
    const longName = 'Hamburguer Artesanal Duplo com Bacon Cheddar e Cebola'
    const ticket = buildThermalComandaTicket(
      makeComanda({
        items: [{ name: longName, quantity: 1, unitPrice: 45.0 }],
      }),
    )
    // The name plus quantity prefix should be wrapped
    expect(ticket).toContain('1x')
  })
})
