import { describe, expect, it, vi } from 'vitest'
import { buildKitchenSummary } from './cozinha-summary-panels'

describe('buildKitchenSummary', () => {
  it('resume fila, mesas ativas e tempo do item mais antigo', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-20T18:10:00.000Z'))

    const summary = buildKitchenSummary({
      businessDate: '2026-04-20T00:00:00.000Z',
      companyOwnerId: 'owner-1',
      statusCounts: {
        queued: 2,
        inPreparation: 1,
        ready: 1,
      },
      items: [
        {
          itemId: 'item-1',
          comandaId: 'com-1',
          mesaLabel: '7',
          employeeId: 'emp-1',
          employeeName: 'Carlos',
          productName: 'Batata G',
          quantity: 1,
          notes: null,
          kitchenStatus: 'QUEUED',
          kitchenQueuedAt: '2026-04-20T18:00:00.000Z',
          kitchenReadyAt: null,
        },
        {
          itemId: 'item-2',
          comandaId: 'com-2',
          mesaLabel: '9',
          employeeId: 'emp-2',
          employeeName: 'Ana',
          productName: 'Pastel',
          quantity: 2,
          notes: 'sem cebola',
          kitchenStatus: 'READY',
          kitchenQueuedAt: '2026-04-20T18:05:00.000Z',
          kitchenReadyAt: '2026-04-20T18:08:00.000Z',
        },
      ],
    })

    expect(summary.total).toBe(2)
    expect(summary.activeMesas).toBe(2)
    expect(summary.pressureTone).toBe('warning')
    expect(summary.hottestItem?.productName).toBe('Batata G')
    expect(summary.oldestQueuedLabel).toBe('10 min')

    vi.useRealTimers()
  })

  it('retorna leitura neutra quando nao ha fila', () => {
    const summary = buildKitchenSummary(undefined)

    expect(summary.total).toBe(0)
    expect(summary.activeMesas).toBe(0)
    expect(summary.pressureTone).toBe('neutral')
    expect(summary.hottestItem).toBeNull()
  })
})
