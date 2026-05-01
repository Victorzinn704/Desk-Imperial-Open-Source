import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as ApiModule from '@/lib/api'
import { RealtimeNotificationCard } from './realtime-notification-card'
import {
  fetchUserNotificationPreferences,
  updateUserNotificationPreferences,
  type UserNotificationPreferencesResponse,
} from '@/lib/api'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof ApiModule>('@/lib/api')
  return {
    ...actual,
    fetchUserNotificationPreferences: vi.fn(),
    updateUserNotificationPreferences: vi.fn(),
  }
})

const fetchUserPreferencesMock = vi.mocked(fetchUserNotificationPreferences)
const updateUserPreferencesMock = vi.mocked(updateUserNotificationPreferences)

describe('RealtimeNotificationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchUserPreferencesMock.mockResolvedValue(makeUserPreferences())
  })

  it('renderiza as chaves pessoais de ruído para web e mobile', async () => {
    renderWithQueryClient(<RealtimeNotificationCard />)

    expect(await screen.findByText(/controle o ruído do web e do mobile por usuário/i)).toBeInTheDocument()
    expect(screen.getByText(/mudança de status da comanda/i)).toBeInTheDocument()
    expect(screen.getByText(/atualização de item da cozinha/i)).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
  })

  it('permite desligar o toast web sem afetar o mobile', async () => {
    updateUserPreferencesMock.mockResolvedValue(
      makeUserPreferences({
        preferences: [
          {
            channel: 'WEB_TOAST',
            eventType: 'operations.comanda.status_changed',
            enabled: false,
            inherited: false,
          },
          {
            channel: 'WEB_TOAST',
            eventType: 'operations.kitchen_item.status_changed',
            enabled: true,
            inherited: true,
          },
          {
            channel: 'MOBILE_TOAST',
            eventType: 'operations.comanda.status_changed',
            enabled: true,
            inherited: true,
          },
          {
            channel: 'MOBILE_TOAST',
            eventType: 'operations.kitchen_item.status_changed',
            enabled: true,
            inherited: true,
          },
        ],
      }),
    )

    renderWithQueryClient(<RealtimeNotificationCard />)

    await waitFor(() => expect(fetchUserPreferencesMock).toHaveBeenCalled())
    const webCheckbox = await screen.findByRole('checkbox', { name: /mudança de status da comanda · web/i })
    expect(webCheckbox).toBeChecked()
    fireEvent.click(webCheckbox)

    await waitFor(() => expect(updateUserPreferencesMock).toHaveBeenCalledTimes(1))
    expect(updateUserPreferencesMock.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: 'WEB_TOAST',
          eventType: 'operations.comanda.status_changed',
          enabled: false,
        }),
        expect.objectContaining({
          channel: 'MOBILE_TOAST',
          eventType: 'operations.comanda.status_changed',
          enabled: true,
        }),
      ]),
    )
  })
})

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function makeUserPreferences(
  overrides: Partial<UserNotificationPreferencesResponse> = {},
): UserNotificationPreferencesResponse {
  return {
    preferences: [
      {
        channel: 'WEB_TOAST',
        eventType: 'operations.comanda.status_changed',
        enabled: true,
        inherited: true,
      },
      {
        channel: 'WEB_TOAST',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: true,
        inherited: true,
      },
      {
        channel: 'MOBILE_TOAST',
        eventType: 'operations.comanda.status_changed',
        enabled: true,
        inherited: true,
      },
      {
        channel: 'MOBILE_TOAST',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: true,
        inherited: true,
      },
    ],
    ...overrides,
  }
}
