import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { UpdateEmployeeDto } from './dto/update-employee.dto'
import { toEmployeeRecord } from './employees.types'

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listForUser(auth: AuthContext) {
    const items = await this.prisma.employee.findMany({
      where: {
        userId: auth.userId,
      },
      orderBy: [{ active: 'desc' }, { employeeCode: 'asc' }],
    })

    return {
      items: items.map(toEmployeeRecord),
      totals: {
        totalEmployees: items.length,
        activeEmployees: items.filter((item) => item.active).length,
      },
    }
  }

  async createForUser(auth: AuthContext, dto: CreateEmployeeDto, context: RequestContext) {
    try {
      const employee = await this.prisma.employee.create({
        data: {
          userId: auth.userId,
          employeeCode: sanitizeEmployeeCode(dto.employeeCode),
          displayName: sanitizePlainText(dto.displayName, 'Nome do funcionario', {
            allowEmpty: false,
            rejectFormula: true,
          })!,
          active: true,
        },
      })

      await this.auditLogService.record({
        actorUserId: auth.userId,
        event: 'employee.created',
        resource: 'employee',
        resourceId: employee.id,
        metadata: {
          employeeCode: employee.employeeCode,
          displayName: employee.displayName,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      return {
        employee: toEmployeeRecord(employee),
      }
    } catch (error) {
      handleEmployeeConflict(error)
    }
  }

  async updateForUser(auth: AuthContext, employeeId: string, dto: UpdateEmployeeDto, context: RequestContext) {
    const existingEmployee = await this.requireOwnedEmployee(auth.userId, employeeId)

    try {
      const employee = await this.prisma.employee.update({
        where: { id: existingEmployee.id },
        data: {
          ...(dto.employeeCode !== undefined ? { employeeCode: sanitizeEmployeeCode(dto.employeeCode) } : {}),
          ...(dto.displayName !== undefined
            ? {
                displayName: sanitizePlainText(dto.displayName, 'Nome do funcionario', {
                  allowEmpty: false,
                  rejectFormula: true,
                })!,
              }
            : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      })

      await this.auditLogService.record({
        actorUserId: auth.userId,
        event: 'employee.updated',
        resource: 'employee',
        resourceId: employee.id,
        metadata: {
          updatedFields: Object.keys(dto),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      return {
        employee: toEmployeeRecord(employee),
      }
    } catch (error) {
      handleEmployeeConflict(error)
    }
  }

  async archiveForUser(auth: AuthContext, employeeId: string, context: RequestContext) {
    return this.toggleActiveState(auth, employeeId, false, context)
  }

  async restoreForUser(auth: AuthContext, employeeId: string, context: RequestContext) {
    return this.toggleActiveState(auth, employeeId, true, context)
  }

  private async toggleActiveState(
    auth: AuthContext,
    employeeId: string,
    active: boolean,
    context: RequestContext,
  ) {
    const existingEmployee = await this.requireOwnedEmployee(auth.userId, employeeId)
    const employee = await this.prisma.employee.update({
      where: { id: existingEmployee.id },
      data: { active },
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: active ? 'employee.restored' : 'employee.archived',
      resource: 'employee',
      resourceId: employee.id,
      metadata: {
        employeeCode: employee.employeeCode,
        active,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      employee: toEmployeeRecord(employee),
    }
  }

  private async requireOwnedEmployee(userId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        userId,
      },
    })

    if (!employee) {
      throw new NotFoundException('Funcionario nao encontrado para esta conta.')
    }

    return employee
  }
}

function sanitizeEmployeeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function handleEmployeeConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('Ja existe um funcionario com este ID para a sua conta.')
  }

  throw error
}
