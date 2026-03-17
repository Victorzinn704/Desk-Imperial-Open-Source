import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { FinanceController } from './finance.controller'
import { FinanceService } from './finance.service'
import { PillarsService } from './pillars.service'

@Module({
  imports: [AuthModule],
  controllers: [FinanceController],
  providers: [FinanceService, PillarsService],
  exports: [FinanceService, PillarsService],
})
export class FinanceModule {}
