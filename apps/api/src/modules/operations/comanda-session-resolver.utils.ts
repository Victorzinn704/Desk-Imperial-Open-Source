import { ConflictException, ForbiddenException } from '@nestjs/common'
import { CashSessionStatus } from '@prisma/client'
import type { PrismaService } from '../../database/prisma.service'
import type { OperationsHelpersService } from './operations-helpers.service'
import type { OpenComandaDto } from './dto/open-comanda.dto'

export async function resolveComandaSessionContext(
  prisma: PrismaService,
  helpers: OperationsHelpersService,
  authRole: string,
  workspaceOwnerUserId: string,
  operationalBusinessDate: Date,
  actorEmployee: { id: string } | null,
  dto: OpenComandaDto,
): Promise<{ currentEmployeeId: string | null; cashSessionId: string | null; businessDate: Date }> {
  if (authRole === 'STAFF') {
    return resolveStaffSessionContext(prisma, workspaceOwnerUserId, operationalBusinessDate, actorEmployee)
  }
  return resolveOwnerSessionContext(prisma, helpers, workspaceOwnerUserId, operationalBusinessDate, dto)
}

async function resolveStaffSessionContext(
  prisma: PrismaService,
  workspaceOwnerUserId: string,
  operationalBusinessDate: Date,
  actorEmployee: { id: string } | null,
) {
  if (!actorEmployee) {
    throw new ForbiddenException('Seu acesso precisa estar vinculado a um funcionario ativo.')
  }

  const openSession = await prisma.cashSession.findFirst({
    where: {
      companyOwnerId: workspaceOwnerUserId,
      employeeId: actorEmployee.id,
      businessDate: operationalBusinessDate,
      status: CashSessionStatus.OPEN,
    },
    orderBy: { openedAt: 'desc' },
  })

  if (!openSession) {
    throw new ConflictException('Abra o caixa do funcionario antes de criar comandas.')
  }

  return {
    currentEmployeeId: actorEmployee.id,
    cashSessionId: openSession.id,
    businessDate: openSession.businessDate,
  }
}

async function resolveOwnerSessionContext(
  prisma: PrismaService,
  helpers: OperationsHelpersService,
  workspaceOwnerUserId: string,
  operationalBusinessDate: Date,
  dto: OpenComandaDto,
) {
  let currentEmployeeId: string | null = null
  let cashSessionId: string | null = dto.cashSessionId ?? null

  if (dto.employeeId) {
    const assignedEmployee = await helpers.requireOwnedEmployee(prisma, workspaceOwnerUserId, dto.employeeId)
    const employeeOpenSession = await prisma.cashSession.findFirst({
      where: {
        companyOwnerId: workspaceOwnerUserId,
        employeeId: assignedEmployee.id,
        businessDate: operationalBusinessDate,
        status: CashSessionStatus.OPEN,
      },
      orderBy: { openedAt: 'desc' },
    })

    if (!employeeOpenSession) {
      throw new ConflictException('O funcionario precisa abrir o proprio caixa antes de receber uma mesa.')
    }

    currentEmployeeId = assignedEmployee.id
    cashSessionId = cashSessionId ?? employeeOpenSession.id
  }

  const businessDate = cashSessionId
    ? (await helpers.requireOwnedCashSession(prisma, workspaceOwnerUserId, cashSessionId)).businessDate
    : operationalBusinessDate

  return { currentEmployeeId, cashSessionId, businessDate }
}
