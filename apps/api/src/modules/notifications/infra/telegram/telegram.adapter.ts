import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Api } from 'grammy'
import type { NotificationChannelCapability } from '../../notifications.types'
import { normalizeOrigin } from '../../../../common/utils/origin.util'

export type TelegramInlineButton = {
  text: string
  callback_data?: string
  url?: string
}

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: TelegramInlineButton[][]
}

export type TelegramMessageOptions = {
  reply_markup?: TelegramInlineKeyboardMarkup
  disable_web_page_preview?: boolean
}

export type TelegramBotCommand = {
  command: string
  description: string
}

@Injectable()
export class TelegramAdapter {
  private api: Api | null = null

  constructor(private readonly configService: ConfigService) {}

  isBotEnabled() {
    const token = this.getBotToken()
    const enabledFlag = this.configService.get<string>('TELEGRAM_BOT_ENABLED')
    const enabledByFlag = enabledFlag === undefined ? true : enabledFlag === 'true'
    return Boolean(token) && enabledByFlag
  }

  isWorkspaceEnabled(workspaceOwnerUserId: string) {
    if (!this.isBotEnabled()) {
      return false
    }

    const allowlist = this.getAllowedWorkspaceOwnerIds()
    return allowlist.length === 0 || allowlist.includes(workspaceOwnerUserId)
  }

  getBotToken() {
    return this.configService.get<string>('TELEGRAM_BOT_TOKEN')?.trim() || null
  }

  getBotUsername() {
    const username = this.configService.get<string>('TELEGRAM_BOT_USERNAME')?.trim() || null
    return username ? username.replace(/^@/, '') : null
  }

  getWebhookSecret() {
    return this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET')?.trim() || null
  }

  getWebhookUrl() {
    return this.configService.get<string>('TELEGRAM_WEBHOOK_URL')?.trim() || null
  }

  getAllowedWorkspaceOwnerIds() {
    return (this.configService.get<string>('TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }

  buildDeeplink(token: string) {
    const username = this.getBotUsername()
    if (!username) {
      throw new ServiceUnavailableException('TELEGRAM_BOT_USERNAME ausente.')
    }

    return `https://t.me/${username}?start=${token}`
  }

  buildPortalUrl(path = '/app/owner?section=settings') {
    const baseUrl =
      normalizeOrigin(this.configService.get<string>('APP_URL')) ??
      normalizeOrigin(this.configService.get<string>('NEXT_PUBLIC_APP_URL'))

    if (!baseUrl) {
      return null
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrl}${normalizedPath}`
  }

  buildBrandPhotoUrl() {
    return this.buildPortalUrl('/icons/icon-512.png')
  }

  buildBotDescription() {
    return 'Gestão operacional do Desk Imperial no Telegram. Consulte vendas, caixa, equipe, alertas e acompanhe a operação com atalhos rápidos.'
  }

  buildBotShortDescription() {
    return 'Operação, vendas e alertas do Desk Imperial.'
  }

  buildDefaultCommands(): TelegramBotCommand[] {
    return [
      { command: 'start', description: 'Vincular a conta ou iniciar o bot' },
      { command: 'menu', description: 'Abrir o painel rápido com atalhos' },
      { command: 'vendas', description: 'Resumo das vendas de hoje' },
      { command: 'caixa', description: 'Status do caixa atual' },
      { command: 'relatorio', description: 'Relatório financeiro do período' },
      { command: 'equipe', description: 'Visão rápida da equipe ativa' },
      { command: 'alertas', description: 'Canais e eventos operacionais ativos' },
      { command: 'status', description: 'Status do vínculo e do acesso' },
      { command: 'portal', description: 'Abrir o portal do Desk Imperial' },
      { command: 'desvincular', description: 'Remover este chat da conta' },
    ]
  }

  describeCapability(): NotificationChannelCapability {
    const token = this.getBotToken()
    if (!token) {
      return {
        channel: 'TELEGRAM',
        enabled: false,
        mode: 'disabled',
        reason: 'TELEGRAM_BOT_TOKEN ausente.',
      }
    }
    if (!this.isBotEnabled()) {
      return {
        channel: 'TELEGRAM',
        enabled: false,
        mode: 'disabled',
        reason: 'TELEGRAM_BOT_ENABLED=false.',
      }
    }

    return {
      channel: 'TELEGRAM',
      enabled: true,
      mode: 'outbound',
    }
  }

  async sendTextMessage(chatId: bigint | number | string, text: string, options?: TelegramMessageOptions) {
    return this.getApi().sendMessage(this.normalizeChatId(chatId), text, options as never)
  }

  async sendPhotoMessage(
    chatId: bigint | number | string,
    photo: string,
    caption: string,
    options?: TelegramMessageOptions,
  ) {
    return this.getApi().sendPhoto(this.normalizeChatId(chatId), photo, {
      caption,
      ...options,
    } as never)
  }

  async editTextMessage(
    chatId: bigint | number | string,
    messageId: number,
    text: string,
    options?: TelegramMessageOptions,
  ) {
    return this.getApi().editMessageText(this.normalizeChatId(chatId), messageId, text, options as never)
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string) {
    return this.getApi().answerCallbackQuery(callbackQueryId, text ? { text } : undefined)
  }

  async setMyName(name: string) {
    return this.getApi().setMyName(name)
  }

  async setMyDescription(description: string) {
    return this.getApi().setMyDescription(description)
  }

  async setMyShortDescription(shortDescription: string) {
    return this.getApi().setMyShortDescription(shortDescription)
  }

  async setMyCommands(commands: TelegramBotCommand[]) {
    return this.getApi().setMyCommands(commands as never)
  }

  async setChatMenuButton() {
    return this.getApi().setChatMenuButton({
      menu_button: {
        type: 'commands',
      },
    } as never)
  }

  async getWebhookInfo() {
    return this.getApi().getWebhookInfo()
  }

  isBlockedByUserError(error: unknown) {
    if (!error || typeof error !== 'object') {
      return false
    }

    const maybeDescription = this.resolveErrorDescription(error)

    const maybeCode = 'error_code' in error && typeof error.error_code === 'number' ? error.error_code : null
    return maybeCode === 403 || maybeDescription.includes('bot was blocked by the user')
  }

  private resolveErrorDescription(error: object) {
    if ('description' in error && typeof error.description === 'string') {
      return error.description.toLowerCase()
    }

    if ('message' in error && typeof error.message === 'string') {
      return error.message.toLowerCase()
    }

    return ''
  }

  private getApi() {
    if (this.api) {
      return this.api
    }

    const token = this.getBotToken()
    if (!token) {
      throw new ServiceUnavailableException('TELEGRAM_BOT_TOKEN ausente.')
    }

    this.api = new Api(token)
    return this.api
  }

  private normalizeChatId(chatId: bigint | number | string) {
    if (typeof chatId === 'bigint') {
      return Number(chatId)
    }

    if (typeof chatId === 'string') {
      return /^\d+$/.test(chatId) ? Number(chatId) : chatId
    }

    return chatId
  }
}
