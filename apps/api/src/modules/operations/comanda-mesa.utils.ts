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
    const mesa = await resolveMesaByIdOrLabel(prisma, { mesaId, tableLabel, workspaceOwnerUserId })

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

  const mesa = await resolveMesaByTableLabel(prisma, workspaceOwnerUserId, tableLabel)
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

type MesaSelectionRecord = {
  active: boolean
  companyOwnerId?: string
  id: string
  label: string
}

async function resolveMesaByIdOrLabel(
  prisma: PrismaService,
  params: { mesaId: string; tableLabel: string; workspaceOwnerUserId: string },
) {
  const mesa = await prisma.mesa.findUnique({
    where: { id: params.mesaId },
    select: {
      id: true,
      label: true,
      active: true,
      companyOwnerId: true,
    },
  })
  if (mesa || !isLabelLikeMesaId(params.mesaId, params.tableLabel)) {
    return mesa
  }

  return resolveMesaByTableLabel(prisma, params.workspaceOwnerUserId, params.tableLabel, {
    includeOwner: true,
  })
}

async function resolveMesaByTableLabel(
  prisma: PrismaService,
  workspaceOwnerUserId: string,
  tableLabel: string,
  options: { includeOwner?: boolean } = {},
): Promise<MesaSelectionRecord | null> {
  const exactMesa = await prisma.mesa.findUnique({
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
      ...(options.includeOwner ? { companyOwnerId: true } : {}),
    },
  })
  if (exactMesa) {
    return exactMesa
  }

  return findMesaByNormalizedLabel(prisma, workspaceOwnerUserId, tableLabel, options)
}

async function findMesaByNormalizedLabel(
  prisma: PrismaService,
  workspaceOwnerUserId: string,
  tableLabel: string,
  options: { includeOwner?: boolean },
): Promise<MesaSelectionRecord | null> {
  const normalizedLabel = normalizeMesaLabel(tableLabel)
  const mesas = await prisma.mesa.findMany({
    where: { companyOwnerId: workspaceOwnerUserId, active: true },
    select: {
      id: true,
      label: true,
      active: true,
      ...(options.includeOwner ? { companyOwnerId: true } : {}),
    },
  })

  return mesas.find((mesa) => normalizeMesaLabel(mesa.label) === normalizedLabel) ?? null
}

function isLabelLikeMesaId(mesaId: string, tableLabel: string) {
  return normalizeMesaLabel(mesaId) === normalizeMesaLabel(tableLabel)
}

function normalizeMesaLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/^mesa\s+/, '')
    .replace(/\s+/g, '')
    .replace(/^0+(?=\d)/, '')
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
