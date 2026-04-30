import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { NotificationChannelCapability } from '../../notifications.types'

@Injectable()
export class TelegramAdapter {
  constructor(private readonly configService: ConfigService) {}

  describeCapability(): NotificationChannelCapability {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN')?.trim()

    if (!token) {
      return {
        channel: 'TELEGRAM',
        enabled: false,
        mode: 'disabled',
        reason: 'TELEGRAM_BOT_TOKEN ausente.',
      }
    }

    return {
      channel: 'TELEGRAM',
      enabled: true,
      mode: 'outbound',
    }
  }
}
