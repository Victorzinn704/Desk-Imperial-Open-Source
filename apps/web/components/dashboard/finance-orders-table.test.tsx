import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { FinanceOrdersTable } from './finance-orders-table'

type RecentOrder = FinanceSummaryResponse['recentOrders'][number]

describe('FinanceOrdersTable', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let appendMock: ReturnType<typeof vi.fn<(...nodes: (string | Node)[]) => void>>
  let removeMock: ReturnType<typeof vi.fn<() => void>>
  let clickMock: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue('blob:finance-orders')
    revokeObjectURLMock = vi.fn()
    appendMock = vi.fn()
    removeMock = vi.fn()
    clickMock = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    })

    vi.spyOn(document.body, 'append').mockImplementation(appendMock)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickMock)
    vi.spyOn(Element.prototype, 'remove').mockImplementation(removeMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('sanitiza células perigosas ao exportar CSV', async () => {
    const orders = [
      {
        id: 'order-1',
        customerName: '=CMD()',
        channel: ' +Webhook',
        totalRevenue: 12345,
        totalProfit: 6789,
        totalItems: 2,
        status: 'COMPLETED',
        createdAt: '2026-04-10T12:34:56.000Z',
      },
    ] as RecentOrder[]

    const user = userEvent.setup()
    render(<FinanceOrdersTable displayCurrency="BRL" orders={orders} />)

    await user.click(screen.getByRole('button', { name: /exportar csv/i }))

    expect(createObjectURLMock).toHaveBeenCalledTimes(1)
    const blob = createObjectURLMock.mock.calls[0][0] as Blob
    const text = await blob.text()

    expect(blob.type).toBe('text/csv;charset=utf-8')
    expect(text).toContain('"Cliente","Canal","Receita","Lucro","Itens","Status","Data"')
    expect(text).toContain('"\'=CMD()"')
    expect(text).toContain('"\' +Webhook"')
    expect(text).toContain('"123.45"')
    expect(text).toContain('"67.89"')
    expect(text).toContain('"2"')
    expect(text).toContain('"COMPLETED"')
    expect(text.split('\r\n')).toHaveLength(2)

    expect(clickMock).toHaveBeenCalledTimes(1)
    expect(removeMock).toHaveBeenCalledTimes(1)
    expect(appendMock).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:finance-orders')
  })
})
