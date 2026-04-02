import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { FinanceModule } from '../finance/finance.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'

@Module({
  imports: [AuthModule, MonitoringModule, FinanceModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
