import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import type { Prisma } from '@prisma/client'
import {
  CashClosureStatus,
  CashMovementType,
  CashSessionStatus,
  ComandaStatus,
  CurrencyCode,
  KitchenItemStatus,
  OrderStatus,
  type Employee,
} from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import type { ComandaDraftItemDto } from './dto/comanda-draft-item.dto'
import {
  buildEmployeeOperationsRecord,
  toClosureRecord,
  toMesaRecord,
  type OperationsLiveResponse,
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
  OPEN_COMANDA_STATUSES,
  buildBusinessDateWindow,
  formatBusinessDateKey,
  resolveBuyerTypeFromDocument,
  toNumberOrZero,
} from './operations-domain.utils'
import {
  recordOperationsKitchenTelemetry,
  recordOperationsLiveTelemetry,
} from '../../common/observability/business-telemetry.util'
import {
  calculateEffectiveUnitCost,
  calculateRawEffectiveUnitCost,
  buildProductConsumptionMap,
} from '../products/product-combo-consumption.util'
import { CurrencyService } from '../currency/currency.service'

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

const employeeSnapshotSelect = {
  id: true,
  employeeCode: true,
  displayName: true,
  active: true,
} as const

const cashMovementSnapshotSelect = {
  id: true,
  cashSessionId: true,
  employeeId: true,
  type: true,
  amount: true,
  note: true,
  createdAt: true,
} as const

