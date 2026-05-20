import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Mesa } from '@/components/pdv/pdv-types'
import { MobileTableGrid } from './mobile-table-grid'

describe('MobileTableGrid', () => {
  it('mostra o mapa compartilhado do salão com resumo e responsável principal', () => {
    const mesas: Mesa[] = [
      {
        id: 'mesa-1',
        numero: '1',
        capacidade: 4,
        status: 'ocupada',
        comandaId: 'cmd-1',
        garcomId: 'emp-1',
        garcomNome: 'Marina',
      },
      {
        id: 'mesa-2',
        numero: '2',
        capacidade: 4,
        status: 'ocupada',
        comandaId: 'cmd-2',
        garcomId: 'emp-2',
        garcomNome: 'Paulo',
      },
      {
        id: 'mesa-3',
        numero: '3',
        capacidade: 6,
        status: 'livre',
      },
      {
        id: 'mesa-4',
        numero: '4',
        capacidade: 2,
        status: 'reservada',
      },
    ]

    render(<MobileTableGrid currentEmployeeId="emp-1" mesas={mesas} onSelectMesa={vi.fn()} />)

    expect(screen.getByText(/Mapa compartilhado do salão/i)).toBeInTheDocument()
    expect(screen.getByTestId('mesa-summary-livres')).toHaveTextContent('1')
    expect(screen.getByTestId('mesa-summary-reservadas')).toHaveTextContent('1')
    expect(screen.getByTestId('mesa-summary-suas')).toHaveTextContent('1')
    expect(screen.getByText('Sua mesa')).toBeInTheDocument()
    expect(screen.getByText(/Responsável Paulo/i)).toBeInTheDocument()
    expect(screen.getByText(/Abrir comanda/i)).toBeInTheDocument()
  })
})
