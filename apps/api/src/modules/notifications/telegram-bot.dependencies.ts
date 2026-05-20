import { Injectable } from '@nestjs/common'
import { CacheService } from '../../common/services/cache.service'
import { EmployeesService } from '../employees/employees.service'
import { FinanceService } from '../finance/finance.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsService } from '../operations/operations.service'
import { TelegramAdapter } from './infra/telegram/telegram.adapter'
import { TelegramOutboundService } from './infra/telegram/telegram-outbound.service'
import { TelegramRuntimeService } from './infra/telegram/telegram-runtime.service'
import { NotificationsService } from './notifications.service'
import { TelegramAuthService } from './telegram-auth.service'
import { TelegramLinkService } from './telegram-link.service'

@Injectable()
export class TelegramBotCoreDependencies {
  constructor(
    readonly cache: CacheService,
    readonly auditLogService: AuditLogService,
    readonly telegramAdapter: TelegramAdapter,
    readonly telegramLinkService: TelegramLinkService,
    readonly telegramAuthService: TelegramAuthService,
  ) {}
}

@Injectable()
export class TelegramBotDomainDependencies {
  constructor(
    readonly operationsService: OperationsService,
    readonly financeService: FinanceService,
    readonly employeesService: EmployeesService,
    readonly notificationsService: NotificationsService,
  ) {}
}

@Injectable()
export class TelegramBotRuntimeDependencies {
  constructor(
    readonly telegramOutbound: TelegramOutboundService,
    readonly telegramRuntime: TelegramRuntimeService,
  ) {}
}
