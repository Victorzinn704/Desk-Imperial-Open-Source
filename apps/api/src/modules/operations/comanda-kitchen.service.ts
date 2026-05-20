import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type ComandaItem, ComandaStatus, KitchenItemStatus, Prisma } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { ComandaKitchenDispatchService } from './comanda-kitchen-dispatch.service'
import { deriveComandaStatusFromKitchen, propagateKitchenStatusToComanda } from './comanda-kitchen.utils'
import { ComandaMutationContextService } from './comanda-mutation-context.service'
import { OperationsHelpersService } from './operations-helpers.service'
import type { UpdateKitchenItemStatusDto } from './operations.schemas'

type KitchenItemLookup = {
  id: string
  kitchenReadyAt: Date | null
  kitchenStatus: KitchenItemStatus | null
  comanda: {
    cashSessionId: string | null
    companyOwnerId: string
    id: string
    openedAt: Date
    status: ComandaStatus
    tableLabel: string
  }
}

type RefreshedKitchenComanda = Awaited<ReturnType<typeof propagateKitchenStatusToComanda>>
type KitchenTransactionResult = {
  businessDate: Date
  comandaId: string
  previousComandaStatus: ComandaStatus
  previousKitchenStatus: KitchenItemStatus | null
  refreshedComanda: RefreshedKitchenComanda
  updatedItem: ComandaItem
}
type KitchenStatusMutationArgs = {
  auth: AuthContext
  context: RequestContext
  dto: UpdateKitchenItemStatusDto
  itemId: string
}

@Injectable()
export class ComandaKitchenService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OperationsHelpersService) private readonly helpers: OperationsHelpersService,
    @Inject(ComandaMutationContextService) private readonly context: ComandaMutationContextService,
    @Inject(ComandaKitchenDispatchService) private readonly dispatch: ComandaKitchenDispatchService,
  ) {}

  async updateKitchenItemStatus(args: KitchenStatusMutationArgs) {
    const { auth, context, dto, itemId } = args
    const mutationStartedAtMs = performance.now()
    const mutationContext = await this.context.requireKitchenStaffContext(auth)
    const result = await this.updateKitchenItemInTransaction(itemId, dto, mutationContext.workspaceOwnerUserId)

    await this.dispatch.recordStatusUpdated({ auth, itemId, status: dto.status, comandaId: result.comandaId, context })
    this.dispatch.publishStatusUpdated({
      auth,
      mutationStartedAtMs,
      result,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })

    return { itemId, status: dto.status }
  }

  private updateKitchenItemInTransaction(
    itemId: string,
    dto: UpdateKitchenItemStatusDto,
    workspaceOwnerUserId: string,
  ): Promise<KitchenTransactionResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const item = (await tx.comandaItem.findUnique({
          where: { id: itemId },
          include: {
            comanda: {
              select: {
                id: true,
                companyOwnerId: true,
                tableLabel: true,
                status: true,
                cashSessionId: true,
                openedAt: true,
              },
            },
          },
        })) as KitchenItemLookup | null
        this.assertKitchenItem(item, workspaceOwnerUserId)

        const updatedItem = await tx.comandaItem.update({
          where: { id: itemId },
          data: {
            kitchenStatus: dto.status as KitchenItemStatus,
            kitchenReadyAt: this.resolveKitchenReadyAt(dto.status, item.kitchenReadyAt),
          },
        })
        const refreshedComanda = await propagateKitchenStatusToComanda(tx, item.comanda, deriveComandaStatusFromKitchen)
        const businessDate = await this.resolveBusinessDate(tx, refreshedComanda, item.comanda)

        return {
          businessDate,
          comandaId: item.comanda.id,
          previousComandaStatus: item.comanda.status,
          previousKitchenStatus: item.kitchenStatus,
          refreshedComanda,
          updatedItem,
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    )
  }

  private assertKitchenItem(
    item: KitchenItemLookup | null,
    workspaceOwnerUserId: string,
  ): asserts item is KitchenItemLookup {
    if (item?.comanda.companyOwnerId !== workspaceOwnerUserId) {
      throw new NotFoundException('Item de comanda nao encontrado.')
    }

    if (!item.kitchenStatus) {
      throw new BadRequestException('Este item nao esta na fila da cozinha.')
    }
  }

  private resolveKitchenReadyAt(status: UpdateKitchenItemStatusDto['status'], currentReadyAt: Date | null) {
    if (status === 'READY') {
      return new Date()
    }

    return currentReadyAt ?? null
  }

  private resolveBusinessDate(
    tx: Prisma.TransactionClient,
    refreshedComanda: RefreshedKitchenComanda,
    fallback: { cashSessionId: string | null; openedAt: Date },
  ): Promise<Date> {
    return this.helpers.resolveComandaBusinessDate(tx, refreshedComanda ?? fallback)
  }
}
