import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OwnerFinanceView } from './owner-finance-view'

describe('OwnerFinanceView', () => {
  it('mostra leitura saudável com métricas e ações principais', () => {
    const onOpenCash = vi.fn()
    const onOpenFinanceiro = vi.fn()

    render(
      <OwnerFinanceView
        caixaEsperado={850}
        errorMessage={null}
        isOffline={false}
        lucroRealizado={320}
        ticketMedio={42.5}
        todayOrderCount={8}
        todayRevenue={1200}
        onOpenCash={onOpenCash}
        onOpenFinanceiro={onOpenFinanceiro}
      />,
    )

    expect(screen.getByText('saudável')).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('1.200,00'))).toBeInTheDocument()
    expect(screen.getByText(/margem 26,7%/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Caixa do turno/i }))
    fireEvent.click(screen.getByRole('button', { name: /Financeiro completo/i }))

    expect(onOpenCash).toHaveBeenCalledTimes(1)
    expect(onOpenFinanceiro).toHaveBeenCalledTimes(1)
  })

  it('mostra leitura de sem giro quando o turno ainda não converteu', () => {
    render(
      <OwnerFinanceView
        caixaEsperado={0}
        errorMessage={null}
        isOffline={false}
        lucroRealizado={0}
        ticketMedio={0}
        todayOrderCount={0}
        todayRevenue={0}
        onOpenCash={() => undefined}
        onOpenFinanceiro={() => undefined}
      />,
    )

    expect(screen.getByText('sem giro')).toBeInTheDocument()
    expect(screen.getByText(/abrir caixa ou iniciar a venda/i)).toBeInTheDocument()
  })
})
