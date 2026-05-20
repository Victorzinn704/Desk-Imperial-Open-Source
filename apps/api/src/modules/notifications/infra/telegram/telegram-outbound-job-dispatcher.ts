import type { TelegramAdapter } from './telegram.adapter'
import type { OutboundJob } from './telegram-runtime.types'

export async function executeTelegramOutboundJob(adapter: TelegramAdapter, job: OutboundJob) {
  if (job.kind === 'answerCallbackQuery') {
    if (!job.callbackQueryId) {
      return
    }
    await adapter.answerCallbackQuery(job.callbackQueryId, job.text)
    return
  }

  if (job.chatId === null) {
    return
  }

  if (job.kind === 'sendPhoto') {
    await adapter.sendPhotoMessage(job.chatId, job.photo ?? '', job.caption ?? '', job.options as never)
    return
  }

  if (job.kind === 'editMessageText') {
    if (job.messageId === undefined) {
      return
    }
    await adapter.editTextMessage(job.chatId, job.messageId, job.text ?? '', job.options as never)
    return
  }

  await adapter.sendTextMessage(job.chatId, job.text ?? '', job.options as never)
}
