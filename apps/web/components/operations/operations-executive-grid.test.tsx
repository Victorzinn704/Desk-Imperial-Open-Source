import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OperationsExecutiveGrid } from './operations-executive-grid'
import type { OperationGridRow } from '@/lib/operations/operations-types'

vi.mock('@/components/shared/lazy-components', () => ({
  LazyAgGrid: ({
    rowData = [],
    onRowClicked,
  }: {
    rowData?: Array<Record<string, unknown>>
    onRowClicked?: (event: { data?: Record<string, unknown> }) => void
  }) => (
    <div data-testid="mock-ag-grid">
      {rowData.map((row) => {
        const label = String(row.employeeName ?? row.tableLabel ?? row.reason ?? row.id ?? 'linha')
        const key = String(row.employeeId ?? row.tableLabel ?? row.id ?? label)
        return (
          <button key={key} onClick={() => onRowClicked?.({ data: row })} type="button">
            {label}
          </button>
        )
      })}
    </div>
  ),
}))

function makeRow(overrides: Partial<OperationGridRow> = {}): OperationGridRow {
  return {
    employee: {
      employeeId: 'emp-1',
      employeeCode: 'E01',
      employeeName: 'Pedro Alves',
      role: 'STAFF',
      activeTables: ['01', '02'],
      closedTablesToday: ['08'],
      openOrdersCount: 2,
      closedOrdersCount: 1,
      cashSessionStatus: 'open',
      cashOpeningAmount: 150,
      cashCurrentAmount: 310,
      cashExpectedAmount: 320,
      cashCountedAmount: 310,
      cashDifferenceAmount: -10,
      salesRevenue: 980,
      salesProfit: 360,
    },
    tables: [
      {
        tableLabel: '01',
        comandaId: 'comanda-1',
        employeeId: 'emp-1',
        employeeName: 'Pedro Alves',
        status: 'open',
        openedAt: '2026-04-03T12:00:00.000Z',
        updatedAt: '2026-04-03T12:20:00.000Z',
        subtotal: 70,
        discountAmount: 0,
        totalAmount: 70,
        itemsCount: 3,
        notes: 'Mesa perto da janela',
      },
      {
        tableLabel: '02',
        comandaId: 'comanda-2',
        employeeId: 'emp-1',
        employeeName: 'Pedro Alves',
        status: 'ready',
        openedAt: '2026-04-03T11:30:00.000Z',
        updatedAt: '2026-04-03T12:30:00.000Z',
        subtotal: 90,
        discountAmount: 5,
        totalAmount: 85,
        itemsCount: 4,
        notes: null,
      },
    ],
    movements: [
      {
        id: 'mov-1',
        employeeId: 'emp-1',
        type: 'supply',
        amount: 80,
        reason: 'Reposição do troco',
        createdAt: '2026-04-03T12:40:00.000Z',
      },
      {
        id: 'mov-2',
        employeeId: 'emp-1',
        type: 'withdrawal',
        amount: 20,
        reason: 'Sangria parcial',
        createdAt: '2026-04-03T12:50:00.000Z',
      },
    ],
    ...overrides,
  }
}

describe('OperationsExecutiveGrid', () => {
  it('mostra estados vazios quando ainda não existe colaborador selecionado', () => {
    render(<OperationsExecutiveGrid rows={[]} />)

    expect(screen.getByText(/nenhum funcionário conectado ainda/i)).toBeInTheDocument()
    expect(screen.getByText(/o grid executivo já está importado com ag grid/i)).toBeInTheDocument()
  })

  it('mostra estados vazios dos painéis quando o colaborador ainda não movimentou o turno', () => {
    render(
      <OperationsExecutiveGrid
        rows={[
          makeRow({
            tables: [],
            movements: [],
          }),
        ]}
      />,
    )

    expect(screen.getByText(/nenhuma mesa ativa neste turno/i)).toBeInTheDocument()
    expect(screen.getByText(/sem movimentos lançados/i)).toBeInTheDocument()
    expect(screen.getByText(/nada novo para mostrar/i)).toBeInTheDocument()
  })

  it('renderiza a leitura viva do colaborador selecionado com mesas e registros', () => {
    render(<OperationsExecutiveGrid rows={[makeRow()]} />)

    expect(screen.getByText(/visão executiva por colaborador/i)).toBeInTheDocument()
    const focusPanel = screen.getByText(/colaborador em foco/i).closest('aside')
    expect(focusPanel).not.toBeNull()
    expect(within(focusPanel!).getByText('Pedro Alves')).toBeInTheDocument()
    expect(screen.getAllByText(/mesa 01/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/reposição do troco/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/últimos registros/i)).toBeInTheDocument()
  })

  it('troca o foco quando outro colaborador é clicado no grid', async () => {
    const user = userEvent.setup()
    const rows = [
      makeRow(),
      makeRow({
        employee: {
          employeeId: 'emp-2',
          employeeCode: 'E02',
          employeeName: 'Marina Rocha',
          role: 'MANAGER',
          activeTables: ['10'],
          closedTablesToday: [],
          openOrdersCount: 1,
          closedOrdersCount: 0,
          cashSessionStatus: 'closing',
          cashOpeningAmount: 200,
          cashCurrentAmount: 400,
          cashExpectedAmount: 390,
          cashCountedAmount: 400,
          cashDifferenceAmount: 10,
          salesRevenue: 1200,
          salesProfit: 500,
        },
        tables: [
          {
            tableLabel: '10',
            comandaId: 'comanda-10',
            employeeId: 'emp-2',
            employeeName: 'Marina Rocha',
            status: 'in_preparation',
            openedAt: '2026-04-03T13:00:00.000Z',
            updatedAt: '2026-04-03T13:15:00.000Z',
            subtotal: 110,
            discountAmount: 0,
            totalAmount: 110,
            itemsCount: 5,
            notes: 'Mesa da varanda',
          },
        ],
        movements: [
          {
            id: 'mov-10',
            employeeId: 'emp-2',
            type: 'adjustment',
            amount: 15,
            reason: 'Ajuste de troco',
            createdAt: '2026-04-03T13:20:00.000Z',
          },
        ],
      }),
    ]

    render(<OperationsExecutiveGrid rows={rows} />)

    await user.click(screen.getByRole('button', { name: 'Marina Rocha' }))

    const focusPanel = screen.getByText(/colaborador em foco/i).closest('aside')
    expect(focusPanel).not.toBeNull()
    expect(within(focusPanel!).getByText('Marina Rocha')).toBeInTheDocument()
    expect(screen.getAllByText(/mesa 10/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/ajuste de troco/i).length).toBeGreaterThan(0)
  })
})
