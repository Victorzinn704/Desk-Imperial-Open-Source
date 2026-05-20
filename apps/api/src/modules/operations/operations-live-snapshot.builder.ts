import { trace } from '@opentelemetry/api'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'
import { recordOperationsLiveTelemetry } from '../../common/observability/business-telemetry.util'
import {
  buildEmployeeOperationsRecord,
  type OperationsLiveResponse,
  toClosureRecord,
  toMesaRecord,
} from './operations.types'
import { formatBusinessDateKey, OPEN_COMANDA_STATUSES } from './operations-domain.utils'
import * as snapshotSelects from './operations-snapshot-selects'

type EmployeeSessionSnapshot = Parameters<typeof buildEmployeeOperationsRecord>[0]['cashSession']
type LiveSnapshotOptions = { includeCashMovements?: boolean; compactMode?: boolean }

type BuildOperationsLiveSnapshotParams = {
  prisma: PrismaService
  cache: CacheService
  workspaceOwnerUserId: string
  businessDate: Date
  scopedEmployeeId?: string | null | undefined
  options?: LiveSnapshotOptions | undefined
}

const OPERATIONS_LIVE_CACHE_TTL_SECONDS = 30
const DEFAULT_OWNER_OPERATOR_LABEL = 'Operacao de balcao'

export async function buildOperationsLiveSnapshot(
  params: BuildOperationsLiveSnapshotParams,
): Promise<OperationsLiveResponse> {
  const startedAt = performance.now()
  const options = resolveLiveSnapshotOptions(params.options)
  const cacheKey = buildLiveSnapshotCacheKey({ ...params, ...options })
  const cached = await readLiveSnapshotFromCache({ ...params, ...options, cacheKey, startedAt })

  if (cached) {
    return cached
  }

  const data = await fetchLiveSnapshotData({ ...params, ...options })
  const snapshot = toOperationsLiveSnapshot({ ...params, ...options, data })

  recordLiveSnapshotTelemetry({
    snapshot,
    startedAt,
    cacheHit: false,
    options,
    scopedEmployeeId: params.scopedEmployeeId,
  })
  void params.cache.set(cacheKey, snapshot, OPERATIONS_LIVE_CACHE_TTL_SECONDS)

  return snapshot
}

function resolveLiveSnapshotOptions(options: BuildOperationsLiveSnapshotParams['options']) {
  return {
    includeCashMovements: options?.includeCashMovements === true,
    compactMode: options?.compactMode === true,
  }
}

function buildLiveSnapshotCacheKey(params: {
  workspaceOwnerUserId: string
  businessDate: Date
  scopedEmployeeId?: string | null | undefined
  includeCashMovements: boolean
  compactMode: boolean
}) {
  const baseKey = CacheService.operationsLiveKey(
    params.workspaceOwnerUserId,
    formatBusinessDateKey(params.businessDate),
    params.includeCashMovements,
    params.scopedEmployeeId,
  )
  return params.compactMode ? `${baseKey}:compact` : baseKey
}

async function readLiveSnapshotFromCache(params: {
  cache: CacheService
  cacheKey: string
  startedAt: number
  compactMode: boolean
  includeCashMovements: boolean
  scopedEmployeeId?: string | null | undefined
}) {
  const cached = await params.cache.get<OperationsLiveResponse>(params.cacheKey)

  if (cached) {
    recordLiveSnapshotTelemetry({ snapshot: cached, startedAt: params.startedAt, cacheHit: true, options: params })
  }

  return cached
}

async function fetchLiveSnapshotData(params: {
  prisma: PrismaService
  workspaceOwnerUserId: string
  businessDate: Date
  scopedEmployeeId?: string | null | undefined
  includeCashMovements: boolean
  compactMode: boolean
}) {
  const comandaSelect = params.compactMode
    ? snapshotSelects.comandaSnapshotCompactSelect
    : snapshotSelects.comandaSnapshotSelect

  const [employees, sessions, closure, mesas, comandas, mesaOccupancyComandas] = await Promise.all([
    fetchEmployees(params),
    fetchCashSessions(params),
    fetchClosure(params),
    fetchMesas(params),
    fetchComandas({ ...params, comandaSelect }),
    fetchMesaOccupancyComandas(params),
  ])

  return { employees, sessions, closure, mesas, comandas, mesaOccupancyComandas }
}

