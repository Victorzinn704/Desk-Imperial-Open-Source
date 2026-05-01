import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EmployeesModule } from '../employees/employees.module'
import { FinanceModule } from '../finance/finance.module'
import { MailerModule } from '../mailer/mailer.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { OperationsModule } from '../operations/operations.module'
import { OperationsRealtimeModule } from '../operations-realtime.module'
import { TelegramAdapter } from './infra/telegram/telegram.adapter'
import { NotificationPreferencesController } from './notification-preferences.controller'
import { NotificationsController } from './notifications.controller'
import { NotificationPreferencesService } from './notification-preferences.service'
import { NotificationsService } from './notifications.service'
import { TelegramAuthService } from './telegram-auth.service'
import { TelegramBotService } from './telegram-bot.service'
import { TelegramLinkService } from './telegram-link.service'

@Module({
  imports: [
    AuthModule,
    EmployeesModule,
    FinanceModule,
    MailerModule,
    MonitoringModule,
    OperationsModule,
    OperationsRealtimeModule,
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    TelegramAdapter,
    NotificationsService,
    NotificationPreferencesService,
    TelegramLinkService,
    TelegramAuthService,
    TelegramBotService,
  ],
  exports: [NotificationsService, NotificationPreferencesService, TelegramLinkService, TelegramBotService],
})
export class NotificationsModule {}
