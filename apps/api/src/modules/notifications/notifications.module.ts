import { Module } from '@nestjs/common'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { TelegramAdapter } from './infra/telegram/telegram.adapter'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [MonitoringModule],
  providers: [TelegramAdapter, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
