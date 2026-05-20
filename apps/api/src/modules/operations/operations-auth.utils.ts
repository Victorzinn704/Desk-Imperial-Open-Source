import { NotFoundException } from '@nestjs/common'
import type { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'

type TransactionClient = Parameters<PrismaService['$transaction']>[0] extends (tx: infer T) => unknown ? T : never

export async function requireOwnedCashSession(
  transaction: PrismaService | TransactionClient,
  workspaceOwnerUserId: string,
  cashSessionId: string,
  options?: {
    includeMovements?: boolean
  },
) {
  const sessionQuery = {
    where: {
      id: cashSessionId,
      companyOwnerId: workspaceOwnerUserId,
    },
    ...(options?.includeMovements
      ? {
          include: {
            movements: {
              orderBy: {
                createdAt: 'asc' as const,
              },
            },
          },
        }
      : {}),
  }

  const session = await transaction.cashSession.findFirst(sessionQuery)

  if (!session) {
    throw new NotFoundException('Caixa nao encontrado para esta empresa.')
  }

  return session
}

export async function requireOwnedComanda(
  transaction: PrismaService | TransactionClient,
  workspaceOwnerUserId: string,
  comandaId: string,
) {
  const comanda = await transaction.comanda.findFirst({
    where: {
      id: comandaId,
      companyOwnerId: workspaceOwnerUserId,
    },
    include: {
      items: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      payments: {
        where: {
          status: 'CONFIRMED',
        },
        orderBy: {
          paidAt: 'asc',
        },
      },
    },
  })

  if (!comanda) {
    throw new NotFoundException('Comanda nao encontrada para esta empresa.')
  }

  return comanda
}

export async function requireOwnedEmployee(
  transaction: PrismaService | TransactionClient,
  workspaceOwnerUserId: string,
  employeeId: string,
) {
  const employee = await transaction.employee.findFirst({
    where: {
      id: employeeId,
      userId: workspaceOwnerUserId,
    },
  })

  if (!employee) {
    throw new NotFoundException('Funcionario nao encontrado para esta empresa.')
  }

  return employee
}

export async function resolveEmployeeForStaff(
  transaction: PrismaService | TransactionClient,
  workspaceOwnerUserId: string,
  auth: AuthContext,
) {
  if (auth.role !== 'STAFF' || !auth.employeeId) {
    return null
  }

  return transaction.employee.findFirst({
    where: {
      id: auth.employeeId,
      userId: workspaceOwnerUserId,
      active: true,
    },
  })
}
