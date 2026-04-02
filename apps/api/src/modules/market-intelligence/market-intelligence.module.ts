import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { FinanceModule } from '../finance/finance.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { MarketIntelligenceController } from './market-intelligence.controller'
import { MarketIntelligenceService } from './market-intelligence.service'

@Module({
  imports: [AuthModule, FinanceModule, MonitoringModule],
  controllers: [MarketIntelligenceController],
  providers: [MarketIntelligenceService],
})
export class MarketIntelligenceModule {}
