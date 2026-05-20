import { type $Enums, KitchenItemStatus, type Prisma } from '@prisma/client'
import { buildBusinessDateWindow, OPEN_COMANDA_STATUSES } from './operations-domain.utils'

export function buildOperationsComandaWhere(params: {
  workspaceOwnerUserId: string
  businessDate: Date
  scopedEmployeeId?: string | null | undefined
  statuses?: $Enums.ComandaStatus[] | undefined
}): Prisma.ComandaWhereInput {
  const window = buildBusinessDateWindow(params.businessDate)

  return {
    companyOwnerId: params.workspaceOwnerUserId,
    ...(params.statuses?.length ? { status: { in: params.statuses } } : {}),
    ...(params.scopedEmployeeId ? { currentEmployeeId: params.scopedEmployeeId } : {}),
    OR: [
      {
        cashSession: {
          is: {
            businessDate: params.businessDate,
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
  }
}

export function buildKitchenItemWhere(params: {
  workspaceOwnerUserId: string
  businessDate: Date
  scopedEmployeeId?: string | null | undefined
}): Prisma.ComandaItemWhereInput {
  return {
    kitchenStatus: {
      in: [KitchenItemStatus.QUEUED, KitchenItemStatus.IN_PREPARATION, KitchenItemStatus.READY],
    },
    comanda: {
      is: buildOperationsComandaWhere({
        workspaceOwnerUserId: params.workspaceOwnerUserId,
        businessDate: params.businessDate,
        scopedEmployeeId: params.scopedEmployeeId,
        statuses: OPEN_COMANDA_STATUSES,
      }),
    },
  }
}
