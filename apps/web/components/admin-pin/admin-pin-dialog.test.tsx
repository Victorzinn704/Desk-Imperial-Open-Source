import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdminPinDialog } from './admin-pin-dialog'
import { rememberAdminPinVerification, verifyAdminPin } from '@/lib/admin-pin'

vi.mock('@/lib/admin-pin', () => ({
  verifyAdminPin: vi.fn(),
  rememberAdminPinVerification: vi.fn(),
}))

describe('AdminPinDialog', () => {
  it('fecha pelo backdrop e expõe IDs estáveis para os dígitos', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(<AdminPinDialog onCancel={onCancel} onConfirm={vi.fn()} />)

    expect(screen.getByLabelText(/fechar verificação de pin/i)).toBeInTheDocument()
    expect(document.getElementById('admin-pin-digit-0')).toBeTruthy()
    expect(document.getElementById('admin-pin-digit-1')).toBeTruthy()
    expect(document.getElementById('admin-pin-digit-2')).toBeTruthy()
    expect(document.getElementById('admin-pin-digit-3')).toBeTruthy()

    await user.click(screen.getByLabelText(/fechar verificação de pin/i))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('confirma o PIN automaticamente ao preencher os quatro dígitos', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const verifiedUntil = '2026-04-03T18:00:00.000Z'

    vi.mocked(verifyAdminPin).mockResolvedValue({ verifiedUntil })

    render(<AdminPinDialog onCancel={vi.fn()} onConfirm={onConfirm} />)

    await user.type(document.getElementById('admin-pin-digit-0') as HTMLInputElement, '1')
    await user.type(document.getElementById('admin-pin-digit-1') as HTMLInputElement, '2')
    await user.type(document.getElementById('admin-pin-digit-2') as HTMLInputElement, '3')
    await user.type(document.getElementById('admin-pin-digit-3') as HTMLInputElement, '4')

    expect(verifyAdminPin).toHaveBeenCalledWith('1234')
    expect(rememberAdminPinVerification).toHaveBeenCalledWith(verifiedUntil)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
