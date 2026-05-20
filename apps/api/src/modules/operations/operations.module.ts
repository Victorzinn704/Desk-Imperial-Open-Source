import { Module } from '@nestjs/common'
import { CacheModule } from '../../cache/cache.module'
import { PrismaModule } from '../../database/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { FinanceModule } from '../finance/finance.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { OperationsRealtimeModule } from '../operations-realtime.module'
import { OperationsController } from './operations.controller'
import { OperationsService } from './operations.service'
import { CashSessionService } from './cash-session.service'
import { ComandaCommandFacadeService } from './comanda-command-facade.service'
import { ComandaItemsDispatchService } from './comanda-items-dispatch.service'
import { ComandaItemsService } from './comanda-items.service'
import { ComandaKitchenDispatchService } from './comanda-kitchen-dispatch.service'
import { ComandaKitchenService } from './comanda-kitchen.service'
import { ComandaLifecycleService } from './comanda-lifecycle.service'
import { ComandaMutationContextService } from './comanda-mutation-context.service'
import { ComandaOpenService } from './comanda-open.service'
import { ComandaQueryService } from './comanda-query.service'
import { ComandaRealtimePublisher } from './comanda-realtime-publisher.service'
import { ComandaService } from './comanda.service'
import { ComandaSettlementService } from './comanda-settlement.service'
import { ComandaTerminalPaymentReconcileService } from './comanda-terminal-payment-reconcile.service'
import { ComandaTerminalPaymentProviderService } from './comanda-terminal-payment-provider.service'
import { ComandaTerminalPaymentService } from './comanda-terminal-payment.service'
import { MercadoPagoPointClient } from './mercado-pago-point.client'
import { MercadoPagoTerminalOrderRuntime } from './mercado-pago-terminal-order-runtime.service'
import { MercadoPagoTerminalOrderWorker } from './mercado-pago-terminal-order-worker.service'
import { MercadoPagoWebhookController } from './mercado-pago-webhook.controller'
import { MercadoPagoWebhookRuntime } from './mercado-pago-webhook-runtime.service'
import { MercadoPagoWebhookWorker } from './mercado-pago-webhook-worker.service'
import { OperationsHelpersService } from './operations-helpers.service'

@Module({
  imports: [AuthModule, PrismaModule, CacheModule, MonitoringModule, OperationsRealtimeModule, FinanceModule],
  controllers: [OperationsController, MercadoPagoWebhookController],
  providers: [
    OperationsHelpersService,
    CashSessionService,
    ComandaMutationContextService,
    ComandaRealtimePublisher,
    ComandaQueryService,
    ComandaOpenService,
    ComandaItemsDispatchService,
    ComandaItemsService,
    ComandaLifecycleService,
    ComandaSettlementService,
    ComandaKitchenDispatchService,
    ComandaKitchenService,
    MercadoPagoPointClient,
    MercadoPagoTerminalOrderRuntime,
    MercadoPagoTerminalOrderWorker,
    MercadoPagoWebhookRuntime,
    MercadoPagoWebhookWorker,
    ComandaTerminalPaymentProviderService,
    ComandaTerminalPaymentService,
    ComandaTerminalPaymentReconcileService,
    ComandaCommandFacadeService,
    ComandaService,
    OperationsService,
  ],
  exports: [OperationsService],
})
export class OperationsModule {}
