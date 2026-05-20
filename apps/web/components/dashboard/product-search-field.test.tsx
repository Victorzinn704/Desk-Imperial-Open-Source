import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProductSearchField } from './product-search-field'

describe('ProductSearchField', () => {
  it('mostra badge de busca imediata quando input esta vazio', () => {
    render(<ProductSearchField value="" onChange={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByText('Busca imediata')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /limpar busca/i })).not.toBeInTheDocument()
  })

  it('exibe botao limpar e dispara callbacks de change/clear', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClear = vi.fn()

    render(<ProductSearchField value="caf" onChange={onChange} onClear={onClear} />)

    await user.type(screen.getByLabelText('Buscar produto'), 'e')
    await user.click(screen.getByRole('button', { name: /limpar busca/i }))

    expect(onChange).toHaveBeenCalled()
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