const cashSessionSnapshotSelect = {
  id: true,
  companyOwnerId: true,
  employeeId: true,
  status: true,
  businessDate: true,
  openingCashAmount: true,
  countedCashAmount: true,
  expectedCashAmount: true,
  differenceAmount: true,
  grossRevenueAmount: true,
  realizedProfitAmount: true,
  notes: true,
  openedAt: true,
  closedAt: true,
  movements: {
    select: cashMovementSnapshotSelect,
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const

const cashSessionSnapshotWithoutMovementsSelect = {
  id: true,
  companyOwnerId: true,
  employeeId: true,
  status: true,
  businessDate: true,
  openingCashAmount: true,
  countedCashAmount: true,
  expectedCashAmount: true,
  differenceAmount: true,
  grossRevenueAmount: true,
  realizedProfitAmount: true,
  notes: true,
  openedAt: true,
  closedAt: true,
} as const

const cashSessionCompactRefSelect = {
  id: true,
} as const

const comandaItemSnapshotSelect = {
  id: true,
  productId: true,
  productName: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  notes: true,
  kitchenStatus: true,
  kitchenQueuedAt: true,
  kitchenReadyAt: true,
} as const

const comandaSnapshotSelect = {
  id: true,
  companyOwnerId: true,
  cashSessionId: true,
  mesaId: true,
  currentEmployeeId: true,
  tableLabel: true,
  customerName: true,
  customerDocument: true,
  participantCount: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  serviceFeeAmount: true,
  totalAmount: true,
  notes: true,
  openedAt: true,
  closedAt: true,
  items: {
    select: comandaItemSnapshotSelect,
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const

const comandaSnapshotCompactSelect = {
  id: true,
  companyOwnerId: true,
  cashSessionId: true,
  mesaId: true,
  currentEmployeeId: true,
  tableLabel: true,
  customerName: true,
  customerDocument: true,
  participantCount: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  serviceFeeAmount: true,
  totalAmount: true,
  notes: true,
  openedAt: true,
  closedAt: true,
} as const

const cashClosureSnapshotSelect = {
  status: true,
  expectedCashAmount: true,
  countedCashAmount: true,
  differenceAmount: true,
  grossRevenueAmount: true,
  realizedProfitAmount: true,
  openSessionsCount: true,
  openComandasCount: true,
} as const

const mesaSnapshotSelect = {
  id: true,
  label: true,
  capacity: true,
  section: true,
  positionX: true,
  positionY: true,
  active: true,
  reservedUntil: true,
} as const

function resolveCashSessionSelect(compactMode: boolean, includeCashMovements: boolean) {
  if (compactMode) return cashSessionCompactRefSelect
  if (includeCashMovements) return cashSessionSnapshotSelect
  return cashSessionSnapshotWithoutMovementsSelect
}

@Injectable()
export class OperationsHelpersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    @Optional() private readonly currencyService?: CurrencyService,
  ) {}

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
      if (cached) return cached
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
      // Single query covering both session-linked and standalone comandas for the
      // business date window — eliminates the sequential second wave that previously
      // waited for sessionIds before querying.
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
      : this.buildSessionSnapshotByEmployee(sessions)

    const comandasByEmployee = new Map<string | null, typeof comandas>()
    for (const comanda of comandas) {
      const key = comanda.currentEmployeeId ?? null
      const bucket = comandasByEmployee.get(key) ?? []
      bucket.push(comanda)
      comandasByEmployee.set(key, bucket)
    }

    // Build a map of mesaId → open comanda for status derivation
    const openComandas = mesaOccupancyComandas.filter((comanda) => OPEN_COMANDA_STATUSES.includes(comanda.status))
    const openComandaByMesa = new Map<string, (typeof openComandas)[number]>()
    for (const comanda of openComandas) {
      if (comanda.mesaId) openComandaByMesa.set(comanda.mesaId, comanda)
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
    if (!cached) return null

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

  private buildSessionSnapshotByEmployee(sessions: Record<string, unknown>[]) {
    const map = new Map<string | null, EmployeeSessionSnapshot>()
    for (const session of sessions) {
      if (!('employeeId' in session)) continue
      const employeeId = typeof session.employeeId === 'string' ? session.employeeId : null
      map.set(employeeId, {
        ...session,
        movements: 'movements' in session ? session.movements : [],
      } as EmployeeSessionSnapshot)
    }
    return map
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
      where: this.buildKitchenItemWhere(workspaceOwnerUserId, businessDate, scopedEmployeeId),
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

    const summaryComandaWhere = this.buildOperationsComandaWhere(workspaceOwnerUserId, businessDate, scopedEmployeeId)
    const openComandaWhere = this.buildOperationsComandaWhere(workspaceOwnerUserId, businessDate, scopedEmployeeId, {
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

  private buildOperationsComandaWhere(
    workspaceOwnerUserId: string,
    businessDate: Date,
    scopedEmployeeId?: string | null,
    options?: {
      statuses?: ComandaStatus[]
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

  private buildKitchenItemWhere(
    workspaceOwnerUserId: string,
    businessDate: Date,
    scopedEmployeeId?: string | null,
  ): Prisma.ComandaItemWhereInput {
    return {
      kitchenStatus: {
        in: [KitchenItemStatus.QUEUED, KitchenItemStatus.IN_PREPARATION, KitchenItemStatus.READY],
      },
      comanda: {
        is: this.buildOperationsComandaWhere(workspaceOwnerUserId, businessDate, scopedEmployeeId, {
          statuses: OPEN_COMANDA_STATUSES,
        }),
      },
    }
  }

  async recalculateCashSession(transaction: TransactionClient, cashSessionId: string) {
    const session = await transaction.cashSession.findUnique({
      where: { id: cashSessionId },
      include: {
        movements: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        comandas: {
          where: {
            status: ComandaStatus.CLOSED,
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Caixa nao encontrado.')
    }

    const supplyAmount = session.movements
      .filter((movement) => movement.type === CashMovementType.SUPPLY)
      .reduce((sum, movement) => sum + toNumberOrZero(movement.amount), 0)
    const withdrawalAmount = session.movements
      .filter((movement) => movement.type === CashMovementType.WITHDRAWAL)
      .reduce((sum, movement) => sum + toNumberOrZero(movement.amount), 0)
    const adjustmentAmount = session.movements
      .filter((movement) => movement.type === CashMovementType.ADJUSTMENT)
      .reduce((sum, movement) => sum + toNumberOrZero(movement.amount), 0)
    const grossRevenueAmount = roundCurrency(
      session.comandas.reduce((sum, comanda) => sum + toNumberOrZero(comanda.totalAmount), 0),
    )
    const realizedProfitAmount = roundCurrency(
      session.comandas.reduce((sum, comanda) => {
        const comandaCost = comanda.items.reduce((itemsTotal, item) => {
          const unitCost = item.product ? toNumberOrZero(item.product.unitCost) : 0
          return itemsTotal + roundCurrency(unitCost * item.quantity)
        }, 0)

        return sum + roundCurrency(toNumberOrZero(comanda.totalAmount) - comandaCost)
      }, 0),
    )
    const expectedCashAmount = roundCurrency(
      toNumberOrZero(session.openingCashAmount) +
        supplyAmount +
        adjustmentAmount -
        withdrawalAmount +
        grossRevenueAmount,
    )

    return transaction.cashSession.update({
      where: { id: session.id },
      data: {
        expectedCashAmount,
        grossRevenueAmount,
        realizedProfitAmount,
      },
      include: {
        movements: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })
  }

  async recalculateComanda(
    transaction: TransactionClient,
    comandaId: string,
    overrides?: {
      discountAmount?: number
      serviceFeeAmount?: number
    },
  ) {
    const comanda = await transaction.comanda.findUnique({
      where: { id: comandaId },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!comanda) {
      throw new NotFoundException('Comanda nao encontrada.')
    }

    const subtotalAmount = roundCurrency(comanda.items.reduce((sum, item) => sum + toNumberOrZero(item.totalAmount), 0))
    const discountAmount = roundCurrency(overrides?.discountAmount ?? toNumberOrZero(comanda.discountAmount))
    const serviceFeeAmount = roundCurrency(overrides?.serviceFeeAmount ?? toNumberOrZero(comanda.serviceFeeAmount))
    const totalAmount = roundCurrency(Math.max(0, subtotalAmount - discountAmount + serviceFeeAmount))

    return transaction.comanda.update({
      where: { id: comanda.id },
      data: {
        subtotalAmount,
        discountAmount,
        serviceFeeAmount,
        totalAmount,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })
  }

  async syncCashClosure(transaction: TransactionClient, workspaceOwnerUserId: string, businessDate: Date) {
    const window = buildBusinessDateWindow(businessDate)
    const [sessions, openComandasCount, existingClosure] = await Promise.all([
      transaction.cashSession.findMany({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
        },
      }),
      transaction.comanda.count({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          status: {
            in: OPEN_COMANDA_STATUSES,
          },
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
        },
      }),
      transaction.cashClosure.findUnique({
        where: {
          companyOwnerId_businessDate: {
            companyOwnerId: workspaceOwnerUserId,
            businessDate,
          },
        },
      }),
    ])

    const openSessionsCount = sessions.filter((session) => session.status === CashSessionStatus.OPEN).length
    const expectedCashAmount = roundCurrency(
      sessions.reduce((sum, session) => sum + toNumberOrZero(session.expectedCashAmount), 0),
    )
    const grossRevenueAmount = roundCurrency(
      sessions.reduce((sum, session) => sum + toNumberOrZero(session.grossRevenueAmount), 0),
    )
    const realizedProfitAmount = roundCurrency(
      sessions.reduce((sum, session) => sum + toNumberOrZero(session.realizedProfitAmount), 0),
    )

    const status =
      existingClosure?.status === CashClosureStatus.CLOSED || existingClosure?.status === CashClosureStatus.FORCE_CLOSED
        ? existingClosure.status
        : openSessionsCount > 0 || openComandasCount > 0
          ? CashClosureStatus.PENDING_EMPLOYEE_CLOSE
          : CashClosureStatus.OPEN

    return transaction.cashClosure.upsert({
      where: {
        companyOwnerId_businessDate: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
        },
      },
      create: {
        companyOwnerId: workspaceOwnerUserId,
        businessDate,
        status,
        expectedCashAmount,
        grossRevenueAmount,
        realizedProfitAmount,
        openSessionsCount,
        openComandasCount,
      },
      update: {
        status,
        expectedCashAmount,
        grossRevenueAmount,
        realizedProfitAmount,
        openSessionsCount,
        openComandasCount,
      },
    })
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

    if (!employee || session.employeeId !== employee.id) {
      throw new ForbiddenException('Seu acesso nao pode operar o caixa de outro funcionario.')
    }

    return session
  }

  async requireOwnedCashSession(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    cashSessionId: string,
    options?: {
      includeMovements?: boolean
    },
  ) {
    const session = await transaction.cashSession.findFirst({
      where: {
        id: cashSessionId,
        companyOwnerId: workspaceOwnerUserId,
      },
      include: options?.includeMovements
        ? {
            movements: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          }
        : undefined,
    })

    if (!session) {
      throw new NotFoundException('Caixa nao encontrado para esta empresa.')
    }

    return session
  }

  async requireAuthorizedComanda(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    auth: AuthContext,
    comandaId: string,
    actorEmployee?: Employee | null,
  ) {
    const comanda = await this.requireOwnedComanda(transaction, workspaceOwnerUserId, comandaId)

    if (auth.role === 'OWNER') {
      return comanda
    }

    const employee = actorEmployee ?? (await this.resolveEmployeeForStaff(transaction, workspaceOwnerUserId, auth))

    if (!employee || comanda.currentEmployeeId !== employee.id) {
      throw new ForbiddenException('Seu acesso so pode operar mesas vinculadas ao seu atendimento.')
    }

    return comanda
  }

  async requireOwnedComanda(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    comandaId: string,
  ) {
    const comanda = await transaction.comanda.findFirst({
      where: {
        id: comandaId,
        companyOwnerId: workspaceOwnerUserId,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!comanda) {
      throw new NotFoundException('Comanda nao encontrada para esta empresa.')
    }

    return comanda
  }

  async requireOwnedEmployee(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    employeeId: string,
  ) {
    const employee = await transaction.employee.findFirst({
      where: {
        id: employeeId,
        userId: workspaceOwnerUserId,
        active: true,
      },
    })

    if (!employee) {
      throw new NotFoundException('Funcionario nao encontrado para esta empresa.')
    }

    return employee
  }

  async resolveEmployeeForStaff(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    auth: AuthContext,
  ) {
    if (auth.role !== 'STAFF') {
      return null
    }

    if (auth.employeeId) {
      return transaction.employee.findFirst({
        where: {
          id: auth.employeeId,
          userId: workspaceOwnerUserId,
          active: true,
        },
      })
    }

    return null
  }

  async resolveComandaBusinessDate(
    transaction: PrismaService | TransactionClient,
    comanda: {
      cashSessionId: string | null
      openedAt: Date
    },
  ) {
    if (comanda.cashSessionId) {
      const session = await transaction.cashSession.findUnique({
        where: {
          id: comanda.cashSessionId,
        },
        select: {
          businessDate: true,
        },
      })

      if (session) {
        return session.businessDate
      }
    }

    return new Date(comanda.openedAt.getFullYear(), comanda.openedAt.getMonth(), comanda.openedAt.getDate())
  }

  async resolveComandaDraftItems(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    items?: ComandaDraftItemDto[],
  ): Promise<
    Array<{
      productId: string | null
      productName: string
      quantity: number
      unitPrice: number
      totalAmount: number
      notes: string | null
    }>
  > {
    if (!items?.length) {
      return []
    }

    const productIds: string[] = []
    const seenProductIds = new Set<string>()
    for (const item of items) {
      if (item.productId && !seenProductIds.has(item.productId)) {
        seenProductIds.add(item.productId)
        productIds.push(item.productId)
      }
    }
    const products = productIds.length
      ? await transaction.product.findMany({
          where: {
            id: {
              in: productIds,
            },
            userId: workspaceOwnerUserId,
            active: true,
          },
          select: {
            id: true,
            name: true,
            unitPrice: true,
          },
        })
      : []
    const productById = new Map(products.map((product) => [product.id, product]))

    const normalizedItems: Array<{
      productId: string | null
      productName: string
      quantity: number
      unitPrice: number
      totalAmount: number
      notes: string | null
    }> = []

    for (const item of items) {
      normalizedItems.push(this.resolveSingleDraftItem(item, productById))
    }

    return normalizedItems
  }

  private resolveSingleDraftItem(
    item: ComandaDraftItemDto,
    productById: Map<string, { id: string; name: string; unitPrice: number }>,
  ): {
    productId: string | null
    productName: string
    quantity: number
    unitPrice: number
    totalAmount: number
    notes: string | null
  } {
    const { productId, productName, unitPrice } = item.productId
      ? this.resolveLinkedDraftItem(item, productById)
      : this.resolveManualDraftItem(item)

    const notes = sanitizePlainText(item.notes, 'Observacoes do item', {
      allowEmpty: true,
      rejectFormula: false,
    })

    return {
      productId,
      productName,
      quantity: item.quantity,
      unitPrice,
      totalAmount: roundCurrency(unitPrice * item.quantity),
      notes,
    }
  }

  private resolveLinkedDraftItem(
    item: ComandaDraftItemDto,
    productById: Map<string, { id: string; name: string; unitPrice: number }>,
  ) {
    const product = productById.get(item.productId!)
    if (!product) throw new NotFoundException('Produto nao encontrado para esta conta.')
    return {
      productId: product.id as string | null,
      productName: product.name,
      unitPrice: roundCurrency(item.unitPrice ?? toNumberOrZero(product.unitPrice)),
    }
  }

  private resolveManualDraftItem(item: ComandaDraftItemDto) {
    const productName = sanitizePlainText(item.productName, 'Nome do item da comanda', {
      allowEmpty: false,
      rejectFormula: true,
    })!

    if (item.unitPrice === undefined) {
      throw new BadRequestException('Informe o valor unitario quando o item nao estiver vinculado ao catalogo.')
    }

    return {
      productId: null as string | null,
      productName,
      unitPrice: roundCurrency(item.unitPrice),
    }
  }

  async assertOpenTableAvailability(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    tableLabel: string,
    currentComandaId?: string,
  ) {
    const openComanda = await transaction.comanda.findFirst({
      where: {
        companyOwnerId: workspaceOwnerUserId,
        tableLabel,
        status: {
          in: OPEN_COMANDA_STATUSES,
        },
        ...(currentComandaId
          ? {
              id: {
                not: currentComandaId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    })

    if (openComanda) {
      throw new ConflictException('Ja existe uma comanda aberta para esta mesa.')
    }
  }

  async ensureOrderForClosedComanda(transaction: TransactionClient, workspaceOwnerUserId: string, comandaId: string) {
    const existingOrder = await transaction.order.findFirst({
      where: {
        userId: workspaceOwnerUserId,
        comandaId,
      },
      select: {
        id: true,
      },
    })

    if (existingOrder) {
      return existingOrder
    }

    const comanda = await transaction.comanda.findFirst({
      where: {
        id: comandaId,
        companyOwnerId: workspaceOwnerUserId,
      },
      include: {
        currentEmployee: true,
        items: {
          include: {
            product: {
              include: {
                comboComponents: {
                  include: {
                    componentProduct: {
                      select: {
                        id: true,
                        name: true,
                        stock: true,
                        unitCost: true,
                        currency: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!comanda) {
      throw new NotFoundException('Comanda nao encontrada para gerar o pedido.')
    }

    const costSnapshot = this.currencyService ? await this.currencyService.getSnapshot() : null

    const totalCost = roundCurrency(
      comanda.items.reduce((sum, item) => {
        const unitCost = item.product
          ? this.currencyService && costSnapshot
            ? calculateEffectiveUnitCost(item.product, {
                currencyService: this.currencyService,
                displayCurrency: CurrencyCode.BRL,
                snapshot: costSnapshot,
              })
            : calculateRawEffectiveUnitCost(item.product)
          : 0
        return sum + roundCurrency(unitCost * item.quantity)
      }, 0),
    )
    const totalRevenue = roundCurrency(toNumberOrZero(comanda.totalAmount))
    const totalProfit = roundCurrency(totalRevenue - totalCost)
    const totalItems = comanda.items.reduce((sum, item) => sum + item.quantity, 0)

    const comboAwareProducts = comanda.items
      .map((item) => item.product)
      .filter((product): product is NonNullable<(typeof comanda.items)[number]['product']> => Boolean(product))
    const comboAwareProductsById = new Map(comboAwareProducts.map((product) => [product.id, product]))
    const stockByProduct = buildProductConsumptionMap(
      comanda.items
        .filter((item) => Boolean(item.productId))
        .map((item) => ({
          productId: item.productId!,
          quantity: item.quantity,
        })),
      comboAwareProductsById,
    )

    for (const [productId, qty] of stockByProduct.entries()) {
      await transaction.product.updateMany({
        where: {
          id: productId,
          userId: workspaceOwnerUserId,
          stock: { gte: qty },
        },
        data: { stock: { decrement: qty } },
      })

      // Se stock < qty o produto continua com estoque 0 (não bloqueia o fechamento da comanda)
      await transaction.product.updateMany({
        where: {
          id: productId,
          userId: workspaceOwnerUserId,
          stock: { lt: qty },
        },
        data: { stock: 0 },
      })
    }

    return transaction.order.create({
      data: {
        userId: workspaceOwnerUserId,
        comandaId: comanda.id,
        customerName: comanda.customerName,
        buyerType: resolveBuyerTypeFromDocument(comanda.customerDocument),
        buyerDocument: comanda.customerDocument,
        employeeId: comanda.currentEmployeeId,
        sellerCode: comanda.currentEmployee?.employeeCode ?? null,
        sellerName: comanda.currentEmployee?.displayName ?? null,
        channel: 'COMANDA',
        notes: comanda.notes,
        currency: CurrencyCode.BRL,
        status: OrderStatus.COMPLETED,
        totalRevenue,
        totalCost,
        totalProfit,
        totalItems,
        items: {
          create: comanda.items.map((item) => {
            const unitCost = item.product
              ? this.currencyService && costSnapshot
                ? calculateEffectiveUnitCost(item.product, {
                    currencyService: this.currencyService,
                    displayCurrency: CurrencyCode.BRL,
                    snapshot: costSnapshot,
                  })
                : calculateRawEffectiveUnitCost(item.product)
              : 0
            const lineRevenue = roundCurrency(toNumberOrZero(item.totalAmount))
            const lineCost = roundCurrency(unitCost * item.quantity)

            return {
              productId: item.productId,
              productName: item.productName,
              category: item.product?.category ?? 'Comanda manual',
              quantity: item.quantity,
              currency: CurrencyCode.BRL,
              unitCost,
              unitPrice: roundCurrency(toNumberOrZero(item.unitPrice)),
              lineRevenue,
              lineCost,
              lineProfit: roundCurrency(lineRevenue - lineCost),
            }
          }),
        },
      },
    })
  }

  async assertBusinessDayOpen(workspaceOwnerUserId: string, businessDate: Date) {
    const closure = await this.prisma.cashClosure.findUnique({
      where: {
        companyOwnerId_businessDate: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
        },
      },
    })

    if (closure?.status === CashClosureStatus.CLOSED || closure?.status === CashClosureStatus.FORCE_CLOSED) {
      throw new ConflictException('A operacao deste dia ja foi consolidada e nao aceita novas aberturas.')
    }
  }
}
