import { ForbiddenException, NotFoundException } from '@nestjs/common'
import type { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'

type TransactionClient = Parameters<PrismaService['$transaction']>[0] extends (tx: infer T) => unknown ? T : never

export async function requireAuthorizedCashSession(
  transaction: PrismaService | TransactionClient,
  workspaceOwnerUserId: string,
  auth: AuthContext,
  cashSessionId: string,
) {
  const session = await requireOwnedCashSession(transaction, workspaceOwnerUserId, cashSessionId, {
    includeMovements: true,
  })

  if (auth.role === 'OWNER') {
    return session
  }

  const employee = await resolveEmployeeForStaff(transaction, workspaceOwnerUserId, auth)

  if (!employee || session.employeeId !== employee.id) {
    throw new ForbiddenException('Seu acesso nao pode operar o caixa de outro funcionario.')
  }

  return session
}

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

export async function requireAuthorizedComanda(
  transaction: PrismaService | TransactionClient,
  workspaceOwnerUserId: string,
  auth: AuthContext,
  comandaId: string,
  actorEmployee?: { id: string } | null,
) {
  const comanda = await requireOwnedComanda(transaction, workspaceOwnerUserId, comandaId)

  if (auth.role === 'OWNER') {
    return comanda
  }

  const employee = actorEmployee ?? (await resolveEmployeeForStaff(transaction, workspaceOwnerUserId, auth))

  if (!employee) {
    throw new ForbiddenException('Seu acesso precisa estar vinculado a um funcionario ativo para operar comandas.')
  }

  return comanda
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
