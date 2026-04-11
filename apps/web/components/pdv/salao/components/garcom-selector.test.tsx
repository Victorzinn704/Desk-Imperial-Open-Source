import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GarcomSelector } from './garcom-selector'
import type { Garcom, Mesa } from '../../pdv-types'

function makeMesa(overrides: Partial<Mesa> = {}): Mesa {
  return {
    id: 'mesa-7',
    numero: '7',
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

describe('GarcomSelector', () => {
  it('atribui o garçom selecionado e fecha o seletor', async () => {
    const user = userEvent.setup()
    const onAssign = vi.fn()
    const onClose = vi.fn()

    render(
      <GarcomSelector
        garcons={[makeGarcom(), makeGarcom({ id: 'garcom-2', nome: 'Marina Rocha' })]}
        mesa={makeMesa({ garcomId: 'garcom-2' })}
        onAssign={onAssign}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: /pedro alves/i }))

    expect(onAssign).toHaveBeenCalledWith('garcom-1')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
