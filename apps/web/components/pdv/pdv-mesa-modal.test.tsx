import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PdvMesaModal } from './pdv-mesa-modal'

describe('PdvMesaModal', () => {
  it('fecha pelo backdrop e salva os dados da mesa', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSave = vi.fn()

    render(<PdvMesaModal onClose={onClose} onSave={onSave} />)

    await user.click(screen.getByLabelText(/fechar criação de mesa/i))
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()

    await user.type(screen.getByPlaceholderText(/ex: 1, vip, balcão/i), '15')
    await user.click(screen.getByRole('button', { name: /\+/i }))
    await user.click(screen.getByRole('button', { name: /reservada/i }))
    await user.click(screen.getByRole('button', { name: /criar mesa/i }))

    expect(onSave).toHaveBeenCalledWith({ numero: '15', capacidade: 5, status: 'reservada' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
