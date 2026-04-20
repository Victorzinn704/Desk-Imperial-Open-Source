import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LabShell } from './lab-shell'

let mockPathname = '/design-lab/portfolio'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  }),
}))

vi.mock('@/lib/api', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue({
    user: {
      fullName: 'Bar do Pedrão',
      role: 'OWNER',
    },
  }),
}))

vi.mock('@/components/dashboard/hooks', () => ({
  useDashboardMutations: () => ({
    logoutMutation: {
      mutate: vi.fn(),
    },
  }),
  useDashboardLogout: () => ({
    logout: vi.fn(),
    isPending: false,
  }),
}))

function renderLabShell() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <LabShell>
        <div>Conteúdo do lab</div>
      </LabShell>
    </QueryClientProvider>,
  )
}

describe('LabShell', () => {
  afterEach(() => {
    document.documentElement.classList.remove('design-lab-shell-open')
    document.body.classList.remove('design-lab-shell-open')
    mockPathname = '/design-lab/portfolio'
    localStorage.clear()
  })

  it('locks page scroll while design-lab is mounted', () => {
    const { unmount } = renderLabShell()

    expect(screen.getByText('Conteúdo do lab')).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('design-lab-shell-open')
    expect(document.body).toHaveClass('design-lab-shell-open')

    unmount()

    expect(document.documentElement).not.toHaveClass('design-lab-shell-open')
    expect(document.body).not.toHaveClass('design-lab-shell-open')
  })

  it('uses the user card as the config entrypoint', () => {
    renderLabShell()

    const configLink = screen.getByLabelText('Abrir configurações')
    expect(configLink).toHaveAttribute('href', '/design-lab/config?tab=account')
    expect(screen.getByText('Configurações')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Config' })).not.toBeInTheDocument()
  })

  it('highlights the account card when config is active', () => {
    mockPathname = '/design-lab/config'

    renderLabShell()

    expect(screen.getByLabelText('Abrir configurações')).toHaveClass('lab-user--active')
  })
})
