import type { Context } from 'grammy'
import type { RequestContext } from '../../common/utils/request-context.util'
import type { TelegramBotCommandAuth } from './telegram-bot-command-auth'
import type { TelegramInteractiveMessageTarget } from './telegram-bot-outbox'
import type { TelegramLinkService } from './telegram-link.service'
import { escapeTelegramHtml } from './telegram-message-format'

type TelegramBotStartCommandDependencies = {
  auth: TelegramBotCommandAuth
  getCurrentRequestContext: () => RequestContext
  sendOnboarding: (target: TelegramInteractiveMessageTarget, text: string) => Promise<void>
  sendText: (chatId: number, text: string, accountId?: string) => Promise<void>
  telegramLinkService: TelegramLinkService
}

export class TelegramBotStartCommand {
  constructor(private readonly deps: TelegramBotStartCommandDependencies) {}

  async handle(ctx: Context) {
    const chatId = ctx.chat?.id
    const from = ctx.from
    if (!(chatId && from)) {
      return
    }

    const token = extractCommandPayload(ctx.message?.text)
    if (!token) {
      await this.sendOnboarding(chatId)
      return
    }

    const result = await this.deps.telegramLinkService.consumeStartToken(
      token,
      BigInt(chatId),
      BigInt(from.id),
      from.username ?? null,
      this.deps.getCurrentRequestContext(),
    )

    if (!result.ok) {
      await this.handleRejectedToken(chatId, from.id, result.reason)
      return
    }

    const label = escapeTelegramHtml(result.companyName?.trim() || 'seu workspace')
    await this.deps.sendOnboarding(
      { chatId },
      [`✅ Telegram conectado à conta ${label}.`, '', 'Use os atalhos abaixo para navegar sem decorar comandos.'].join(
        '\n',
      ),
    )
  }

  private async sendOnboarding(chatId: number) {
    await this.deps.sendOnboarding(
      { chatId },
      [
        'Desk Imperial no Telegram',
        '',
        '1. Abra o portal do Desk Imperial.',
        '2. Entre em Configurações → Conta.',
        "3. Gere o vínculo em 'Conectar Telegram'.",
        '',
        'Depois disso, este chat acompanha operação, caixa, vendas e equipe com atalhos interativos.',
      ].join('\n'),
    )
  }

  private async handleRejectedToken(chatId: number, telegramUserId: number, reason: string) {
    const invalidTokenMessage = '❌ Token inválido. Gere um novo no portal.'
    const messages: Record<string, string> = {
      invalid: invalidTokenMessage,
      expired: '⏱ Token expirado. Gere um novo no portal.',
      already_used: '⚠️ Este token já foi usado. Gere um novo no portal.',
      workspace_disabled: '🔒 O bot do Telegram ainda não foi liberado para este workspace.',
    }

    await this.deps.sendText(chatId, messages[reason] ?? invalidTokenMessage)
    await this.deps.auth.recordRejectedLinkToken(chatId, telegramUserId, reason)
  }
}

function extractCommandPayload(text: string | undefined) {
  if (!text) {
    return ''
  }

  const normalized = text.trim()
  if (!normalized.startsWith('/')) {
    return ''
  }

  const [, ...rest] = normalized.split(/\s+/)
  return rest.join(' ').trim()
}
