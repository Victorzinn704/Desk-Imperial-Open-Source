import { BadRequestException, ForbiddenException } from '@nestjs/common'
import type { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'

export async function resolveOrderSeller(
  prisma: PrismaService,
  auth: AuthContext,
  workspaceUserId: string,
  sellerEmployeeId?: string,
) {
  const employeeId = auth.role === 'STAFF' ? auth.employeeId : sellerEmployeeId
  if (!employeeId) {
    return null
  }

  const seller = await prisma.employee.findFirst({
    where: { id: employeeId, userId: workspaceUserId, active: true },
  })

  if (auth.role === 'STAFF' && !seller) {
    throw new ForbiddenException(
      'Seu acesso de funcionario precisa estar vinculado a um colaborador ativo para registrar vendas.',
    )
  }

  if (auth.role !== 'STAFF' && sellerEmployeeId && !seller) {
    throw new BadRequestException('Selecione um funcionario ativo para registrar esta venda.')
  }

  return seller
}
