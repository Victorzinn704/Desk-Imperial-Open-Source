import { ConflictException, Inject, Injectable } from '@nestjs/common'
import { CashSessionStatus } from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import { assertOwnerRole } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import { buildCashClosureResponse, buildCashMovementResponse, buildCashSessionResponse } from './cash-response.utils'
import {
  type CloseCashClosureCommand,
  type CloseCashSessionCommand,
  type CreateCashMovementCommand,
  normalizeCashMovementCommand,
  normalizeCloseCashClosureCommand,
  normalizeCloseCashSessionCommand,
  normalizeOpenCashSessionCommand,
  type OpenCashSessionCommand,
  requireCashOpeningEmployeeId,
  shouldBlockCashClosureClose,
} from './cash-session-command.utils'
import {
  closeCashClosureRecord,
  closeOpenCashSession,
  createCashSessionMovement,
  createOpeningCashSession,
  markCashClosurePending,
  syncCashClosureForDate,
} from './cash-session-persistence.utils'
import {
  publishCashClosureMutation,
  publishCashSessionMutation as publishCashSessionRealtimeMutation,
  publishOpenedCashSession,
  recordCashClosureClosed,
  recordCashMovementCreated,
  recordCashSessionClosed,
  recordCashSessionOpened,
} from './cash-session-side-effects.utils'
import { OPEN_COMANDA_STATUSES } from './operations-domain.utils'
import { OperationsHelpersService } from './operations-helpers.service'

