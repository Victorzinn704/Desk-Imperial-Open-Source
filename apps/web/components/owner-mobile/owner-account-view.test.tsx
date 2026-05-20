import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OwnerAccountView } from './owner-account-view'

describe('OwnerAccountView', () => {
  it('organiza os atalhos em grupos sem perder os acessos principais', () => {
    const onOpenDashboard = vi.fn()
    const onOpenQuickRegister = vi.fn()
    const onOpenSecurity = vi.fn()
    const onOpenSettings = vi.fn()

    render(
      <OwnerAccountView
        companyName="Bar do Pedrão"
        displayName="Wilson Owner"
        onOpenDashboard={onOpenDashboard}
        onOpenQuickRegister={onOpenQuickRegister}
        onOpenSecurity={onOpenSecurity}
        onOpenSettings={onOpenSettings}
      />,
    )

    expect(screen.getByText('Sistema')).toBeInTheDocument()
    expect(screen.getByText('Operação')).toBeInTheDocument()
    expect(screen.getByText('proprietário')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Configurações/i }))
    fireEvent.click(screen.getByRole('button', { name: /Painel completo/i }))
    fireEvent.click(screen.getByRole('button', { name: /Catálogo e cadastro rápido/i }))
    fireEvent.click(screen.getByRole('button', { name: /Segurança/i }))

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(onOpenDashboard).toHaveBeenCalledTimes(1)
    expect(onOpenQuickRegister).toHaveBeenCalledTimes(1)
    expect(onOpenSecurity).toHaveBeenCalledTimes(1)
  })
})
