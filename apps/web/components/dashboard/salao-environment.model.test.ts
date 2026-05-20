import { describe, expect, it } from 'vitest'
import type { MesaRecord } from '@contracts/contracts'
import type { Mesa } from '@/components/pdv/pdv-types'
import { mergeLiveMesasWithRecords, toPdvMesaIntent } from './salao-environment.model'

describe('salao environment model', () => {
  it('preserva o id real da mesa quando o snapshot compacto traz apenas rotulo', () => {
    const liveMesas: Mesa[] = [
      {
        id: '2',
        numero: '2',
        capacidade: 4,
        status: 'livre',
      },
    ]

    const [mesa] = mergeLiveMesasWithRecords(liveMesas, [
      makeMesaRecord({
        id: 'mesa-real-2',
        label: '2',
        section: 'Salão',
      }),
    ])

    expect(toPdvMesaIntent(mesa)).toEqual({
      mesaId: 'mesa-real-2',
      mesaLabel: '2',
      comandaId: undefined,
    })
    expect(mesa.section).toBe('Salão')
  })

  it('inclui mesas ativas que ainda nao apareceram na operacao viva', () => {
    const mesas = mergeLiveMesasWithRecords(
      [],
      [
        makeMesaRecord({
          id: 'mesa-real-1',
          label: '1',
          status: 'reservada',
        }),
      ],
    )

    expect(mesas).toEqual([
      expect.objectContaining({
        id: 'mesa-real-1',
        numero: '1',
        status: 'reservada',
      }),
    ])
  })
})

function makeMesaRecord(overrides: Partial<MesaRecord>): MesaRecord {
  return {
    id: 'mesa-real-1',
    label: '1',
    capacity: 4,
    section: null,
    positionX: null,
    positionY: null,
    active: true,
    reservedUntil: null,
    status: 'livre',
    comandaId: null,
    currentEmployeeId: null,
    ...overrides,
  }
}
