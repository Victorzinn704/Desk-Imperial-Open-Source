import { Injectable } from '@nestjs/common'
import type { TelegramInlineKeyboardMarkup, TelegramMessageOptions } from './telegram.adapter'
import { TelegramRuntimeService } from './telegram-runtime.service'
import type { OutboundJob } from './telegram-runtime.types'

type TelegramTextRequest = {
  chatId: number | string
  text: string
  options?: TelegramMessageOptions | undefined
  accountId?: string | undefined
}

type TelegramInteractiveRequest = {
  chatId: number | string
  text: string
  keyboard: TelegramInlineKeyboardMarkup
  accountId?: string | undefined
}

type TelegramPhotoRequest = {
  chatId: number | string
  photo: string
  caption: string
  options?: TelegramMessageOptions | undefined
  accountId?: string | undefined
}

type TelegramEditTextRequest = TelegramTextRequest & {
  messageId: number
}

type TelegramCallbackAnswerRequest = {
  callbackQueryId: string
  text?: string | undefined
}

/**
 * Façade que enfileira mensagens outbound em vez de chamar a API do Telegram diretamente.
 * O worker (TelegramOutboundWorker) consome a fila respeitando rate limits e retry de 429.
 */
@Injectable()
export class TelegramOutboundService {
  constructor(private readonly runtime: TelegramRuntimeService) {}

  async sendText(input: TelegramTextRequest) {
    return this.runtime.enqueueOutbound({
      kind: 'sendMessage',
      chatId: input.chatId,
      text: input.text,
      options: input.options as Record<string, unknown> | undefined,
      accountId: input.accountId,
    })
  }

  async sendInteractive(input: TelegramInteractiveRequest) {
    const options: TelegramMessageOptions = {
      disable_web_page_preview: true,
      parse_mode: 'HTML',
      reply_markup: input.keyboard,
    }
    return this.runtime.enqueueOutbound({
      kind: 'sendMessage',
      chatId: input.chatId,
      text: input.text,
      options: options as Record<string, unknown>,
      accountId: input.accountId,
    })
  }

  async sendPhoto(input: TelegramPhotoRequest) {
    return this.runtime.enqueueOutbound({
      kind: 'sendPhoto',
      chatId: input.chatId,
      photo: input.photo,
      caption: input.caption,
      options: input.options as Record<string, unknown> | undefined,
      accountId: input.accountId,
    })
  }

  async editText(input: TelegramEditTextRequest) {
    return this.runtime.enqueueOutbound({
      kind: 'editMessageText',
      chatId: input.chatId,
      messageId: input.messageId,
      text: input.text,
      options: input.options as Record<string, unknown> | undefined,
      accountId: input.accountId,
    })
  }

  async answerCallbackQuery(input: TelegramCallbackAnswerRequest) {
    const job: Omit<OutboundJob, 'attempts' | 'enqueuedAt'> = {
      kind: 'answerCallbackQuery',
      chatId: null,
      callbackQueryId: input.callbackQueryId,
      text: input.text,
    }
    return this.runtime.enqueueOutbound(job)
  }
}
