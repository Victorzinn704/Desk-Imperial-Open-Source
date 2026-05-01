import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { IntelligencePlatformController } from './intelligence-platform.controller'
import { IntelligencePlatformService } from './intelligence-platform.service'

@Module({
  imports: [AuthModule, MonitoringModule, NotificationsModule],
  controllers: [IntelligencePlatformController],
  providers: [IntelligencePlatformService],
  exports: [IntelligencePlatformService],
})
export class IntelligencePlatformModule {}
