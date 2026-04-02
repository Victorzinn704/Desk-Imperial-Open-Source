import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminPinModule } from '../admin-pin/admin-pin.module'
import { FinanceModule } from '../finance/finance.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [AuthModule, MonitoringModule, AdminPinModule, FinanceModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
