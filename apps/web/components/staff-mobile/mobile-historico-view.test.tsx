import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MobileHistoricoView } from './mobile-historico-view'

describe('MobileHistoricoView', () => {
  it('mantém subtotal e total de comandas compactas no extrato histórico', async () => {
    const user = userEvent.setup()

    render(
      <MobileHistoricoView
        comandas={[
          {
            id: 'c-closed-1',
            status: 'fechada',
            mesa: '9',
            garcomNome: 'Marina',
            itens: [],
            desconto: 10,
            acrescimo: 0,
            abertaEm: new Date('2026-03-30T12:00:00.000Z'),
            subtotalBackend: 80,
            totalBackend: 72,
          },
        ]}
      />,
    )

    await user.click(screen.getByText('Mesa 9'))

    expect(screen.getByText(/Garçom Marina/i)).toBeInTheDocument()
    expect(screen.getByText(/Extrato resumido/i)).toBeInTheDocument()
    expect(screen.getByText(/^Garçom$/i)).toBeInTheDocument()
    expect(screen.getByText(/R\$ 80,00/i)).toBeInTheDocument()
    expect(screen.getAllByText(/R\$ 72,00/i)).toHaveLength(2)
    expect(screen.getByText(/Totais mantidos pelo backend/i)).toBeInTheDocument()
  })

  it('mostra ranking e KPIs próprios quando o resumo é informado', () => {
    render(
      <MobileHistoricoView
        comandas={[]}
        summary={{
          receitaRealizada: 120,
          receitaEsperada: 200,
          openComandasCount: 1,
          ranking: {
            position: 2,
            totalPerformers: 3,
            leaderName: 'Paulo',
            leaderValue: 180,
            performerValue: 120,
            deltaToLeader: 60,
          },
        }}
      />,
    )

    expect(screen.getByText(/Histórico próprio/i)).toBeInTheDocument()
    expect(screen.getByTestId('summary-card-receita-realizada')).toHaveTextContent('120,00')
    expect(screen.getByTestId('summary-card-receita-esperada')).toHaveTextContent('200,00')
    expect(screen.getByTestId('summary-card-posi-o')).toHaveTextContent('2º')
    expect(screen.getByText(/faltam R\$ 60,00 para alcançar Paulo/i)).toBeInTheDocument()
  })
})