function fetchEmployees(params: {
  prisma: PrismaService
  workspaceOwnerUserId: string
  scopedEmployeeId?: string | null | undefined
}) {
  return params.prisma.employee.findMany({
    where: {
      userId: params.workspaceOwnerUserId,
      ...(params.scopedEmployeeId ? { id: params.scopedEmployeeId } : {}),
    },
    select: snapshotSelects.employeeSnapshotSelect,
    orderBy: [{ active: 'desc' }, { employeeCode: 'asc' }],
  })
}

function fetchCashSessions(params: {
  prisma: PrismaService
  workspaceOwnerUserId: string
  businessDate: Date
  scopedEmployeeId?: string | null | undefined
  includeCashMovements: boolean
  compactMode: boolean
}) {
  return params.prisma.cashSession.findMany({
    where: {
      companyOwnerId: params.workspaceOwnerUserId,
      businessDate: params.businessDate,
      ...(params.scopedEmployeeId ? { employeeId: params.scopedEmployeeId } : {}),
    },
    select: resolveCashSessionSelect(params.compactMode, params.includeCashMovements),
    orderBy: { openedAt: 'desc' },
  })
}

function fetchClosure(params: { prisma: PrismaService; workspaceOwnerUserId: string; businessDate: Date }) {
  return params.prisma.cashClosure.findUnique({
    where: {
      companyOwnerId_businessDate: {
        companyOwnerId: params.workspaceOwnerUserId,
        businessDate: params.businessDate,
      },
    },
    select: snapshotSelects.cashClosureSnapshotSelect,
  })
}

function fetchMesas(params: { prisma: PrismaService; workspaceOwnerUserId: string }) {
  return params.prisma.mesa.findMany({
    where: { companyOwnerId: params.workspaceOwnerUserId, active: true },
    select: snapshotSelects.mesaSnapshotSelect,
    orderBy: [{ section: 'asc' }, { label: 'asc' }],
  })
}

function fetchComandas(params: {
  prisma: PrismaService
  workspaceOwnerUserId: string
  scopedEmployeeId?: string | null | undefined
  comandaSelect: typeof snapshotSelects.comandaSnapshotCompactSelect | typeof snapshotSelects.comandaSnapshotSelect
}) {
  return params.prisma.comanda.findMany({
    where: buildOpenedComandaWhere(params),
    select: params.comandaSelect,
    orderBy: { openedAt: 'asc' },
  })
}

function fetchMesaOccupancyComandas(params: { prisma: PrismaService; workspaceOwnerUserId: string }) {
  return params.prisma.comanda.findMany({
    where: {
      companyOwnerId: params.workspaceOwnerUserId,
      mesaId: { not: null },
      status: { in: OPEN_COMANDA_STATUSES },
    },
    select: {
      id: true,
      mesaId: true,
      currentEmployeeId: true,
      status: true,
    },
  })
}

function buildOpenedComandaWhere(params: {
  workspaceOwnerUserId: string
  scopedEmployeeId?: string | null | undefined
}) {
  return {
    companyOwnerId: params.workspaceOwnerUserId,
    status: {
      in: OPEN_COMANDA_STATUSES,
    },
    ...(params.scopedEmployeeId ? { currentEmployeeId: params.scopedEmployeeId } : {}),
  }
}

function resolveCashSessionSelect(compactMode: boolean, includeCashMovements: boolean) {
  if (compactMode) {
    return snapshotSelects.cashSessionCompactRefSelect
  }
  return includeCashMovements
    ? snapshotSelects.cashSessionSnapshotSelect
    : snapshotSelects.cashSessionSnapshotWithoutMovementsSelect
}

