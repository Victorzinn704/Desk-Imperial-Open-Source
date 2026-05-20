import { describe, expect, it } from 'vitest'
import { buildComanda, buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'
import {
  buildPdvComandas,
  buildPdvGarcons,
  buildPdvMesas,
  toOperationAmounts,
  toOperationsStatus,
  toPdvComanda,
} from './pdv-operations'

describe('pdv-operations', () => {
  it('buildPdvComandas agrega grupos e ordena por abertura mais recente', () => {
    const snapshot = buildOperationsSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          displayName: 'Marina',
          comandas: [
            {
              id: 'c-older',
              tableLabel: '1',
              openedAt: '2026-03-30T10:00:00.000Z',
              status: 'OPEN',
            },
          ],
        },
      ],
      unassigned: {
        comandas: [
          {
            id: 'c-newer',
            tableLabel: '2',
            openedAt: '2026-03-30T11:00:00.000Z',
            status: 'OPEN',
          },
        ],
      },
    })

    const result = buildPdvComandas(snapshot)

    expect(result.map((comanda) => comanda.id)).toEqual(['c-newer', 'c-older'])
    expect(result.find((comanda) => comanda.id === 'c-older')?.garcomNome).toBe('Marina')
  })

  it('toPdvComanda usa fallback de preco por total/quantidade quando unitPrice e invalido', () => {
    const comanda = buildComanda({
      id: 'c-fallback',
      status: 'READY',
      items: [
        {
          id: 'item-1',
          productId: null,
          productName: 'Suco',
          quantity: 2,
          unitPrice: Number.NaN,
        },
      ],
    })
    const rawItem = comanda.items[0] as unknown as {
      totalAmount: number
      unitPrice: number | string
      productId: string | null
    }
    rawItem.totalAmount = 19.8
    rawItem.unitPrice = 'not-a-number'
    rawItem.productId = null

    const pdvComanda = toPdvComanda(comanda)

    expect(pdvComanda.status).toBe('pronta')
    expect(pdvComanda.itens[0]?.produtoId).toBe('manual-item-1')
    expect(pdvComanda.itens[0]?.precoUnitario).toBe(9.9)
  })

  it('buildPdvGarcons ignora funcionario sem employeeId', () => {
    const snapshot = buildOperationsSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          displayName: 'Marina',
          comandas: [],
        },
        {
          employeeId: null,
          displayName: 'Sem ID',
          comandas: [],
        },
      ],
    })

    const result = buildPdvGarcons(snapshot)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining({ id: 'emp-1', nome: 'Marina' }))
  })

  it('buildPdvMesas faz fallback pelas comandas abertas quando mesas ainda nao foram semeadas', () => {
    const snapshot = buildOperationsSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          displayName: 'Marina',
          comandas: [
            {
              id: 'c-open',
              tableLabel: '7',
              status: 'OPEN',
              currentEmployeeId: 'emp-1',
            },
          ],
        },
      ],
      mesas: [],
    })

    const result = buildPdvMesas(snapshot)
    const mesaSete = result.find((mesa) => mesa.numero === '7')

    expect(mesaSete).toEqual(
      expect.objectContaining({
        status: 'ocupada',
        comandaId: 'c-open',
        garcomNome: 'Marina',
      }),
    )
  })

  it('buildPdvMesas cruza label normalizada da mesa com comanda ativa', () => {
    const snapshot = buildOperationsSnapshot({
      employees: [
        {
          employeeId: 'emp-2',
          displayName: 'Rafa',
          comandas: [
            {
              id: 'c-10',
              tableLabel: '10',
              status: 'IN_PREPARATION',
              currentEmployeeId: 'emp-2',
            },
          ],
        },
      ],
      mesas: [
        buildMesaRecord({
          id: 'mesa-10',
          label: 'Mesa 10',
          status: 'livre',
          comandaId: null,
          currentEmployeeId: null,
          active: true,
        }),
        buildMesaRecord({
          id: 'mesa-inativa',
          label: 'Mesa 99',
          status: 'livre',
          active: false,
        }),
      ],
    })

    const result = buildPdvMesas(snapshot)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'mesa-10',
        status: 'ocupada',
        comandaId: 'c-10',
        garcomId: 'emp-2',
        garcomNome: 'Rafa',
      }),
    )
  })

  it('toOperationsStatus mapeia status do frontend para contrato da API', () => {
    expect(toOperationsStatus('aberta')).toBe('OPEN')
    expect(toOperationsStatus('em_preparo')).toBe('IN_PREPARATION')
    expect(toOperationsStatus('pronta')).toBe('READY')
  })

  it('toOperationAmounts converte percentuais em valores monetarios arredondados', () => {
    const result = toOperationAmounts({
      itens: [
        { produtoId: 'p1', nome: 'Café', quantidade: 2, precoUnitario: 10 },
        { produtoId: 'p2', nome: 'Pão', quantidade: 1, precoUnitario: 5.55 },
      ],
      desconto: 10,
      acrescimo: 7.5,
    })

    expect(result).toEqual({
      discountAmount: 2.56,
      serviceFeeAmount: 1.92,
    })
  })
})
