import { CacheService } from '../../common/services/cache.service'
import type { PrismaService } from '../../database/prisma.service'
import { recordOperationsKitchenTelemetry } from '../../common/observability/business-telemetry.util'
import type { OperationsKitchenItemRecord, OperationsKitchenResponse } from '@contracts/contracts'
import { formatBusinessDateKey } from './operations-domain.utils'
import { buildKitchenItemWhere } from './operations-query-builders.utils'

type BuildKitchenViewParams = {
  prisma: PrismaService
  cache: CacheService
  workspaceOwnerUserId: string
  businessDate: Date
  scopedEmployeeId?: string | null | undefined
}

const OPERATIONS_KITCHEN_CACHE_TTL_SECONDS = 20
const DEFAULT_OWNER_OPERATOR_LABEL = 'Operacao de balcao'
const statusCountKeyByKitchenStatus = {
  QUEUED: 'queued',
  IN_PREPARATION: 'inPreparation',
  READY: 'ready',
} as const

export async function buildOperationsKitchenView(params: BuildKitchenViewParams): Promise<OperationsKitchenResponse> {
  const startedAt = performance.now()
  const businessDateKey = formatBusinessDateKey(params.businessDate)
  const cacheKey = CacheService.operationsKitchenKey(
    params.workspaceOwnerUserId,
    businessDateKey,
    params.scopedEmployeeId,
  )
  const cached = await readKitchenViewFromCache({ ...params, cacheKey, startedAt })

  if (cached) {
    return cached
  }

  const items = (await fetchKitchenItems(params)).map(toKitchenItemRecord)
  const response = {
    businessDate: businessDateKey,
    companyOwnerId: params.workspaceOwnerUserId,
    items,
    statusCounts: countKitchenStatuses(items),
  }

  recordKitchenTelemetry({ response, startedAt, cacheHit: false, scopedEmployeeId: params.scopedEmployeeId })
  void params.cache.set(cacheKey, response, OPERATIONS_KITCHEN_CACHE_TTL_SECONDS)

  return response
}

async function readKitchenViewFromCache(params: {
  cache: CacheService
  cacheKey: string
  startedAt: number
  scopedEmployeeId?: string | null | undefined
}) {
  const cached = await params.cache.get<OperationsKitchenResponse>(params.cacheKey)

  if (cached) {
    recordKitchenTelemetry({
      response: cached,
      startedAt: params.startedAt,
      cacheHit: true,
      scopedEmployeeId: params.scopedEmployeeId,
    })
  }

  return cached
}

function fetchKitchenItems(params: BuildKitchenViewParams) {
  return params.prisma.comandaItem.findMany({
    where: buildKitchenItemWhere({
      workspaceOwnerUserId: params.workspaceOwnerUserId,
      businessDate: params.businessDate,
      scopedEmployeeId: params.scopedEmployeeId,
    }),
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
}

function toKitchenItemRecord(item: Awaited<ReturnType<typeof fetchKitchenItems>>[number]): OperationsKitchenItemRecord {
  return {
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
  }
}

function countKitchenStatuses(items: OperationsKitchenItemRecord[]) {
  const statusCounts = {
    queued: 0,
    inPreparation: 0,
    ready: 0,
  }

  for (const item of items) {
    const countKey = statusCountKeyByKitchenStatus[item.kitchenStatus]
    if (countKey) {
      statusCounts[countKey] += 1
    }
  }

  return statusCounts
}

function recordKitchenTelemetry(params: {
  response: OperationsKitchenResponse
  startedAt: number
  cacheHit: boolean
  scopedEmployeeId?: string | null | undefined
}) {
  recordOperationsKitchenTelemetry(
    performance.now() - params.startedAt,
    {
      items: params.response.items.length,
    },
    {
      'desk.operations.cache_hit': params.cacheHit,
      'desk.operations.scoped_employee': Boolean(params.scopedEmployeeId),
    },
  )
}
