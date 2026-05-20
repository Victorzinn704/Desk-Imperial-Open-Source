import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComandaRecord } from '@contracts/contracts'
import * as api from '@/lib/api'
import { MobileComandaList } from './mobile-comanda-list'

vi.mock('@/lib/api', () => ({
  fetchComandaDetails: vi.fn(),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

describe('MobileComandaList', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    queryClient = createTestQueryClient()
  })

  it('expõe a ação de fechamento com rótulo curto e valores atuais', async () => {
    const user = userEvent.setup()
    const onCloseComanda = vi.fn()

    const detailsRecord: ComandaRecord = {
      id: 'c-1',
      companyOwnerId: 'owner-1',
      cashSessionId: 'cash-1',
      mesaId: 'mesa-7',
      currentEmployeeId: 'emp-1',
      tableLabel: '7',
      customerName: 'Mesa lateral',
      customerDocument: null,
      participantCount: 2,
      status: 'OPEN',
      subtotalAmount: 50,
      discountAmount: 5,
      serviceFeeAmount: 2.5,
      totalAmount: 47.5,
      notes: null,
      openedAt: '2026-03-30T13:00:00.000Z',
      closedAt: null,
      items: [
        {
          id: 'i-1',
          productId: 'p-1',
          productName: 'Café',
          quantity: 1,
          unitPrice: 12.5,
          totalAmount: 12.5,
          notes: null,
          kitchenStatus: 'READY',
          kitchenQueuedAt: '2026-03-30T13:02:00.000Z',
          kitchenReadyAt: '2026-03-30T13:15:00.000Z',
        },
      ],
    }

    vi.mocked(api.fetchComandaDetails).mockResolvedValue({ comanda: detailsRecord })

    render(
      <QueryClientProvider client={queryClient}>
        <MobileComandaList
          comandas={[
            {
              id: 'c-1',
              status: 'aberta',
              mesa: '7',
              clienteNome: 'Mesa lateral',
              garcomNome: 'Paulo',
              itens: [],
              desconto: 10,
              acrescimo: 5,
              abertaEm: new Date('2026-03-30T13:00:00.000Z'),
              subtotalBackend: 50,
              totalBackend: 47.5,
            },
          ]}
          focusedId="c-1"
          onCloseComanda={onCloseComanda}
          onFocus={vi.fn()}
          onUpdateStatus={vi.fn()}
        />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(api.fetchComandaDetails).toHaveBeenCalledWith('c-1')
    })

    await user.click(screen.getByRole('button', { name: /^Fechar$/i }))

    expect(onCloseComanda).toHaveBeenCalledWith('c-1', 10, 5)
  })

  it('permite registrar pagamento parcial sem sair da comanda focada', async () => {
    const user = userEvent.setup()
    const onCreatePayment = vi.fn()

    const detailsRecord: ComandaRecord = {
      id: 'c-2',
      companyOwnerId: 'owner-1',
      cashSessionId: 'cash-1',
      mesaId: 'mesa-8',
      currentEmployeeId: 'emp-1',
      tableLabel: '8',
      customerName: 'Mesa oito',
      customerDocument: null,
      participantCount: 2,
      status: 'OPEN',
      subtotalAmount: 80,
      discountAmount: 0,
      serviceFeeAmount: 0,
      totalAmount: 80,
      paidAmount: 20,
      remainingAmount: 60,
      paymentStatus: 'PARTIAL',
      notes: null,
      openedAt: '2026-03-30T13:00:00.000Z',
      closedAt: null,
      items: [],
      payments: [
        {
          id: 'pay-1',
          amount: 20,
          method: 'PIX',
          status: 'CONFIRMED',
          paidAt: '2026-03-30T13:10:00.000Z',
          note: null,
        },
      ],
    }

    vi.mocked(api.fetchComandaDetails).mockResolvedValue({ comanda: detailsRecord })

    render(
      <QueryClientProvider client={queryClient}>
        <MobileComandaList
          comandas={[
            {
              id: 'c-2',
              status: 'aberta',
              mesa: '8',
              clienteNome: 'Mesa oito',
              garcomNome: 'Paulo',
              itens: [],
              desconto: 0,
              acrescimo: 0,
              abertaEm: new Date('2026-03-30T13:00:00.000Z'),
              paidAmount: 20,
              remainingAmount: 60,
              paymentStatus: 'PARTIAL',
              subtotalBackend: 80,
              totalBackend: 80,
            },
          ]}
          focusedId="c-2"
          onCreatePayment={onCreatePayment}
          onFocus={vi.fn()}
          onUpdateStatus={vi.fn()}
        />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(api.fetchComandaDetails).toHaveBeenCalledWith('c-2')
    })

    await user.click(screen.getByRole('button', { name: 'Meia' }))
    await user.click(screen.getByRole('button', { name: 'Parcial' }))

    expect(onCreatePayment).toHaveBeenCalledWith('c-2', 30, 'PIX')
  })
})
