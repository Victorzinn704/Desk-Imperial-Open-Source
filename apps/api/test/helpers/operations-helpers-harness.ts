import { CashSessionStatus, ComandaStatus, Prisma } from '@prisma/client'
import type { CacheService } from '../../src/common/services/cache.service'
import type { PrismaService } from '../../src/database/prisma.service'
import { OperationsHelpersService } from '../../src/modules/operations/operations-helpers.service'

export const OPERATIONS_OWNER_ID = 'owner-1'
export const OPERATIONS_BUSINESS_DATE = new Date(2026, 3, 1)

type OperationsClient = PrismaService | Prisma.TransactionClient
type OperationsHarness = ReturnType<typeof createOperationsHelpersHarness>

export type OperationsOwnedCashSession = Awaited<ReturnType<OperationsHarness['service']['requireOwnedCashSession']>>
export type OperationsOwnedComanda = Awaited<ReturnType<OperationsHarness['service']['requireOwnedComanda']>>
export type OperationsOwnedEmployee = NonNullable<
  Awaited<ReturnType<OperationsHarness['service']['resolveEmployeeForStaff']>>
>

const fixtureDate = new Date('2026-04-01T10:00:00.000Z')

export function createOperationsHelpersHarness() {
  const prisma = {
    cashClosure: {
      findUnique: jest.fn(),
    },
  }

  const cache = {
    get: jest.fn(),
    set: jest.fn(),
  }

  const service = new OperationsHelpersService(prisma as unknown as PrismaService, cache as unknown as CacheService)

  return { cache, prisma, service }
}

export function resetOperationsHelpersHarness() {
  jest.clearAllMocks()
  return createOperationsHelpersHarness()
}

export function asOperationsClient<T extends object>(client: T): OperationsClient {
  return client as unknown as OperationsClient
}

export function makeOperationsCashSession(
  overrides: Partial<OperationsOwnedCashSession> = {},
): OperationsOwnedCashSession {
  return {
    businessDate: fixtureDate,
    closedAt: null,
    closedByUserId: null,
    companyOwnerId: OPERATIONS_OWNER_ID,
    countedCashAmount: null,
    createdAt: fixtureDate,
    differenceAmount: null,
    employeeId: null,
    expectedCashAmount: money(),
    grossRevenueAmount: money(),
    id: 'cash-1',
    notes: null,
    openedAt: fixtureDate,
    openedByUserId: OPERATIONS_OWNER_ID,
    openingCashAmount: money(),
    realizedProfitAmount: money(),
    status: CashSessionStatus.OPEN,
    updatedAt: fixtureDate,
    ...overrides,
  }
}

export function makeOperationsComanda(overrides: Partial<OperationsOwnedComanda> = {}): OperationsOwnedComanda {
  return {
    cashSessionId: null,
    closedAt: null,
    closedByUserId: null,
    companyOwnerId: OPERATIONS_OWNER_ID,
    createdAt: fixtureDate,
    currentEmployeeId: null,
    customerDocument: null,
    customerName: null,
    discountAmount: money(),
    id: 'comanda-1',
    items: [],
    mesaId: null,
    notes: null,
    openedAt: fixtureDate,
    openedByUserId: OPERATIONS_OWNER_ID,
    participantCount: 1,
    payments: [],
    serviceFeeAmount: money(),
    status: ComandaStatus.OPEN,
    subtotalAmount: money(),
    tableLabel: 'Mesa 1',
    totalAmount: money(),
    updatedAt: fixtureDate,
    ...overrides,
  }
}

export function makeOperationsEmployee(overrides: Partial<OperationsOwnedEmployee> = {}): OperationsOwnedEmployee {
  return {
    active: true,
    createdAt: fixtureDate,
    displayName: 'Funcionario',
    employeeCode: 'EMP-1',
    id: 'emp-1',
    loginUserId: null,
    passwordHash: null,
    percentualVendas: money(),
    salarioBase: money(),
    updatedAt: fixtureDate,
    userId: OPERATIONS_OWNER_ID,
    ...overrides,
  }
}

function money(value = 0) {
  return new Prisma.Decimal(value)
}
