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
  assertAvailability: (mesaId: string, currentComandaId?: string) => Promise<void> = (id, currentId) =>
    assertMesaAvailability(prisma, id, currentId),
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

    if (!mesa?.active || mesa.companyOwnerId !== workspaceOwnerUserId) {
      throw new NotFoundException('Mesa nao encontrada ou inativa.')
    }

    await helpers.assertOpenTableAvailability(prisma, workspaceOwnerUserId, mesa.label, currentComandaId)
    await assertAvailability(mesa.id, currentComandaId)

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

  await helpers.assertOpenTableAvailability(prisma, workspaceOwnerUserId, resolvedTableLabel, currentComandaId)

  if (resolvedMesaId) {
    await assertAvailability(resolvedMesaId, currentComandaId)
  }

  return {
    mesaId: resolvedMesaId,
    tableLabel: resolvedTableLabel,
  }
}

export async function assertMesaAvailability(prisma: PrismaService, mesaId: string, currentComandaId?: string) {
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
