import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KitchenOrdersView } from './kitchen-orders-view'

vi.mock('@/lib/api', () => ({
  updateKitchenItemStatus: vi.fn(),
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

describe('KitchenOrdersView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-21T18:30:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra a fila compartilhada com mesa, responsável e leitura curta de pressão', () => {
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <KitchenOrdersView
          currentEmployeeId="emp-1"
          data={{
            businessDate: '2026-04-21T00:00:00.000Z',
            companyOwnerId: 'owner-1',
            items: [
              {
                itemId: 'item-1',
                comandaId: 'com-1',
                mesaLabel: '7',
                employeeId: 'emp-1',
                employeeName: 'Marina',
                productName: 'Batata G',
                quantity: 1,
                notes: null,
                kitchenStatus: 'QUEUED',
                kitchenQueuedAt: '2026-04-21T18:20:00.000Z',
                kitchenReadyAt: null,
              },
              {
                itemId: 'item-2',
                comandaId: 'com-2',
                mesaLabel: '9',
                employeeId: 'emp-2',
                employeeName: 'Paulo',
                productName: 'Pastel',
                quantity: 2,
                notes: 'sem cebola',
                kitchenStatus: 'QUEUED',
                kitchenQueuedAt: '2026-04-21T18:24:00.000Z',
                kitchenReadyAt: null,
              },
              {
                itemId: 'item-3',
                comandaId: 'com-3',
                mesaLabel: '10',
                employeeId: 'emp-3',
                employeeName: 'Ana',
                productName: 'Suco',
                quantity: 1,
                notes: null,
                kitchenStatus: 'READY',
                kitchenQueuedAt: '2026-04-21T18:26:00.000Z',
                kitchenReadyAt: '2026-04-21T18:28:00.000Z',
              },
            ],
            statusCounts: {
              queued: 2,
              inPreparation: 0,
              ready: 1,
            },
          }}
          queryKey={['operations', 'kitchen']}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByText(/Fila compartilhada do salão/i)).toBeInTheDocument()
    expect(screen.getByText(/fila puxando/i)).toBeInTheDocument()
    expect(screen.getByText(/Próxima ação/i)).toBeInTheDocument()
    expect(screen.getByText(/Sua pressão/i)).toBeInTheDocument()
    expect(screen.getByText('Sua mesa')).toBeInTheDocument()
    expect(screen.getByText(/Responsável Paulo/i)).toBeInTheDocument()
    expect(screen.getAllByText(/10 min/i).length).toBeGreaterThan(0)
  })
})