function toOperationsLiveSnapshot(params: {
  workspaceOwnerUserId: string
  businessDate: Date
  compactMode: boolean
  data: Awaited<ReturnType<typeof fetchLiveSnapshotData>>
}): OperationsLiveResponse {
  const sessionSnapshotByEmployee = params.compactMode
    ? new Map<string | null, EmployeeSessionSnapshot>()
    : buildSessionSnapshotByEmployee(params.data.sessions)
  const comandasByEmployee = groupComandasByEmployee(params.data.comandas)
  const openComandaByMesa = buildOpenComandaByMesa(params.data.mesaOccupancyComandas)

  return {
    businessDate: formatBusinessDateKey(params.businessDate),
    companyOwnerId: params.workspaceOwnerUserId,
    closure: toClosureRecord(params.data.closure),
    employees: params.data.employees.map((employee) =>
      buildEmployeeOperationsRecord({
        employee,
        cashSession: params.compactMode ? null : (sessionSnapshotByEmployee.get(employee.id) ?? null),
        comandas: comandasByEmployee.get(employee.id) ?? [],
      }),
    ),
    unassigned: buildEmployeeOperationsRecord({
      employee: null,
      cashSession: params.compactMode ? null : (sessionSnapshotByEmployee.get(null) ?? null),
      comandas: comandasByEmployee.get(null) ?? [],
      fallbackDisplayName: DEFAULT_OWNER_OPERATOR_LABEL,
    }),
    mesas: params.data.mesas.map((mesa) => toMesaRecord(mesa, openComandaByMesa.get(mesa.id) ?? null)),
  }
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

function groupComandasByEmployee(comandas: Awaited<ReturnType<typeof fetchLiveSnapshotData>>['comandas']) {
  const grouped = new Map<string | null, typeof comandas>()
  for (const comanda of comandas) {
    const key = comanda.currentEmployeeId ?? null
    grouped.set(key, [...(grouped.get(key) ?? []), comanda])
  }
  return grouped
}

function buildOpenComandaByMesa(comandas: Awaited<ReturnType<typeof fetchLiveSnapshotData>>['mesaOccupancyComandas']) {
  const map = new Map<string, (typeof comandas)[number]>()
  for (const comanda of comandas) {
    if (comanda.mesaId) {
      map.set(comanda.mesaId, comanda)
    }
  }
  return map
}

function recordLiveSnapshotTelemetry(params: {
  snapshot: OperationsLiveResponse
  startedAt: number
  cacheHit: boolean
  options: { compactMode: boolean; includeCashMovements: boolean; scopedEmployeeId?: string | null | undefined }
  scopedEmployeeId?: string | null | undefined
}) {
  const totalComandas = countSnapshotComandas(params.snapshot)
  const attributes = {
    'desk.operations.cache_hit': params.cacheHit,
    'desk.operations.compact_mode': params.options.compactMode,
    'desk.operations.include_cash_movements': params.options.includeCashMovements,
    'desk.operations.scoped_employee': Boolean(params.scopedEmployeeId ?? params.options.scopedEmployeeId),
  }

  recordOperationsLiveTelemetry(
    performance.now() - params.startedAt,
    {
      employees: params.snapshot.employees.length,
      comandas: totalComandas,
      mesas: params.snapshot.mesas.length,
    },
    attributes,
  )

  trace.getActiveSpan()?.setAttributes({
    ...attributes,
    'desk.operations.employee_count': params.snapshot.employees.length,
    'desk.operations.comanda_count': totalComandas,
    'desk.operations.mesa_count': params.snapshot.mesas.length,
  })
}

function countSnapshotComandas(snapshot: OperationsLiveResponse) {
  return (
    snapshot.unassigned.comandas.length +
    snapshot.employees.reduce((total, employee) => total + employee.comandas.length, 0)
  )
}
