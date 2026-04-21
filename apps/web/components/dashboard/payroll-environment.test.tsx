import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PayrollEnvironment } from './payroll-environment'

describe('PayrollEnvironment', () => {
  it('renderiza um onboarding unico quando nao ha colaboradores na folha', () => {
    render(<PayrollEnvironment employees={[]} />)

    expect(screen.getByRole('heading', { name: 'Folha de pagamento' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Folha ainda sem colaboradores' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ir para equipe/i })).toBeInTheDocument()
    expect(screen.queryByText(/Colaboradores -/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Radar do fechamento')).not.toBeInTheDocument()
  })
})
