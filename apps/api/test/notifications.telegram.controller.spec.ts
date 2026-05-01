import { UnauthorizedException } from '@nestjs/common'
import { NotificationsController } from '../src/modules/notifications/notifications.controller'
import type { TelegramLinkService } from '../src/modules/notifications/telegram-link.service'
import type { TelegramBotService } from '../src/modules/notifications/telegram-bot.service'
import type { TelegramAdapter } from '../src/modules/notifications/infra/telegram/telegram.adapter'
import type { NotificationPreferencesService } from '../src/modules/notifications/notification-preferences.service'

describe('NotificationsController (telegram)', () => {
  const telegramLinkService = {
    createLinkToken: jest.fn(),
    getStatus: jest.fn(),
    unlinkForPortal: jest.fn(),
    getHealth: jest.fn(),
  }

  const telegramBotService = {
    handleWebhookUpdate: jest.fn(async () => {}),
  }

  const telegramAdapter = {
    getWebhookSecret: jest.fn(() => 'telegram-secret'),
  }

  const notificationPreferencesService = {
    listForWorkspace: jest.fn(),
    updateForWorkspace: jest.fn(),
  }

  let controller: NotificationsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new NotificationsController(
      telegramLinkService as unknown as TelegramLinkService,
      telegramBotService as unknown as TelegramBotService,
      telegramAdapter as unknown as TelegramAdapter,
      notificationPreferencesService as unknown as NotificationPreferencesService,
    )
  })

  it('rejeita webhook sem secret válido', async () => {
    const request = {
      body: { update_id: 1 },
      headers: {},
      ip: undefined,
      get: jest.fn(() => null),
    }

    await expect(
      controller.handleWebhook(
        'wrong-secret',
        { update_id: 1 },
        request as never,
        { status: jest.fn(), json: jest.fn() } as never,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('aceita webhook válido e encaminha o update para o bot service', async () => {
    const request = {
      body: { update_id: 2 },
      headers: {},
      ip: undefined,
      get: jest.fn(() => null),
    }

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await controller.handleWebhook('telegram-secret', { update_id: 2 }, request as never, response as never)

    expect(telegramBotService.handleWebhookUpdate).toHaveBeenCalledWith(
      { update_id: 2 },
      expect.objectContaining({ ipAddress: null, userAgent: null }),
    )
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith({ ok: true })
  })
})
