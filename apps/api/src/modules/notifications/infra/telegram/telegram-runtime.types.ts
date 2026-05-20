import type { Update } from 'grammy/types'

export type InboundJob = {
  update: Update
  ipAddress: string | null
  userAgent: string | null
  receivedAt: string
  attempts: number
}

export type OutboundJob = {
  kind: 'sendMessage' | 'sendPhoto' | 'editMessageText' | 'answerCallbackQuery'
  chatId: number | string | null
  callbackQueryId?: string | undefined
  text?: string | undefined
  caption?: string | undefined
  photo?: string | undefined
  messageId?: number | undefined
  options?: Record<string, unknown> | undefined
  accountId?: string | undefined
  attempts: number
  enqueuedAt: string
}
