import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CacheModule } from '../../cache/cache.module'
import { FinanceModule } from '../finance/finance.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { ProductsController } from './products.controller'
import { ProductsSmartDraftService } from './products-smart-draft.service'
import { ProductsService } from './products.service'

@Module({
  imports: [AuthModule, MonitoringModule, FinanceModule, CacheModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsSmartDraftService],
  exports: [ProductsService],
})
export class ProductsModule {}
