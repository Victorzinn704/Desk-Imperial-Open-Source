import type { ComandaStatus, Prisma } from '@prisma/client'
import { OPEN_COMANDA_STATUSES } from './operations-domain.utils'

export function buildOperationsComandaWhere(
  workspaceOwnerUserId: string,
  businessDate: Date,
  scopedEmployeeId?: string | null,
  options?: {
    statuses?: ComandaStatus[]
  },
): Prisma.ComandaWhereInput {
  const window = buildBusinessDateWindow(businessDate)

  return {
    companyOwnerId: workspaceOwnerUserId,
    ...(options?.statuses?.length
      ? {
          status: {
            in: options.statuses,
          },
        }
      : {}),
    ...(scopedEmployeeId ? { currentEmployeeId: scopedEmployeeId } : {}),
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
  }
}

export function buildKitchenItemWhere(
  workspaceOwnerUserId: string,
  businessDate: Date,
  scopedEmployeeId?: string | null,
): Prisma.ComandaItemWhereInput {
  return {
    kitchenStatus: {
      in: ['QUEUED', 'IN_PREPARATION', 'READY'],
    },
    comanda: {
      is: buildOperationsComandaWhere(workspaceOwnerUserId, businessDate, scopedEmployeeId, {
        statuses: OPEN_COMANDA_STATUSES,
      }),
    },
  }
}

function buildBusinessDateWindow(businessDate: Date) {
  const start = new Date(businessDate.getFullYear(), businessDate.getMonth(), businessDate.getDate())
  const end = new Date(businessDate.getFullYear(), businessDate.getMonth(), businessDate.getDate() + 1)
  return { start, end }
}
