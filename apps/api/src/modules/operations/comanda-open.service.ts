import { Inject, Injectable } from '@nestjs/common'
import { KitchenItemStatus, Prisma } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { publishQueuedKitchenItems } from './comanda-items-dispatch.utils'
import { ComandaMutationContextService } from './comanda-mutation-context.service'
import { ComandaRealtimePublisher } from './comanda-realtime-publisher.service'
import { buildComandaResponse } from './comanda-response.utils'
import { resolveComandaSessionContext } from './comanda-session-resolver.utils'
import { prepareComandaDraftFields } from './comanda-draft-fields.utils'
import { selectDraftStockSelections } from './comanda-item-preparation.utils'
import { calculateDraftItemsSubtotal, shouldRecalculateComandaTotals } from './comanda-validation.utils'
import { OperationsHelpersService } from './operations-helpers.service'
import { resolveBusinessDate } from './operations-domain.utils'
import type { OpenComandaDto, OperationsResponseOptionsDto } from './operations.schemas'

type OpenComandaRecord = Awaited<ReturnType<OperationsHelpersService['recalculateComanda']>>
type ComandaSessionContext = Awaited<ReturnType<typeof resolveComandaSessionContext>>
type CreateAssignmentParams = {
  transaction: Prisma.TransactionClient
  workspaceOwnerUserId: string
  session: ComandaSessionContext
  comandaId: string
  assignedByUserId: string
}
type RecordAuditParams = {
  auth: AuthContext
  comandaId: string
  tableLabel: string
  session: ComandaSessionContext
  context: RequestContext
}
type PublishResultParams = {
  auth: AuthContext
  workspaceOwnerUserId: string
  businessDate: Date
  result: Awaited<ReturnType<ComandaOpenService['createComandaInTransaction']>>
  mutationStartedAtMs: number
}

