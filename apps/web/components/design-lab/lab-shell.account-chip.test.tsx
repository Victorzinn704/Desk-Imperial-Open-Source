import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LabShellAccountChip } from './lab-shell.account-chip'

describe('LabShellAccountChip', () => {
  it('mantem o footer colapsado sem vazar texto do usuário', () => {
    render(
      <LabShellAccountChip
        accountInitials="DI"
        accountLabel="Desk Imperial"
        accountMeta="Administração"
        collapsed
        compact
        configHref="/design-lab/config?tab=account"
      />,
    )

    expect(screen.getByRole('link', { name: 'Abrir configurações' })).toHaveAttribute(
      'href',
      '/design-lab/config?tab=account',
    )
    expect(screen.queryByText('Desk Imperial')).not.toBeInTheDocument()
    expect(screen.queryByText('Administração')).not.toBeInTheDocument()
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
  })
})
