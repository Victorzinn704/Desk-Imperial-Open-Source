import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Bell } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import {
  buildDashboardSignals,
  DashboardWorkspaceHeader,
  getSessionErrorMessage,
  resolveActiveNavigation,
} from './dashboard-shell'

describe('dashboard-shell helpers', () => {
  it('returns a stable fallback error message for non-API failures', () => {
    expect(getSessionErrorMessage(new Error('boom'))).toMatch(/conecte a api/i)
    expect(getSessionErrorMessage(new ApiError('Sessão expirada', 401))).toBe('Sessão expirada')
  })

  it('resolves navigation fallback for settings when the active item is absent', () => {
    const navigation = resolveActiveNavigation('settings', [
      {
        items: [{ id: 'overview', label: 'Visão geral', description: 'Resumo', icon: Bell }],
      },
    ])

    expect(navigation).toEqual(
      expect.objectContaining({
        id: 'settings',
        label: 'Conta e preferências',
      }),
    )
  })

  it('builds different signal strips for staff and owner contexts', () => {
    const staffSignals = buildDashboardSignals({
      activeNavigationLabel: 'Vendas',
      activeSection: 'sales',
      companyName: 'Desk Imperial',
      displayCurrency: 'BRL',
      finance: undefined,
      isStaffUser: true,
      legalAcceptancesCount: 0,
      ordersCompleted: 18,
      productsActive: 42,
      requiredDocumentCount: 0,
    })

    const ownerSignals = buildDashboardSignals({
      activeNavigationLabel: 'Portfólio',
      activeSection: 'settings',
      companyName: 'Desk Imperial',
      displayCurrency: 'BRL',
      finance: {
        displayCurrency: 'BRL',
        totals: {
          currentMonthRevenue: 12500,
          lowStockItems: 3,
        },
      } as never,
      isStaffUser: false,
      legalAcceptancesCount: 2,
      ordersCompleted: 18,
      productsActive: 42,
      requiredDocumentCount: 4,
    })

    expect(staffSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Pedidos', value: '18' }),
        expect.objectContaining({ label: 'Perfil', value: 'Staff' }),
      ]),
    )
    expect(ownerSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Receita do mes' }),
        expect.objectContaining({ label: 'Documentos', value: '2/4' }),
      ]),
    )
  })

  it('renders the workspace header with signals and wired actions', async () => {
    const user = userEvent.setup()
    const handleQuickAction = vi.fn()
    const setIsTimelineOpen = vi.fn()
    const logout = vi.fn()

    render(
      <DashboardWorkspaceHeader
        activeHero={{
          badge: 'Operação',
          title: 'Central do workspace',
          description: 'Resumo da operação em andamento.',
        }}
        activeNavigationLabel="Visão geral"
        handleQuickAction={handleQuickAction}
        isLoggingOut={false}
        isTimelineOpen={false}
        logout={logout}
        quickActions={[
          {
            id: 'new-event',
            label: 'Alertas',
            description: 'Ver pendências',
            icon: Bell,
            target: 'sales',
          },
        ]}
        setIsTimelineOpen={setIsTimelineOpen}
        signals={[
          { label: 'Receita', value: 'R$ 10.000', helper: 'resultado bruto do período' },
          { label: 'Estoque', value: '3', helper: 'itens em baixa' },
        ]}
      />,
    )

    expect(screen.getByText(/central do workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/receita/i)).toBeInTheDocument()
    expect(screen.getByText(/r\$ 10.000/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /alertas/i }))
    await user.click(screen.getByRole('button', { name: /atividades/i }))
    await user.click(screen.getByRole('button', { name: /encerrar sessão/i }))

    expect(handleQuickAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-event',
      }),
    )
    expect(setIsTimelineOpen).toHaveBeenCalledWith(true)
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
