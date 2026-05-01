import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EmployeeManagementCard } from './employee-management-card'
import { fetchAdminPinStatus, hasRecentAdminPinVerification, rememberAdminPinVerification, verifyAdminPin } from '@/lib/admin-pin'

vi.mock('@/lib/admin-pin', () => ({
  fetchAdminPinStatus: vi.fn(),
  hasRecentAdminPinVerification: vi.fn(),
  rememberAdminPinVerification: vi.fn(),
  verifyAdminPin: vi.fn(),
}))

const baseEmployee = {
  id: 'employee-1',
  employeeCode: 'AB12CD',
  displayName: 'Ana Martins',
  active: true,
  hasLogin: true,
  salarioBase: 0,
  percentualVendas: 0,
  createdAt: '2026-04-30T10:00:00.000Z',
  updatedAt: '2026-04-30T10:00:00.000Z',
}

describe('EmployeeManagementCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hasRecentAdminPinVerification).mockReturnValue(false)
  })

  it('exige PIN antes de rotacionar a senha quando o PIN administrativo está ativo', async () => {
    const user = userEvent.setup()
    const onRotatePassword = vi.fn().mockResolvedValue({
      employee: baseEmployee,
      credentials: { employeeCode: 'AB12CD', temporaryPassword: '12345678' },
    })

    vi.mocked(fetchAdminPinStatus).mockResolvedValue({ configured: true })
    vi.mocked(verifyAdminPin).mockResolvedValue({ verifiedUntil: '2026-04-30T11:00:00.000Z' })

    render(
      <EmployeeManagementCard
        employees={[baseEmployee]}
        onArchive={vi.fn()}
        onCreate={vi.fn().mockResolvedValue({
          employee: baseEmployee,
          credentials: { employeeCode: 'AB12CD', temporaryPassword: '12345678' },
        })}
        onIssueAccess={vi.fn().mockResolvedValue({
          employee: baseEmployee,
          credentials: { employeeCode: 'ZX98YU', temporaryPassword: '87654321' },
        })}
        onRestore={vi.fn()}
        onRevokeAccess={vi.fn().mockResolvedValue({ employee: { ...baseEmployee, hasLogin: false } })}
        onRotatePassword={onRotatePassword}
      />,
    )

    await waitFor(() => expect(fetchAdminPinStatus).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: /rotacionar senha/i }))

    expect(onRotatePassword).not.toHaveBeenCalled()

    await user.type(document.getElementById('admin-pin-digit-0') as HTMLInputElement, '1')
    await user.type(document.getElementById('admin-pin-digit-1') as HTMLInputElement, '2')
    await user.type(document.getElementById('admin-pin-digit-2') as HTMLInputElement, '3')
    await user.type(document.getElementById('admin-pin-digit-3') as HTMLInputElement, '4')

    await waitFor(() => expect(verifyAdminPin).toHaveBeenCalledWith('1234'))
    await waitFor(() => expect(onRotatePassword).toHaveBeenCalledWith('employee-1'))
    expect(rememberAdminPinVerification).toHaveBeenCalled()
  })

  it('executa a rotação de senha direto quando não existe PIN configurado', async () => {
    const user = userEvent.setup()
    const onRotatePassword = vi.fn().mockResolvedValue({
      employee: baseEmployee,
      credentials: { employeeCode: 'AB12CD', temporaryPassword: '12345678' },
    })

    vi.mocked(fetchAdminPinStatus).mockResolvedValue({ configured: false })

    render(
      <EmployeeManagementCard
        employees={[baseEmployee]}
        onArchive={vi.fn()}
        onCreate={vi.fn().mockResolvedValue({
          employee: baseEmployee,
          credentials: { employeeCode: 'AB12CD', temporaryPassword: '12345678' },
        })}
        onIssueAccess={vi.fn().mockResolvedValue({
          employee: baseEmployee,
          credentials: { employeeCode: 'ZX98YU', temporaryPassword: '87654321' },
        })}
        onRestore={vi.fn()}
        onRevokeAccess={vi.fn().mockResolvedValue({ employee: { ...baseEmployee, hasLogin: false } })}
        onRotatePassword={onRotatePassword}
      />,
    )

    await waitFor(() => expect(fetchAdminPinStatus).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: /rotacionar senha/i }))

    await waitFor(() => expect(onRotatePassword).toHaveBeenCalledWith('employee-1'))
    expect(screen.queryByText(/digite o pin/i)).not.toBeInTheDocument()
  })
})
