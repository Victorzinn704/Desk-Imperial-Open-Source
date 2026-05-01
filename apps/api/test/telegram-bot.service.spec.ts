import type { CacheService } from '../src/common/services/cache.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { OperationsService } from '../src/modules/operations/operations.service'
import type { FinanceService } from '../src/modules/finance/finance.service'
import type { EmployeesService } from '../src/modules/employees/employees.service'
import type { NotificationsService } from '../src/modules/notifications/notifications.service'
import type { TelegramAdapter } from '../src/modules/notifications/infra/telegram/telegram.adapter'
import type { TelegramLinkService } from '../src/modules/notifications/telegram-link.service'
import type { TelegramAuthService } from '../src/modules/notifications/telegram-auth.service'
import { TelegramBotService } from '../src/modules/notifications/telegram-bot.service'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

describe('TelegramBotService', () => {
  const cache = {
    setIfAbsent: jest.fn(async () => true),
    increment: jest.fn(async () => 1),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const operationsService = {
    getSummaryView: jest.fn(),
    getLiveSnapshot: jest.fn(),
  }

  const financeService = {
    getSummaryForUser: jest.fn(),
  }

  const employeesService = {
    listForUser: jest.fn(),
  }

  const notificationsService = {
    getChannelCapabilities: jest.fn(() => [{ channel: 'TELEGRAM', enabled: true, mode: 'outbound' }]),
  }

  const telegramAdapter = {
    getBotToken: jest.fn(() => 'telegram-token'),
    getBotUsername: jest.fn(() => 'Desk_Imperial_bot'),
    isBotEnabled: jest.fn(() => true),
    buildPortalUrl: jest.fn(() => 'https://app.deskimperial.online/app/owner?section=settings'),
    buildBrandPhotoUrl: jest.fn(() => 'https://app.deskimperial.online/icons/icon-512.png'),
    sendTextMessage: jest.fn(async () => ({})),
    sendPhotoMessage: jest.fn(async () => ({})),
    answerCallbackQuery: jest.fn(async () => ({})),
    isBlockedByUserError: jest.fn(() => false),
  }

  const telegramLinkService = {
    consumeStartToken: jest.fn(),
    unlinkChat: jest.fn(async () => 1),
    markAccountBlocked: jest.fn(async () => {}),
  }

  const telegramAuthService = {
    resolveChatAuth: jest.fn(),
    touchAccount: jest.fn(async () => {}),
  }

  let service: TelegramBotService

  beforeEach(() => {
    jest.clearAllMocks()
    cache.setIfAbsent.mockResolvedValue(true)
    cache.increment.mockResolvedValue(1)
    auditLogService.record.mockResolvedValue(undefined)
    telegramAdapter.getBotToken.mockReturnValue('telegram-token')
    telegramAdapter.getBotUsername.mockReturnValue('Desk_Imperial_bot')
    telegramAdapter.isBotEnabled.mockReturnValue(true)
    telegramAdapter.buildPortalUrl.mockReturnValue('https://app.deskimperial.online/app/owner?section=settings')
    telegramAdapter.buildBrandPhotoUrl.mockReturnValue('https://app.deskimperial.online/icons/icon-512.png')
    telegramAdapter.sendTextMessage.mockResolvedValue({})
    telegramAdapter.sendPhotoMessage.mockResolvedValue({})
    telegramAdapter.answerCallbackQuery.mockResolvedValue({})
    telegramAdapter.isBlockedByUserError.mockReturnValue(false)
    telegramLinkService.unlinkChat.mockResolvedValue(1)
    telegramLinkService.markAccountBlocked.mockResolvedValue(undefined)
    telegramAuthService.touchAccount.mockResolvedValue(undefined)

    service = new TelegramBotService(
      cache as unknown as CacheService,
      auditLogService as unknown as AuditLogService,
      operationsService as unknown as OperationsService,
      financeService as unknown as FinanceService,
      employeesService as unknown as EmployeesService,
      notificationsService as unknown as NotificationsService,
      telegramAdapter as unknown as TelegramAdapter,
      telegramLinkService as unknown as TelegramLinkService,
      telegramAuthService as unknown as TelegramAuthService,
    )
  })

  it('responde erro de token inválido no /start', async () => {
    telegramLinkService.consumeStartToken.mockResolvedValue({ ok: false, reason: 'invalid' })

    await service.handleWebhookUpdate(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          text: '/start invalid-token',
          chat: { id: 555, type: 'private' },
          from: { id: 555, is_bot: false, first_name: 'Pedro' },
        },
      } as never,
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(555, '❌ Token inválido. Gere um novo no portal.')
  })

  it('envia onboarding com imagem quando /start chega sem token', async () => {
    await service.handleWebhookUpdate(
      {
        update_id: 11,
        message: {
          message_id: 11,
          date: 1,
          text: '/start',
          chat: { id: 555, type: 'private' },
          from: { id: 555, is_bot: false, first_name: 'Pedro' },
        },
      } as never,
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendPhotoMessage).toHaveBeenCalledWith(
      555,
      'https://app.deskimperial.online/icons/icon-512.png',
      expect.stringContaining('Desk Imperial no Telegram'),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      }),
    )
  })

  it('pede vínculo quando comando protegido chega de chat não vinculado', async () => {
    telegramAuthService.resolveChatAuth.mockResolvedValue({ status: 'unlinked' })

    await service.handleWebhookUpdate(
      {
        update_id: 2,
        message: {
          message_id: 2,
          date: 1,
          text: '/vendas',
          chat: { id: 555, type: 'private' },
          from: { id: 555, is_bot: false, first_name: 'Pedro' },
        },
      } as never,
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(
      555,
      expect.stringContaining('Sua conta não está vinculada'),
    )
  })

  it('bloqueia STAFF no comando /caixa', async () => {
    telegramAuthService.resolveChatAuth.mockResolvedValue({
      status: 'ok',
      accountId: 'tg-account-1',
      workspaceOwnerUserId: 'owner-1',
      telegramChatId: 555n,
      auth: makeStaffAuthContext(),
    })

    await service.handleWebhookUpdate(
      {
        update_id: 3,
        message: {
          message_id: 3,
          date: 1,
          text: '/caixa',
          chat: { id: 555, type: 'private' },
          from: { id: 555, is_bot: false, first_name: 'Pedro' },
        },
      } as never,
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(555, '🔒 Você não tem permissão para este comando.')
  })

  it('executa /vendas para owner usando summary operacional', async () => {
    telegramAuthService.resolveChatAuth.mockResolvedValue({
      status: 'ok',
      accountId: 'tg-account-1',
      workspaceOwnerUserId: 'owner-1',
      telegramChatId: 555n,
      auth: makeOwnerAuthContext(),
    })
    operationsService.getSummaryView.mockResolvedValue({
      businessDate: '2026-04-29',
      companyOwnerId: 'owner-1',
      kpis: {
        receitaRealizada: 1200,
        faturamentoAberto: 300,
        projecaoTotal: 1500,
        lucroRealizado: 400,
        lucroEsperado: 500,
        caixaEsperado: 700,
        openComandasCount: 4,
        openSessionsCount: 1,
      },
      performers: [],
      topProducts: [{ nome: 'Combo Petisco', qtd: 2, valor: 300 }],
    })

    await service.handleWebhookUpdate(
      {
        update_id: 4,
        message: {
          message_id: 4,
          date: 1,
          text: '/vendas',
          chat: { id: 555, type: 'private' },
          from: { id: 555, is_bot: false, first_name: 'Pedro' },
        },
      } as never,
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(operationsService.getSummaryView).toHaveBeenCalled()
    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(
      555,
      expect.stringContaining('📊 Vendas de hoje'),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      }),
    )
  })

  it('ignora update duplicado pelo cache de update_id', async () => {
    cache.setIfAbsent.mockResolvedValue(false)

    await service.handleWebhookUpdate(
      {
        update_id: 5,
        message: {
          message_id: 5,
          date: 1,
          text: '/ajuda',
          chat: { id: 555, type: 'private' },
          from: { id: 555, is_bot: false, first_name: 'Pedro' },
        },
      } as never,
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).not.toHaveBeenCalled()
  })

  it('exige chat privado', async () => {
    await service.handleWebhookUpdate(
      {
        update_id: 6,
        message: {
          message_id: 6,
          date: 1,
          text: '/ajuda',
          chat: { id: -100, type: 'group', title: 'Mesa geral' },
          from: { id: 555, is_bot: false, first_name: 'Pedro' },
        },
      } as never,
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(-100, 'Use o bot no chat privado com o Desk Imperial.')
  })

  it('responde callback do menu e abre a visao de vendas', async () => {
    telegramAuthService.resolveChatAuth.mockResolvedValue({
      status: 'ok',
      accountId: 'tg-account-1',
      workspaceOwnerUserId: 'owner-1',
      telegramChatId: 555n,
      auth: makeOwnerAuthContext(),
    })
    operationsService.getSummaryView.mockResolvedValue({
      businessDate: '2026-04-29',
      companyOwnerId: 'owner-1',
      kpis: {
        receitaRealizada: 1200,
        faturamentoAberto: 300,
        projecaoTotal: 1500,
        lucroRealizado: 400,
        lucroEsperado: 500,
        caixaEsperado: 700,
        openComandasCount: 4,
        openSessionsCount: 1,
      },
      performers: [],
      topProducts: [{ nome: 'Combo Petisco', qtd: 2, valor: 300 }],
    })

    await service.handleWebhookUpdate(
      {
        update_id: 7,
        callback_query: {
          id: 'callback-1',
          from: { id: 555, is_bot: false, first_name: 'Pedro' },
          chat_instance: 'chat-1',
          data: 'menu:vendas',
          message: {
            message_id: 10,
            date: 1,
            chat: { id: 555, type: 'private' },
            text: 'Painel rápido',
          },
        },
      } as never,
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.answerCallbackQuery).toHaveBeenCalledWith('callback-1', undefined)
    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(
      555,
      expect.stringContaining('📊 Vendas de hoje'),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      }),
    )
  })
})
