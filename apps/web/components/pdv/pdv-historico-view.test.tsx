import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { buildPdvComandas } from './pdv-operations'
import { PdvHistoricoView } from './pdv-historico-view'
import { buildOperationsSnapshot } from '@/test/operations-fixtures'

describe('PdvHistoricoView', () => {
  const snapshot = buildOperationsSnapshot({
    employees: [
      {
        employeeId: 'emp-1',
        employeeCode: 'E01',
        displayName: 'Marina',
        comandas: [
          {
            id: 'c-1',
            status: 'CLOSED',
            tableLabel: '1',
            totalAmount: 60,
            openedAt: '2026-03-28T10:00:00.000Z',
            items: [{ id: 'i-1', productName: 'Café', quantity: 2, unitPrice: 15, kitchenStatus: 'READY' }],
          },
          {
            id: 'c-2',
            status: 'OPEN',
            tableLabel: '2',
            totalAmount: 100,
            openedAt: '2026-03-28T11:00:00.000Z',
            items: [{ id: 'i-2', productName: 'Salgado', quantity: 2, unitPrice: 25, kitchenStatus: 'QUEUED' }],
          },
        ],
      },
    ],
    unassigned: {
      comandas: [
        {
          id: 'c-3',
          status: 'CLOSED',
          tableLabel: 'BALCÃO',
          totalAmount: 20,
          openedAt: '2026-03-28T12:00:00.000Z',
          items: [{ id: 'i-3', productName: 'Agua', quantity: 1, unitPrice: 20, kitchenStatus: null }],
        },
      ],
    },
    mesas: [],
  })

  const comandas = buildPdvComandas(snapshot)

  it('ordena por mais recentes por padrão e alterna para maior valor', async () => {
    const user = userEvent.setup()
    render(<PdvHistoricoView comandas={comandas} />)

    await waitFor(() => {
      const cards = screen.getAllByRole('button').filter((button) => button.textContent?.includes('Mesa '))
      expect(cards[0]).toHaveTextContent('Mesa BALCÃO')
    })

    await user.selectOptions(screen.getByLabelText('Ordenar comandas'), 'maior_valor')

    await waitFor(() => {
      const cards = screen.getAllByRole('button').filter((button) => button.textContent?.includes('Mesa '))
      expect(cards[0]).toHaveTextContent('Mesa 2')
    })
  })

  it('filtra por responsável e busca por item', async () => {
    const user = userEvent.setup()
    render(<PdvHistoricoView comandas={comandas} />)

    await user.selectOptions(screen.getByLabelText('Filtrar por responsável'), 'Marina')

    await waitFor(() => {
      const cards = screen.getAllByRole('button').filter((button) => button.textContent?.includes('Mesa '))
      expect(cards).toHaveLength(2)
    })

    await user.type(screen.getByLabelText('Buscar comandas'), 'Salgado')

    await waitFor(() => {
      const cards = screen.getAllByRole('button').filter((button) => button.textContent?.includes('Mesa '))
      expect(cards).toHaveLength(1)
      expect(cards[0]).toHaveTextContent('Mesa 2')
    })
  })
})
