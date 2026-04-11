import { Injectable, Optional } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { $Enums, CashSessionStatus, KitchenItemStatus, type Prisma } from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'
import {
  buildEmployeeOperationsRecord,
  type OperationsLiveResponse,
  toClosureRecord,
  toMesaRecord,
} from './operations.types'
import type {
  OperationsExecutiveKpis,
  OperationsKitchenItemRecord,
  OperationsKitchenResponse,
  OperationsPerformerRankingEntry,
  OperationsSummaryResponse,
  OperationsTopProductEntry,
} from '@contracts/contracts'
import {
  buildBusinessDateWindow,
  formatBusinessDateKey,
  OPEN_COMANDA_STATUSES,
  toNumberOrZero,
} from './operations-domain.utils'
import {
  recordOperationsKitchenTelemetry,
  recordOperationsLiveTelemetry,
} from '../../common/observability/business-telemetry.util'
import { CurrencyService } from '../currency/currency.service'
import {
  recalculateCashSession,
  recalculateComanda,
  syncCashClosure,
} from './operations-cash.utils'
import {
  requireAuthorizedCashSession,
  requireAuthorizedComanda,
  requireOwnedCashSession,
  requireOwnedComanda,
  requireOwnedEmployee,
  resolveEmployeeForStaff,
} from './operations-auth.utils'
import {
  assertBusinessDayOpen,
  assertOpenTableAvailability,
  ensureOrderForClosedComanda,
  resolveComandaBusinessDate,
  resolveComandaDraftItems,
} from './operations-comanda-helpers.utils'

type TransactionClient = Prisma.TransactionClient

type EmployeeSessionSnapshot = Parameters<typeof buildEmployeeOperationsRecord>[0]['cashSession']

// TTL do live elevado para 30s porque o cache não é mais deletado nas mutações.
// O socket empurra patches via setQueryData — o Redis só serve reconexões e
// background refetches (staleTime frontend = 15s). 30s > 15s garante que o
// cache esteja quente em toda janela de operação normal.
const OPERATIONS_LIVE_CACHE_TTL_SECONDS = 30
const OPERATIONS_KITCHEN_CACHE_TTL_SECONDS = 20
const OPERATIONS_SUMMARY_CACHE_TTL_SECONDS = 20
const DEFAULT_OWNER_OPERATOR_LABEL = 'Operacao de balcao'

import {
  cashClosureSnapshotSelect,
  cashSessionCompactRefSelect,
  cashSessionSnapshotSelect,
  cashSessionSnapshotWithoutMovementsSelect,
  comandaSnapshotCompactSelect,
  comandaSnapshotSelect,
  employeeSnapshotSelect,
  mesaSnapshotSelect,
} from './operations-snapshot-selects'

function resolveCashSessionSelect(compactMode: boolean, includeCashMovements: boolean) {
  if (compactMode) {
    return cashSessionCompactRefSelect
  }
  if (includeCashMovements) {
    return cashSessionSnapshotSelect
  }
  return cashSessionSnapshotWithoutMovementsSelect
}

function buildSessionSnapshotByEmployee(sessions: Record<string, unknown>[]) {
  const map = new Map<string | null, EmployeeSessionSnapshot>()
  for (const session of sessions) {
    if (!('employeeId' in session)) {
      continue
    }
    const employeeId = typeof session.employeeId === 'string' ? session.employeeId : null
    map.set(employeeId, {
      ...session,
      movements: 'movements' in session ? session.movements : [],
    } as EmployeeSessionSnapshot)
  }
  return map
}

function buildOperationsComandaWhere(
  workspaceOwnerUserId: string,
  businessDate: Date,
  scopedEmployeeId?: string | null,
  options?: {
    statuses?: $Enums.ComandaStatus[]
  },
): Prisma.ComandaWhereInput {
  const window = buildBusinessDateWindow(businessDate)

  return {
    companyOwnerId: workspaceOwnerUserId,
    ...(options?.statuses?.length
      ? {
          status: {
            in: options.statuses,
          },
        }
      : {}),
    ...(scopedEmployeeId ? { currentEmployeeId: scopedEmployeeId } : {}),
    OR: [
      {
        cashSession: {
          is: {
            businessDate,
          },
        },
      },
      {
        cashSessionId: null,
        openedAt: {
          gte: window.start,
          lt: window.end,
        },
      },
    ],
  }
}

