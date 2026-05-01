import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { TelegramIntegrationCard } from './telegram-integration-card'
import {
  createTelegramLinkToken,
  fetchTelegramIntegrationStatus,
  fetchWorkspaceNotificationPreferences,
  unlinkTelegramIntegration,
  updateWorkspaceNotificationPreferences,
  type NotificationPreferencesResponse,
  type TelegramIntegrationStatusResponse,
  type TelegramLinkTokenResponse,
} from '@/lib/api'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    fetchTelegramIntegrationStatus: vi.fn(),
    fetchWorkspaceNotificationPreferences: vi.fn(),
    createTelegramLinkToken: vi.fn(),
    unlinkTelegramIntegration: vi.fn(),
    updateWorkspaceNotificationPreferences: vi.fn(),
  }
})

const fetchStatusMock = vi.mocked(fetchTelegramIntegrationStatus)
const fetchPreferencesMock = vi.mocked(fetchWorkspaceNotificationPreferences)
const createLinkMock = vi.mocked(createTelegramLinkToken)
const unlinkMock = vi.mocked(unlinkTelegramIntegration)
const updatePreferencesMock = vi.mocked(updateWorkspaceNotificationPreferences)

describe('TelegramIntegrationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchPreferencesMock.mockResolvedValue(makePreferences())
    unlinkMock.mockResolvedValue({ success: true, revokedCount: 1 })
  })

  it('mostra indisponibilidade quando o bot ainda nao esta ativo no ambiente', async () => {
    fetchStatusMock.mockResolvedValue(makeStatus({ enabled: false, workspaceEnabled: false }))

    renderWithQueryClient(<TelegramIntegrationCard />)

    expect(await screen.findByText(/token do bot ainda não está ativo neste ambiente/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gerar link do telegram/i })).toBeDisabled()
  })

  it('mostra que o bot é fonte oficial e não pode ser trocado manualmente', async () => {
    fetchStatusMock.mockResolvedValue(makeStatus())

    renderWithQueryClient(<TelegramIntegrationCard />)

    expect(await screen.findByText(/canal oficial único/i)).toBeInTheDocument()
    expect(screen.getByText(/não existe troca manual para outro bot/i)).toBeInTheDocument()
  })

  it('gera um deeplink temporario para abrir o bot', async () => {
    fetchStatusMock.mockResolvedValue(makeStatus())
    createLinkMock.mockResolvedValue({
      token: 'abc',
      deeplink: 'https://t.me/Desk_Imperial_bot?start=abc',
      expiresAt: '2026-05-01T10:00:00.000Z',
      botUsername: 'Desk_Imperial_bot',
    } satisfies TelegramLinkTokenResponse)

    renderWithQueryClient(<TelegramIntegrationCard />)

    const generateButton = await screen.findByRole('button', { name: /gerar link do telegram/i })
    await waitFor(() => expect(generateButton).not.toBeDisabled())
    fireEvent.click(generateButton)

    await waitFor(() => expect(createLinkMock).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: /abrir telegram/i })).toBeInTheDocument()
    expect(screen.getByText('https://t.me/Desk_Imperial_bot?start=abc')).toBeInTheDocument()
  })

  it('permite ajustar o ruído operacional do Telegram por evento', async () => {
    fetchStatusMock.mockResolvedValue(makeStatus())
    updatePreferencesMock.mockResolvedValue(makePreferences({
      preferences: [
        {
          channel: 'TELEGRAM',
          eventType: 'operations.comanda.status_changed',
          enabled: false,
          inherited: false,
        },
        {
          channel: 'TELEGRAM',
          eventType: 'operations.kitchen_item.status_changed',
          enabled: true,
          inherited: true,
        },
      ],
    }))

    renderWithQueryClient(<TelegramIntegrationCard />)

    await waitFor(() => expect(fetchPreferencesMock).toHaveBeenCalled())
    const checkbox = await screen.findByRole('checkbox', { name: /mudança de status da comanda/i })
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)

    await waitFor(() => expect(updatePreferencesMock).toHaveBeenCalledTimes(1))
    expect(updatePreferencesMock.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        channel: 'TELEGRAM',
        eventType: 'operations.comanda.status_changed',
        enabled: false,
      }),
      expect.objectContaining({
        channel: 'TELEGRAM',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: true,
      }),
    ])
  })

  it('mostra dados do chat vinculado e permite desvincular com confirmacao', async () => {
    fetchStatusMock.mockResolvedValue(
      makeStatus({
        linked: true,
        account: {
          telegramChatId: '555',
          telegramUserId: '777',
          telegramUsername: 'pedro',
          status: 'ACTIVE',
          linkedAt: '2026-05-01T10:00:00.000Z',
          lastActiveAt: '2026-05-01T10:05:00.000Z',
        },
      }),
    )
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithQueryClient(<TelegramIntegrationCard />)

    expect(await screen.findByText('555')).toBeInTheDocument()
    expect(screen.getByText('@pedro')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /desvincular/i }))

    await waitFor(() => expect(unlinkMock).toHaveBeenCalledTimes(1))
    expect(confirmSpy).toHaveBeenCalled()
  })

  it('abre e copia o link temporario quando o vínculo ainda está pendente', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    })
    fetchStatusMock.mockResolvedValue(makeStatus())
    createLinkMock.mockResolvedValue({
      token: 'abc',
      deeplink: 'https://t.me/Desk_Imperial_bot?start=abc',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      botUsername: 'Desk_Imperial_bot',
    } satisfies TelegramLinkTokenResponse)

    renderWithQueryClient(<TelegramIntegrationCard />)

    const generateButton = await screen.findByRole('button', { name: /gerar link do telegram/i })
    await waitFor(() => expect(generateButton).not.toBeDisabled())
    fireEvent.click(generateButton)
    await waitFor(() => expect(createLinkMock).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('https://t.me/Desk_Imperial_bot?start=abc')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /abrir telegram/i }))
    expect(openSpy).toHaveBeenCalledWith('https://t.me/Desk_Imperial_bot?start=abc', '_blank', 'noopener,noreferrer')

    fireEvent.click(screen.getByRole('button', { name: /copiar link/i }))
    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledWith('https://t.me/Desk_Imperial_bot?start=abc'))
    expect(await screen.findByRole('button', { name: /link copiado/i })).toBeInTheDocument()
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

function makeStatus(overrides: Partial<TelegramIntegrationStatusResponse> = {}): TelegramIntegrationStatusResponse {
  return {
    enabled: true,
    workspaceEnabled: true,
    restrictionReason: null,
    botUsername: 'Desk_Imperial_bot',
    deeplinkBase: 'https://t.me/Desk_Imperial_bot',
    linked: false,
    account: null,
    ...overrides,
  }
}

function makePreferences(
  overrides: Partial<NotificationPreferencesResponse> = {},
): NotificationPreferencesResponse {
  return {
    preferences: [
      {
        channel: 'TELEGRAM',
        eventType: 'operations.comanda.status_changed',
        enabled: true,
        inherited: true,
      },
      {
        channel: 'TELEGRAM',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: true,
        inherited: true,
      },
    ],
    ...overrides,
  }
}
