import { Injectable, Optional } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'
import {
  buildEmployeeOperationsRecord,
  type CashClosureLike,
  type ComandaLike,
  type OperationsLiveResponse,
  toClosureRecord,
  toMesaRecord,
} from './operations.types'
import { buildBusinessDateWindow, formatBusinessDateKey, OPEN_COMANDA_STATUSES } from './operations-domain.utils'
import { ComandaStatus } from '@prisma/client'
import { recordOperationsLiveTelemetry } from '../../common/observability/business-telemetry.util'
import { CurrencyService } from '../currency/currency.service'

type EmployeeSessionSnapshot = Parameters<typeof buildEmployeeOperationsRecord>[0]['cashSession']

const OPERATIONS_LIVE_CACHE_TTL_SECONDS = 30
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
  if (compactMode) {
    return cashSessionCompactRefSelect
  }
  if (includeCashMovements) {
    return cashSessionSnapshotSelect
  }
  return cashSessionSnapshotWithoutMovementsSelect
}

@Injectable()
export class OperationsLiveSnapshotService {
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
      const cached = await this.tryResolveFromCache(
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
        orderBy: { openedAt: 'desc' },
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
          openedAt: { gte: window.start, lt: window.end },
          ...(scopedEmployeeId ? { currentEmployeeId: scopedEmployeeId } : {}),
        },
        select: comandaSelect,
        orderBy: { openedAt: 'asc' },
      }),
      this.prisma.comanda.findMany({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          mesaId: { not: null },
          status: { in: OPEN_COMANDA_STATUSES },
        },
        select: { id: true, mesaId: true, currentEmployeeId: true, status: true },
      }),
    ])

    const sessionSnapshotByEmployee = compactMode
      ? new Map<string | null, EmployeeSessionSnapshot>()
      : this.buildSessionSnapshotByEmployee(sessions)

    const comandasByEmployee = this.groupComandasByEmployee(comandas)
    const openComandaByMesa = this.buildOpenComandaByMesa(mesaOccupancyComandas)

    const snapshot = this.buildSnapshotRecord({
      businessDate,
      workspaceOwnerUserId,
      closure,
      employees,
      comandasByEmployee,
      sessionSnapshotByEmployee,
      mesas,
      openComandaByMesa,
      compactMode,
    })

    this.recordTelemetry(startedAt, snapshot, compactMode, includeCashMovements, scopedEmployeeId)
    this.updateSpanAttributes(snapshot, compactMode, includeCashMovements)

    if (cacheKey) {
      void this.cache.set(cacheKey, snapshot, OPERATIONS_LIVE_CACHE_TTL_SECONDS)
    }

    return snapshot
  }

  private async tryResolveFromCache(
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

  private buildSessionSnapshotByEmployee(sessions: Record<string, unknown>[]) {
    const map = new Map<string | null, EmployeeSessionSnapshot>()
    for (const session of sessions) {
      if (!('employeeId' in session)) {
        continue
      }
      const employeeId = typeof session.employeeId === 'string' ? session.employeeId : null
      const movements = 'movements' in session ? session.movements : []
      map.set(employeeId, { ...session, movements } as EmployeeSessionSnapshot)
    }
    return map
  }

  private groupComandasByEmployee<T extends { currentEmployeeId: string | null }>(comandas: T[]) {
    const map = new Map<string | null, T[]>()
    for (const comanda of comandas) {
      const key = comanda.currentEmployeeId ?? null
      const bucket = map.get(key) ?? []
      bucket.push(comanda)
      map.set(key, bucket)
    }
    return map
  }

  private buildOpenComandaByMesa(
    mesaOccupancyComandas: Array<{
      id: string
      mesaId: string | null
      currentEmployeeId: string | null
      status: string
    }>,
  ) {
    const openComandas = mesaOccupancyComandas.filter((c) => OPEN_COMANDA_STATUSES.includes(c.status as ComandaStatus))
    const map = new Map<string, (typeof openComandas)[number]>()
    for (const comanda of openComandas) {
      if (comanda.mesaId) {
        map.set(comanda.mesaId, comanda)
      }
    }
    return map
  }

  private buildSnapshotRecord(params: {
    businessDate: Date
    workspaceOwnerUserId: string
    closure: CashClosureLike | null
    employees: Array<{ id: string; employeeCode: string; displayName: string; active: boolean }>
    comandasByEmployee: Map<string | null, Array<Record<string, unknown>>>
    sessionSnapshotByEmployee: Map<string | null, EmployeeSessionSnapshot>
    mesas: Array<{
      id: string
      label: string
      capacity: number
      section: string | null
      positionX: number | null
      positionY: number | null
      active: boolean
      reservedUntil: Date | null
    }>
    openComandaByMesa: Map<
      string,
      { id: string; mesaId: string | null; currentEmployeeId: string | null; status: string }
    >
    compactMode: boolean
  }) {
    const {
      businessDate,
      workspaceOwnerUserId,
      closure,
      employees,
      comandasByEmployee,
      sessionSnapshotByEmployee,
      mesas,
      openComandaByMesa,
      compactMode,
    } = params

    return {
      businessDate: formatBusinessDateKey(businessDate),
      companyOwnerId: workspaceOwnerUserId,
      closure: toClosureRecord(closure),
      employees: employees.map((employee) =>
        buildEmployeeOperationsRecord({
          employee,
          cashSession: compactMode ? null : (sessionSnapshotByEmployee.get(employee.id) ?? null),
          comandas: (comandasByEmployee.get(employee.id) ?? []) as ComandaLike[],
        }),
      ),
      unassigned: buildEmployeeOperationsRecord({
        employee: null,
        cashSession: compactMode ? null : (sessionSnapshotByEmployee.get(null) ?? null),
        comandas: (comandasByEmployee.get(null) ?? []) as ComandaLike[],
        fallbackDisplayName: DEFAULT_OWNER_OPERATOR_LABEL,
      }),
      mesas: mesas.map((mesa) => {
        const comanda = openComandaByMesa.get(mesa.id)
        return toMesaRecord(mesa, comanda ?? null)
      }),
    }
  }

  private recordTelemetry(
    startedAt: number,
    snapshot: OperationsLiveResponse,
    compactMode: boolean,
    includeCashMovements: boolean,
    scopedEmployeeId?: string | null,
  ) {
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
  }

  private updateSpanAttributes(snapshot: OperationsLiveResponse, compactMode: boolean, includeCashMovements: boolean) {
    trace.getActiveSpan()?.setAttributes({
      'desk.operations.cache_hit': false,
      'desk.operations.compact_mode': compactMode,
      'desk.operations.include_cash_movements': includeCashMovements,
      'desk.operations.employee_count': snapshot.employees.length,
      'desk.operations.comanda_count':
        snapshot.unassigned.comandas.length + snapshot.employees.reduce((t, e) => t + e.comandas.length, 0),
      'desk.operations.mesa_count': snapshot.mesas.length,
    })
  }
}
