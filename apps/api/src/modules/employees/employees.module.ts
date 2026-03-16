import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { EmployeesController } from './employees.controller'
import { EmployeesService } from './employees.service'

@Module({
  imports: [AuthModule, MonitoringModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
