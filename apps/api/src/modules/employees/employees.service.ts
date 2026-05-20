/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, UserStatus } from '@prisma/client'
import { randomInt } from 'node:crypto'
import * as argon2 from 'argon2'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import { AuthService } from '../auth/auth.service'
import { authSessionWorkspaceOwnerSelect, resolveAuthActorUserId } from '../auth/auth-shared.util'
import { ensureEmployeeLoginUser } from '../auth/auth-login-actor.utils'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { CacheService } from '../../common/services/cache.service'
import type { CreateEmployeeDto } from './dto/create-employee.dto'
import type { UpdateEmployeeDto } from './dto/update-employee.dto'
import { toEmployeeRecord } from './employees.types'

type EmployeeAccessCredentials = {
  employeeCode: string
  temporaryPassword: string
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly cache: CacheService,
    private readonly authService: AuthService,
  ) {}

  async listForUser(auth: AuthContext) {
    assertOwnerRole(auth, 'Apenas o dono pode listar e gerenciar funcionarios.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)

    type ListResult = {
      items: ReturnType<typeof toEmployeeRecord>[]
      totals: { totalEmployees: number; activeEmployees: number }
    }
    const cached = await this.cache.get<ListResult>(CacheService.employeesKey(workspaceUserId))
    if (cached) {
      return cached
    }

    const items = await this.prisma.employee.findMany({
      where: {
        userId: workspaceUserId,
      },
      orderBy: [{ active: 'desc' }, { displayName: 'asc' }],
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
    const displayName = sanitizePlainText(dto.displayName, 'Nome do funcionario', {
      allowEmpty: false,
      rejectFormula: true,
    })!

    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        const ownerUser = await transaction.user.findUnique({
          where: {
            id: workspaceUserId,
          },
          select: authSessionWorkspaceOwnerSelect,
        })

        if (!ownerUser) {
          throw new NotFoundException('Conta principal nao encontrada para este workspace.')
        }

        const credentials = await issueEmployeeAccessCredentials(transaction, workspaceUserId)
        const passwordHash = await argon2.hash(credentials.temporaryPassword, { type: argon2.argon2id })
        const createdEmployee = await transaction.employee.create({
          data: {
            userId: workspaceUserId,
            passwordHash,
            employeeCode: credentials.employeeCode,
            displayName,
            active: true,
          },
        })

        const loginUser = await ensureEmployeeLoginUser(transaction, {
          employee: {
            id: createdEmployee.id,
            active: createdEmployee.active,
            displayName: createdEmployee.displayName,
            passwordHash: createdEmployee.passwordHash,
            loginUser: null,
          },
          ownerUser,
          fallbackPasswordHash: createdEmployee.passwordHash,
        })

        return {
          employee: {
            ...createdEmployee,
            loginUserId: loginUser.id,
          },
          credentials,
        }
      })

      await this.auditLogService.record({
        actorUserId: resolveAuthActorUserId(auth),
        event: 'employee.created',
        resource: 'employee',
        resourceId: created.employee.id,
        metadata: {
          employeeCode: created.employee.employeeCode,
          displayName: created.employee.displayName,
          loginEnabled: Boolean(created.employee.passwordHash),
          accessMode: 'company_email_plus_generated_employee_id',
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      void this.invalidateEmployeesCache(workspaceUserId)

      return {
        employee: toEmployeeRecord(created.employee),
        credentials: created.credentials,
      }
    } catch (error) {
      handleEmployeeConflict(error)
    }
  }

  async updateForUser(auth: AuthContext, employeeId: string, dto: UpdateEmployeeDto, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode editar funcionarios.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const existingEmployee = await this.requireOwnedEmployee(workspaceUserId, employeeId)
    const sanitizedDisplayName =
      dto.displayName !== undefined
        ? sanitizePlainText(dto.displayName, 'Nome do funcionario', {
            allowEmpty: false,
            rejectFormula: true,
          })!
        : undefined

    try {
      const employee = await this.prisma.$transaction(async (transaction) => {
        await this.syncLinkedLoginUser(transaction, existingEmployee, sanitizedDisplayName, dto.active)

        return transaction.employee.update({
          where: { id: existingEmployee.id },
          data: {
            ...(sanitizedDisplayName !== undefined ? { displayName: sanitizedDisplayName } : {}),
            ...(dto.active !== undefined ? { active: dto.active } : {}),
            ...(dto.salarioBase !== undefined ? { salarioBase: dto.salarioBase } : {}),
            ...(dto.percentualVendas === undefined ? {} : { percentualVendas: dto.percentualVendas }),
          },
        })
      })

      await this.auditLogService.record({
        actorUserId: resolveAuthActorUserId(auth),
        event: 'employee.updated',
        resource: 'employee',
        resourceId: employee.id,
        metadata: {
          updatedFields: Object.keys(dto),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      if (dto.active === false) {
        await this.authService.revokeEmployeeSessions(employee.id)
      } else if (sanitizedDisplayName !== undefined || dto.active !== undefined) {
        await this.authService.refreshEmployeeSessionCaches(employee.id)
      }

      void this.invalidateEmployeesCache(workspaceUserId)

      return {
        employee: toEmployeeRecord(employee),
      }
    } catch (error) {
      handleEmployeeConflict(error)
    }
  }

  async issueAccessForUser(auth: AuthContext, employeeId: string, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode gerenciar o acesso de funcionarios.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const existingEmployee = await this.requireOwnedEmployee(workspaceUserId, employeeId)

    if (!existingEmployee.active) {
      throw new BadRequestException('Reative o funcionario antes de gerar um novo acesso.')
    }

    const issued = await this.prisma.$transaction(async (transaction) => {
      const ownerUser = await transaction.user.findUnique({
        where: { id: workspaceUserId },
        select: authSessionWorkspaceOwnerSelect,
      })

      if (!ownerUser) {
        throw new NotFoundException('Conta principal nao encontrada para este workspace.')
      }

      const credentials = await issueEmployeeAccessCredentials(transaction, workspaceUserId, existingEmployee.id)
      const nextPasswordHash = await argon2.hash(credentials.temporaryPassword, { type: argon2.argon2id })
      const updatedEmployee = await transaction.employee.update({
        where: { id: existingEmployee.id },
        data: {
          employeeCode: credentials.employeeCode,
          passwordHash: nextPasswordHash,
        },
      })

      const loginUser = await ensureEmployeeLoginUser(transaction, {
        employee: {
          id: updatedEmployee.id,
          active: updatedEmployee.active,
          displayName: updatedEmployee.displayName,
          passwordHash: nextPasswordHash,
          loginUser: existingEmployee.loginUserId
            ? { id: existingEmployee.loginUserId, passwordHash: nextPasswordHash }
            : null,
        },
        ownerUser,
        fallbackPasswordHash: nextPasswordHash,
      })

      return {
        employee: {
          ...updatedEmployee,
          loginUserId: loginUser.id,
        },
        credentials,
      }
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'employee.access_issued',
      resource: 'employee',
      resourceId: issued.employee.id,
      metadata: {
        employeeCode: issued.employee.employeeCode,
        rotated: Boolean(existingEmployee.passwordHash),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    await this.authService.revokeEmployeeSessions(existingEmployee.id)
    void this.invalidateEmployeesCache(workspaceUserId)

    return {
      employee: toEmployeeRecord(issued.employee),
      credentials: issued.credentials,
    }
  }

  async rotatePasswordForUser(auth: AuthContext, employeeId: string, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode gerenciar o acesso de funcionarios.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const existingEmployee = await this.requireOwnedEmployee(workspaceUserId, employeeId)

    if (!existingEmployee.active) {
      throw new BadRequestException('Reative o funcionario antes de rotacionar a senha.')
    }

    if (!existingEmployee.passwordHash) {
      throw new BadRequestException('Gere o acesso do funcionario antes de rotacionar a senha.')
    }

    const rotated = await this.prisma.$transaction(async (transaction) => {
      const ownerUser = await this.requireOwnerUser(transaction, workspaceUserId)
      const temporaryPassword = generateEmployeePassword()
      const nextPasswordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id })
      const updatedEmployee = await transaction.employee.update({
        where: { id: existingEmployee.id },
        data: {
          passwordHash: nextPasswordHash,
        },
      })

      const loginUser = await ensureEmployeeLoginUser(transaction, {
        employee: {
          id: updatedEmployee.id,
          active: updatedEmployee.active,
          displayName: updatedEmployee.displayName,
          passwordHash: nextPasswordHash,
          loginUser: existingEmployee.loginUserId
            ? { id: existingEmployee.loginUserId, passwordHash: nextPasswordHash }
            : null,
        },
        ownerUser,
        fallbackPasswordHash: nextPasswordHash,
      })

      return {
        employee: {
          ...updatedEmployee,
          loginUserId: loginUser.id,
        },
        credentials: {
          employeeCode: updatedEmployee.employeeCode,
          temporaryPassword,
        },
      }
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'employee.access_password_rotated',
      resource: 'employee',
      resourceId: rotated.employee.id,
      metadata: {
        employeeCode: rotated.employee.employeeCode,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    await this.authService.revokeEmployeeSessions(existingEmployee.id)
    void this.invalidateEmployeesCache(workspaceUserId)

    return {
      employee: toEmployeeRecord(rotated.employee),
      credentials: rotated.credentials,
    }
  }

  async revokeAccessForUser(auth: AuthContext, employeeId: string, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode gerenciar o acesso de funcionarios.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const existingEmployee = await this.requireOwnedEmployee(workspaceUserId, employeeId)

    if (!(existingEmployee.passwordHash || existingEmployee.loginUserId)) {
      return { employee: toEmployeeRecord(existingEmployee) }
    }

    const revokedPasswordHash = await argon2.hash(buildRevokedPasswordSeed(existingEmployee.id), {
      type: argon2.argon2id,
    })

    const employee = await this.prisma.$transaction(async (transaction) => {
      if (existingEmployee.loginUserId) {
        await transaction.user.update({
          where: { id: existingEmployee.loginUserId },
          data: {
            passwordHash: revokedPasswordHash,
            passwordChangedAt: null,
            status: UserStatus.DISABLED,
          },
        })
      }

      return transaction.employee.update({
        where: { id: existingEmployee.id },
        data: {
          passwordHash: null,
        },
      })
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'employee.access_revoked',
      resource: 'employee',
      resourceId: employee.id,
      metadata: {
        employeeCode: employee.employeeCode,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    await this.authService.revokeEmployeeSessions(employee.id)
    void this.invalidateEmployeesCache(workspaceUserId)

    return {
      employee: toEmployeeRecord(employee),
    }
  }

  async archiveForUser(auth: AuthContext, employeeId: string, context: RequestContext) {
    return this.toggleActiveState(auth, employeeId, false, context)
  }

  async restoreForUser(auth: AuthContext, employeeId: string, context: RequestContext) {
    return this.toggleActiveState(auth, employeeId, true, context)
  }

  private async syncLinkedLoginUser(
    transaction: any,
    existingEmployee: { loginUserId: string | null; passwordHash: string | null },
    sanitizedDisplayName: string | undefined,
    active: boolean | undefined,
  ) {
    if (!existingEmployee.loginUserId) {
      return
    }
    if (sanitizedDisplayName === undefined && active === undefined) {
      return
    }

    await transaction.user.update({
      where: { id: existingEmployee.loginUserId },
      data: {
        ...(sanitizedDisplayName === undefined ? {} : { fullName: sanitizedDisplayName }),
        ...(active === undefined
          ? {}
          : { status: active && existingEmployee.passwordHash ? UserStatus.ACTIVE : UserStatus.DISABLED }),
      },
    })
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
            status: active && existingEmployee.passwordHash ? UserStatus.ACTIVE : UserStatus.DISABLED,
          },
        })
      }

      return transaction.employee.update({
        where: { id: existingEmployee.id },
        data: { active },
      })
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
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

    if (!active) {
      await this.authService.revokeEmployeeSessions(employee.id)
    }

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
    })

    if (!employee) {
      throw new NotFoundException('Funcionario nao encontrado para esta conta.')
    }

    return employee
  }

  private async requireOwnerUser(transaction: Pick<Prisma.TransactionClient, 'user'>, workspaceUserId: string) {
    const ownerUser = await transaction.user.findUnique({
      where: { id: workspaceUserId },
      select: authSessionWorkspaceOwnerSelect,
    })

    if (!ownerUser) {
      throw new NotFoundException('Conta principal nao encontrada para este workspace.')
    }

    return ownerUser
  }
}

async function issueEmployeeAccessCredentials(
  prisma: Pick<Prisma.TransactionClient, 'employee'>,
  userId: string,
  excludeEmployeeId?: string,
): Promise<EmployeeAccessCredentials> {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const employeeCode = generateEmployeeCode()
    const existing = await prisma.employee.findFirst({
      where: {
        userId,
        employeeCode,
        ...(excludeEmployeeId ? { id: { not: excludeEmployeeId } } : {}),
      },
      select: { id: true },
    })

    if (!existing) {
      return {
        employeeCode,
        temporaryPassword: generateEmployeePassword(),
      }
    }
  }

  throw new ConflictException('Nao foi possivel gerar um novo ID de acesso. Tente novamente.')
}

function generateEmployeeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[randomInt(0, alphabet.length)]).join('')
}

function generateEmployeePassword() {
  return randomInt(0, 100_000_000).toString().padStart(8, '0')
}

function buildRevokedPasswordSeed(employeeId: string) {
  return `revoked:${employeeId}:${Date.now()}:${randomInt(1000, 9999)}`
}

function handleEmployeeConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('Ja existe um funcionario com este ID para a sua conta.')
  }

  throw error
}
