import { ConflictException, NotFoundException } from '@nestjs/common'
import { CashClosureStatus, CashMovementType, CashSessionStatus, ComandaStatus } from '@prisma/client'
import {
  OPERATIONS_BUSINESS_DATE,
  OPERATIONS_OWNER_ID,
  resetOperationsHelpersHarness,
} from './helpers/operations-helpers-harness'

describe('OperationsHelpersService - cash and closure branches', () => {
  let harness: ReturnType<typeof resetOperationsHelpersHarness>

  beforeEach(() => {
    harness = resetOperationsHelpersHarness()
  })

  it('recalculateCashSession falha quando caixa nao existe', async () => {
    const transaction = { cashSession: { findUnique: jest.fn().mockResolvedValue(null) } }

    await expect(harness.service.recalculateCashSession(transaction as any, 'cash-x')).rejects.toThrow(
      NotFoundException,
    )
  })

  it('recalculateCashSession recalcula expected, gross e profit com movimentos e comandas fechadas', async () => {
    const transaction = {
      cashSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cash-1',
          openingCashAmount: 100,
          movements: [
            { type: CashMovementType.OPENING_FLOAT, amount: 100 },
            { type: CashMovementType.SUPPLY, amount: 40 },
            { type: CashMovementType.WITHDRAWAL, amount: 10 },
            { type: CashMovementType.ADJUSTMENT, amount: 5 },
          ],
          payments: [],
          comandas: [
            {
              id: 'comanda-1',
              status: ComandaStatus.CLOSED,
              totalAmount: 150,
              payments: [],
              items: [{ quantity: 2, product: { unitCost: 20 } }],
            },
            {
              id: 'comanda-2',
              status: ComandaStatus.CLOSED,
              totalAmount: 50,
              payments: [],
              items: [{ quantity: 1, product: null }],
            },
          ],
        }),
        update: jest.fn().mockResolvedValue({ id: 'cash-1' }),
      },
    }

    await harness.service.recalculateCashSession(transaction as any, 'cash-1')

    expect(transaction.cashSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          expectedCashAmount: 335,
          grossRevenueAmount: 200,
          realizedProfitAmount: 160,
        },
        where: { id: 'cash-1' },
      }),
    )
  })

  it('syncCashClosure preserva status CLOSED existente', async () => {
    const transaction = makeCashClosureTransaction({
      closureStatus: CashClosureStatus.CLOSED,
      openComandasCount: 2,
      sessionStatus: CashSessionStatus.OPEN,
    })

    await harness.service.syncCashClosure(transaction as any, OPERATIONS_OWNER_ID, OPERATIONS_BUSINESS_DATE)

    expect(transaction.cashClosure.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: CashClosureStatus.CLOSED }),
      }),
    )
  })

  it('syncCashClosure seta PENDING quando ha sessoes ou comandas abertas', async () => {
    const transaction = makeCashClosureTransaction({
      closureStatus: CashClosureStatus.OPEN,
      openComandasCount: 0,
      sessionStatus: CashSessionStatus.OPEN,
      totals: { expectedCashAmount: 120, grossRevenueAmount: 40, realizedProfitAmount: 15 },
    })

    await harness.service.syncCashClosure(transaction as any, OPERATIONS_OWNER_ID, OPERATIONS_BUSINESS_DATE)

    expect(transaction.cashClosure.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          expectedCashAmount: 120,
          grossRevenueAmount: 40,
          openComandasCount: 0,
          openSessionsCount: 1,
          realizedProfitAmount: 15,
          status: CashClosureStatus.PENDING_EMPLOYEE_CLOSE,
        }),
      }),
    )
  })

  it('syncCashClosure seta OPEN quando nao ha pendencias', async () => {
    const transaction = makeCashClosureTransaction({
      closureStatus: null,
      openComandasCount: 0,
      sessionStatus: CashSessionStatus.CLOSED,
      totals: { expectedCashAmount: 200, grossRevenueAmount: 200, realizedProfitAmount: 80 },
    })

    await harness.service.syncCashClosure(transaction as any, OPERATIONS_OWNER_ID, OPERATIONS_BUSINESS_DATE)

    expect(transaction.cashClosure.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ openComandasCount: 0, openSessionsCount: 0, status: CashClosureStatus.OPEN }),
      }),
    )
  })

  it('assertBusinessDayOpen bloqueia dias consolidados e permite dias abertos', async () => {
    harness.prisma.cashClosure.findUnique
      .mockResolvedValueOnce({ status: CashClosureStatus.CLOSED })
      .mockResolvedValueOnce({ status: CashClosureStatus.FORCE_CLOSED })
      .mockResolvedValueOnce({ status: CashClosureStatus.OPEN })

    await expect(harness.service.assertBusinessDayOpen(OPERATIONS_OWNER_ID, OPERATIONS_BUSINESS_DATE)).rejects.toThrow(
      ConflictException,
    )
    await expect(harness.service.assertBusinessDayOpen(OPERATIONS_OWNER_ID, new Date(2026, 3, 2))).rejects.toThrow(
      ConflictException,
    )
    await expect(
      harness.service.assertBusinessDayOpen(OPERATIONS_OWNER_ID, new Date(2026, 3, 3)),
    ).resolves.toBeUndefined()
  })

  it('assertBusinessDayOpen permite quando nao existe consolidacao para o dia', async () => {
    harness.prisma.cashClosure.findUnique.mockResolvedValue(null)

    await expect(
      harness.service.assertBusinessDayOpen(OPERATIONS_OWNER_ID, new Date(2026, 3, 4)),
    ).resolves.toBeUndefined()
  })

  it('resolveComandaBusinessDate prioriza sessao e cai para data da abertura', async () => {
    const transaction = {
      cashSession: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ businessDate: OPERATIONS_BUSINESS_DATE })
          .mockResolvedValueOnce(null),
      },
    }

    await expect(
      harness.service.resolveComandaBusinessDate(transaction as any, {
        cashSessionId: 'cash-1',
        openedAt: new Date(2026, 3, 2, 10, 0, 0),
      }),
    ).resolves.toEqual(OPERATIONS_BUSINESS_DATE)
    await expect(
      harness.service.resolveComandaBusinessDate(transaction as any, {
        cashSessionId: 'cash-x',
        openedAt: new Date(2026, 3, 2, 21, 45, 0),
      }),
    ).resolves.toEqual(new Date(2026, 3, 2, 0, 0, 0, 0))
  })
})

function makeCashClosureTransaction(params: {
  closureStatus: CashClosureStatus | null
  openComandasCount: number
  sessionStatus: CashSessionStatus
  totals?: { expectedCashAmount: number; grossRevenueAmount: number; realizedProfitAmount: number }
}) {
  const totals = params.totals ?? { expectedCashAmount: 100, grossRevenueAmount: 30, realizedProfitAmount: 10 }
  return {
    cashSession: {
      findMany: jest.fn().mockResolvedValue([{ status: params.sessionStatus, ...totals }]),
    },
    comanda: {
      count: jest.fn().mockResolvedValue(params.openComandasCount),
    },
    cashClosure: {
      findUnique: jest.fn().mockResolvedValue(params.closureStatus ? { status: params.closureStatus } : null),
      upsert: jest.fn().mockResolvedValue({ status: params.closureStatus ?? CashClosureStatus.OPEN }),
    },
  }
}
