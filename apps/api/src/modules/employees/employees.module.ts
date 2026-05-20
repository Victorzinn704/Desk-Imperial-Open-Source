import { Module } from '@nestjs/common'
import { AdminPinModule } from '../admin-pin/admin-pin.module'
import { AuthModule } from '../auth/auth.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { EmployeesController } from './employees.controller'
import { EmployeesService } from './employees.service'

@Module({
  imports: [AdminPinModule, AuthModule, MonitoringModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
