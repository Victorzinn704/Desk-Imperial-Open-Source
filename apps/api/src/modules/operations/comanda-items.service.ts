import { Inject, Injectable } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { ComandaItemsDispatchService } from './comanda-items-dispatch.service'
import {
  createBatchComandaItems,
  createSingleComandaItem,
  replaceComandaItems,
} from './comanda-items-transactions.utils'
import { type ComandaMutationContext, ComandaMutationContextService } from './comanda-mutation-context.service'
import { buildComandaResponse } from './comanda-response.utils'
import { prepareComandaDraftFields } from './comanda-draft-fields.utils'
import {
  prepareComandaItemForCreate,
  prepareComandaItemsForBatchCreate,
  selectDraftStockSelections,
} from './comanda-item-preparation.utils'
import { assertMonetaryAdjustmentsWithinSubtotal, calculateDraftItemsSubtotal } from './comanda-validation.utils'
import { OperationsHelpersService } from './operations-helpers.service'
import { toNumberOrZero } from './operations-domain.utils'
import type {
  AddComandaItemDto,
  AddComandaItemsBatchDto,
  OperationsResponseOptionsDto,
  ReplaceComandaDto,
} from './operations.schemas'

type ComandaMutationArgs<TDto> = {
  auth: AuthContext
  comandaId: string
  dto: TDto
  context: RequestContext
  options?: OperationsResponseOptionsDto | undefined
}

type AuthorizedComanda = Awaited<ReturnType<OperationsHelpersService['requireAuthorizedComanda']>>
type ResponseComanda = Parameters<typeof buildComandaResponse>[3]
type ReplaceInput = Awaited<ReturnType<ComandaItemsService['prepareReplaceInput']>>

