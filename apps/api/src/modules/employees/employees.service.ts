import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, UserRole, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { CacheService } from '../../common/services/cache.service'
import { CreateEmployeeDto } from './dto/create-employee.dto'
import { UpdateEmployeeDto } from './dto/update-employee.dto'
import { toEmployeeRecord } from './employees.types'

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly cache: CacheService,
  ) {}

  async listForUser(auth: AuthContext) {
    assertOwnerRole(auth, 'Apenas o dono pode listar e gerenciar funcionarios.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)

    type ListResult = {
      items: ReturnType<typeof toEmployeeRecord>[]
      totals: { totalEmployees: number; activeEmployees: number }
    }
    const cached = await this.cache.get<ListResult>(CacheService.employeesKey(workspaceUserId))
    if (cached) return cached

    const items = await this.prisma.employee.findMany({
      where: {
        userId: workspaceUserId,
      },
      include: {
        loginUser: true,
      },
      orderBy: [{ active: 'desc' }, { employeeCode: 'asc' }],
    })

    const result: ListResult = {
      items: items.map(toEmployeeRecord),
      totals: {
        totalEmployees: items.length,
        activeEmployees: items.filter((item) => item.active).length,
      },
    }

    void this.cache.set(CacheService.employeesKey(workspaceUserId), result, 600)

    return result
  }

  async invalidateEmployeesCache(userId: string) {
    await this.cache.del(CacheService.employeesKey(userId))
  }

  async createForUser(auth: AuthContext, dto: CreateEmployeeDto, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode cadastrar funcionarios.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const ownerUser = await this.requireWorkspaceOwner(workspaceUserId)
    const employeeCode = sanitizeEmployeeCode(dto.employeeCode)
    const displayName = sanitizePlainText(dto.displayName, 'Nome do funcionario', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const passwordHash = await argon2.hash(dto.temporaryPassword, { type: argon2.argon2id })

    try {
      const employee = await this.prisma.$transaction(async (transaction) => {
        const loginUser = await transaction.user.create({
          data: {
            companyOwnerId: workspaceUserId,
            fullName: displayName,
            companyName: ownerUser.companyName,
            companyStreetLine1: ownerUser.companyStreetLine1,
            companyStreetNumber: ownerUser.companyStreetNumber,
            companyAddressComplement: ownerUser.companyAddressComplement,
            companyDistrict: ownerUser.companyDistrict,
            companyCity: ownerUser.companyCity,
            companyState: ownerUser.companyState,
            companyPostalCode: ownerUser.companyPostalCode,
            companyCountry: ownerUser.companyCountry,
            companyLatitude: ownerUser.companyLatitude,
            companyLongitude: ownerUser.companyLongitude,
            hasEmployees: false,
            employeeCount: 0,
            role: UserRole.STAFF,
            email: buildEmployeeLoginEmail(workspaceUserId, employeeCode),
            passwordHash,
            status: UserStatus.ACTIVE,
            preferredCurrency: ownerUser.preferredCurrency,
            emailVerifiedAt: new Date(),
            passwordChangedAt: null,
          },
        })

        return transaction.employee.create({
          data: {
            userId: workspaceUserId,
            loginUserId: loginUser.id,
            employeeCode,
            displayName,
            active: true,
          },
          include: {
            loginUser: true,
          },
        })
      })

      await this.auditLogService.record({
        actorUserId: auth.userId,
        event: 'employee.created',
        resource: 'employee',
        resourceId: employee.id,
        metadata: {
          employeeCode: employee.employeeCode,
          displayName: employee.displayName,
          loginEnabled: Boolean(employee.loginUserId),
          accessMode: 'company_email_plus_employee_id',
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      void this.invalidateEmployeesCache(workspaceUserId)

      return {
        employee: toEmployeeRecord(employee),
      }
    } catch (error) {
      handleEmployeeConflict(error)
    }
  }

  async updateForUser(auth: AuthContext, employeeId: string, dto: UpdateEmployeeDto, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode editar funcionarios.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const existingEmployee = await this.requireOwnedEmployee(workspaceUserId, employeeId)
    const sanitizedEmployeeCode = dto.employeeCode !== undefined ? sanitizeEmployeeCode(dto.employeeCode) : undefined
    const sanitizedDisplayName =
      dto.displayName !== undefined
        ? sanitizePlainText(dto.displayName, 'Nome do funcionario', {
            allowEmpty: false,
            rejectFormula: true,
          })!
        : undefined

    try {
      const employee = await this.prisma.$transaction(async (transaction) => {
        if (dto.temporaryPassword && existingEmployee.loginUserId) {
          await transaction.user.update({
            where: { id: existingEmployee.loginUserId },
            data: {
              passwordHash: await argon2.hash(dto.temporaryPassword, { type: argon2.argon2id }),
              passwordChangedAt: null,
            },
          })
        }

        if (existingEmployee.loginUserId && (sanitizedDisplayName !== undefined || dto.active !== undefined)) {
          await transaction.user.update({
            where: { id: existingEmployee.loginUserId },
            data: {
              ...(sanitizedDisplayName !== undefined ? { fullName: sanitizedDisplayName } : {}),
              ...(dto.active !== undefined ? { status: dto.active ? UserStatus.ACTIVE : UserStatus.DISABLED } : {}),
            },
          })
        }

        return transaction.employee.update({
          where: { id: existingEmployee.id },
          data: {
            ...(sanitizedEmployeeCode !== undefined ? { employeeCode: sanitizedEmployeeCode } : {}),
            ...(sanitizedDisplayName !== undefined ? { displayName: sanitizedDisplayName } : {}),
            ...(dto.active !== undefined ? { active: dto.active } : {}),
            ...(dto.salarioBase !== undefined ? { salarioBase: dto.salarioBase } : {}),
            ...(dto.percentualVendas !== undefined ? { percentualVendas: dto.percentualVendas } : {}),
          },
          include: {
            loginUser: true,
          },
        })
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

      void this.invalidateEmployeesCache(workspaceUserId)

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

  private async toggleActiveState(auth: AuthContext, employeeId: string, active: boolean, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode alterar o status de funcionarios.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const existingEmployee = await this.requireOwnedEmployee(workspaceUserId, employeeId)
    const employee = await this.prisma.$transaction(async (transaction) => {
      if (existingEmployee.loginUserId) {
        await transaction.user.update({
          where: { id: existingEmployee.loginUserId },
          data: {
            status: active ? UserStatus.ACTIVE : UserStatus.DISABLED,
          },
        })
      }

      return transaction.employee.update({
        where: { id: existingEmployee.id },
        data: { active },
        include: {
          loginUser: true,
        },
      })
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

    void this.invalidateEmployeesCache(workspaceUserId)

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
      include: {
        loginUser: true,
      },
    })

    if (!employee) {
      throw new NotFoundException('Funcionario nao encontrado para esta conta.')
    }

    return employee
  }

  private async requireWorkspaceOwner(userId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyName: true,
        companyStreetLine1: true,
        companyStreetNumber: true,
        companyAddressComplement: true,
        companyDistrict: true,
        companyCity: true,
        companyState: true,
        companyPostalCode: true,
        companyCountry: true,
        companyLatitude: true,
        companyLongitude: true,
        preferredCurrency: true,
      },
    })

    if (!owner) {
      throw new NotFoundException('Empresa proprietaria nao encontrada.')
    }

    return owner
  }
}

function sanitizeEmployeeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function buildEmployeeLoginEmail(workspaceUserId: string, employeeCode: string) {
  const normalizedCode = employeeCode.toLowerCase().replace(/[^a-z0-9-]/g, '')
  return `staff.${workspaceUserId}.${normalizedCode}@login.deskimperial.internal`
}

function handleEmployeeConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('Ja existe um funcionario com este ID para a sua conta.')
  }

  throw error
}
