import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActivityModal } from './commercial-calendar'

describe('ActivityModal', () => {
  it('abre a atividade modal com campos rotulados e fecha pelo backdrop', async () => {
    const onClose = vi.fn()
    render(<ActivityModal initialStart={new Date('2026-04-03T12:00:00.000Z')} onClose={onClose} onSave={() => {}} />)

    expect(await screen.findByLabelText(/^nome$/i)).toHaveAttribute('id', 'commercial-activity-title')
    expect(screen.getByLabelText(/início/i)).toHaveAttribute('id', 'commercial-activity-start')
    expect(screen.getByLabelText(/fim/i)).toHaveAttribute('id', 'commercial-activity-end')
    expect(screen.getByLabelText(/descrição/i)).toHaveAttribute('id', 'commercial-activity-description')
    expect(screen.getByLabelText(/impacto esperado/i)).toHaveAttribute('id', 'commercial-activity-impact')

    fireEvent.click(screen.getByLabelText(/fechar atividade comercial/i))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('envia uma nova atividade comercial com os campos principais preenchidos', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<ActivityModal initialStart={new Date('2026-04-03T12:00:00.000Z')} onClose={vi.fn()} onSave={onSave} />)

    await user.type(screen.getByLabelText(/^nome$/i), 'Happy Hour')
    await user.type(screen.getByLabelText(/impacto esperado/i), '25')
    await user.click(screen.getByRole('button', { name: /criar atividade/i }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Happy Hour',
        impactoEsperado: 25,
      }),
    )
  })

  it('permite classificar jogo em campeonato monitorado', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<ActivityModal initialStart={new Date('2026-04-03T12:00:00.000Z')} onClose={vi.fn()} onSave={onSave} />)

    await user.type(screen.getByLabelText(/^nome$/i), 'Jogo da Libertadores')
    await user.click(screen.getByRole('button', { name: /^jogo$/i }))
    await user.click(screen.getByRole('button', { name: /libertadores/i }))
    await user.click(screen.getByRole('button', { name: /criar atividade/i }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        footballCompetition: 'libertadores',
        title: 'Jogo da Libertadores',
        type: 'jogo',
      }),
    )
  })
})
