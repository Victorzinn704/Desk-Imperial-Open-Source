import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common'
import { AuditSeverity, CashClosureStatus, CashMovementType, CashSessionStatus } from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { assertOwnerRole } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import type { CloseCashClosureDto } from './dto/close-cash-closure.dto'
import type { CloseCashSessionDto } from './dto/close-cash-session.dto'
import type { CreateCashMovementDto } from './dto/create-cash-movement.dto'
import type { OpenCashSessionDto } from './dto/open-cash-session.dto'
import type { OperationsResponseOptionsDto } from './dto/operations-response-options.dto'
import { OperationsHelpersService } from './operations-helpers.service'
import {
  toCashMovementRecord,
  toCashSessionRecord,
  toClosureRecord,
  toRealtimeCashSessionRecord,
} from './operations.types'
import {
  buildOptionalOperationsSnapshot,
  OPEN_COMANDA_STATUSES,
  buildCashClosurePayload,
  buildCashUpdatedPayload,
  formatBusinessDateKey,
  invalidateOperationsLiveCache,
  resolveBusinessDate,
  toNumber,
} from './operations-domain.utils'

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
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishCashOpenedRealtime(auth, session, closure)

    return this.buildCashSessionResponse(workspaceOwnerUserId, businessDate, session, options)
  }

  async createCashMovement(
    auth: AuthContext,
    cashSessionId: string,
    dto: CreateCashMovementDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
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
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, session.businessDate)
    this.publishCashRealtime(auth, refreshedSession, closure, session.businessDate)

    return this.buildCashMovementResponse(
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
      const differenceAmount = roundCurrency(countedCashAmount - toNumber(recalculatedSession.expectedCashAmount))

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
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, session.businessDate)
    this.publishCashRealtime(auth, refreshedSession, closure, session.businessDate)

    return this.buildCashSessionResponse(workspaceOwnerUserId, session.businessDate, refreshedSession, options)
  }

  async closeCashClosure(
    auth: AuthContext,
    dto: CloseCashClosureDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
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
    const { closure } = await this.prisma.$transaction(async (transaction) => {
      const syncedClosure = await helpers.syncCashClosure(transaction, workspaceOwnerUserId, businessDate)

      if (!forceClose && (syncedClosure.openSessionsCount > 0 || syncedClosure.openComandasCount > 0)) {
        await transaction.cashClosure.update({
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

      const differenceAmount = roundCurrency(countedCashAmount - toNumber(syncedClosure.expectedCashAmount))

      return {
        closure: await transaction.cashClosure.update({
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
        }),
      }
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishCashClosureRealtime(auth, closure)

    return this.buildCashClosureResponse(workspaceOwnerUserId, businessDate, closure, options)
  }

  private async buildOptionalSnapshot(
    workspaceOwnerUserId: string,
    businessDate: Date,
    options?: OperationsResponseOptionsDto,
  ) {
    return buildOptionalOperationsSnapshot(this.helpers, workspaceOwnerUserId, businessDate, options)
  }

  private publishCashRealtime(
    auth: AuthContext,
    session: Parameters<typeof buildCashUpdatedPayload>[0],
    closure: Parameters<typeof buildCashClosurePayload>[0],
    businessDate?: Date,
  ) {
    this.operationsRealtimeService.publishCashUpdated(auth, {
      ...buildCashUpdatedPayload(session),
      businessDate: businessDate ? formatBusinessDateKey(businessDate) : undefined,
      cashSession: toRealtimeCashSessionRecord(session),
    })
    this.publishCashClosureRealtime(auth, closure)
  }

  private publishCashOpenedRealtime(
    auth: AuthContext,
    session: {
      id: string
      openedAt: Date
      openingCashAmount: { toNumber(): number } | number
      employeeId: string | null
      companyOwnerId: string
      businessDate: Date
      status: CashSessionStatus
      countedCashAmount: { toNumber(): number } | number | null
      expectedCashAmount: { toNumber(): number } | number
      differenceAmount: { toNumber(): number } | number | null
      grossRevenueAmount: { toNumber(): number } | number
      realizedProfitAmount: { toNumber(): number } | number
      notes: string | null
      closedAt: Date | null
      movements: Array<{
        id: string
        cashSessionId: string
        employeeId: string | null
        type: CashMovementType
        amount: { toNumber(): number } | number
        note: string | null
        createdAt: Date
      }>
    },
    closure: Parameters<typeof buildCashClosurePayload>[0],
  ) {
    this.operationsRealtimeService.publishCashOpened(auth, {
      cashSessionId: session.id,
      openedAt: session.openedAt.toISOString(),
      openingAmount: toNumber(session.openingCashAmount),
      currency: auth.preferredCurrency,
      employeeId: session.employeeId,
      businessDate: formatBusinessDateKey(session.businessDate),
      cashSession: toRealtimeCashSessionRecord(session),
    })
    this.publishCashClosureRealtime(auth, closure)
  }

  private publishCashClosureRealtime(auth: AuthContext, closure: Parameters<typeof buildCashClosurePayload>[0]) {
    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))
  }

  private invalidateLiveSnapshotCache(workspaceOwnerUserId: string, businessDate: Date) {
    invalidateOperationsLiveCache(this.cache, workspaceOwnerUserId, businessDate)
  }

  private resolveActorEmployee(workspaceOwnerUserId: string, auth: AuthContext) {
    return this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
  }

  private async buildCashSessionResponse(
    workspaceOwnerUserId: string,
    businessDate: Date,
    session: Parameters<typeof toCashSessionRecord>[0],
    options?: OperationsResponseOptionsDto,
  ) {
    return {
      cashSession: toCashSessionRecord(session),
      ...(await this.buildOptionalSnapshot(workspaceOwnerUserId, businessDate, options)),
    }
  }

  private async buildCashMovementResponse(
    workspaceOwnerUserId: string,
    businessDate: Date,
    movement: Parameters<typeof toCashMovementRecord>[0],
    session: Parameters<typeof toCashSessionRecord>[0],
    options?: OperationsResponseOptionsDto,
  ) {
    return {
      movement: toCashMovementRecord(movement),
      cashSession: toCashSessionRecord(session),
      ...(await this.buildOptionalSnapshot(workspaceOwnerUserId, businessDate, options)),
    }
  }

  private async buildCashClosureResponse(
    workspaceOwnerUserId: string,
    businessDate: Date,
    closure: Parameters<typeof toClosureRecord>[0],
    options?: OperationsResponseOptionsDto,
  ) {
    return {
      closure: toClosureRecord(closure),
      ...(await this.buildOptionalSnapshot(workspaceOwnerUserId, businessDate, options)),
    }
  }
}
