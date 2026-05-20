import { CashSessionStatus } from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import { recordOperationsSummaryTelemetry } from '../../common/observability/business-telemetry.util'
import type { PrismaService } from '../../database/prisma.service'
import type {
  OperationsExecutiveKpis,
  OperationsPerformerRankingEntry,
  OperationsSummaryResponse,
  OperationsTopProductEntry,
} from '@contracts/contracts'
import { formatBusinessDateKey, OPEN_COMANDA_STATUSES, toNumberOrZero } from './operations-domain.utils'
import { cashClosureSnapshotSelect } from './operations-snapshot-selects'
import { buildOperationsComandaWhere } from './operations-query-builders.utils'

type BuildSummaryViewParams = {
  prisma: PrismaService
  cache: CacheService
  workspaceOwnerUserId: string
  businessDate: Date
  scopedEmployeeId?: string | null | undefined
}

const OPERATIONS_SUMMARY_CACHE_TTL_SECONDS = 20
const DEFAULT_OWNER_OPERATOR_LABEL = 'Operacao de balcao'
const TOP_LIST_LIMIT = 5

export async function buildOperationsSummaryView(params: BuildSummaryViewParams): Promise<OperationsSummaryResponse> {
  const startedAt = performance.now()
  const businessDateKey = formatBusinessDateKey(params.businessDate)
  const cacheKey = CacheService.operationsSummaryKey(
    params.workspaceOwnerUserId,
    businessDateKey,
    params.scopedEmployeeId,
  )
  const cached = await params.cache.get<OperationsSummaryResponse>(cacheKey)

  if (cached) {
    recordSummaryTelemetry({ response: cached, startedAt, cacheHit: true, scopedEmployeeId: params.scopedEmployeeId })
    return cached
  }

  const data = await fetchSummaryData(params)
  const employeeNameById = await fetchEmployeeNames({ ...params, performerGroups: data.performerGroups })
  const response = {
    businessDate: businessDateKey,
    companyOwnerId: params.workspaceOwnerUserId,
    kpis: buildExecutiveKpis(data),
    performers: buildPerformers({ groups: data.performerGroups, employeeNameById }),
    topProducts: buildTopProducts(data.topProductGroups),
  }

  void params.cache.set(cacheKey, response, OPERATIONS_SUMMARY_CACHE_TTL_SECONDS)
  recordSummaryTelemetry({ response, startedAt, cacheHit: false, scopedEmployeeId: params.scopedEmployeeId })
  return response
}

async function fetchSummaryData(params: BuildSummaryViewParams) {
  const summaryComandaWhere = buildOperationsComandaWhere(params)
  const openComandaWhere = buildOperationsComandaWhere({ ...params, statuses: OPEN_COMANDA_STATUSES })

  const [closure, openComandasAggregate, openSessionsCount, performerGroups, topProductGroups] = await Promise.all([
    fetchClosure(params),
    aggregateOpenComandas({ ...params, openComandaWhere }),
    countOpenSessions(params),
    groupPerformers({ ...params, summaryComandaWhere }),
    groupTopProducts({ ...params, summaryComandaWhere }),
  ])

  return { closure, openComandasAggregate, openSessionsCount, performerGroups, topProductGroups }
}

function fetchClosure(params: BuildSummaryViewParams) {
  return params.prisma.cashClosure.findUnique({
    where: {
      companyOwnerId_businessDate: {
        companyOwnerId: params.workspaceOwnerUserId,
        businessDate: params.businessDate,
      },
    },
    select: cashClosureSnapshotSelect,
  })
}

function aggregateOpenComandas(
  params: BuildSummaryViewParams & { openComandaWhere: ReturnType<typeof buildOperationsComandaWhere> },
) {
  return params.prisma.comanda.aggregate({
    where: params.openComandaWhere,
    _sum: {
      totalAmount: true,
    },
    _count: {
      _all: true,
    },
  })
}

function countOpenSessions(params: BuildSummaryViewParams) {
  return params.prisma.cashSession.count({
    where: {
      companyOwnerId: params.workspaceOwnerUserId,
      businessDate: params.businessDate,
      status: CashSessionStatus.OPEN,
      ...(params.scopedEmployeeId ? { employeeId: params.scopedEmployeeId } : {}),
    },
  })
}

function groupPerformers(
  params: BuildSummaryViewParams & { summaryComandaWhere: ReturnType<typeof buildOperationsComandaWhere> },
) {
  return params.prisma.comanda.groupBy({
    by: ['currentEmployeeId'],
    where: params.summaryComandaWhere,
    _sum: {
      totalAmount: true,
    },
    _count: {
      _all: true,
    },
  })
}

