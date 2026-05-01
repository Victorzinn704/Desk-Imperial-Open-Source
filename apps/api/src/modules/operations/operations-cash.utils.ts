import { NotFoundException } from '@nestjs/common'
import {
  CashClosureStatus,
  CashMovementType,
  CashSessionStatus,
  ComandaPaymentStatus,
  ComandaStatus,
  type Prisma,
} from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { buildBusinessDateWindow, OPEN_COMANDA_STATUSES, toNumberOrZero } from './operations-domain.utils'

type TransactionClient = Prisma.TransactionClient

export async function recalculateCashSession(transaction: TransactionClient, cashSessionId: string) {
  const session = await transaction.cashSession.findUnique({
    where: { id: cashSessionId },
    include: {
      movements: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      comandas: {
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payments: {
            where: {
              status: ComandaPaymentStatus.CONFIRMED,
            },
          },
        },
      },
      payments: {
        where: {
          status: ComandaPaymentStatus.CONFIRMED,
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
  const paidComandaIds = new Set(session.payments.map((payment) => payment.comandaId))
  const paidRevenueAmount = session.payments.reduce((sum, payment) => sum + toNumberOrZero(payment.amount), 0)
  const legacyClosedRevenueAmount = session.comandas
    .filter((comanda) => comanda.status === ComandaStatus.CLOSED && !paidComandaIds.has(comanda.id))
    .reduce((sum, comanda) => sum + toNumberOrZero(comanda.totalAmount), 0)
  const grossRevenueAmount = roundCurrency(paidRevenueAmount + legacyClosedRevenueAmount)
  const realizedProfitAmount = roundCurrency(
    session.comandas
      .filter((comanda) => comanda.status === ComandaStatus.CLOSED)
      .reduce((sum, comanda) => {
        const comandaCost = comanda.items.reduce((itemsTotal, item) => {
          const unitCost = item.product ? toNumberOrZero(item.product.unitCost) : 0
          return itemsTotal + roundCurrency(unitCost * item.quantity)
        }, 0)

        return sum + roundCurrency(toNumberOrZero(comanda.totalAmount) - comandaCost)
      }, 0),
  )
  const expectedCashAmount = roundCurrency(
    toNumberOrZero(session.openingCashAmount) + supplyAmount + adjustmentAmount - withdrawalAmount + grossRevenueAmount,
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

export async function recalculateComanda(
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

export async function syncCashClosure(
  transaction: TransactionClient,
  workspaceOwnerUserId: string,
  businessDate: Date,
) {
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

  const status = resolveCashClosureStatus(existingClosure?.status, openSessionsCount, openComandasCount)

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

function resolveCashClosureStatus(
  currentStatus: CashClosureStatus | null | undefined,
  openSessionsCount: number,
  openComandasCount: number,
) {
  if (currentStatus === CashClosureStatus.CLOSED || currentStatus === CashClosureStatus.FORCE_CLOSED) {
    return currentStatus
  }

  if (openSessionsCount > 0 || openComandasCount > 0) {
    return CashClosureStatus.PENDING_EMPLOYEE_CLOSE
  }

  return CashClosureStatus.OPEN
}
