import { TelegramBotService } from '../src/modules/notifications/telegram-bot.service'
import {
  buildOperationsSummaryView,
  buildOwnerTelegramResolution,
  buildStaffTelegramResolution,
  buildTelegramCallbackUpdate,
  buildTelegramGroupTextUpdate,
  buildTelegramTextUpdate,
  cache,
  createTelegramBotService,
  operationsService,
  resetTelegramBotTestDoubles,
  telegramAdapter,
  telegramAuthService,
  telegramLinkService,
} from './telegram-bot.service.fixtures'
import { makeRequestContext } from './helpers/request-context.factory'

describe('TelegramBotService', () => {
  let service: TelegramBotService

  beforeEach(() => {
    resetTelegramBotTestDoubles()
    service = createTelegramBotService()
  })

  it('responde erro de token inválido no /start', async () => {
    telegramLinkService.consumeStartToken.mockResolvedValue({ ok: false, reason: 'invalid' })

    await service.handleWebhookUpdate(
      buildTelegramTextUpdate({ updateId: 1, text: '/start invalid-token' }),
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(555, '❌ Token inválido. Gere um novo no portal.')
  })

  it('envia onboarding com imagem quando /start chega sem token', async () => {
    await service.handleWebhookUpdate(
      buildTelegramTextUpdate({ updateId: 11, text: '/start' }),
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
      buildTelegramTextUpdate({ updateId: 2, text: '/vendas' }),
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(
      555,
      expect.stringContaining('Sua conta não está vinculada'),
    )
  })

  it('bloqueia STAFF no comando /caixa', async () => {
    telegramAuthService.resolveChatAuth.mockResolvedValue(buildStaffTelegramResolution())

    await service.handleWebhookUpdate(
      buildTelegramTextUpdate({ updateId: 3, text: '/caixa' }),
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(555, '🔒 Você não tem permissão para este comando.')
  })

  it('executa /vendas para owner usando summary operacional', async () => {
    telegramAuthService.resolveChatAuth.mockResolvedValue(buildOwnerTelegramResolution())
    operationsService.getSummaryView.mockResolvedValue(buildOperationsSummaryView())

    await service.handleWebhookUpdate(
      buildTelegramTextUpdate({ updateId: 4, text: '/vendas' }),
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
      buildTelegramTextUpdate({ updateId: 5, text: '/ajuda' }),
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).not.toHaveBeenCalled()
  })

  it('exige chat privado', async () => {
    await service.handleWebhookUpdate(
      buildTelegramGroupTextUpdate({ updateId: 6, text: '/ajuda' }),
      makeRequestContext({ userAgent: 'telegram-webhook' }),
    )

    expect(telegramAdapter.sendTextMessage).toHaveBeenCalledWith(-100, 'Use o bot no chat privado com o Desk Imperial.')
  })

  it('responde callback do menu e abre a visao de vendas', async () => {
    telegramAuthService.resolveChatAuth.mockResolvedValue(buildOwnerTelegramResolution())
    operationsService.getSummaryView.mockResolvedValue(buildOperationsSummaryView())

    await service.handleWebhookUpdate(
      buildTelegramCallbackUpdate({ updateId: 7, callbackId: 'callback-1', data: 'menu:vendas' }),
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