function groupTopProducts(
  params: BuildSummaryViewParams & { summaryComandaWhere: ReturnType<typeof buildOperationsComandaWhere> },
) {
  return params.prisma.comandaItem.groupBy({
    by: ['productName'],
    where: {
      comanda: {
        is: params.summaryComandaWhere,
      },
    },
    _sum: {
      quantity: true,
      totalAmount: true,
    },
  })
}

async function fetchEmployeeNames(params: {
  prisma: PrismaService
  workspaceOwnerUserId: string
  performerGroups: Awaited<ReturnType<typeof fetchSummaryData>>['performerGroups']
}) {
  const employeeIds = params.performerGroups
    .map((group) => group.currentEmployeeId)
    .filter((employeeId): employeeId is string => Boolean(employeeId))

  if (!employeeIds.length) {
    return new Map<string, string>()
  }

  const employees = await params.prisma.employee.findMany({
    where: {
      id: { in: employeeIds },
      userId: params.workspaceOwnerUserId,
    },
    select: {
      id: true,
      displayName: true,
    },
  })

  return new Map(employees.map((employee) => [employee.id, employee.displayName]))
}

function buildExecutiveKpis(data: Awaited<ReturnType<typeof fetchSummaryData>>): OperationsExecutiveKpis {
  const faturamentoAberto = toNumberOrZero(data.openComandasAggregate._sum.totalAmount)
  const receitaRealizada = toNumberOrZero(data.closure?.grossRevenueAmount)
  const lucroRealizado = toNumberOrZero(data.closure?.realizedProfitAmount)

  return {
    receitaRealizada,
    faturamentoAberto,
    projecaoTotal: receitaRealizada + faturamentoAberto,
    lucroRealizado,
    lucroEsperado: lucroRealizado + faturamentoAberto,
    caixaEsperado: toNumberOrZero(data.closure?.expectedCashAmount),
    openComandasCount: data.closure?.openComandasCount ?? data.openComandasAggregate._count._all,
    openSessionsCount: data.closure?.openSessionsCount ?? data.openSessionsCount,
  }
}

function buildPerformers(params: {
  groups: Awaited<ReturnType<typeof fetchSummaryData>>['performerGroups']
  employeeNameById: Map<string, string>
}): OperationsPerformerRankingEntry[] {
  return params.groups
    .map((group) => toPerformerEntry({ group, employeeNameById: params.employeeNameById }))
    .filter((entry): entry is OperationsPerformerRankingEntry => entry !== null)
    .sort((left, right) => right.valor - left.valor)
    .slice(0, TOP_LIST_LIMIT)
}

function toPerformerEntry(params: {
  group: Awaited<ReturnType<typeof fetchSummaryData>>['performerGroups'][number]
  employeeNameById: Map<string, string>
}) {
  const valor = toNumberOrZero(params.group._sum.totalAmount)
  const comandas = params.group._count._all

  if (valor <= 0 && comandas <= 0) {
    return null
  }

  return {
    nome: resolvePerformerName(params),
    valor,
    comandas,
  }
}

function resolvePerformerName(params: {
  group: Awaited<ReturnType<typeof fetchSummaryData>>['performerGroups'][number]
  employeeNameById: Map<string, string>
}) {
  if (!params.group.currentEmployeeId) {
    return DEFAULT_OWNER_OPERATOR_LABEL
  }
  return params.employeeNameById.get(params.group.currentEmployeeId) ?? 'Funcionario removido'
}

function buildTopProducts(
  groups: Awaited<ReturnType<typeof fetchSummaryData>>['topProductGroups'],
): OperationsTopProductEntry[] {
  return groups
    .map((group) => ({
      nome: group.productName,
      qtd: group._sum.quantity ?? 0,
      valor: toNumberOrZero(group._sum.totalAmount),
    }))
    .sort((left, right) => right.valor - left.valor)
    .slice(0, TOP_LIST_LIMIT)
}

function recordSummaryTelemetry(params: {
  response: OperationsSummaryResponse
  startedAt: number
  cacheHit: boolean
  scopedEmployeeId?: string | null | undefined
}) {
  recordOperationsSummaryTelemetry(
    performance.now() - params.startedAt,
    {
      performers: params.response.performers.length,
      topProducts: params.response.topProducts.length,
    },
    {
      'desk.operations.cache_hit': params.cacheHit,
      'desk.operations.scoped_employee': Boolean(params.scopedEmployeeId),
    },
  )
}
