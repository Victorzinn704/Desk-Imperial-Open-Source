import { ConflictException, NotFoundException } from '@nestjs/common'
import type { PrismaService } from '../../database/prisma.service'
import type { OperationsHelpersService } from './operations-helpers.service'
import { OPEN_COMANDA_STATUSES } from './operations-domain.utils'

export async function resolveMesaSelection(
  prisma: PrismaService,
  helpers: OperationsHelpersService,
  workspaceOwnerUserId: string,
  tableLabel: string,
  mesaId?: string | null,
  currentComandaId?: string,
) {
  if (mesaId) {
    const mesa = await prisma.mesa.findUnique({
      where: { id: mesaId },
      select: {
        id: true,
        label: true,
        active: true,
        companyOwnerId: true,
      },
    })

    if (!mesa || mesa.companyOwnerId !== workspaceOwnerUserId || !mesa.active) {
      throw new NotFoundException('Mesa nao encontrada ou inativa.')
    }

    await helpers.assertOpenTableAvailability(prisma, workspaceOwnerUserId, mesa.label, currentComandaId)
    await assertMesaAvailability(prisma, mesa.id, currentComandaId)

    return {
      mesaId: mesa.id,
      tableLabel: mesa.label,
    }
  }

  const mesa = await prisma.mesa.findUnique({
    where: {
      companyOwnerId_label: {
        companyOwnerId: workspaceOwnerUserId,
        label: tableLabel,
      },
    },
    select: {
      id: true,
      label: true,
      active: true,
    },
  })

  const resolvedMesaId = mesa?.active ? mesa.id : null
  const resolvedTableLabel = mesa?.active ? mesa.label : tableLabel

  await helpers.assertOpenTableAvailability(
    prisma,
    workspaceOwnerUserId,
    resolvedTableLabel,
    currentComandaId,
  )

  if (resolvedMesaId) {
    await assertMesaAvailability(prisma, resolvedMesaId, currentComandaId)
  }

  return {
    mesaId: resolvedMesaId,
    tableLabel: resolvedTableLabel,
  }
}

async function assertMesaAvailability(prisma: PrismaService, mesaId: string, currentComandaId?: string) {
  const occupiedComanda = await prisma.comanda.findFirst({
    where: {
      mesaId,
      status: {
        in: OPEN_COMANDA_STATUSES,
      },
      ...(currentComandaId
        ? {
            id: {
              not: currentComandaId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  if (occupiedComanda) {
    throw new ConflictException('Essa mesa ja possui uma comanda aberta.')
  }
}
