import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LabFactPill, LabFilterChip, LabMiniStat, LabSignalRow } from './lab-primitives'
import { LabWorkbench } from './lab-workbench'

describe('lab-primitives', () => {
  it('renders shared compact primitives used by lab sections', () => {
    render(
      <div>
        <LabMiniStat label="categorias" value="12" description="ativas" />
        <LabSignalRow label="estoque" note="leitura atual" value="ok" tone="success" />
        <LabFactPill label="canal" value="Delivery" />
        <LabFilterChip active count={3} label="Ativos" />
      </div>,
    )

    expect(screen.getByText('categorias')).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getByText('estoque')).toBeDefined()
    expect(screen.getByText('ok')).toBeDefined()
    expect(screen.getByText('canal')).toBeDefined()
    expect(screen.getByText('Delivery')).toBeDefined()
    expect(screen.getByRole('button', { name: /ativos/i })).toBeDefined()
  })

  it('opens workbench with body class and calls close actions', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <LabWorkbench bodyClassName="test-workbench-open" title="Cadastrar produto" onClose={onClose}>
        Conteúdo do fluxo
      </LabWorkbench>,
    )

    expect(document.body.classList.contains('test-workbench-open')).toBe(true)
    expect(screen.getByRole('dialog', { name: /cadastrar produto/i })).toBeDefined()
    expect(screen.getByText('Conteúdo do fluxo')).toBeDefined()

    fireEvent.click(screen.getAllByRole('button', { name: /fechar superfície/i })[1])
    expect(onClose).toHaveBeenCalledTimes(1)

    unmount()
    expect(document.body.classList.contains('test-workbench-open')).toBe(false)
  })
})
