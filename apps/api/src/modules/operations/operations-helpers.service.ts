import { ForbiddenException, Injectable, Optional } from '@nestjs/common'
import { type $Enums, type Prisma } from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'
import type { OperationsLiveResponse } from './operations.types'
import { isOpenComandaStatus } from './operations-domain.utils'
import { CurrencyService } from '../currency/currency.service'
import type { AuthContext } from '../auth/auth.types'
import { recalculateCashSession, recalculateComanda, syncCashClosure } from './operations-cash.utils'
import {
  requireOwnedCashSession,
  requireOwnedComanda,
  requireOwnedEmployee,
  resolveEmployeeForStaff,
} from './operations-auth.utils'
import {
  assertBusinessDayOpen,
  assertDraftSelectionsStockAvailability,
  assertOpenTableAvailability,
  ensureOrderForClosedComanda,
  resolveComandaBusinessDate,
  resolveComandaDraftItems,
} from './operations-comanda-helpers.utils'
import { recordOperationsRecalculateCashSessionTelemetry } from '../../common/observability/business-telemetry.util'
import { buildOperationsKitchenView } from './operations-kitchen-view.builder'
import { buildOperationsLiveSnapshot } from './operations-live-snapshot.builder'
import {
  buildKitchenItemWhere as buildKitchenItemWhereInput,
  buildOperationsComandaWhere as buildOperationsComandaWhereInput,
} from './operations-query-builders.utils'
import { buildOperationsSummaryView } from './operations-summary-view.builder'

type TransactionClient = Prisma.TransactionClient

export type AuthorizedComandaRequest = {
  transaction: PrismaService | TransactionClient
  workspaceOwnerUserId: string
  auth: AuthContext
  comandaId: string
  actorEmployee?: { id: string } | null
}

@Injectable()
export class OperationsHelpersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    @Optional() private readonly currencyService?: CurrencyService,
  ) {}

  recalculateComanda = recalculateComanda
  syncCashClosure = syncCashClosure
  requireOwnedCashSession = requireOwnedCashSession
  requireOwnedComanda = requireOwnedComanda
  requireOwnedEmployee = requireOwnedEmployee
  resolveEmployeeForStaff = resolveEmployeeForStaff
  resolveComandaBusinessDate = resolveComandaBusinessDate
  resolveComandaDraftItems = resolveComandaDraftItems
  assertOpenTableAvailability = assertOpenTableAvailability

  assertDraftSelectionsStockAvailability = (
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    selections: Array<{ productId: string; quantity: number }>,
  ) => assertDraftSelectionsStockAvailability(transaction, workspaceOwnerUserId, selections)

  buildOperationsComandaWhere = (
    workspaceOwnerUserId: string,
    businessDate: Date,
    scopedEmployeeId?: string | null,
    options?: { statuses?: $Enums.ComandaStatus[] },
  ) =>
    buildOperationsComandaWhereInput({
      workspaceOwnerUserId,
      businessDate,
      scopedEmployeeId,
      statuses: options?.statuses,
    })

  buildKitchenItemWhere = (workspaceOwnerUserId: string, businessDate: Date, scopedEmployeeId?: string | null) =>
    buildKitchenItemWhereInput({ workspaceOwnerUserId, businessDate, scopedEmployeeId })

  assertBusinessDayOpen = (workspaceOwnerUserId: string, businessDate: Date) =>
    assertBusinessDayOpen(this.prisma, workspaceOwnerUserId, businessDate)

  ensureOrderForClosedComanda = (transaction: TransactionClient, workspaceOwnerUserId: string, comandaId: string) =>
    ensureOrderForClosedComanda(transaction, workspaceOwnerUserId, comandaId, this.currencyService ?? null)

  async recalculateCashSession(transaction: TransactionClient, cashSessionId: string) {
    const startedAt = performance.now()
    const session = await recalculateCashSession(transaction, cashSessionId)
    recordOperationsRecalculateCashSessionTelemetry(performance.now() - startedAt, {
      'desk.operations.cash_session_id_present': Boolean(cashSessionId),
      'desk.operations.cash_session_status': session.status,
    })
    return session
  }

  async requireAuthorizedCashSession(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    auth: AuthContext,
    cashSessionId: string,
  ) {
    const session = await this.requireOwnedCashSession(transaction, workspaceOwnerUserId, cashSessionId, {
      includeMovements: true,
    })

    if (auth.role === 'OWNER') {
      return session
    }

    const employee = await this.resolveEmployeeForStaff(transaction, workspaceOwnerUserId, auth)

    if (employee?.id !== session.employeeId) {
      throw new ForbiddenException('Seu acesso nao pode operar o caixa de outro funcionario.')
    }

    return session
  }

  async requireAuthorizedComanda(params: AuthorizedComandaRequest) {
    const comanda = await this.requireOwnedComanda(params.transaction, params.workspaceOwnerUserId, params.comandaId)

    if (params.auth.role === 'OWNER') {
      return comanda
    }

    const employee =
      params.actorEmployee ??
      (await this.resolveEmployeeForStaff(params.transaction, params.workspaceOwnerUserId, params.auth))

    if (!employee) {
      throw new ForbiddenException('Seu acesso precisa estar vinculado a um funcionario ativo para operar comandas.')
    }

    return comanda
  }

  async buildLiveSnapshot(
    workspaceOwnerUserId: string,
    businessDate: Date,
    scopedEmployeeId?: string | null,
    options?: {
      includeCashMovements?: boolean
      compactMode?: boolean
    },
  ): Promise<OperationsLiveResponse> {
    return buildOperationsLiveSnapshot({
      prisma: this.prisma,
      cache: this.cache,
      workspaceOwnerUserId,
      businessDate,
      scopedEmployeeId,
      options,
    })
  }

  async buildStaffOperationalSnapshot(
    workspaceOwnerUserId: string,
    businessDate: Date,
    staffEmployeeId: string,
    options?: {
      compactMode?: boolean
    },
  ): Promise<OperationsLiveResponse> {
    const snapshot = await this.buildLiveSnapshot(workspaceOwnerUserId, businessDate, null, {
      includeCashMovements: false,
      ...(options?.compactMode !== undefined ? { compactMode: options.compactMode } : {}),
    })

    return {
      ...snapshot,
      closure: null,
      employees: snapshot.employees.map((employee) => ({
        ...employee,
        cashSession: employee.employeeId === staffEmployeeId ? employee.cashSession : null,
        comandas: employee.comandas.filter(
          (comanda) => isOpenComandaStatus(comanda.status) || comanda.currentEmployeeId === staffEmployeeId,
        ),
      })),
      unassigned: {
        ...snapshot.unassigned,
        cashSession: null,
        comandas: snapshot.unassigned.comandas.filter((comanda) => isOpenComandaStatus(comanda.status)),
      },
    }
  }

  async buildKitchenView(workspaceOwnerUserId: string, businessDate: Date, scopedEmployeeId?: string | null) {
    return buildOperationsKitchenView({
      prisma: this.prisma,
      cache: this.cache,
      workspaceOwnerUserId,
      businessDate,
      scopedEmployeeId,
    })
  }

  async buildSummaryView(workspaceOwnerUserId: string, businessDate: Date, scopedEmployeeId?: string | null) {
    return buildOperationsSummaryView({
      prisma: this.prisma,
      cache: this.cache,
      workspaceOwnerUserId,
      businessDate,
      scopedEmployeeId,
    })
  }
}