function buildKitchenItemWhere(
  workspaceOwnerUserId: string,
  businessDate: Date,
  scopedEmployeeId?: string | null,
): Prisma.ComandaItemWhereInput {
  return {
    kitchenStatus: {
      in: [KitchenItemStatus.QUEUED, KitchenItemStatus.IN_PREPARATION, KitchenItemStatus.READY],
    },
    comanda: {
      is: buildOperationsComandaWhere(workspaceOwnerUserId, businessDate, scopedEmployeeId, {
        statuses: OPEN_COMANDA_STATUSES,
      }),
    },
  }
}

@Injectable()
export class OperationsHelpersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    @Optional() private readonly currencyService?: CurrencyService,
  ) {}

  // ── Delegated helpers (pure utilities extracted to separate files) ──

  recalculateCashSession = recalculateCashSession
  recalculateComanda = recalculateComanda
  syncCashClosure = syncCashClosure
  requireAuthorizedCashSession = requireAuthorizedCashSession
  requireOwnedCashSession = requireOwnedCashSession
  requireAuthorizedComanda = requireAuthorizedComanda
  requireOwnedComanda = requireOwnedComanda
  requireOwnedEmployee = requireOwnedEmployee
  resolveEmployeeForStaff = resolveEmployeeForStaff
  resolveComandaBusinessDate = resolveComandaBusinessDate
  resolveComandaDraftItems = resolveComandaDraftItems
  assertOpenTableAvailability = assertOpenTableAvailability
  assertBusinessDayOpen = (workspaceOwnerUserId: string, businessDate: Date) =>
    assertBusinessDayOpen(this.prisma, workspaceOwnerUserId, businessDate)
  ensureOrderForClosedComanda = (transaction: TransactionClient, workspaceOwnerUserId: string, comandaId: string) =>
    ensureOrderForClosedComanda(transaction, workspaceOwnerUserId, comandaId, this.currencyService ?? null)

  // ── Snapshot builders (need this.cache / this.prisma) ──

  async buildLiveSnapshot(
    workspaceOwnerUserId: string,
    businessDate: Date,
    scopedEmployeeId?: string | null,
    options?: {
      includeCashMovements?: boolean
      compactMode?: boolean
    },
  ): Promise<OperationsLiveResponse> {
    const startedAt = performance.now()
    const window = buildBusinessDateWindow(businessDate)
    const includeCashMovements = options?.includeCashMovements === true
    const compactMode = options?.compactMode === true
    const cacheKey =
      CacheService.operationsLiveKey(
        workspaceOwnerUserId,
        formatBusinessDateKey(businessDate),
        includeCashMovements,
        scopedEmployeeId,
      ) + (compactMode ? ':compact' : '')

    if (cacheKey) {
      const cached = await this.tryResolveLiveSnapshotFromCache(
        cacheKey,
        startedAt,
        compactMode,
        includeCashMovements,
        scopedEmployeeId,
      )
      if (cached) {
        return cached
      }
    }

    const comandaSelect = compactMode ? comandaSnapshotCompactSelect : comandaSnapshotSelect
    const [employees, sessions, closure, mesas, comandas, mesaOccupancyComandas] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          userId: workspaceOwnerUserId,
          ...(scopedEmployeeId ? { id: scopedEmployeeId } : {}),
        },
        select: employeeSnapshotSelect,
        orderBy: [{ active: 'desc' }, { employeeCode: 'asc' }],
      }),
      this.prisma.cashSession.findMany({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
          ...(scopedEmployeeId ? { employeeId: scopedEmployeeId } : {}),
        },
        select: resolveCashSessionSelect(compactMode, includeCashMovements),
        orderBy: {
          openedAt: 'desc',
        },
      }),
      this.prisma.cashClosure.findUnique({
        where: {
          companyOwnerId_businessDate: {
            companyOwnerId: workspaceOwnerUserId,
            businessDate,
          },
        },
        select: cashClosureSnapshotSelect,
      }),
      this.prisma.mesa.findMany({
        where: { companyOwnerId: workspaceOwnerUserId, active: true },
        select: mesaSnapshotSelect,
        orderBy: [{ section: 'asc' }, { label: 'asc' }],
      }),
      this.prisma.comanda.findMany({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          openedAt: {
            gte: window.start,
            lt: window.end,
          },
          ...(scopedEmployeeId ? { currentEmployeeId: scopedEmployeeId } : {}),
        },
        select: comandaSelect,
        orderBy: {
          openedAt: 'asc',
        },
      }),
      this.prisma.comanda.findMany({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          mesaId: {
            not: null,
          },
          status: {
            in: OPEN_COMANDA_STATUSES,
          },
        },
        select: {
          id: true,
          mesaId: true,
          currentEmployeeId: true,
          status: true,
        },
      }),
    ])
    const sessionSnapshotByEmployee = compactMode
      ? new Map<string | null, EmployeeSessionSnapshot>()
      : buildSessionSnapshotByEmployee(sessions)

    const comandasByEmployee = new Map<string | null, typeof comandas>()
    for (const comanda of comandas) {
      const key = comanda.currentEmployeeId ?? null
      const bucket = comandasByEmployee.get(key) ?? []
      bucket.push(comanda)
      comandasByEmployee.set(key, bucket)
    }

    const openComandas = mesaOccupancyComandas.filter((comanda) => OPEN_COMANDA_STATUSES.includes(comanda.status))
    const openComandaByMesa = new Map<string, (typeof openComandas)[number]>()
    for (const comanda of openComandas) {
      if (comanda.mesaId) {
        openComandaByMesa.set(comanda.mesaId, comanda)
      }
    }

    const snapshot = {
      businessDate: formatBusinessDateKey(businessDate),
      companyOwnerId: workspaceOwnerUserId,
      closure: toClosureRecord(closure),
      employees: employees.map((employee) =>
        buildEmployeeOperationsRecord({
          employee,
          cashSession: compactMode ? null : (sessionSnapshotByEmployee.get(employee.id) ?? null),
          comandas: comandasByEmployee.get(employee.id) ?? [],
        }),
      ),
      unassigned: buildEmployeeOperationsRecord({
        employee: null,
        cashSession: compactMode ? null : (sessionSnapshotByEmployee.get(null) ?? null),
        comandas: comandasByEmployee.get(null) ?? [],
        fallbackDisplayName: DEFAULT_OWNER_OPERATOR_LABEL,
      }),
      mesas: mesas.map((mesa) => {
        const comanda = openComandaByMesa.get(mesa.id)
        return toMesaRecord(mesa, comanda ?? null)
      }),
    }

    const totalComandas =
      snapshot.unassigned.comandas.length +
      snapshot.employees.reduce((total, employee) => total + employee.comandas.length, 0)

    recordOperationsLiveTelemetry(
      performance.now() - startedAt,
      {
        employees: snapshot.employees.length,
        comandas: totalComandas,
        mesas: snapshot.mesas.length,
      },
      {
        'desk.operations.cache_hit': false,
        'desk.operations.compact_mode': compactMode,
        'desk.operations.include_cash_movements': includeCashMovements,
        'desk.operations.scoped_employee': Boolean(scopedEmployeeId),
      },
    )

    trace.getActiveSpan()?.setAttributes({
      'desk.operations.cache_hit': false,
      'desk.operations.compact_mode': compactMode,
      'desk.operations.include_cash_movements': includeCashMovements,
      'desk.operations.employee_count': snapshot.employees.length,
      'desk.operations.comanda_count': totalComandas,
      'desk.operations.mesa_count': snapshot.mesas.length,
    })

    if (cacheKey) {
      void this.cache.set(cacheKey, snapshot, OPERATIONS_LIVE_CACHE_TTL_SECONDS)
    }

    return snapshot
  }

  private async tryResolveLiveSnapshotFromCache(
    cacheKey: string,
    startedAt: number,
    compactMode: boolean,
    includeCashMovements: boolean,
    scopedEmployeeId?: string | null,
  ): Promise<OperationsLiveResponse | null> {
    const cached = await this.cache.get<OperationsLiveResponse>(cacheKey)
    if (!cached) {
      return null
    }

    const totalComandas =
      cached.unassigned.comandas.length +
      cached.employees.reduce((total, employee) => total + employee.comandas.length, 0)

    recordOperationsLiveTelemetry(
      performance.now() - startedAt,
      {
        employees: cached.employees.length,
        comandas: totalComandas,
        mesas: cached.mesas.length,
      },
      {
        'desk.operations.cache_hit': true,
        'desk.operations.compact_mode': compactMode,
        'desk.operations.include_cash_movements': includeCashMovements,
        'desk.operations.scoped_employee': Boolean(scopedEmployeeId),
      },
    )

    return cached
  }

  async buildKitchenView(
    workspaceOwnerUserId: string,
    businessDate: Date,
    scopedEmployeeId?: string | null,
  ): Promise<OperationsKitchenResponse> {
    const startedAt = performance.now()
    const businessDateKey = formatBusinessDateKey(businessDate)
    const cacheKey = CacheService.operationsKitchenKey(workspaceOwnerUserId, businessDateKey, scopedEmployeeId)
    const cached = await this.cache.get<OperationsKitchenResponse>(cacheKey)
    if (cached) {
      recordOperationsKitchenTelemetry(
        performance.now() - startedAt,
        {
          items: cached.items.length,
        },
        {
          'desk.operations.cache_hit': true,
          'desk.operations.scoped_employee': Boolean(scopedEmployeeId),
        },
      )

      return cached
    }

    const kitchenItems = await this.prisma.comandaItem.findMany({
      where: buildKitchenItemWhere(workspaceOwnerUserId, businessDate, scopedEmployeeId),
      select: {
        id: true,
        comandaId: true,
        productName: true,
        quantity: true,
        notes: true,
        kitchenStatus: true,
        kitchenQueuedAt: true,
        kitchenReadyAt: true,
        comanda: {
          select: {
            tableLabel: true,
            currentEmployeeId: true,
            currentEmployee: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: [{ kitchenQueuedAt: 'asc' }, { createdAt: 'asc' }],
    })

    const items: OperationsKitchenItemRecord[] = kitchenItems.map((item) => ({
      itemId: item.id,
      comandaId: item.comandaId,
      mesaLabel: item.comanda.tableLabel,
      employeeId: item.comanda.currentEmployeeId,
      employeeName: item.comanda.currentEmployee?.displayName ?? DEFAULT_OWNER_OPERATOR_LABEL,
      productName: item.productName,
      quantity: item.quantity,
      notes: item.notes,
      kitchenStatus: item.kitchenStatus as OperationsKitchenItemRecord['kitchenStatus'],
      kitchenQueuedAt: item.kitchenQueuedAt?.toISOString() ?? null,
      kitchenReadyAt: item.kitchenReadyAt?.toISOString() ?? null,
    }))
    const statusCounts = items.reduce(
      (accumulator, item) => {
        if (item.kitchenStatus === 'QUEUED') {
          accumulator.queued += 1
        } else if (item.kitchenStatus === 'IN_PREPARATION') {
          accumulator.inPreparation += 1
        } else if (item.kitchenStatus === 'READY') {
          accumulator.ready += 1
        }

        return accumulator
      },
      {
        queued: 0,
        inPreparation: 0,
        ready: 0,
      },
    )

    const response = {
      businessDate: businessDateKey,
      companyOwnerId: workspaceOwnerUserId,
      items,
      statusCounts,
    }

    recordOperationsKitchenTelemetry(
      performance.now() - startedAt,
      {
        items: response.items.length,
      },
      {
        'desk.operations.cache_hit': false,
        'desk.operations.scoped_employee': Boolean(scopedEmployeeId),
      },
    )

    void this.cache.set(cacheKey, response, OPERATIONS_KITCHEN_CACHE_TTL_SECONDS)

    return response
  }

  async buildSummaryView(
    workspaceOwnerUserId: string,
    businessDate: Date,
    scopedEmployeeId?: string | null,
  ): Promise<OperationsSummaryResponse> {
    const businessDateKey = formatBusinessDateKey(businessDate)
    const cacheKey = CacheService.operationsSummaryKey(workspaceOwnerUserId, businessDateKey, scopedEmployeeId)
    const cached = await this.cache.get<OperationsSummaryResponse>(cacheKey)
    if (cached) {
      return cached
    }

    const summaryComandaWhere = buildOperationsComandaWhere(workspaceOwnerUserId, businessDate, scopedEmployeeId)
    const openComandaWhere = buildOperationsComandaWhere(workspaceOwnerUserId, businessDate, scopedEmployeeId, {
      statuses: OPEN_COMANDA_STATUSES,
    })

    const [closure, openComandasAggregate, openSessionsCount, performerGroups, topProductGroups] = await Promise.all([
      this.prisma.cashClosure.findUnique({
        where: {
          companyOwnerId_businessDate: {
            companyOwnerId: workspaceOwnerUserId,
            businessDate,
          },
        },
        select: cashClosureSnapshotSelect,
      }),
      this.prisma.comanda.aggregate({
        where: openComandaWhere,
        _sum: {
          totalAmount: true,
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.cashSession.count({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
          status: CashSessionStatus.OPEN,
          ...(scopedEmployeeId ? { employeeId: scopedEmployeeId } : {}),
        },
      }),
      this.prisma.comanda.groupBy({
        by: ['currentEmployeeId'],
        where: summaryComandaWhere,
        _sum: {
          totalAmount: true,
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.comandaItem.groupBy({
        by: ['productName'],
        where: {
          comanda: {
            is: summaryComandaWhere,
          },
        },
        _sum: {
          quantity: true,
          totalAmount: true,
        },
      }),
    ])

    const employeeIds = performerGroups
      .map((group) => group.currentEmployeeId)
      .filter((employeeId): employeeId is string => Boolean(employeeId))
    const employees = employeeIds.length
      ? await this.prisma.employee.findMany({
          where: {
            id: { in: employeeIds },
            userId: workspaceOwnerUserId,
          },
          select: {
            id: true,
            displayName: true,
          },
        })
      : []
    const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.displayName]))
    const ownerDisplayName = DEFAULT_OWNER_OPERATOR_LABEL

    const faturamentoAberto = toNumberOrZero(openComandasAggregate._sum.totalAmount)
    const receitaRealizada = toNumberOrZero(closure?.grossRevenueAmount)
    const lucroRealizado = toNumberOrZero(closure?.realizedProfitAmount)

    const kpis: OperationsExecutiveKpis = {
      receitaRealizada,
      faturamentoAberto,
      projecaoTotal: receitaRealizada + faturamentoAberto,
      lucroRealizado,
      lucroEsperado: lucroRealizado + faturamentoAberto,
      caixaEsperado: toNumberOrZero(closure?.expectedCashAmount),
      openComandasCount: closure?.openComandasCount ?? openComandasAggregate._count._all,
      openSessionsCount: closure?.openSessionsCount ?? openSessionsCount,
    }

    const performers: OperationsPerformerRankingEntry[] = performerGroups
      .map((group) => {
        const valor = toNumberOrZero(group._sum.totalAmount)
        const comandas = group._count._all
        if (valor <= 0 && comandas <= 0) {
          return null
        }

        return {
          nome: group.currentEmployeeId
            ? (employeeNameById.get(group.currentEmployeeId) ?? 'Funcionario removido')
            : ownerDisplayName,
          valor,
          comandas,
        }
      })
      .filter((entry): entry is OperationsPerformerRankingEntry => entry !== null)
      .sort((left, right) => right.valor - left.valor)
      .slice(0, 5)

    const topProducts: OperationsTopProductEntry[] = topProductGroups
      .map((group) => ({
        nome: group.productName,
        qtd: group._sum.quantity ?? 0,
        valor: toNumberOrZero(group._sum.totalAmount),
      }))
      .sort((left, right) => right.valor - left.valor)
      .slice(0, 5)

    const finalizedResponse: OperationsSummaryResponse = {
      businessDate: businessDateKey,
      companyOwnerId: workspaceOwnerUserId,
      kpis,
      performers,
      topProducts,
    }

    void this.cache.set(cacheKey, finalizedResponse, OPERATIONS_SUMMARY_CACHE_TTL_SECONDS)

    return finalizedResponse
  }
}
