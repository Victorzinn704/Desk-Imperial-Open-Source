import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common'
import { CashSessionStatus, ComandaStatus, Prisma } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import type { OperationsRealtimeMutationName } from '../operations-realtime/operations-realtime.types'
import { buildComandaResponse } from './comanda-response.utils'
import { ComandaMutationContextService } from './comanda-mutation-context.service'
import { ComandaRealtimePublisher } from './comanda-realtime-publisher.service'
import { toRealtimeStatus } from './comanda-realtime-status.utils'
import { OperationsHelpersService } from './operations-helpers.service'
import type { AssignComandaDto, OperationsResponseOptionsDto, UpdateComandaStatusDto } from './operations.schemas'

@Injectable()
export class ComandaLifecycleService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(OperationsHelpersService) private readonly helpers: OperationsHelpersService,
    @Inject(ComandaMutationContextService) private readonly context: ComandaMutationContextService,
    @Inject(ComandaRealtimePublisher) private readonly realtime: ComandaRealtimePublisher,
  ) {}

  async assignComanda(
    auth: AuthContext,
    comandaId: string,
    dto: AssignComandaDto,
    ...rest: [context: RequestContext, options?: OperationsResponseOptionsDto]
  ) {
    const [context, options] = rest
    const mutationStartedAtMs = performance.now()
    const { workspaceOwnerUserId, comanda, employee, employeeOpenSession } = await this.resolveAssignComandaContext(
      auth,
      comandaId,
      dto,
    )
    const employeeId = employee?.id ?? null
    const cashSessionId = employeeOpenSession?.id ?? null
    const result = await this.assignComandaInTransaction({
      auth,
      workspaceOwnerUserId,
      comandaId: comanda.id,
      employeeId,
      cashSessionId,
    })
    await this.recordComandaAudit({
      auth,
      comandaId: comanda.id,
      event: 'operations.comanda.assigned',
      metadata: { cashSessionId, employeeId },
      context,
    })
    this.publishUpdated({
      auth,
      businessDate: result.businessDate,
      comanda: result.refreshedComanda,
      mutationName: 'assign-comanda',
      mutationStartedAtMs,
      workspaceOwnerUserId,
    })

    return buildComandaResponse(
      this.helpers,
      workspaceOwnerUserId,
      result.businessDate,
      result.refreshedComanda,
      options,
    )
  }

  async updateComandaStatus(
    auth: AuthContext,
    comandaId: string,
    dto: UpdateComandaStatusDto,
    ...rest: [context: RequestContext, options?: OperationsResponseOptionsDto]
  ) {
    const [context, options] = rest
    const mutationStartedAtMs = performance.now()
    const mutationContext = await this.context.resolve(auth)
    const comanda = await this.helpers.requireAuthorizedComanda({
      transaction: this.prisma,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
      auth,
      comandaId,
      actorEmployee: mutationContext.actorEmployee,
    })
    this.assertCanUpdateStatus(comanda.status, dto.status)
    const result = await this.updateStatusInTransaction(auth, mutationContext.workspaceOwnerUserId, comanda, dto.status)

    await this.recordComandaAudit({
      auth,
      comandaId: comanda.id,
      event: 'operations.comanda.status_updated',
      metadata: { status: dto.status },
      context,
    })
    this.publishStatusResult({
      auth,
      mutationStartedAtMs,
      nextStatus: dto.status,
      previousStatus: comanda.status,
      result,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })

    return buildComandaResponse(
      this.helpers,
      mutationContext.workspaceOwnerUserId,
      result.businessDate,
      result.refreshedComanda,
      options,
    )
  }

  private findEmployeeOpenSession(workspaceOwnerUserId: string, employeeId: string, businessDate: Date) {
    return this.prisma.cashSession.findFirst({
      where: { businessDate, companyOwnerId: workspaceOwnerUserId, employeeId, status: CashSessionStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    })
  }

  private async resolveAssignComandaContext(auth: AuthContext, comandaId: string, dto: AssignComandaDto) {
    const workspaceOwnerUserId = this.context.requireOwner(
      auth,
      'Somente o dono pode redistribuir mesas entre funcionarios.',
    )
    const comanda = await this.helpers.requireOwnedComanda(this.prisma, workspaceOwnerUserId, comandaId)
    const businessDate = await this.helpers.resolveComandaBusinessDate(this.prisma, comanda)
    const employee = dto.employeeId
      ? await this.helpers.requireOwnedEmployee(this.prisma, workspaceOwnerUserId, dto.employeeId)
      : null
    const employeeOpenSession = employee
      ? await this.findEmployeeOpenSession(workspaceOwnerUserId, employee.id, businessDate)
      : null

    if (employee && !employeeOpenSession) {
      throw new ConflictException('O funcionario precisa abrir o proprio caixa antes de assumir uma mesa.')
    }

    return { workspaceOwnerUserId, comanda, employee, employeeOpenSession }
  }

  private assignComandaInTransaction(params: {
    auth: AuthContext
    workspaceOwnerUserId: string
    comandaId: string
    employeeId: string | null
    cashSessionId: string | null
  }) {
    const { auth, workspaceOwnerUserId, comandaId, employeeId, cashSessionId } = params
    return this.prisma.$transaction(async (transaction) => {
      await transaction.comandaAssignment.updateMany({
        where: { comandaId, endedAt: null },
        data: { endedAt: new Date() },
      })
      if (employeeId) {
        await transaction.comandaAssignment.create({
          data: { assignedByUserId: auth.userId, comandaId, companyOwnerId: workspaceOwnerUserId, employeeId },
        })
      }
      const refreshedComanda = await transaction.comanda.update({
        where: { id: comandaId },
        data: { cashSessionId, currentEmployeeId: employeeId },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })

      return {
        businessDate: await this.helpers.resolveComandaBusinessDate(transaction, refreshedComanda),
        refreshedComanda,
      }
    })
  }

  private assertCanUpdateStatus(currentStatus: ComandaStatus, nextStatus: ComandaStatus) {
    if (nextStatus === ComandaStatus.CLOSED) {
      throw new BadRequestException('Use o endpoint especifico para fechar a comanda.')
    }

    if (currentStatus === ComandaStatus.CLOSED) {
      throw new ConflictException('Esta comanda ja foi encerrada.')
    }

    if (currentStatus === ComandaStatus.CANCELLED) {
      throw new ConflictException('Esta comanda ja foi cancelada.')
    }
  }

  private updateStatusInTransaction(
    auth: AuthContext,
    workspaceOwnerUserId: string,
    comanda: Awaited<ReturnType<OperationsHelpersService['requireAuthorizedComanda']>>,
    status: ComandaStatus,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const refreshedComanda = await transaction.comanda.update({
        where: { id: comanda.id },
        data: {
          ...(status === ComandaStatus.CANCELLED ? { closedAt: new Date(), closedByUserId: auth.userId } : {}),
          status,
        },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })
      const businessDate = await this.helpers.resolveComandaBusinessDate(transaction, refreshedComanda)
      const closure =
        status === ComandaStatus.CANCELLED
          ? await this.helpers.syncCashClosure(transaction, workspaceOwnerUserId, businessDate)
          : null

      return { businessDate, closure, refreshedComanda }
    })
  }

  private recordComandaAudit(params: {
    auth: AuthContext
    comandaId: string
    event: 'operations.comanda.assigned' | 'operations.comanda.status_updated'
    metadata: Prisma.InputJsonObject
    context: RequestContext
  }) {
    return this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(params.auth),
      event: params.event,
      resource: 'comanda',
      resourceId: params.comandaId,
      metadata: params.metadata,
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })
  }

  private publishUpdated(params: {
    auth: AuthContext
    businessDate: Date
    comanda: Parameters<ComandaRealtimePublisher['publishUpdated']>[0]['comanda']
    mutationName: OperationsRealtimeMutationName
    mutationStartedAtMs: number
    workspaceOwnerUserId: string
  }) {
    this.realtime.invalidate(params.workspaceOwnerUserId, params.businessDate)
    this.realtime.publishUpdated({
      auth: params.auth,
      businessDate: params.businessDate,
      comanda: params.comanda,
      instrumentation: {
        mutationName: params.mutationName,
        mutationStartedAtMs: params.mutationStartedAtMs,
      },
    })
  }

  private publishStatusResult(params: {
    auth: AuthContext
    mutationStartedAtMs: number
    nextStatus: ComandaStatus
    previousStatus: ComandaStatus
    result: Awaited<ReturnType<ComandaLifecycleService['updateStatusInTransaction']>>
    workspaceOwnerUserId: string
  }) {
    this.realtime.invalidate(params.workspaceOwnerUserId, params.result.businessDate)
    this.realtime.publishUpdated({
      auth: params.auth,
      businessDate: params.result.businessDate,
      comanda: params.result.refreshedComanda,
      options:
        params.previousStatus !== params.nextStatus
          ? { previousStatus: toRealtimeStatus(params.previousStatus) }
          : undefined,
      instrumentation: { mutationName: 'update-comanda-status', mutationStartedAtMs: params.mutationStartedAtMs },
    })
    if (params.result.closure) {
      this.realtime.publishCashClosureUpdated({ auth: params.auth, closure: params.result.closure })
    }
  }
}
