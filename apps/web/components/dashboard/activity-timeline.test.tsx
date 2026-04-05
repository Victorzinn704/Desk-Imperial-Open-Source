import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActivityFeedEntry } from '@/lib/api'
import { ActivityTimeline } from './activity-timeline'

vi.mock('@/lib/api', () => ({
  fetchActivityFeed: vi.fn(),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

describe('ActivityTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza a trilha e fecha pelo backdrop acessível', async () => {
    const { fetchActivityFeed } = await import('@/lib/api')
    vi.mocked(fetchActivityFeed).mockResolvedValue([
      {
        id: 'evt-1',
        event: 'auth.login.succeeded',
        resource: 'auth',
        resourceId: 'auth-1',
        actorName: 'Pedro Alves',
        actorUserId: 'user-1',
        actorRole: 'OWNER',
        severity: 'INFO',
        createdAt: '2026-04-03T12:00:00.000Z',
        ipAddress: '127.0.0.1',
        metadata: {},
      } satisfies ActivityFeedEntry,
    ])

    const queryClient = createTestQueryClient()
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <ActivityTimeline onClose={onClose} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/acesso autenticado/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText(/fechar atividades/i))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
