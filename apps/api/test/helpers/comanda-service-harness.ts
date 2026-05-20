import type { CacheService } from '../../src/common/services/cache.service'
import type { PrismaService } from '../../src/database/prisma.service'
import type { FinanceService } from '../../src/modules/finance/finance.service'
import type { AuditLogService } from '../../src/modules/monitoring/audit-log.service'
import type { OperationsRealtimeService } from '../../src/modules/operations-realtime/operations-realtime.service'
import { ComandaCommandFacadeService } from '../../src/modules/operations/comanda-command-facade.service'
import { ComandaItemsDispatchService } from '../../src/modules/operations/comanda-items-dispatch.service'
import { ComandaItemsService } from '../../src/modules/operations/comanda-items.service'
import { ComandaKitchenDispatchService } from '../../src/modules/operations/comanda-kitchen-dispatch.service'
import { ComandaKitchenService } from '../../src/modules/operations/comanda-kitchen.service'
import { ComandaLifecycleService } from '../../src/modules/operations/comanda-lifecycle.service'
import { ComandaMutationContextService } from '../../src/modules/operations/comanda-mutation-context.service'
import { ComandaOpenService } from '../../src/modules/operations/comanda-open.service'
import { ComandaQueryService } from '../../src/modules/operations/comanda-query.service'
import { ComandaRealtimePublisher } from '../../src/modules/operations/comanda-realtime-publisher.service'
import { ComandaService } from '../../src/modules/operations/comanda.service'
import { ComandaSettlementService } from '../../src/modules/operations/comanda-settlement.service'
import type { OperationsHelpersService } from '../../src/modules/operations/operations-helpers.service'

type AsyncMock = jest.Mock<Promise<unknown>, unknown[]>
type SyncMock = jest.Mock<unknown, unknown[]>

type TransactionCallback = (tx: ComandaTransactionClientMock) => Promise<unknown>
type TransactionMock = jest.Mock<Promise<unknown>, [callback: TransactionCallback, options?: unknown]>

export type ComandaTransactionClientMock = {
  product: ComandaPrismaMock['product']
  comanda: ComandaPrismaMock['comanda']
  comandaItem: ComandaPrismaMock['comandaItem']
  comandaAssignment: ComandaPrismaMock['comandaAssignment']
  comandaPayment: ComandaPrismaMock['comandaPayment']
}

export type ComandaPrismaMock = {
  product: {
    findFirst: AsyncMock
    findMany: AsyncMock
  }
  comanda: {
    findFirst: AsyncMock
    create: AsyncMock
    update: AsyncMock
    findUnique: AsyncMock
  }
  comandaItem: {
    create: AsyncMock
    createMany: AsyncMock
    deleteMany: AsyncMock
    findMany: AsyncMock
    findUnique: AsyncMock
    update: AsyncMock
  }
  comandaAssignment: {
    updateMany: AsyncMock
    create: AsyncMock
  }
  comandaPayment: {
    aggregate: AsyncMock
    create: AsyncMock
  }
  cashSession: {
    findFirst: AsyncMock
  }
  mesa: {
    findUnique: AsyncMock
  }
  $transaction: TransactionMock
}

export type ComandaCacheMock = {
  delByPrefix: AsyncMock
  del: AsyncMock
}

export type ComandaRealtimeMock = {
  publishComandaOpened: SyncMock
  publishComandaUpdated: SyncMock
  publishComandaClosed: SyncMock
  publishCashUpdated: SyncMock
  publishCashClosureUpdated: SyncMock
  publishKitchenItemQueued: SyncMock
  publishKitchenItemUpdated: SyncMock
}

export type ComandaHelpersMock = {
  resolveEmployeeForStaff: AsyncMock
  requireAuthorizedComanda: AsyncMock
  requireOwnedComanda: AsyncMock
  requireOwnedEmployee: AsyncMock
  resolveComandaBusinessDate: AsyncMock
  recalculateComanda: AsyncMock
  resolveComandaDraftItems: AsyncMock
  assertDraftSelectionsStockAvailability: AsyncMock
  assertOpenTableAvailability: AsyncMock
  assertBusinessDayOpen: AsyncMock
  syncCashClosure: AsyncMock
  recalculateCashSession: AsyncMock
  ensureOrderForClosedComanda: AsyncMock
  buildLiveSnapshot: AsyncMock
}

export type ComandaServiceHarness = {
  service: ComandaService
  prisma: ComandaPrismaMock
  cache: ComandaCacheMock
  audit: { record: AsyncMock }
  realtime: ComandaRealtimeMock
  helpers: ComandaHelpersMock
  finance: { invalidateAndWarmSummary: AsyncMock }
}

export type ComandaServiceMocks = {
  audit: { record: AsyncMock }
  cache: ComandaCacheMock
  finance?: { invalidateAndWarmSummary: AsyncMock }
  helpers: ComandaHelpersMock
  prisma: ComandaPrismaMock
  realtime: ComandaRealtimeMock
}

function asyncMock(): AsyncMock {
  return jest.fn<Promise<unknown>, unknown[]>()
}

function syncMock(): SyncMock {
  return jest.fn<unknown, unknown[]>()
}