@Injectable()
export class ComandaOpenService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(OperationsHelpersService) private readonly helpers: OperationsHelpersService,
    @Inject(ComandaMutationContextService) private readonly context: ComandaMutationContextService,
    @Inject(ComandaRealtimePublisher) private readonly realtime: ComandaRealtimePublisher,
  ) {}

  async openComanda(
    auth: AuthContext,
    dto: OpenComandaDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const mutationStartedAtMs = performance.now()
    const mutationContext = await this.context.resolve(auth)
    const draftItems = await this.resolveDraftItems(mutationContext.workspaceOwnerUserId, dto)
    const draftFields = this.prepareDraftFields(dto, draftItems)
    const session = await this.resolveSessionContext(auth, mutationContext, dto)
    const mesa = await this.context.resolveMesaSelection({
      mesaId: dto.mesaId,
      tableLabel: draftFields.tableLabel,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })
    await this.helpers.assertBusinessDayOpen(mutationContext.workspaceOwnerUserId, session.businessDate)
    const result = await this.createComandaInTransaction({
      auth,
      session,
      mesa,
      fields: draftFields,
      draftItems,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })

    await this.recordAudit({
      auth,
      comandaId: result.comanda.id,
      tableLabel: mesa.tableLabel,
      session,
      context,
    })
    this.publishResult({
      auth,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
      businessDate: session.businessDate,
      result,
      mutationStartedAtMs,
    })

    return buildComandaResponse(
      this.helpers,
      mutationContext.workspaceOwnerUserId,
      session.businessDate,
      result.comanda,
      options,
    )
  }

  private prepareDraftFields(
    dto: OpenComandaDto,
    draftItems: Awaited<ReturnType<OperationsHelpersService['resolveComandaDraftItems']>>,
  ) {
    return prepareComandaDraftFields({
      customerDocument: dto.customerDocument,
      customerName: dto.customerName,
      discountAmount: dto.discountAmount,
      fallbackParticipantCount: 1,
      notes: dto.notes,
      participantCount: dto.participantCount,
      serviceFeeAmount: dto.serviceFeeAmount,
      subtotal: calculateDraftItemsSubtotal(draftItems),
      tableLabel: dto.tableLabel,
    })
  }

  private async resolveDraftItems(workspaceOwnerUserId: string, dto: OpenComandaDto) {
    const draftItems = await this.helpers.resolveComandaDraftItems(this.prisma, workspaceOwnerUserId, dto.items)
    await this.helpers.assertDraftSelectionsStockAvailability(
      this.prisma,
      workspaceOwnerUserId,
      selectDraftStockSelections(draftItems),
    )

    return draftItems
  }

  private resolveSessionContext(
    auth: AuthContext,
    context: Awaited<ReturnType<ComandaMutationContextService['resolve']>>,
    dto: OpenComandaDto,
  ) {
    return resolveComandaSessionContext(
      this.prisma,
      this.helpers,
      auth.role,
      context.workspaceOwnerUserId,
      resolveBusinessDate(),
      context.actorEmployee,
      dto,
    )
  }

  private createComandaInTransaction(params: {
    auth: AuthContext
    draftItems: Awaited<ReturnType<OperationsHelpersService['resolveComandaDraftItems']>>
    fields: ReturnType<typeof prepareComandaDraftFields>
    mesa: Awaited<ReturnType<ComandaMutationContextService['resolveMesaSelection']>>
    session: ComandaSessionContext
    workspaceOwnerUserId: string
  }) {
    return this.prisma.$transaction(async (transaction) => {
      const comanda = await transaction.comanda.create({
        data: {
          cashSessionId: params.session.cashSessionId,
          companyOwnerId: params.workspaceOwnerUserId,
          currentEmployeeId: params.session.currentEmployeeId,
          customerDocument: params.fields.customerDocument,
          customerName: params.fields.customerName,
          mesaId: params.mesa.mesaId,
          notes: params.fields.notes,
          openedByUserId: params.auth.userId,
          participantCount: params.fields.participantCount,
          tableLabel: params.mesa.tableLabel,
        },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })
      await this.createDraftItems(transaction, comanda.id, params.draftItems)
      await this.createAssignmentIfNeeded({
        transaction,
        workspaceOwnerUserId: params.workspaceOwnerUserId,
        session: params.session,
        comandaId: comanda.id,
        assignedByUserId: params.auth.userId,
      })
      const recalculated = await this.recalculateIfNeeded(transaction, comanda, params.fields, params.draftItems.length)
      const kitchenItems = await this.loadKitchenItems(transaction, comanda.id, params.draftItems.length)
      return { comanda: recalculated, kitchenItems }
    })
  }

  private createDraftItems(
    transaction: Prisma.TransactionClient,
    comandaId: string,
    draftItems: Awaited<ReturnType<OperationsHelpersService['resolveComandaDraftItems']>>,
  ) {
    if (!draftItems.length) {
      return Promise.resolve()
    }

    const now = new Date()
    return transaction.comandaItem.createMany({
      data: draftItems.map((item) => ({
        comandaId,
        kitchenQueuedAt: item.requiresKitchen ? now : null,
        kitchenStatus: item.requiresKitchen ? KitchenItemStatus.QUEUED : null,
        notes: item.notes,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        totalAmount: item.totalAmount,
        unitPrice: item.unitPrice,
      })),
    })
  }

  private createAssignmentIfNeeded(params: CreateAssignmentParams) {
    if (!params.session.currentEmployeeId) {
      return Promise.resolve()
    }

    return params.transaction.comandaAssignment.create({
      data: {
        assignedByUserId: params.assignedByUserId,
        comandaId: params.comandaId,
        companyOwnerId: params.workspaceOwnerUserId,
        employeeId: params.session.currentEmployeeId,
      },
    })
  }

  private recalculateIfNeeded(
    transaction: Prisma.TransactionClient,
    comanda: { id: string },
    fields: ReturnType<typeof prepareComandaDraftFields>,
    draftItemsCount: number,
  ): Promise<OpenComandaRecord> {
    const recalculate = () =>
      this.helpers.recalculateComanda(transaction, comanda.id, {
        discountAmount: fields.discountAmount,
        serviceFeeAmount: fields.serviceFeeAmount,
      })

    if (shouldRecalculateComandaTotals(fields, draftItemsCount)) {
      return recalculate()
    }

    return Promise.resolve(comanda as OpenComandaRecord)
  }

  private loadKitchenItems(transaction: Prisma.TransactionClient, comandaId: string, draftItemsCount: number) {
    if (!draftItemsCount) {
      return Promise.resolve([])
    }

    return transaction.comandaItem.findMany({
      where: { comandaId, kitchenStatus: { not: null } },
      select: {
        id: true,
        kitchenQueuedAt: true,
        kitchenReadyAt: true,
        kitchenStatus: true,
        notes: true,
        productName: true,
        quantity: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  private recordAudit(params: RecordAuditParams) {
    return this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(params.auth),
      event: 'operations.comanda.opened',
      resource: 'comanda',
      resourceId: params.comandaId,
      metadata: {
        cashSessionId: params.session.cashSessionId,
        currentEmployeeId: params.session.currentEmployeeId,
        tableLabel: params.tableLabel,
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })
  }

  private publishResult(params: PublishResultParams) {
    this.realtime.invalidate(params.workspaceOwnerUserId, params.businessDate)
    this.realtime.publishOpened({
      auth: params.auth,
      businessDate: params.businessDate,
      comanda: params.result.comanda,
      instrumentation: { mutationName: 'open-comanda', mutationStartedAtMs: params.mutationStartedAtMs },
    })
    publishQueuedKitchenItems({
      auth: params.auth,
      businessDate: params.businessDate,
      comanda: params.result.comanda,
      items: params.result.kitchenItems,
      realtime: this.realtime,
    })
  }
}
