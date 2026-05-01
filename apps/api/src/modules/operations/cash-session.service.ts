import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common'
import { AuditSeverity, CashClosureStatus, CashMovementType, CashSessionStatus } from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import { OperationsHelpersService } from './operations-helpers.service'
import { toCashSessionRecord, toClosureRecord } from './operations.types'
import {
  buildCashClosurePayload,
  formatBusinessDateKey,
  invalidateOperationsLiveCache,
  OPEN_COMANDA_STATUSES,
  resolveBusinessDate,
  toNumberOrZero,
} from './operations-domain.utils'
import { publishCashRealtime, publishCashOpenedRealtime } from './cash-realtime-publish.utils'
import { buildCashSessionResponse, buildCashMovementResponse, buildCashClosureResponse } from './cash-response.utils'
import type {
  CloseCashClosureDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  OpenCashSessionDto,
  OperationsResponseOptionsDto,
} from './operations.schemas'

@Injectable()
export class CashSessionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(OperationsRealtimeService) private readonly operationsRealtimeService: OperationsRealtimeService,
    @Inject(OperationsHelpersService) private readonly helpers: OperationsHelpersService,
  ) {}

  async openCashSession(
    auth: AuthContext,
    dto: OpenCashSessionDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const mutationStartedAtMs = performance.now()
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const businessDate = resolveBusinessDate(dto.businessDate)
    const openingCashAmount = roundCurrency(dto.openingCashAmount)
    const notes = sanitizePlainText(dto.notes, 'Observacoes da abertura', {
      allowEmpty: true,
      rejectFormula: false,
    })

    await this.helpers.assertBusinessDayOpen(workspaceOwnerUserId, businessDate)

    const employee = await this.resolveActorEmployee(workspaceOwnerUserId, auth)
    const employeeId = auth.role === 'STAFF' ? (employee?.id ?? null) : null

    if (auth.role === 'STAFF' && !employeeId) {
      throw new BadRequestException('Seu acesso precisa estar vinculado a um funcionario ativo para abrir caixa.')
    }

    const existingSession = await this.prisma.cashSession.findFirst({
      where: {
        companyOwnerId: workspaceOwnerUserId,
        employeeId,
        businessDate,
        status: CashSessionStatus.OPEN,
      },
    })

    if (existingSession) {
      throw new ConflictException('Ja existe um caixa aberto para este usuario nesta data operacional.')
    }

    const helpers = this.helpers
    const { session, closure } = await this.prisma.$transaction(async (transaction) => {
      const createdSession = await transaction.cashSession.create({
        data: {
          companyOwnerId: workspaceOwnerUserId,
          employeeId,
          openedByUserId: auth.userId,
          businessDate,
          status: CashSessionStatus.OPEN,
          openingCashAmount,
          expectedCashAmount: openingCashAmount,
          notes,
        },
      })

      await transaction.cashMovement.create({
        data: {
          cashSessionId: createdSession.id,
          companyOwnerId: workspaceOwnerUserId,
          employeeId,
          createdByUserId: auth.userId,
          type: CashMovementType.OPENING_FLOAT,
          amount: openingCashAmount,
          note: notes ?? 'Abertura do caixa operacional',
        },
      })

      const refreshedSession = await helpers.recalculateCashSession(transaction, createdSession.id)
      const closureSnapshot = await helpers.syncCashClosure(transaction, workspaceOwnerUserId, businessDate)

      return {
        session: refreshedSession,
        closure: closureSnapshot,
      }
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.cash_session.opened',
      resource: 'cash_session',
      resourceId: session.id,
      metadata: {
        businessDate: formatBusinessDateKey(businessDate),
        employeeId,
        openingCashAmount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateOperationsLiveCache(this.cache, workspaceOwnerUserId, businessDate)
    publishCashOpenedRealtime(this.operationsRealtimeService, auth, session, closure, {
      mutationName: 'open-cash-session',
      mutationStartedAtMs,
    })

    return buildCashSessionResponse(this.helpers, workspaceOwnerUserId, businessDate, session, options)
  }

  async createCashMovement(
    auth: AuthContext,
    cashSessionId: string,
    dto: CreateCashMovementDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const mutationStartedAtMs = performance.now()
    if (dto.type === CashMovementType.OPENING_FLOAT) {
      throw new BadRequestException('O tipo OPENING_FLOAT e reservado para a abertura do caixa.')
    }

    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveActorEmployee(workspaceOwnerUserId, auth)
    const session = await this.helpers.requireAuthorizedCashSession(
      this.prisma,
      workspaceOwnerUserId,
      auth,
      cashSessionId,
    )

    if (session.status !== CashSessionStatus.OPEN) {
      throw new ConflictException('Somente caixas abertos aceitam movimentacoes.')
    }

    const note = sanitizePlainText(dto.note, 'Observacao da movimentacao', {
      allowEmpty: true,
      rejectFormula: false,
    })

    const helpers = this.helpers
    const { movement, refreshedSession, closure } = await this.prisma.$transaction(async (transaction) => {
      const createdMovement = await transaction.cashMovement.create({
        data: {
          cashSessionId: session.id,
          companyOwnerId: workspaceOwnerUserId,
          employeeId: session.employeeId ?? actorEmployee?.id ?? null,
          createdByUserId: auth.userId,
          type: dto.type,
          amount: roundCurrency(dto.amount),
          note,
        },
      })

      const updatedSession = await helpers.recalculateCashSession(transaction, session.id)
      const closureSnapshot = await helpers.syncCashClosure(transaction, workspaceOwnerUserId, session.businessDate)

      return {
        movement: createdMovement,
        refreshedSession: updatedSession,
        closure: closureSnapshot,
      }
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.cash_movement.created',
      resource: 'cash_session',
      resourceId: session.id,
      metadata: {
        movementId: movement.id,
        type: movement.type,
        amount: dto.amount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateOperationsLiveCache(this.cache, workspaceOwnerUserId, session.businessDate)
    publishCashRealtime(this.operationsRealtimeService, auth, refreshedSession, closure, session.businessDate, {
      mutationName: 'create-cash-movement',
      mutationStartedAtMs,
    })

    return buildCashMovementResponse(
      this.helpers,
      workspaceOwnerUserId,
      session.businessDate,
      movement,
      refreshedSession,
      options,
    )
  }

  async closeCashSession(
    auth: AuthContext,
    cashSessionId: string,
    dto: CloseCashSessionDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const mutationStartedAtMs = performance.now()
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const session = await this.helpers.requireAuthorizedCashSession(
      this.prisma,
      workspaceOwnerUserId,
      auth,
      cashSessionId,
    )

    if (session.status !== CashSessionStatus.OPEN) {
      throw new ConflictException('Este caixa ja foi encerrado.')
    }

    const openComandas = await this.prisma.comanda.count({
      where: {
        cashSessionId: session.id,
        status: {
          in: OPEN_COMANDA_STATUSES,
        },
      },
    })

    if (openComandas > 0) {
      throw new ConflictException('Feche ou reatribua todas as comandas antes de encerrar o caixa.')
    }

    const countedCashAmount = roundCurrency(dto.countedCashAmount)
    const notes = sanitizePlainText(dto.notes, 'Observacoes do fechamento', {
      allowEmpty: true,
      rejectFormula: false,
    })

    const helpers = this.helpers
    const { refreshedSession, closure } = await this.prisma.$transaction(async (transaction) => {
      const recalculatedSession = await helpers.recalculateCashSession(transaction, session.id)
      const differenceAmount = roundCurrency(countedCashAmount - toNumberOrZero(recalculatedSession.expectedCashAmount))

      const closedSession = await transaction.cashSession.update({
        where: { id: session.id },
        data: {
          countedCashAmount,
          differenceAmount,
          status: CashSessionStatus.CLOSED,
          closedByUserId: auth.userId,
          closedAt: new Date(),
          notes: notes ?? recalculatedSession.notes,
        },
        include: {
          movements: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      })

      const closureSnapshot = await helpers.syncCashClosure(transaction, workspaceOwnerUserId, session.businessDate)
      return {
        refreshedSession: closedSession,
        closure: closureSnapshot,
      }
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.cash_session.closed',
      resource: 'cash_session',
      resourceId: session.id,
      metadata: {
        countedCashAmount,
        differenceAmount: toCashSessionRecord(refreshedSession).differenceAmount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateOperationsLiveCache(this.cache, workspaceOwnerUserId, session.businessDate)
    publishCashRealtime(this.operationsRealtimeService, auth, refreshedSession, closure, session.businessDate, {
      mutationName: 'close-cash-session',
      mutationStartedAtMs,
    })

    return buildCashSessionResponse(this.helpers, workspaceOwnerUserId, session.businessDate, refreshedSession, options)
  }

  async closeCashClosure(
    auth: AuthContext,
    dto: CloseCashClosureDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const mutationStartedAtMs = performance.now()
    assertOwnerRole(auth, 'Somente o dono pode fechar o caixa consolidado da empresa.')
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const businessDate = resolveBusinessDate(dto.businessDate)
    const countedCashAmount = roundCurrency(dto.countedCashAmount)
    const notes = sanitizePlainText(dto.notes, 'Observacoes do fechamento consolidado', {
      allowEmpty: true,
      rejectFormula: false,
    })
    const forceClose = dto.forceClose ?? false

    const helpers = this.helpers
    const syncedClosure = await this.prisma.$transaction(async (transaction) =>
      helpers.syncCashClosure(transaction, workspaceOwnerUserId, businessDate),
    )

    if (!forceClose && (syncedClosure.openSessionsCount > 0 || syncedClosure.openComandasCount > 0)) {
      await this.prisma.cashClosure.update({
        where: {
          companyOwnerId_businessDate: {
            companyOwnerId: workspaceOwnerUserId,
            businessDate,
          },
        },
        data: {
          status: CashClosureStatus.PENDING_EMPLOYEE_CLOSE,
        },
      })

      throw new ConflictException(
        'Ainda existem caixas ou comandas em aberto. Feche as operacoes dos funcionarios antes de consolidar o dia.',
      )
    }

    const differenceAmount = roundCurrency(countedCashAmount - toNumberOrZero(syncedClosure.expectedCashAmount))

    const closure = await this.prisma.cashClosure.update({
      where: {
        companyOwnerId_businessDate: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
        },
      },
      data: {
        countedCashAmount,
        differenceAmount,
        notes,
        status: forceClose ? CashClosureStatus.FORCE_CLOSED : CashClosureStatus.CLOSED,
        closedByUserId: auth.userId,
        closedAt: new Date(),
      },
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: forceClose ? 'operations.cash_closure.force_closed' : 'operations.cash_closure.closed',
      resource: 'cash_closure',
      resourceId: closure.id,
      severity: forceClose ? AuditSeverity.WARN : AuditSeverity.INFO,
      metadata: {
        businessDate: formatBusinessDateKey(businessDate),
        countedCashAmount,
        differenceAmount: toClosureRecord(closure)?.differenceAmount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateOperationsLiveCache(this.cache, workspaceOwnerUserId, businessDate)
    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(syncedClosure), {
      mutationName: 'close-cash-closure',
      mutationStartedAtMs,
    })

    return buildCashClosureResponse(this.helpers, workspaceOwnerUserId, businessDate, closure, options)
  }

  private resolveActorEmployee(workspaceOwnerUserId: string, auth: AuthContext) {
    return this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
  }
}
