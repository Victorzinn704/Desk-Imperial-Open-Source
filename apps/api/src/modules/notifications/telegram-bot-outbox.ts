import type { Logger } from '@nestjs/common'
import type {
  TelegramAdapter,
  TelegramInlineKeyboardMarkup,
  TelegramMessageOptions,
} from './infra/telegram/telegram.adapter'
import type { TelegramOutboundService } from './infra/telegram/telegram-outbound.service'
import type { TelegramRuntimeService } from './infra/telegram/telegram-runtime.service'
import type { TelegramLinkService } from './telegram-link.service'

export type TelegramInteractiveMessageTarget = {
  chatId: number
  accountId?: string | undefined
  view?: TelegramInteractiveView | undefined
}

export type TelegramInteractiveView = 'alerts' | 'cash' | 'home' | 'portal' | 'report' | 'sales' | 'status' | 'team'

type TelegramBotOutboxDependencies = {
  adapter: TelegramAdapter
  linkService: TelegramLinkService
  logger: Logger
  outbound: TelegramOutboundService
  runtime: TelegramRuntimeService
}

export class TelegramBotOutbox {
  constructor(private readonly deps: TelegramBotOutboxDependencies) {}

  async sendText(chatId: number, text: string, accountId?: string) {
    if (this.deps.runtime.isReady()) {
      await this.deps.outbound.sendText({ accountId, chatId, text })
      return
    }

    await this.sendWithBlockedUserHandling({
      accountId,
      chatId,
      description: 'mensagem Telegram',
      send: () => this.deps.adapter.sendTextMessage(chatId, text),
    })
  }

  async sendInteractive(target: TelegramInteractiveMessageTarget, text: string) {
    if (this.deps.runtime.isReady()) {
      await this.deps.outbound.sendInteractive({
        accountId: target.accountId,
        chatId: target.chatId,
        keyboard: this.buildKeyboard(target.view),
        text,
      })
      return
    }

    await this.sendWithBlockedUserHandling({
      accountId: target.accountId,
      chatId: target.chatId,
      description: 'mensagem interativa Telegram',
      send: () =>
        this.deps.adapter.sendTextMessage(target.chatId, text, this.buildInteractiveMessageOptions(target.view)),
    })
  }

  async sendOnboarding(target: TelegramInteractiveMessageTarget, text: string) {
    const brandPhotoUrl = this.deps.adapter.buildBrandPhotoUrl()
    if (!brandPhotoUrl) {
      await this.sendInteractive(target, text)
      return
    }

    if (this.deps.runtime.isReady()) {
      await this.deps.outbound.sendPhoto({
        accountId: target.accountId,
        caption: text,
        chatId: target.chatId,
        options: this.buildInteractiveMessageOptions(target.view),
        photo: brandPhotoUrl,
      })
      return
    }

    const sent = await this.sendWithBlockedUserHandling({
      accountId: target.accountId,
      chatId: target.chatId,
      description: 'onboarding Telegram com imagem',
      send: () =>
        this.deps.adapter.sendPhotoMessage(
          target.chatId,
          brandPhotoUrl,
          text,
          this.buildInteractiveMessageOptions(target.view),
        ),
    })

    if (!sent) {
      await this.sendInteractive(target, text)
    }
  }

  async answerCallback(callbackQueryId: string, text?: string) {
    try {
      await this.deps.adapter.answerCallbackQuery(callbackQueryId, text)
    } catch (error) {
      this.deps.logger.warn(
        `Falha ao responder callback do Telegram: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  private async sendWithBlockedUserHandling(input: {
    accountId?: string | undefined
    chatId: number
    description: string
    send: () => Promise<unknown>
  }) {
    try {
      await input.send()
      return true
    } catch (error) {
      if (input.accountId && this.deps.adapter.isBlockedByUserError(error)) {
        await this.deps.linkService.markAccountBlocked(input.accountId)
        return true
      }

      this.deps.logger.warn(
        `Falha ao enviar ${input.description} para ${input.chatId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      )
      return false
    }
  }

  private buildInteractiveMessageOptions(view: TelegramInteractiveView = 'home'): TelegramMessageOptions {
    return {
      disable_web_page_preview: true,
      parse_mode: 'HTML',
      reply_markup: this.buildKeyboard(view),
    }
  }

  private buildKeyboard(view: TelegramInteractiveView = 'home'): TelegramInlineKeyboardMarkup {
    const portalUrl = this.deps.adapter.buildPortalUrl('/app')
    const portalRow = portalUrl
      ? [
          { text: '🌐 Abrir portal', url: portalUrl },
          { text: '🔌 Desvincular', callback_data: 'menu:desvincular' },
        ]
      : [{ text: '🔌 Desvincular', callback_data: 'menu:desvincular' }]
    const homeRow = [{ text: '🏠 Menu inicial', callback_data: 'menu:home' }]

    if (view !== 'home') {
      return {
        inline_keyboard: [...buildContextRows(view), portalRow, homeRow],
      }
    }

    return {
      inline_keyboard: [
        [
          { text: '📊 Vendas', callback_data: 'menu:vendas' },
          { text: '💰 Caixa', callback_data: 'menu:caixa' },
        ],
        [
          { text: '📈 Relatório', callback_data: 'menu:relatorio' },
          { text: '👥 Equipe', callback_data: 'menu:equipe' },
        ],
        [
          { text: '🔔 Alertas', callback_data: 'menu:alertas' },
          { text: '🧭 Status', callback_data: 'menu:status' },
        ],
        portalRow,
      ],
    }
  }
}

function buildContextRows(view: TelegramInteractiveView): TelegramInlineKeyboardMarkup['inline_keyboard'] {
  const rows: Record<TelegramInteractiveView, TelegramInlineKeyboardMarkup['inline_keyboard']> = {
    alerts: [
      [
        { text: '🧭 Status do bot', callback_data: 'menu:status' },
        { text: '📊 Vendas', callback_data: 'menu:vendas' },
      ],
    ],
    cash: [
      [
        { text: '🔄 Atualizar caixa', callback_data: 'menu:caixa' },
        { text: '📈 Relatório', callback_data: 'menu:relatorio' },
      ],
    ],
    home: [],
    portal: [
      [
        { text: '🧭 Status', callback_data: 'menu:status' },
        { text: '🔔 Alertas', callback_data: 'menu:alertas' },
      ],
    ],
    report: [
      [
        { text: '📊 Vendas hoje', callback_data: 'menu:vendas' },
        { text: '💰 Caixa', callback_data: 'menu:caixa' },
      ],
    ],
    sales: [
      [
        { text: '🔄 Atualizar vendas', callback_data: 'menu:vendas' },
        { text: '💰 Caixa', callback_data: 'menu:caixa' },
      ],
      [{ text: '📈 Relatório financeiro', callback_data: 'menu:relatorio' }],
    ],
    status: [
      [
        { text: '🔔 Alertas', callback_data: 'menu:alertas' },
        { text: '📊 Vendas', callback_data: 'menu:vendas' },
      ],
    ],
    team: [
      [
        { text: '📊 Vendas', callback_data: 'menu:vendas' },
        { text: '💰 Caixa', callback_data: 'menu:caixa' },
      ],
    ],
  }

  return rows[view]
}
