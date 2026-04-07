import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { describe, expect, it, vi } from 'vitest'
import { MesaCard } from './mesa-card'
import { MesaCompact } from './mesa-compact'
import type { Garcom, Mesa } from '../../pdv-types'

function renderWithDnd(ui: ReactNode) {
  return render(
    <DragDropContext onDragEnd={() => {}}>
      <Droppable droppableId="mesa-compact-droppable">
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

function makeMesa(overrides: Partial<Mesa> = {}): Mesa {
  return {
    id: 'mesa-12',
    numero: '12',
    capacidade: 4,
    status: 'livre',
    ...overrides,
  }
}

function makeGarcom(overrides: Partial<Garcom> = {}): Garcom {
  return {
    id: 'garcom-1',
    nome: 'Pedro Alves',
    cor: '#36f57c',
    ...overrides,
  }
}

function getNativeButtonByName(name: RegExp) {
  return screen.getAllByRole('button', { name }).find((element) => element.tagName === 'BUTTON') as HTMLButtonElement
}

describe('Salão mesa cards', () => {
  it('opens the full mesa card through the dedicated action surface', async () => {
    const user = userEvent.setup()
    const onClickLivre = vi.fn()

    render(
      <MesaCard
        mesa={makeMesa()}
        garcons={[]}
        index={0}
        view="equipe"
        now={Date.now()}
        assigningGarcomId={null}
        onAssign={vi.fn()}
        onClickLivre={onClickLivre}
        onClickOcupada={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /abrir mesa 12/i }))

    expect(onClickLivre).toHaveBeenCalledWith(expect.objectContaining({ id: 'mesa-12' }))
  })

  it('keeps the compact garçom controls separated from the mesa open action', async () => {
    const user = userEvent.setup()
    const onClickLivre = vi.fn()
    const onAssign = vi.fn()

    renderWithDnd(
      <MesaCompact
        mesa={makeMesa({ garcomId: 'garcom-1' })}
        garcons={[makeGarcom()]}
        index={0}
        onAssign={onAssign}
        onClickLivre={onClickLivre}
      />,
    )

    await user.click(screen.getByRole('button', { name: /abrir mesa 12/i }))
    await user.click(screen.getByRole('button', { name: 'PA' }))
    await screen.findByText(/pedro alves/i)
    await user.click(getNativeButtonByName(/remover garçom/i))

    expect(onClickLivre).toHaveBeenCalledWith(expect.objectContaining({ id: 'mesa-12' }))
    expect(onClickLivre).toHaveBeenCalledTimes(1)
    expect(onAssign).toHaveBeenCalledWith('mesa-12', undefined)
  })
})
