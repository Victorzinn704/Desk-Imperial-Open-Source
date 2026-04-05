import { CircleDashed } from 'lucide-react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OperationEmptyState } from './operation-empty-state'

describe('OperationEmptyState', () => {
  it('renderiza titulo e descricao sem acao', () => {
    render(<OperationEmptyState title="Sem comandas" description="Abra uma nova comanda para iniciar." Icon={CircleDashed} />)

    expect(screen.getByText('Sem comandas')).toBeInTheDocument()
    expect(screen.getByText('Abra uma nova comanda para iniciar.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /abrir/i })).not.toBeInTheDocument()
  })

  it('renderiza area de acao quando fornecida', () => {
    render(
      <OperationEmptyState
        title="Sem pedidos"
        description="Nenhum item pendente na cozinha."
        Icon={CircleDashed}
        action={<button type="button">Abrir nova comanda</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Abrir nova comanda' })).toBeInTheDocument()
  })
})