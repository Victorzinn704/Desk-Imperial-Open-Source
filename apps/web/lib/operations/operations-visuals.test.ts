import { describe, expect, it } from 'vitest'
import type { OperationTimelineItem, OperationTimelineResource } from './operations-types'
import {
  buildTimelineTicks,
  buildTimelineWindow,
  formatLongDateTime,
  formatMoney,
  formatShortTime,
  getCashSessionTone,
  getComandaTone,
  getTimelinePlacement,
  groupItemsByResource,
} from './operations-visuals'

describe('operations visuals helpers', () => {
  it('formats money and date helpers', () => {
    expect(formatMoney(1234.56)).toContain('1.234')
    expect(formatShortTime('2026-04-03T08:15:00.000Z')).toMatch(/^\d{2}:\d{2}$/)
    expect(formatLongDateTime('2026-04-03T08:15:00.000Z')).toContain('03/04')
  })

  it('returns proper tones for cash session statuses', () => {
    expect(getCashSessionTone('open').label).toBe('Aberto')
    expect(getCashSessionTone('closing').label).toBe('Fechando')
    expect(getCashSessionTone('closed').label).toBe('Fechado')
  })

  it('returns proper tones for comanda statuses', () => {
    expect(getComandaTone('open').label).toBe('Aberta')
    expect(getComandaTone('in_preparation').label).toBe('Em preparo')
    expect(getComandaTone('ready').label).toBe('Pronta')
    expect(getComandaTone('closed').label).toBe('Fechada')
  })

  it('builds default timeline window when there are no items', () => {
    const window = buildTimelineWindow([])
    expect(window.durationMinutes).toBe(900)
    expect(window.start.getHours()).toBe(8)
    expect(window.end.getHours()).toBe(23)
  })

  it('builds timeline window with padding and computes clamped placement', () => {
    const items: OperationTimelineItem[] = [
      {
        id: 'a',
        resourceId: 'r-1',
        title: 'Mesa 1',
        start: '2026-04-03T10:00:00.000Z',
        end: '2026-04-03T11:00:00.000Z',
        status: 'open',
        tableLabel: '1',
        employeeName: 'Marina',
        amount: 30,
      },
    ]

    const window = buildTimelineWindow(items)
    expect(window.durationMinutes).toBeGreaterThan(120)

    const placement = getTimelinePlacement(
      {
        start: new Date('2026-04-03T10:00:00.000Z'),
        durationMinutes: 30,
      },
      {
        id: 'x',
        resourceId: 'r-1',
        title: 'Mesa 2',
        start: '2026-04-03T09:00:00.000Z',
        end: '2026-04-03T14:00:00.000Z',
        status: 'ready',
        tableLabel: '2',
        employeeName: 'Marina',
        amount: 50,
      } as OperationTimelineItem,
    )

    expect(placement.left).toBe(0)
    expect(placement.width).toBe(100)
  })

  it('builds timeline ticks and groups items by resource', () => {
    const ticks = buildTimelineTicks({
      start: new Date('2026-04-03T08:00:00.000Z'),
      durationMinutes: 180,
    })

    expect(ticks).toHaveLength(4)

    const grouped = groupItemsByResource(
      [
        { id: 'r-1', title: 'Marina', status: 'open' },
        { id: 'r-2', title: 'Joao', status: 'closed' },
      ] satisfies OperationTimelineResource[],
      [
        {
          id: 'i-1',
          resourceId: 'r-1',
          title: 'Mesa 1',
          start: '2026-04-03T10:00:00.000Z',
          end: '2026-04-03T10:30:00.000Z',
          status: 'open',
          tableLabel: '1',
          employeeName: 'Marina',
          amount: 10,
        },
      ] satisfies OperationTimelineItem[],
    )

    expect(grouped).toHaveLength(2)
    expect(grouped[0]?.items).toHaveLength(1)
    expect(grouped[1]?.items).toHaveLength(0)
  })
})
