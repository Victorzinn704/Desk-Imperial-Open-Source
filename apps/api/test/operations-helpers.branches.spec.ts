import { ComandaStatus, KitchenItemStatus } from '@prisma/client'
import {
  OPERATIONS_BUSINESS_DATE,
  OPERATIONS_OWNER_ID,
  resetOperationsHelpersHarness,
} from './helpers/operations-helpers-harness'

describe('OperationsHelpersService - query branches', () => {
  let harness: ReturnType<typeof resetOperationsHelpersHarness>

  beforeEach(() => {
    harness = resetOperationsHelpersHarness()
  })

  it('buildOperationsComandaWhere aplica status e escopo de funcionario quando informados', () => {
    const where = (harness.service as any).buildOperationsComandaWhere(
      OPERATIONS_OWNER_ID,
      OPERATIONS_BUSINESS_DATE,
      'emp-1',
      {
        statuses: [ComandaStatus.OPEN, ComandaStatus.READY],
      },
    )

    expect(where.companyOwnerId).toBe(OPERATIONS_OWNER_ID)
    expect(where.currentEmployeeId).toBe('emp-1')
    expect(where.status).toEqual({ in: [ComandaStatus.OPEN, ComandaStatus.READY] })
    expect(where.OR[0]).toEqual({ cashSession: { is: { businessDate: OPERATIONS_BUSINESS_DATE } } })
    expect(where.OR[1]).toEqual({
      cashSessionId: null,
      openedAt: {
        gte: new Date(2026, 3, 1, 0, 0, 0, 0),
        lt: new Date(2026, 3, 2, 0, 0, 0, 0),
      },
    })
  })

  it('buildOperationsComandaWhere omite filtros opcionais quando nao informados', () => {
    const where = (harness.service as any).buildOperationsComandaWhere(OPERATIONS_OWNER_ID, OPERATIONS_BUSINESS_DATE)

    expect(where).not.toHaveProperty('status')
    expect(where).not.toHaveProperty('currentEmployeeId')
  })

  it('buildKitchenItemWhere inclui apenas status de cozinha ativos e comandas abertas', () => {
    const where = (harness.service as any).buildKitchenItemWhere(OPERATIONS_OWNER_ID, OPERATIONS_BUSINESS_DATE, 'emp-1')

    expect(where.kitchenStatus).toEqual({
      in: [KitchenItemStatus.QUEUED, KitchenItemStatus.IN_PREPARATION, KitchenItemStatus.READY],
    })
    expect(where.comanda.is.currentEmployeeId).toBe('emp-1')
    expect(where.comanda.is.status.in).toEqual([ComandaStatus.OPEN, ComandaStatus.IN_PREPARATION, ComandaStatus.READY])
  })
})