@Injectable()
export class CashSessionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(OperationsRealtimeService) private readonly operationsRealtimeService: OperationsRealtimeService,
    @Inject(OperationsHelpersService) private readonly helpers: OperationsHelpersService,
  ) {}

  async openCashSession(command: OpenCashSessionCommand) {
    const mutationStartedAtMs = performance.now()
    const opening = normalizeOpenCashSessionCommand(command)
    await this.helpers.assertBusinessDayOpen(opening.workspaceOwnerUserId, opening.businessDate)

    const employee = await this.resolveActorEmployee(opening.workspaceOwnerUserId, command.auth)
    const employeeId = requireCashOpeningEmployeeId(command.auth, employee)
    await this.assertNoOpenSessionForActor({ ...opening, employeeId })

    const { session, closure } = await createOpeningCashSession({
      deps: this.persistenceDeps(),
      opening: { ...opening, auth: command.auth, employeeId },
    })
    await recordCashSessionOpened({
      auditLogService: this.auditLogService,
      command,
      sessionId: session.id,
      employeeId,
      opening,
    })
    publishOpenedCashSession({
      cache: this.cache,
      operationsRealtimeService: this.operationsRealtimeService,
      command,
      session,
      closure,
      opening,
      mutationStartedAtMs,
    })

    return buildCashSessionResponse(
      this.helpers,
      opening.workspaceOwnerUserId,
      opening.businessDate,
      session,
      command.options,
    )
  }

  async createCashMovement(command: CreateCashMovementCommand) {
    const mutationStartedAtMs = performance.now()
    const movementInput = normalizeCashMovementCommand(command)
    const actorEmployee = await this.resolveActorEmployee(movementInput.workspaceOwnerUserId, command.auth)
    const session = await this.helpers.requireAuthorizedCashSession(
      this.prisma,
      movementInput.workspaceOwnerUserId,
      command.auth,
      command.cashSessionId,
    )

    assertOpenCashSession(session.status, 'Somente caixas abertos aceitam movimentacoes.')
    const { movement, refreshedSession, closure } = await createCashSessionMovement({
      deps: this.persistenceDeps(),
      command,
      session,
      actorEmployee,
      movement: movementInput,
    })

    await recordCashMovementCreated({
      auditLogService: this.auditLogService,
      command,
      movementId: movement.id,
      sessionId: session.id,
    })
    this.publishCashSessionMutation({
      command,
      session: refreshedSession,
      closure,
      businessDate: session.businessDate,
      workspaceOwnerUserId: movementInput.workspaceOwnerUserId,
      mutationName: 'create-cash-movement',
      mutationStartedAtMs,
    })

    return buildCashMovementResponse({
      helpers: this.helpers,
      workspaceOwnerUserId: movementInput.workspaceOwnerUserId,
      businessDate: session.businessDate,
      movement,
      session: refreshedSession,
      options: command.options,
    })
  }

  async closeCashSession(command: CloseCashSessionCommand) {
    const mutationStartedAtMs = performance.now()
    const closing = normalizeCloseCashSessionCommand(command)
    const session = await this.helpers.requireAuthorizedCashSession(
      this.prisma,
      closing.workspaceOwnerUserId,
      command.auth,
      command.cashSessionId,
    )

    assertOpenCashSession(session.status, 'Este caixa ja foi encerrado.')
    await this.assertNoOpenComandas(session.id)

    const { refreshedSession, closure } = await closeOpenCashSession({
      deps: this.persistenceDeps(),
      command,
      session,
      closing,
    })
    await recordCashSessionClosed({
      auditLogService: this.auditLogService,
      command,
      sessionId: session.id,
      closing,
      refreshedSession,
    })
    this.publishCashSessionMutation({
      command,
      session: refreshedSession,
      closure,
      businessDate: session.businessDate,
      workspaceOwnerUserId: closing.workspaceOwnerUserId,
      mutationName: 'close-cash-session',
      mutationStartedAtMs,
    })

    return buildCashSessionResponse(
      this.helpers,
      closing.workspaceOwnerUserId,
      session.businessDate,
      refreshedSession,
      command.options,
    )
  }

  async closeCashClosure(command: CloseCashClosureCommand) {
    const mutationStartedAtMs = performance.now()
    assertOwnerRole(command.auth, 'Somente o dono pode fechar o caixa consolidado da empresa.')
    const closing = normalizeCloseCashClosureCommand(command)
    const syncedClosure = await syncCashClosureForDate({
      deps: this.persistenceDeps(),
      workspaceOwnerUserId: closing.workspaceOwnerUserId,
      businessDate: closing.businessDate,
    })

    if (shouldBlockCashClosureClose({ ...closing, ...syncedClosure })) {
      await markCashClosurePending({ prisma: this.prisma, ...closing })
      throw new ConflictException(
        'Ainda existem caixas ou comandas em aberto. Feche as operacoes dos funcionarios antes de consolidar o dia.',
      )
    }

    const closure = await closeCashClosureRecord({ prisma: this.prisma, command, closing, syncedClosure })
    await recordCashClosureClosed({ auditLogService: this.auditLogService, command, closing, closure })
    publishCashClosureMutation({
      cache: this.cache,
      operationsRealtimeService: this.operationsRealtimeService,
      command,
      closing,
      syncedClosure,
      mutationStartedAtMs,
    })

    return buildCashClosureResponse(
      this.helpers,
      closing.workspaceOwnerUserId,
      closing.businessDate,
      closure,
      command.options,
    )
  }

  private async assertNoOpenSessionForActor(input: {
    workspaceOwnerUserId: string
    employeeId: string | null
    businessDate: Date
  }) {
    const existingSession = await this.prisma.cashSession.findFirst({
      where: {
        companyOwnerId: input.workspaceOwnerUserId,
        employeeId: input.employeeId,
        businessDate: input.businessDate,
        status: CashSessionStatus.OPEN,
      },
    })

    if (existingSession) {
      throw new ConflictException('Ja existe um caixa aberto para este usuario nesta data operacional.')
    }
  }

  private async assertNoOpenComandas(cashSessionId: string) {
    const openComandas = await this.prisma.comanda.count({
      where: {
        cashSessionId,
        status: { in: OPEN_COMANDA_STATUSES },
      },
    })

    if (openComandas > 0) {
      throw new ConflictException('Feche ou reatribua todas as comandas antes de encerrar o caixa.')
    }
  }

  private publishCashSessionMutation(
    input: Omit<Parameters<typeof publishCashSessionRealtimeMutation>[0], 'cache' | 'operationsRealtimeService'>,
  ) {
    publishCashSessionRealtimeMutation({
      ...input,
      cache: this.cache,
      operationsRealtimeService: this.operationsRealtimeService,
    })
  }

  private persistenceDeps() {
    return {
      prisma: this.prisma,
      helpers: this.helpers,
    }
  }

  private resolveActorEmployee(workspaceOwnerUserId: string, auth: AuthContext) {
    return this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
  }
}

function assertOpenCashSession(status: CashSessionStatus, message: string) {
  if (status !== CashSessionStatus.OPEN) {
    throw new ConflictException(message)
  }
}
