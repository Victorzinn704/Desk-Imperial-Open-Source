import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { extractRequestContext } from '../../common/utils/request-context.util'
import { CurrentAuth } from '../auth/decorators/current-auth.decorator'
import type { AuthContext } from '../auth/auth.types'
import { CsrfGuard } from '../auth/guards/csrf.guard'
import { SessionGuard } from '../auth/guards/session.guard'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { UpdateEmployeeDto } from './dto/update-employee.dto'
import { EmployeesService } from './employees.service'

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @UseGuards(SessionGuard)
  @Get()
  listEmployees(@CurrentAuth() auth: AuthContext) {
    return this.employeesService.listForUser(auth)
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post()
  createEmployee(@CurrentAuth() auth: AuthContext, @Body() body: CreateEmployeeDto, @Req() request: Request) {
    return this.employeesService.createForUser(auth, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Patch(':employeeId')
  updateEmployee(
    @CurrentAuth() auth: AuthContext,
    @Param('employeeId') employeeId: string,
    @Body() body: UpdateEmployeeDto,
    @Req() request: Request,
  ) {
    return this.employeesService.updateForUser(auth, employeeId, body, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Delete(':employeeId')
  archiveEmployee(@CurrentAuth() auth: AuthContext, @Param('employeeId') employeeId: string, @Req() request: Request) {
    return this.employeesService.archiveForUser(auth, employeeId, extractRequestContext(request))
  }

  @UseGuards(SessionGuard, CsrfGuard)
  @Post(':employeeId/restore')
  restoreEmployee(@CurrentAuth() auth: AuthContext, @Param('employeeId') employeeId: string, @Req() request: Request) {
    return this.employeesService.restoreForUser(auth, employeeId, extractRequestContext(request))
  }
}
