import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EmployeesModule } from '../employees/employees.module'
import { FinanceModule } from '../finance/finance.module'
import { MailerModule } from '../mailer/mailer.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { OperationsModule } from '../operations/operations.module'
import { OperationsRealtimeModule } from '../operations-realtime.module'
import { TelegramAdapter } from './infra/telegram/telegram.adapter'
import { TelegramRuntimeService } from './infra/telegram/telegram-runtime.service'
import { TelegramOutboundService } from './infra/telegram/telegram-outbound.service'
import { TelegramOutboundWorker } from './infra/telegram/telegram-outbound-worker.service'
import { TelegramInboundWorker } from './infra/telegram/telegram-inbound-worker.service'
import { TelegramWebhookBootstrap } from './infra/telegram/telegram-webhook-bootstrap.service'
import { NotificationPreferencesController } from './notification-preferences.controller'
import { NotificationsController } from './notifications.controller'
import { NotificationPreferencesService } from './notification-preferences.service'
import { NotificationsService } from './notifications.service'
import { TelegramAuthService } from './telegram-auth.service'
import {
  TelegramBotCoreDependencies,
  TelegramBotDomainDependencies,
  TelegramBotRuntimeDependencies,
} from './telegram-bot.dependencies'
import { TelegramBotService } from './telegram-bot.service'
import { TelegramGeminiIntentRouter } from './telegram-gemini-intent-router'
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
    TelegramRuntimeService,
    TelegramOutboundService,
    TelegramOutboundWorker,
    TelegramInboundWorker,
    TelegramWebhookBootstrap,
    NotificationsService,
    NotificationPreferencesService,
    TelegramLinkService,
    TelegramAuthService,
    TelegramBotCoreDependencies,
    TelegramBotDomainDependencies,
    TelegramBotRuntimeDependencies,
    TelegramGeminiIntentRouter,
    TelegramBotService,
  ],
  exports: [NotificationsService, NotificationPreferencesService, TelegramLinkService, TelegramBotService],
})
export class NotificationsModule {}
