import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { describe, expect, it, vi } from 'vitest'
import { PdvComandaCard } from './pdv-comanda-card'
import { PdvMesaCard } from './pdv-mesa-card'
import { PdvMesasKanban } from './pdv-mesas-kanban'
import { KANBAN_COLUMNS, type Comanda, type Mesa } from './pdv-types'

function renderWithDnd(ui: ReactNode) {
  return render(
    <DragDropContext onDragEnd={() => {}}>
      <Droppable droppableId="test-droppable">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {ui}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>,
  )
}

function makeComanda(overrides: Partial<Comanda> = {}): Comanda {
  return {
    id: 'comanda-1',
    status: 'aberta',
    mesa: '10',
    clienteNome: 'Marina',
    itens: [{ produtoId: 'p1', nome: 'Suco', quantidade: 2, precoUnitario: 9.9 }],
    desconto: 0,
    acrescimo: 0,
    abertaEm: new Date('2026-04-03T10:00:00.000Z'),
    ...overrides,
  }
}

function makeMesa(overrides: Partial<Mesa> = {}): Mesa {
  return {
    id: 'mesa-1',
    numero: '10',
    capacidade: 4,
    status: 'livre',
    ...overrides,
  }
}

function getNativeButtonByName(name: RegExp) {
  return screen
    .getAllByRole('button', { name })
    .find((element) => element.tagName === 'BUTTON') as HTMLButtonElement
}

describe('PDV cards', () => {
  it('opens a comanda card through its native button surface', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    renderWithDnd(
      <PdvComandaCard comanda={makeComanda()} index={0} column={KANBAN_COLUMNS[0]!} onClick={onClick} />,
    )

    await user.click(getNativeButtonByName(/mesa 10/i))

    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'comanda-1' }))
  })

  it('lets the main mesa surface open while keeping delete isolated', async () => {
    const user = userEvent.setup()
    const onClickLivre = vi.fn()
    const onClickOcupada = vi.fn()
    const onDelete = vi.fn()

    render(
      <PdvMesaCard
        mesa={makeMesa()}
        onClickLivre={onClickLivre}
        onClickOcupada={onClickOcupada}
        onDelete={onDelete}
      />,
    )

    await user.click(screen.getByRole('button', { name: /abrir mesa 10/i }))
    await user.click(screen.getByTitle(/remover mesa/i))

    expect(onClickLivre).toHaveBeenCalledWith(expect.objectContaining({ id: 'mesa-1' }))
    expect(onDelete).toHaveBeenCalledWith('mesa-1')
    expect(onClickOcupada).not.toHaveBeenCalled()
  })

  it('routes reserved and occupied mesa actions in the kanban', async () => {
    const user = userEvent.setup()
    const onClickLivre = vi.fn()
    const onClickOcupada = vi.fn()
    const onAddMesa = vi.fn()

    render(
      <PdvMesasKanban
        mesas={[
          makeMesa({ id: 'mesa-livre', numero: '1', status: 'livre' }),
          makeMesa({ id: 'mesa-reservada', numero: '5', status: 'reservada' }),
          makeMesa({ id: 'mesa-ocupada', numero: '8', status: 'ocupada', comandaId: 'comanda-ocupada' }),
        ]}
        comandas={[makeComanda({ id: 'comanda-ocupada', mesa: '8', status: 'em_preparo' })]}
        onStatusChange={vi.fn()}
        onClickLivre={onClickLivre}
        onClickOcupada={onClickOcupada}
        onAddMesa={onAddMesa}
      />,
    )

    await user.click(screen.getByRole('button', { name: /nova mesa/i }))
    await user.click(getNativeButtonByName(/mesa 5/i))
    await user.click(getNativeButtonByName(/mesa 8/i))

    expect(onAddMesa).toHaveBeenCalledTimes(1)
    expect(onClickLivre).toHaveBeenCalledWith(expect.objectContaining({ id: 'mesa-reservada' }))
    expect(onClickOcupada).toHaveBeenCalledWith(expect.objectContaining({ id: 'comanda-ocupada' }))
  })
})