@Injectable()
export class ComandaItemsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OperationsHelpersService) private readonly helpers: OperationsHelpersService,
    @Inject(ComandaMutationContextService) private readonly context: ComandaMutationContextService,
    @Inject(ComandaItemsDispatchService) private readonly dispatch: ComandaItemsDispatchService,
  ) {}

  async addComandaItem(args: ComandaMutationArgs<AddComandaItemDto>) {
    const { auth, comandaId, dto, context, options } = args
    const mutationStartedAtMs = performance.now()
    const { mutationContext, comanda } = await this.resolveMutationContextAndComanda({
      auth,
      comandaId,
      operation: 'item',
    })
    await this.assertSingleProductStock(mutationContext.workspaceOwnerUserId, dto)
    const preparedItem = await prepareComandaItemForCreate(this.prisma, mutationContext.workspaceOwnerUserId, dto)
    const result = await this.createSingleItem(comanda.id, preparedItem)

    await this.dispatch.recordItem({
      auth,
      comandaId: comanda.id,
      context,
      item: preparedItem,
      itemId: result.item.id,
    })
    this.dispatch.publishSingle({
      auth,
      mutationStartedAtMs,
      preparedItem,
      result,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })

    return this.buildMutationResponse({ workspaceOwnerUserId: mutationContext.workspaceOwnerUserId, result, options })
  }

  async addComandaItems(args: ComandaMutationArgs<AddComandaItemsBatchDto>) {
    const { auth, comandaId, dto, context, options } = args
    const mutationStartedAtMs = performance.now()
    const { mutationContext, comanda } = await this.resolveMutationContextAndComanda({
      auth,
      comandaId,
      operation: 'item',
    })
    await this.helpers.assertDraftSelectionsStockAvailability(
      this.prisma,
      mutationContext.workspaceOwnerUserId,
      selectDraftStockSelections(dto.items),
    )
    const preparedItems = await prepareComandaItemsForBatchCreate(
      this.prisma,
      mutationContext.workspaceOwnerUserId,
      dto.items,
    )
    const result = await this.createBatchItems(comanda.id, preparedItems)

    await this.dispatch.recordBatch({
      auth,
      comandaId: comanda.id,
      context,
      items: result.createdItems,
    })
    this.dispatch.publishBatch({
      auth,
      mutationName: 'add-comanda-items',
      mutationStartedAtMs,
      result,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })

    return this.buildMutationResponse({ workspaceOwnerUserId: mutationContext.workspaceOwnerUserId, result, options })
  }

  async replaceComanda(args: ComandaMutationArgs<ReplaceComandaDto>) {
    const { auth, comandaId, dto, context, options } = args
    const mutationStartedAtMs = performance.now()
    const { mutationContext, comanda } = await this.resolveMutationContextAndComanda({
      auth,
      comandaId,
      operation: 'replace',
    })
    const replaceInput = await this.prepareReplaceInput(mutationContext.workspaceOwnerUserId, comanda, dto)
    const result = await this.replaceComandaInTransaction(comanda, replaceInput)

    await this.dispatch.recordReplace({
      auth,
      comandaId: comanda.id,
      context,
      input: replaceInput,
    })
    this.dispatch.publishBatch({
      auth,
      mutationName: 'replace-comanda',
      mutationStartedAtMs,
      result,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })

    return this.buildMutationResponse({ workspaceOwnerUserId: mutationContext.workspaceOwnerUserId, result, options })
  }

  private async resolveMutationContextAndComanda(params: {
    auth: AuthContext
    comandaId: string
    operation: 'item' | 'replace'
  }) {
    const mutationContext = await this.context.resolve(params.auth)
    const comanda = await this.requireOpenComanda({ ...params, mutationContext })
    return { mutationContext, comanda }
  }

  private buildMutationResponse(params: {
    workspaceOwnerUserId: string
    result: { businessDate: Date; refreshedComanda: ResponseComanda }
    options: OperationsResponseOptionsDto | undefined
  }) {
    return buildComandaResponse(
      this.helpers,
      params.workspaceOwnerUserId,
      params.result.businessDate,
      params.result.refreshedComanda,
      params.options,
    )
  }

  private async requireOpenComanda(params: {
    auth: AuthContext
    comandaId: string
    mutationContext: ComandaMutationContext
    operation: 'item' | 'replace'
  }) {
    const comanda = await this.helpers.requireAuthorizedComanda({
      transaction: this.prisma,
      workspaceOwnerUserId: params.mutationContext.workspaceOwnerUserId,
      auth: params.auth,
      comandaId: params.comandaId,
      actorEmployee: params.mutationContext.actorEmployee,
    })
    if (params.operation === 'replace') {
      this.context.assertOpenForReplace(comanda.status)
    } else {
      this.context.assertOpenForItemMutation(comanda.status)
    }

    return comanda
  }

  private assertSingleProductStock(workspaceOwnerUserId: string, dto: AddComandaItemDto) {
    if (!dto.productId) {
      return Promise.resolve()
    }

    return this.helpers.assertDraftSelectionsStockAvailability(this.prisma, workspaceOwnerUserId, [
      { productId: dto.productId, quantity: dto.quantity },
    ])
  }

  private createSingleItem(comandaId: string, item: Awaited<ReturnType<typeof prepareComandaItemForCreate>>) {
    return createSingleComandaItem({ comandaId, helpers: this.helpers, item, prisma: this.prisma })
  }

  private createBatchItems(comandaId: string, items: Awaited<ReturnType<typeof prepareComandaItemsForBatchCreate>>) {
    return createBatchComandaItems({ comandaId, helpers: this.helpers, items, prisma: this.prisma })
  }

  private async prepareReplaceInput(workspaceOwnerUserId: string, comanda: AuthorizedComanda, dto: ReplaceComandaDto) {
    const draftItems = await this.helpers.resolveComandaDraftItems(this.prisma, workspaceOwnerUserId, dto.items)
    await this.helpers.assertDraftSelectionsStockAvailability(
      this.prisma,
      workspaceOwnerUserId,
      selectDraftStockSelections(draftItems),
    )
    const fields = prepareComandaDraftFields({
      customerDocument: dto.customerDocument,
      customerName: dto.customerName,
      discountAmount: dto.discountAmount,
      fallbackDiscountAmount: toNumberOrZero(comanda.discountAmount),
      fallbackParticipantCount: comanda.participantCount,
      fallbackServiceFeeAmount: toNumberOrZero(comanda.serviceFeeAmount),
      notes: dto.notes,
      participantCount: dto.participantCount,
      serviceFeeAmount: dto.serviceFeeAmount,
      subtotal: calculateDraftItemsSubtotal(draftItems),
      tableLabel: dto.tableLabel,
    })
    const subtotal = calculateDraftItemsSubtotal(draftItems)
    const mesaSelection = await this.context.resolveMesaSelection({
      currentComandaId: comanda.id,
      mesaId: dto.mesaId,
      tableLabel: fields.tableLabel,
      workspaceOwnerUserId,
    })
    assertMonetaryAdjustmentsWithinSubtotal(subtotal, fields.discountAmount, fields.serviceFeeAmount)

    return { draftItems, fields, mesaSelection }
  }

  private replaceComandaInTransaction(comanda: AuthorizedComanda, input: ReplaceInput) {
    return replaceComandaItems({ comanda, helpers: this.helpers, input, prisma: this.prisma })
  }
}
