import { CashClosureStatus, CashMovementType, CashSessionStatus, type Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import {
  type CloseCashClosureCommand,
  type CloseCashSessionCommand,
  type CreateCashMovementCommand,
  normalizeCashMovementCommand,
  normalizeCloseCashClosureCommand,
  normalizeCloseCashSessionCommand,
  normalizeOpenCashSessionCommand,
  resolveClosedCashClosureStatus,
} from './cash-session-command.utils'
import { toNumberOrZero } from './operations-domain.utils'
import { OperationsHelpersService } from './operations-helpers.service'

type TransactionClient = Prisma.TransactionClient
type PersistenceDeps = {
  prisma: PrismaService
  helpers: OperationsHelpersService
}

export function createOpeningCashSession(input: {
  deps: PersistenceDeps
  opening: ReturnType<typeof normalizeOpenCashSessionCommand> & {
    auth: AuthContext
    employeeId: string | null
  }
}) {
  return input.deps.prisma.$transaction(async (transaction) => {
    const createdSession = await transaction.cashSession.create({
      data: {
        companyOwnerId: input.opening.workspaceOwnerUserId,
        employeeId: input.opening.employeeId,
        openedByUserId: input.opening.auth.userId,
        businessDate: input.opening.businessDate,
        status: CashSessionStatus.OPEN,
        openingCashAmount: input.opening.openingCashAmount,
        expectedCashAmount: input.opening.openingCashAmount,
        notes: input.opening.notes,
      },
    })

    await transaction.cashMovement.create({
      data: buildOpeningMovementData(input.opening, createdSession.id),
    })

    return refreshCashState(input.deps, transaction, {
      workspaceOwnerUserId: input.opening.workspaceOwnerUserId,
      businessDate: input.opening.businessDate,
      sessionId: createdSession.id,
    })
  })
}

export function createCashSessionMovement(input: {
  deps: PersistenceDeps
  command: CreateCashMovementCommand
  session: { id: string; employeeId: string | null; businessDate: Date }
  actorEmployee: { id: string } | null
  movement: ReturnType<typeof normalizeCashMovementCommand>
}) {
  const { deps } = input
  return deps.prisma.$transaction(async (transaction) => {
    const movement = await transaction.cashMovement.create({
      data: {
        cashSessionId: input.session.id,
        companyOwnerId: input.movement.workspaceOwnerUserId,
        employeeId: input.session.employeeId ?? input.actorEmployee?.id ?? null,
        createdByUserId: input.command.auth.userId,
        type: input.command.dto.type,
        amount: input.movement.amount,
        note: input.movement.note,
      },
    })
    const refreshedSession = await deps.helpers.recalculateCashSession(transaction, input.session.id)
    const closure = await deps.helpers.syncCashClosure(
      transaction,
      input.movement.workspaceOwnerUserId,
      input.session.businessDate,
    )
    return { movement, refreshedSession, closure }
  })
}

export function closeOpenCashSession(input: {
  deps: PersistenceDeps
  command: CloseCashSessionCommand
  session: { id: string; businessDate: Date; notes: string | null }
  closing: ReturnType<typeof normalizeCloseCashSessionCommand>
}) {
  const { deps } = input
  return deps.prisma.$transaction(async (transaction) => {
    const recalculated = await deps.helpers.recalculateCashSession(transaction, input.session.id)
    const differenceAmount = input.closing.countedCashAmount - toNumberOrZero(recalculated.expectedCashAmount)
    const refreshedSession = await updateClosedCashSession(transaction, {
      sessionId: input.session.id,
      auth: input.command.auth,
      countedCashAmount: input.closing.countedCashAmount,
      differenceAmount,
      notes: input.closing.notes ?? input.session.notes,
    })
    const closure = await deps.helpers.syncCashClosure(
      transaction,
      input.closing.workspaceOwnerUserId,
      input.session.businessDate,
    )
    return { refreshedSession, closure }
  })
}

export function closeCashClosureRecord(input: {
  prisma: PrismaService
  command: CloseCashClosureCommand
  closing: ReturnType<typeof normalizeCloseCashClosureCommand>
  syncedClosure: { expectedCashAmount: Parameters<typeof toNumberOrZero>[0] }
}) {
  const differenceAmount = input.closing.countedCashAmount - toNumberOrZero(input.syncedClosure.expectedCashAmount)
  return input.prisma.cashClosure.update({
    where: {
      companyOwnerId_businessDate: {
        companyOwnerId: input.closing.workspaceOwnerUserId,
        businessDate: input.closing.businessDate,
      },
    },
    data: {
      countedCashAmount: input.closing.countedCashAmount,
      differenceAmount,
      notes: input.closing.notes,
      status: resolveClosedCashClosureStatus(input.closing.forceClose),
      closedByUserId: input.command.auth.userId,
      closedAt: new Date(),
    },
  })
}

export function syncCashClosureForDate(input: {
  deps: PersistenceDeps
  workspaceOwnerUserId: string
  businessDate: Date
}) {
  return input.deps.prisma.$transaction((transaction) =>
    input.deps.helpers.syncCashClosure(transaction, input.workspaceOwnerUserId, input.businessDate),
  )
}

export function markCashClosurePending(input: {
  prisma: PrismaService
  workspaceOwnerUserId: string
  businessDate: Date
}) {
  return input.prisma.cashClosure.update({
    where: {
      companyOwnerId_businessDate: {
        companyOwnerId: input.workspaceOwnerUserId,
        businessDate: input.businessDate,
      },
    },
    data: { status: CashClosureStatus.PENDING_EMPLOYEE_CLOSE },
  })
}

function refreshCashState(
  deps: PersistenceDeps,
  transaction: TransactionClient,
  input: {
    workspaceOwnerUserId: string
    businessDate: Date
    sessionId: string
  },
) {
  return Promise.all([
    deps.helpers.recalculateCashSession(transaction, input.sessionId),
    deps.helpers.syncCashClosure(transaction, input.workspaceOwnerUserId, input.businessDate),
  ]).then(([session, closure]) => ({ session, closure }))
}

function buildOpeningMovementData(
  input: {
    auth: AuthContext
    workspaceOwnerUserId: string
    employeeId: string | null
    openingCashAmount: number
    notes: string | null
  },
  cashSessionId: string,
) {
  return {
    cashSessionId,
    companyOwnerId: input.workspaceOwnerUserId,
    employeeId: input.employeeId,
    createdByUserId: input.auth.userId,
    type: CashMovementType.OPENING_FLOAT,
    amount: input.openingCashAmount,
    note: input.notes ?? 'Abertura do caixa operacional',
  }
}

function updateClosedCashSession(
  transaction: TransactionClient,
  input: {
    sessionId: string
    auth: AuthContext
    countedCashAmount: number
    differenceAmount: number
    notes: string | null
  },
) {
  return transaction.cashSession.update({
    where: { id: input.sessionId },
    data: {
      countedCashAmount: input.countedCashAmount,
      differenceAmount: input.differenceAmount,
      status: CashSessionStatus.CLOSED,
      closedByUserId: input.auth.userId,
      closedAt: new Date(),
      notes: input.notes,
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
