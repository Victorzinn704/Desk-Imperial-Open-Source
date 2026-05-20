import { z } from 'zod'

export const telegramWebhookSchema = z
  .object({
    update_id: z.number().int().nonnegative(),
  })
  .passthrough()

export type TelegramWebhookDto = z.infer<typeof telegramWebhookSchema>