function createPrismaMock(): ComandaPrismaMock {
  const prisma = {
    product: { findFirst: asyncMock(), findMany: asyncMock() },
    comanda: { findFirst: asyncMock(), create: asyncMock(), update: asyncMock(), findUnique: asyncMock() },
    comandaItem: {
      create: asyncMock(),
      createMany: asyncMock(),
      deleteMany: asyncMock(),
      findMany: asyncMock(),
      findUnique: asyncMock(),
      update: asyncMock(),
    },
    comandaAssignment: { updateMany: asyncMock(), create: asyncMock() },
    comandaPayment: { aggregate: asyncMock(), create: asyncMock() },
    cashSession: { findFirst: asyncMock() },
    mesa: { findUnique: asyncMock() },
    $transaction: jest.fn<Promise<unknown>, [callback: TransactionCallback, options?: unknown]>(),
  }

  prisma.$transaction.mockImplementation(async (callback) => callback(createTransactionClient(prisma)))

  return prisma
}

function createTransactionClient(prisma: ComandaPrismaMock): ComandaTransactionClientMock {
  return {
    product: prisma.product,
    comanda: prisma.comanda,
    comandaItem: prisma.comandaItem,
    comandaAssignment: prisma.comandaAssignment,
    comandaPayment: prisma.comandaPayment,
  }
}

function createHelpersMock(): ComandaHelpersMock {
  return {
    resolveEmployeeForStaff: jest.fn(async () => null),
    requireAuthorizedComanda: asyncMock(),
    requireOwnedComanda: asyncMock(),
    requireOwnedEmployee: asyncMock(),
    resolveComandaBusinessDate: asyncMock(),
    recalculateComanda: asyncMock(),
    resolveComandaDraftItems: asyncMock(),
    assertDraftSelectionsStockAvailability: jest.fn(async () => undefined),
    assertOpenTableAvailability: jest.fn(async () => undefined),
    assertBusinessDayOpen: jest.fn(async () => undefined),
    syncCashClosure: asyncMock(),
    recalculateCashSession: asyncMock(),
    ensureOrderForClosedComanda: jest.fn(async () => undefined),
    buildLiveSnapshot: jest.fn(async () => ({ marker: 'live' })),
  }
}

export function createComandaServiceHarness(): ComandaServiceHarness {
  const prisma = createPrismaMock()
  const cache = { delByPrefix: jest.fn(async () => undefined), del: jest.fn(async () => undefined) }
  const audit = { record: jest.fn(async () => undefined) }
  const realtime = {
    publishComandaOpened: syncMock(),
    publishComandaUpdated: syncMock(),
    publishComandaClosed: syncMock(),
    publishCashUpdated: syncMock(),
    publishCashClosureUpdated: syncMock(),
    publishKitchenItemQueued: syncMock(),
    publishKitchenItemUpdated: syncMock(),
  }
  const helpers = createHelpersMock()
  const finance = { invalidateAndWarmSummary: jest.fn(async () => undefined) }

  const service = createComandaServiceFromMocks({
    audit,
    cache,
    finance,
    helpers,
    prisma,
    realtime,
  })

  return { service, prisma, cache, audit, realtime, helpers, finance }
}

export function createComandaServiceFromMocks(mocks: ComandaServiceMocks): ComandaService {
  const finance = mocks.finance ?? { invalidateAndWarmSummary: jest.fn(async () => undefined) }
  const context = new ComandaMutationContextService(
    mocks.prisma as unknown as PrismaService,
    mocks.helpers as unknown as OperationsHelpersService,
  )
  const realtime = new ComandaRealtimePublisher(
    mocks.cache as unknown as CacheService,
    mocks.realtime as unknown as OperationsRealtimeService,
    finance as unknown as FinanceService,
  )
  const query = new ComandaQueryService(mocks.prisma as unknown as PrismaService, context)
  const commands = createComandaCommands(mocks, context, realtime)

  return new ComandaService(query, commands)
}

function createComandaCommands(
  mocks: ComandaServiceMocks,
  context: ComandaMutationContextService,
  realtime: ComandaRealtimePublisher,
) {
  const itemsDispatch = new ComandaItemsDispatchService(mocks.audit as unknown as AuditLogService, realtime)
  const kitchenDispatch = new ComandaKitchenDispatchService(mocks.audit as unknown as AuditLogService, realtime)
  const open = new ComandaOpenService(
    mocks.prisma as unknown as PrismaService,
    mocks.audit as unknown as AuditLogService,
    mocks.helpers as unknown as OperationsHelpersService,
    context,
    realtime,
  )
  const items = new ComandaItemsService(
    mocks.prisma as unknown as PrismaService,
    mocks.helpers as unknown as OperationsHelpersService,
    context,
    itemsDispatch,
  )
  const lifecycle = new ComandaLifecycleService(
    mocks.prisma as unknown as PrismaService,
    mocks.audit as unknown as AuditLogService,
    mocks.helpers as unknown as OperationsHelpersService,
    context,
    realtime,
  )
  const settlement = new ComandaSettlementService(
    mocks.prisma as unknown as PrismaService,
    mocks.audit as unknown as AuditLogService,
    mocks.helpers as unknown as OperationsHelpersService,
    context,
    realtime,
  )
  const kitchen = new ComandaKitchenService(
    mocks.prisma as unknown as PrismaService,
    mocks.helpers as unknown as OperationsHelpersService,
    context,
    kitchenDispatch,
  )
  const commands = new ComandaCommandFacadeService(open, items, lifecycle, settlement, kitchen)

  return commands
}
