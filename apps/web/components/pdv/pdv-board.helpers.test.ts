import { describe, expect, it } from 'vitest'
import { buildOpenComandaPayload } from './pdv-board.helpers'
import type { SaveComandaPayload } from './comanda-modal'
import type { Mesa } from './pdv-types'

describe('pdv-board.helpers', () => {
  it('omite mesaId quando o snapshot so tem label como id para o backend resolver pela mesa', () => {
    const mesaPreSelected: Mesa = {
      id: '2',
      numero: '2',
      capacidade: 4,
      status: 'livre',
    }

    const payload = buildOpenComandaPayload({
      data: makeDraft({ mesa: '2' }),
      editingComanda: null,
      mesaPreSelected,
      mesas: [mesaPreSelected],
    })

    expect(payload).toEqual(expect.objectContaining({ tableLabel: '2' }))
    expect(payload.mesaId).toBeUndefined()
  })

  it('envia mesaId quando o cadastro de mesa tem id real', () => {
    const mesaPreSelected: Mesa = {
      id: 'mesa-real-2',
      numero: '2',
      capacidade: 4,
      status: 'livre',
    }

    const payload = buildOpenComandaPayload({
      data: makeDraft({ mesa: '2' }),
      editingComanda: null,
      mesaPreSelected,
      mesas: [mesaPreSelected],
    })

    expect(payload.mesaId).toBe('mesa-real-2')
  })

  it('normaliza payload parcial sem quebrar campos opcionais ausentes', () => {
    const mesaPreSelected: Mesa = {
      id: 'mesa-real-2',
      numero: 'Mesa 02',
      capacidade: 4,
      status: 'livre',
    }

    const payload = buildOpenComandaPayload({
      data: makeDraft({
        clienteDocumento: undefined as unknown as string,
        clienteNome: undefined as unknown as string,
        mesa: '2',
        notes: undefined as unknown as string,
      }),
      editingComanda: null,
      mesaPreSelected,
      mesas: [mesaPreSelected],
    })

    expect(payload).toEqual(
      expect.objectContaining({
        customerDocument: undefined,
        customerName: undefined,
        mesaId: 'mesa-real-2',
        notes: undefined,
        tableLabel: '2',
      }),
    )
  })
})

function makeDraft(overrides: Partial<SaveComandaPayload> = {}): SaveComandaPayload {
  return {
    acrescimo: 0,
    clienteDocumento: '',
    clienteNome: '',
    desconto: 0,
    itens: [{ nome: 'Coca-Cola Lata', precoUnitario: 5.5, produtoId: 'p-1', quantidade: 1 }],
    mesa: '1',
    notes: '',
    ...overrides,
  }
}
