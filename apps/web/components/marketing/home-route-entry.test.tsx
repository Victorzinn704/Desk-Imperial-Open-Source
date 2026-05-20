import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeRouteEntry } from './home-route-entry'
import { fetchCurrentUser } from '@/lib/api'

const routerReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplace,
  }),
}))

vi.mock('@/components/marketing/landing-page', () => ({
  LandingPage: () => <div data-testid="landing-page">landing</div>,
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  fetchCurrentUser: vi.fn(),
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

describe('HomeRouteEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 430,
    })
  })

  it('redireciona owner autenticado no mobile para o PWA', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      user: {
        role: 'OWNER',
        emailVerified: true,
      },
    } as never)

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <HomeRouteEntry />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith('/app/owner')
    })
  })

  it('mantém a landing quando a sessão não existe', async () => {
    const { ApiError } = await import('@/lib/api')

    vi.mocked(fetchCurrentUser).mockRejectedValue(new ApiError('Não autenticado', 401))

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <HomeRouteEntry />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('landing-page')).toBeInTheDocument()
    })

    expect(routerReplace).not.toHaveBeenCalled()
  })
})
