import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminPinController } from './admin-pin.controller'
import { AdminPinGuard } from './admin-pin.guard'
import { AdminPinService } from './admin-pin.service'

@Module({
  imports: [AuthModule],
  controllers: [AdminPinController],
  providers: [AdminPinService, AdminPinGuard],
  exports: [AdminPinService, AdminPinGuard],
})
export class AdminPinModule {}
