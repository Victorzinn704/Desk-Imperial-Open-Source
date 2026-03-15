import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [AuthModule, MonitoringModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
