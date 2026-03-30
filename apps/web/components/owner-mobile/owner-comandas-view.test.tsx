import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComandaRecord } from '@contracts/contracts'
import * as api from '@/lib/api'
import { OwnerComandasView } from './owner-comandas-view'

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

describe('OwnerComandasView', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  it('carrega o extrato detalhado ao expandir uma comanda compacta', async () => {
    const user = userEvent.setup()

    const detailsRecord: ComandaRecord = {
      id: 'c-1',
      companyOwnerId: 'owner-1',
      cashSessionId: 'cash-1',
      mesaId: 'mesa-4',
      currentEmployeeId: 'emp-1',
      tableLabel: '4',
      customerName: 'Mesa varanda',
      customerDocument: null,
      participantCount: 2,
      status: 'OPEN',
      subtotalAmount: 72,
      discountAmount: 7.2,
      serviceFeeAmount: 0,
      totalAmount: 64.8,
      notes: null,
      openedAt: '2026-03-30T13:00:00.000Z',
      closedAt: null,
      items: [
        {
          id: 'i-1',
          productId: 'p-1',
          productName: 'Risoto de camarão',
          quantity: 2,
          unitPrice: 36,
          totalAmount: 72,
          notes: 'Sem pimenta',
          kitchenStatus: 'READY',
          kitchenQueuedAt: '2026-03-30T13:02:00.000Z',
          kitchenReadyAt: '2026-03-30T13:15:00.000Z',
        },
      ],
    }

    vi.mocked(api.fetchComandaDetails).mockResolvedValue({ comanda: detailsRecord })

    render(
      <QueryClientProvider client={queryClient}>
        <OwnerComandasView
          comandas={[
            {
              id: 'c-1',
              status: 'aberta',
              mesa: '4',
              clienteNome: 'Mesa varanda',
              garcomNome: 'Marina',
              itens: [],
              desconto: 10,
              acrescimo: 0,
              abertaEm: new Date('2026-03-30T13:00:00.000Z'),
              subtotalBackend: 72,
              totalBackend: 64.8,
            },
          ]}
        />
      </QueryClientProvider>,
    )

    await user.click(screen.getByText('Mesa 4'))

    await waitFor(() => {
      expect(api.fetchComandaDetails).toHaveBeenCalledWith('c-1')
    })

    expect(await screen.findByText(/Risoto de camarão/i)).toBeInTheDocument()
    expect(screen.getByText(/Sem pimenta/i)).toBeInTheDocument()
    expect(screen.getByTestId('owner-comanda-items-c-1')).toBeInTheDocument()
    expect(screen.getAllByText(/64,80/)).toHaveLength(2)
  })
})
