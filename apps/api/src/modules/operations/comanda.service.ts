 
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { CashSessionStatus, ComandaStatus, KitchenItemStatus, Prisma } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CacheService } from '../../common/services/cache.service'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import { OperationsHelpersService } from './operations-helpers.service'
import { toComandaRecord } from './operations.types'
import { isKitchenCategory } from '../../common/utils/is-kitchen-category.util'
import { FinanceService } from '../finance/finance.service'
import { assertMonetaryAdjustmentsWithinSubtotal, calculateDraftItemsSubtotal } from './comanda-validation.utils'
import {
  deriveComandaStatusFromKitchen,
  propagateKitchenStatusToComanda,
  takeMatchingKitchenState,
} from './comanda-kitchen.utils'
import { buildComandaResponse, checkLowStockAfterClose, invalidateLiveSnapshotCache } from './comanda-response.utils'
import {
  buildKitchenItemRealtimeDelta,
  buildKitchenItemRealtimeDeltas,
  publishComandaClosed,
  publishComandaOpened,
  publishComandaUpdated,
  publishKitchenItemQueued,
  publishKitchenItemUpdated,
} from './comanda-realtime-publish.utils'
import { resolveComandaSessionContext } from './comanda-session-resolver.utils'
import { assertMesaAvailability, resolveMesaSelection } from './comanda-mesa.utils'
import {
  buildCashClosurePayload,
  isOpenComandaStatus,
  resolveBusinessDate,
  toNumberOrZero,
} from './operations-domain.utils'
import type {
  AddComandaItemDto,
  AddComandaItemsBatchDto,
  AssignComandaDto,
  CloseComandaDto,
  OpenComandaDto,
  OperationsResponseOptionsDto,
  ReplaceComandaDto,
  UpdateComandaStatusDto,
  UpdateKitchenItemStatusDto,
} from './operations.schemas'

const COMANDA_WRITE_ISOLATION_LEVEL = Prisma.TransactionIsolationLevel.Serializable

@Injectable()
export class ComandaService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(OperationsRealtimeService) private readonly operationsRealtimeService: OperationsRealtimeService,
    @Inject(OperationsHelpersService) private readonly helpers: OperationsHelpersService,
    @Optional() private readonly financeService?: FinanceService,
  ) {}

  private resolveMesaSelection(
    workspaceOwnerUserId: string,
    tableLabel: string,
    mesaId?: string | null,
    currentComandaId?: string,
  ) {
    return resolveMesaSelection(
      this.prisma,
      this.helpers,
      workspaceOwnerUserId,
      tableLabel,
      mesaId,
      currentComandaId,
      (resolvedMesaId, resolvedCurrentComandaId) =>
        this.assertMesaAvailability(resolvedMesaId, resolvedCurrentComandaId),
    )
  }

  private assertMesaAvailability(mesaId: string, currentComandaId?: string) {
    return assertMesaAvailability(this.prisma, mesaId, currentComandaId)
  }

  private takeMatchingKitchenState(...args: Parameters<typeof takeMatchingKitchenState>) {
    return takeMatchingKitchenState(...args)
  }

  private buildKitchenItemRealtimeDelta(...args: Parameters<typeof buildKitchenItemRealtimeDelta>) {
    return buildKitchenItemRealtimeDelta(...args)
  }

  private buildKitchenItemRealtimeDeltas(...args: Parameters<typeof buildKitchenItemRealtimeDeltas>) {
    return buildKitchenItemRealtimeDeltas(...args)
  }

  private publishComandaOpenedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof publishComandaOpened>[2],
    businessDate: Date,
  ) {
    publishComandaOpened(this.operationsRealtimeService, auth, comanda, businessDate)
  }

  private publishComandaUpdatedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof publishComandaUpdated>[2],
    businessDate: Date,
    options?: Parameters<typeof publishComandaUpdated>[4],
  ) {
    publishComandaUpdated(this.operationsRealtimeService, auth, comanda, businessDate, options)
  }

  private publishComandaCloseRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof publishComandaClosed>[2],
    refreshedSession: Parameters<typeof publishComandaClosed>[3],
    closure: Parameters<typeof publishComandaClosed>[4],
    businessDate: Date,
  ) {
    publishComandaClosed(this.operationsRealtimeService, auth, comanda, refreshedSession, closure, businessDate)
  }

  private publishKitchenItemQueuedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof publishKitchenItemQueued>[2],
    item: Parameters<typeof publishKitchenItemQueued>[3],
    businessDate: Date,
  ) {
    publishKitchenItemQueued(this.operationsRealtimeService, auth, comanda, item, businessDate)
  }

  private publishKitchenItemUpdatedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof publishKitchenItemUpdated>[2],
    item: Parameters<typeof publishKitchenItemUpdated>[3],
    businessDate: Date,
  ) {
    publishKitchenItemUpdated(this.operationsRealtimeService, auth, comanda, item, businessDate)
  }

  private refreshFinanceSummary(workspaceOwnerUserId: string) {
    if (this.financeService) {
      void this.financeService.invalidateAndWarmSummary(workspaceOwnerUserId)
      return
    }

    void this.cache.del(CacheService.financeKey(workspaceOwnerUserId))
  }

  async getComandaDetails(auth: AuthContext, comandaId: string) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)

    const comanda = await this.prisma.comanda.findUnique({
      where: { id: comandaId, companyOwnerId: workspaceOwnerUserId },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!comanda) {
      throw new NotFoundException('Comanda nao encontrada.')
    }

    return {
      comanda: toComandaRecord(comanda),
    }
  }

  async openComanda(
    auth: AuthContext,
    dto: OpenComandaDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveActorEmployee(workspaceOwnerUserId, auth)
    const tableLabel = sanitizePlainText(dto.tableLabel, 'Mesa', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const customerName = sanitizePlainText(dto.customerName, 'Nome do cliente', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const customerDocument = sanitizePlainText(dto.customerDocument, 'Documento do cliente', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const notes = sanitizePlainText(dto.notes, 'Observacoes da comanda', {
      allowEmpty: true,
      rejectFormula: false,
    })
    const participantCount = dto.participantCount ?? 1
    const draftItems = await this.helpers.resolveComandaDraftItems(this.prisma, workspaceOwnerUserId, dto.items)
    const discountAmount = roundCurrency(dto.discountAmount ?? 0)
    const serviceFeeAmount = roundCurrency(dto.serviceFeeAmount ?? 0)
    assertMonetaryAdjustmentsWithinSubtotal(calculateDraftItemsSubtotal(draftItems), discountAmount, serviceFeeAmount)

    if (participantCount < 1) {
      throw new BadRequestException('A comanda precisa ter pelo menos uma pessoa.')
    }

    const operationalBusinessDate = resolveBusinessDate()
    const sessionContext = await resolveComandaSessionContext(
      this.prisma,
      this.helpers,
      auth.role,
      workspaceOwnerUserId,
      operationalBusinessDate,
      actorEmployee,
      dto,
    )
    const { currentEmployeeId, cashSessionId, businessDate } = sessionContext

    const mesaSelection = await this.resolveMesaSelection(workspaceOwnerUserId, tableLabel, dto.mesaId)
    const resolvedMesaId = mesaSelection.mesaId
    const resolvedTableLabel = mesaSelection.tableLabel

    await this.helpers.assertBusinessDayOpen(workspaceOwnerUserId, businessDate)

    const helpers = this.helpers
    const { comanda, kitchenItems } = await this.prisma.$transaction(async (transaction) => {
      const createdComanda = await transaction.comanda.create({
        data: {
          companyOwnerId: workspaceOwnerUserId,
          cashSessionId,
          mesaId: resolvedMesaId,
          openedByUserId: auth.userId,
          currentEmployeeId,
          tableLabel: resolvedTableLabel,
          customerName,
          customerDocument,
          participantCount,
          notes,
        },
        include: {
          items: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      })

      if (draftItems.length) {
        const productIds = draftItems.map((i) => i.productId).filter(Boolean) as string[]
        const products = productIds.length
          ? await transaction.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, category: true, requiresKitchen: true },
            })
          : []
        const productMap = new Map(products.map((p) => [p.id, p]))
        const now = new Date()

        await transaction.comandaItem.createMany({
          data: draftItems.map((item) => {
            const prod = item.productId ? productMap.get(item.productId) : undefined
            const needsKitchen = prod ? prod.requiresKitchen || isKitchenCategory(prod.category) : false
            return {
              comandaId: createdComanda.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              notes: item.notes,
              kitchenStatus: needsKitchen ? KitchenItemStatus.QUEUED : null,
              kitchenQueuedAt: needsKitchen ? now : null,
            }
          }),
        })
      }

      if (currentEmployeeId) {
        await transaction.comandaAssignment.create({
          data: {
            companyOwnerId: workspaceOwnerUserId,
            comandaId: createdComanda.id,
            employeeId: currentEmployeeId,
            assignedByUserId: auth.userId,
          },
        })
      }

      const recalculatedComanda =
        draftItems.length || discountAmount > 0 || serviceFeeAmount > 0
          ? await helpers.recalculateComanda(transaction, createdComanda.id, {
              discountAmount,
              serviceFeeAmount,
            })
          : createdComanda

      const kitchenItems = draftItems.length
        ? await transaction.comandaItem.findMany({
            where: {
              comandaId: createdComanda.id,
              kitchenStatus: {
                not: null,
              },
            },
            select: {
              id: true,
              productName: true,
              quantity: true,
              notes: true,
              kitchenStatus: true,
              kitchenQueuedAt: true,
              kitchenReadyAt: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          })
        : []

      return {
        comanda: recalculatedComanda,
        kitchenItems,
      }
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.comanda.opened',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        tableLabel: resolvedTableLabel,
        currentEmployeeId,
        cashSessionId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateLiveSnapshotCache(this.cache, workspaceOwnerUserId, businessDate)
    this.publishComandaOpenedRealtime(auth, comanda, businessDate)

    for (const kitchenItem of kitchenItems) {
      if (kitchenItem.kitchenStatus === KitchenItemStatus.QUEUED && kitchenItem.kitchenQueuedAt) {
        this.publishKitchenItemQueuedRealtime(auth, comanda, kitchenItem, businessDate)
      }
    }

    return buildComandaResponse(this.helpers, workspaceOwnerUserId, businessDate, comanda, options)
  }

  async addComandaItem(
    auth: AuthContext,
    comandaId: string,
    dto: AddComandaItemDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveActorEmployee(workspaceOwnerUserId, auth)
    const comanda = await this.helpers.requireAuthorizedComanda(
      this.prisma,
      workspaceOwnerUserId,
      auth,
      comandaId,
      actorEmployee,
    )

    if (!isOpenComandaStatus(comanda.status)) {
      throw new ConflictException('Nao e possivel adicionar itens em uma comanda encerrada ou cancelada.')
    }

    let productId: string | null = null
    let productName: string
    let unitPrice: number
    let requiresKitchen = false

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: {
          id: dto.productId,
          userId: workspaceOwnerUserId,
          active: true,
        },
      })

      if (!product) {
        throw new NotFoundException('Produto nao encontrado para esta conta.')
      }

      productId = product.id
      productName = product.name
      unitPrice = roundCurrency(dto.unitPrice ?? toNumberOrZero(product.unitPrice))
      // requiresKitchen: use product flag; if false but category suggests food, infer true
      // This handles products created before the auto-detection feature
      requiresKitchen = product.requiresKitchen || isKitchenCategory(product.category)
    } else {
      productName = sanitizePlainText(dto.productName, 'Nome do item da comanda', {
        allowEmpty: false,
        rejectFormula: true,
      })!

      if (dto.unitPrice === undefined) {
        throw new BadRequestException('Informe o valor unitario quando o item nao estiver vinculado ao catalogo.')
      }

      unitPrice = roundCurrency(dto.unitPrice)
    }

    const note = sanitizePlainText(dto.notes, 'Observacoes do item', {
      allowEmpty: true,
      rejectFormula: false,
    })
    const totalAmount = roundCurrency(unitPrice * dto.quantity)
    const kitchenQueuedAt = requiresKitchen ? new Date() : null

    const helpers = this.helpers
    const { item, refreshedComanda, businessDate } = await this.prisma.$transaction(
      async (transaction) => {
        const createdItem = await transaction.comandaItem.create({
          data: {
            comandaId: comanda.id,
            productId,
            productName,
            quantity: dto.quantity,
            unitPrice,
            totalAmount,
            notes: note,
            kitchenStatus: requiresKitchen ? KitchenItemStatus.QUEUED : null,
            kitchenQueuedAt,
          },
        })

        const updatedComanda = await helpers.recalculateComanda(transaction, comanda.id)
        const resolvedBusinessDate = await helpers.resolveComandaBusinessDate(transaction, updatedComanda)

        return {
          item: createdItem,
          refreshedComanda: updatedComanda,
          businessDate: resolvedBusinessDate,
        }
      },
      {
        isolationLevel: COMANDA_WRITE_ISOLATION_LEVEL,
      },
    )

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.comanda_item.created',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        itemId: item.id,
        productId,
        productName,
        quantity: dto.quantity,
        unitPrice,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateLiveSnapshotCache(this.cache, workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate)

    if (requiresKitchen && kitchenQueuedAt) {
      this.publishKitchenItemQueuedRealtime(auth, refreshedComanda, item, businessDate)
    }

    return buildComandaResponse(this.helpers, workspaceOwnerUserId, businessDate, refreshedComanda, options)
  }

  async addComandaItems(
    auth: AuthContext,
    comandaId: string,
    dto: AddComandaItemsBatchDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveActorEmployee(workspaceOwnerUserId, auth)
    const comanda = await this.helpers.requireAuthorizedComanda(
      this.prisma,
      workspaceOwnerUserId,
      auth,
      comandaId,
      actorEmployee,
    )

    if (!isOpenComandaStatus(comanda.status)) {
      throw new ConflictException('Nao e possivel adicionar itens em uma comanda encerrada ou cancelada.')
    }

    const uniqueProductIds = Array.from(
      new Set(dto.items.map((item) => item.productId).filter((productId): productId is string => Boolean(productId))),
    )
    const products = uniqueProductIds.length
      ? await this.prisma.product.findMany({
          where: {
            id: { in: uniqueProductIds },
            userId: workspaceOwnerUserId,
            active: true,
          },
        })
      : []
    const productMap = new Map(products.map((product) => [product.id, product]))
    const missingProductId = uniqueProductIds.find((productId) => !productMap.has(productId))
    if (missingProductId) {
      throw new NotFoundException('Produto nao encontrado para esta conta.')
    }

    const now = new Date()
    const preparedItems = dto.items.map((itemDto) => {
      const product = itemDto.productId ? productMap.get(itemDto.productId) : undefined
      const productId = product?.id ?? null
      const productName =
        product?.name ??
        sanitizePlainText(itemDto.productName, 'Nome do item da comanda', {
          allowEmpty: false,
          rejectFormula: true,
        })
      if (!productName) {
        throw new BadRequestException('Informe o nome do item quando o produto nao estiver vinculado ao catalogo.')
      }

      if (!product && itemDto.unitPrice === undefined) {
        throw new BadRequestException('Informe o valor unitario quando o item nao estiver vinculado ao catalogo.')
      }

      const unitPrice = roundCurrency(
        product ? (itemDto.unitPrice ?? toNumberOrZero(product.unitPrice)) : itemDto.unitPrice!,
      )
      const notes = sanitizePlainText(itemDto.notes, 'Observacoes do item', {
        allowEmpty: true,
        rejectFormula: false,
      })
      const requiresKitchen = product ? product.requiresKitchen || isKitchenCategory(product.category) : false

      return {
        productId,
        productName,
        quantity: itemDto.quantity,
        unitPrice,
        totalAmount: roundCurrency(unitPrice * itemDto.quantity),
        notes,
        requiresKitchen,
        kitchenQueuedAt: requiresKitchen ? now : null,
      }
    })

    const helpers = this.helpers
    const { createdItems, refreshedComanda, businessDate } = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.comandaItem.createMany({
          data: preparedItems.map((item) => ({
            comandaId: comanda.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
            notes: item.notes,
            kitchenStatus: item.requiresKitchen ? KitchenItemStatus.QUEUED : null,
            kitchenQueuedAt: item.kitchenQueuedAt,
          })),
        })

        const insertedItems = await transaction.comandaItem.findMany({
          where: { comandaId: comanda.id },
          orderBy: { createdAt: 'desc' },
          take: preparedItems.length,
        })

        const updatedComanda = await helpers.recalculateComanda(transaction, comanda.id)
        const resolvedBusinessDate = await helpers.resolveComandaBusinessDate(transaction, updatedComanda)

        return {
          createdItems: insertedItems,
          refreshedComanda: updatedComanda,
          businessDate: resolvedBusinessDate,
        }
      },
      {
        isolationLevel: COMANDA_WRITE_ISOLATION_LEVEL,
      },
    )

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.comanda_items.batch_created',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        itemsCount: createdItems.length,
        itemIds: createdItems.map((item) => item.id),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateLiveSnapshotCache(this.cache, workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate, {
      replaceKitchenItems: true,
      kitchenItems: this.buildKitchenItemRealtimeDeltas(refreshedComanda, businessDate),
    })

    for (const item of createdItems) {
      if (item.kitchenStatus === KitchenItemStatus.QUEUED && item.kitchenQueuedAt) {
        this.publishKitchenItemQueuedRealtime(auth, refreshedComanda, item, businessDate)
      }
    }

    return buildComandaResponse(this.helpers, workspaceOwnerUserId, businessDate, refreshedComanda, options)
  }

  async replaceComanda(
    auth: AuthContext,
    comandaId: string,
    dto: ReplaceComandaDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveActorEmployee(workspaceOwnerUserId, auth)
    const comanda = await this.helpers.requireAuthorizedComanda(
      this.prisma,
      workspaceOwnerUserId,
      auth,
      comandaId,
      actorEmployee,
    )

    if (!isOpenComandaStatus(comanda.status)) {
      throw new ConflictException('Nao e possivel editar uma comanda encerrada ou cancelada.')
    }

    const tableLabel = sanitizePlainText(dto.tableLabel, 'Mesa', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const customerName = sanitizePlainText(dto.customerName, 'Nome do cliente', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const customerDocument = sanitizePlainText(dto.customerDocument, 'Documento do cliente', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const notes = sanitizePlainText(dto.notes, 'Observacoes da comanda', {
      allowEmpty: true,
      rejectFormula: false,
    })
    const participantCount = dto.participantCount ?? comanda.participantCount
    const draftItems = await this.helpers.resolveComandaDraftItems(this.prisma, workspaceOwnerUserId, dto.items)
    const discountAmount = roundCurrency(dto.discountAmount ?? toNumberOrZero(comanda.discountAmount))
    const serviceFeeAmount = roundCurrency(dto.serviceFeeAmount ?? toNumberOrZero(comanda.serviceFeeAmount))
    assertMonetaryAdjustmentsWithinSubtotal(calculateDraftItemsSubtotal(draftItems), discountAmount, serviceFeeAmount)

    if (participantCount < 1) {
      throw new BadRequestException('A comanda precisa ter pelo menos uma pessoa.')
    }

    const mesaSelection = await this.resolveMesaSelection(workspaceOwnerUserId, tableLabel, dto.mesaId, comanda.id)
    const resolvedMesaId = mesaSelection.mesaId
    const resolvedTableLabel = mesaSelection.tableLabel

    const helpers = this.helpers
    const { refreshedComanda, businessDate } = await this.prisma.$transaction(async (transaction) => {
      const productIds = draftItems.map((item) => item.productId).filter(Boolean) as string[]
      const products = productIds.length
        ? await transaction.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, category: true, requiresKitchen: true },
          })
        : []
      const productMap = new Map(products.map((product) => [product.id, product]))
      const now = new Date()
      const remainingExistingItems = [...comanda.items]

      await transaction.comanda.update({
        where: { id: comanda.id },
        data: {
          tableLabel: resolvedTableLabel,
          mesaId: resolvedMesaId,
          customerName,
          customerDocument,
          participantCount,
          notes,
        },
      })

      await transaction.comandaItem.deleteMany({
        where: { comandaId: comanda.id },
      })

      if (draftItems.length) {
        await transaction.comandaItem.createMany({
          data: draftItems.map((item) => {
            const product = item.productId ? productMap.get(item.productId) : undefined
            const needsKitchen = product ? product.requiresKitchen || isKitchenCategory(product.category) : false
            const preservedKitchenState = this.takeMatchingKitchenState(remainingExistingItems, item, needsKitchen, now)
            return {
              comandaId: comanda.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              notes: item.notes,
              kitchenStatus: preservedKitchenState.kitchenStatus,
              kitchenQueuedAt: preservedKitchenState.kitchenQueuedAt,
              kitchenReadyAt: preservedKitchenState.kitchenReadyAt,
            }
          }),
        })
      }

      const updatedComanda = await helpers.recalculateComanda(transaction, comanda.id, {
        discountAmount,
        serviceFeeAmount,
      })
      const resolvedBusinessDate = await helpers.resolveComandaBusinessDate(transaction, updatedComanda)
      return {
        refreshedComanda: updatedComanda,
        businessDate: resolvedBusinessDate,
      }
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.comanda.replaced',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        tableLabel: resolvedTableLabel,
        itemsCount: draftItems.length,
        discountAmount,
        serviceFeeAmount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateLiveSnapshotCache(this.cache, workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate, {
      replaceKitchenItems: true,
      kitchenItems: this.buildKitchenItemRealtimeDeltas(refreshedComanda, businessDate),
    })

    return buildComandaResponse(this.helpers, workspaceOwnerUserId, businessDate, refreshedComanda, options)
  }

  async assignComanda(
    auth: AuthContext,
    comandaId: string,
    dto: AssignComandaDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    assertOwnerRole(auth, 'Somente o dono pode redistribuir mesas entre funcionarios.')
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const comanda = await this.helpers.requireOwnedComanda(this.prisma, workspaceOwnerUserId, comandaId)
    const comandaBusinessDate = await this.helpers.resolveComandaBusinessDate(this.prisma, comanda)
    const employee = dto.employeeId
      ? await this.helpers.requireOwnedEmployee(this.prisma, workspaceOwnerUserId, dto.employeeId)
      : null
    const employeeOpenSession = employee
      ? await this.prisma.cashSession.findFirst({
          where: {
            companyOwnerId: workspaceOwnerUserId,
            employeeId: employee.id,
            businessDate: comandaBusinessDate,
            status: CashSessionStatus.OPEN,
          },
          orderBy: {
            openedAt: 'desc',
          },
        })
      : null

    if (employee && !employeeOpenSession) {
      throw new ConflictException('O funcionario precisa abrir o proprio caixa antes de assumir uma mesa.')
    }

    const helpers = this.helpers
    const { refreshedComanda, businessDate } = await this.prisma.$transaction(async (transaction) => {
      await transaction.comandaAssignment.updateMany({
        where: {
          comandaId: comanda.id,
          endedAt: null,
        },
        data: {
          endedAt: new Date(),
        },
      })

      if (employee) {
        await transaction.comandaAssignment.create({
          data: {
            companyOwnerId: workspaceOwnerUserId,
            comandaId: comanda.id,
            employeeId: employee.id,
            assignedByUserId: auth.userId,
          },
        })
      }

      const updatedComanda = await transaction.comanda.update({
        where: { id: comanda.id },
        data: {
          currentEmployeeId: employee?.id ?? null,
          cashSessionId: employeeOpenSession?.id ?? null,
        },
        include: {
          items: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      })

      return {
        refreshedComanda: updatedComanda,
        businessDate: await helpers.resolveComandaBusinessDate(transaction, updatedComanda),
      }
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.comanda.assigned',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        employeeId: employee?.id ?? null,
        cashSessionId: employeeOpenSession?.id ?? null,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateLiveSnapshotCache(this.cache, workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate)

    return buildComandaResponse(this.helpers, workspaceOwnerUserId, businessDate, refreshedComanda, options)
  }

  async updateComandaStatus(
    auth: AuthContext,
    comandaId: string,
    dto: UpdateComandaStatusDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveActorEmployee(workspaceOwnerUserId, auth)
    const comanda = await this.helpers.requireAuthorizedComanda(
      this.prisma,
      workspaceOwnerUserId,
      auth,
      comandaId,
      actorEmployee,
    )

    if (dto.status === ComandaStatus.CLOSED) {
      throw new BadRequestException('Use o endpoint especifico para fechar a comanda.')
    }

    if (comanda.status === ComandaStatus.CLOSED) {
      throw new ConflictException('Esta comanda ja foi encerrada.')
    }

    if (comanda.status === ComandaStatus.CANCELLED) {
      throw new ConflictException('Esta comanda ja foi cancelada.')
    }

    const { refreshedComanda, businessDate, closure } = await this.prisma.$transaction(async (transaction) => {
      const updatedComanda = await transaction.comanda.update({
        where: { id: comanda.id },
        data: {
          status: dto.status,
          ...(dto.status === ComandaStatus.CANCELLED
            ? {
                closedAt: new Date(),
                closedByUserId: auth.userId,
              }
            : {}),
        },
        include: {
          items: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      })

      const resolvedBusinessDate = await this.helpers.resolveComandaBusinessDate(transaction, updatedComanda)
      const closureSnapshot =
        dto.status === ComandaStatus.CANCELLED
          ? await this.helpers.syncCashClosure(transaction, workspaceOwnerUserId, resolvedBusinessDate)
          : null

      return {
        refreshedComanda: updatedComanda,
        businessDate: resolvedBusinessDate,
        closure: closureSnapshot,
      }
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.comanda.status_updated',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        status: dto.status,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateLiveSnapshotCache(this.cache, workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate)
    if (closure) {
      this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))
    }

    return buildComandaResponse(this.helpers, workspaceOwnerUserId, businessDate, refreshedComanda, options)
  }

  async updateKitchenItemStatus(
    auth: AuthContext,
    itemId: string,
    dto: UpdateKitchenItemStatusDto,
    context: RequestContext,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const helpers = this.helpers

    const { updatedItem, refreshedComanda, businessDate, comandaId } = await this.prisma.$transaction(
      async (tx) => {
        const item = await tx.comandaItem.findUnique({
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
        })

        if (!item || item.comanda.companyOwnerId !== workspaceOwnerUserId) {
          throw new NotFoundException('Item de comanda nao encontrado.')
        }

        if (!item.kitchenStatus) {
          throw new BadRequestException('Este item nao esta na fila da cozinha.')
        }

        const kitchenReadyAt = dto.status === 'READY' ? new Date() : (item.kitchenReadyAt ?? undefined)

        const txUpdatedItem = await tx.comandaItem.update({
          where: { id: itemId },
          data: {
            kitchenStatus: dto.status as KitchenItemStatus,
            kitchenReadyAt: kitchenReadyAt ?? null,
          },
        })

        const txRefreshedComanda = await propagateKitchenStatusToComanda(tx, item.comanda, deriveComandaStatusFromKitchen)

        const resolvedBusinessDate = await helpers.resolveComandaBusinessDate(
          tx,
          txRefreshedComanda ?? {
            cashSessionId: item.comanda.cashSessionId,
            openedAt: item.comanda.openedAt,
          },
        )

        return {
          updatedItem: txUpdatedItem,
          refreshedComanda: txRefreshedComanda,
          businessDate: resolvedBusinessDate,
          comandaId: item.comanda.id,
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    )

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.kitchen_item.status_updated',
      resource: 'comanda_item',
      resourceId: itemId,
      metadata: { status: dto.status, comandaId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateLiveSnapshotCache(this.cache, workspaceOwnerUserId, businessDate)

    if (refreshedComanda) {
      this.publishKitchenItemUpdatedRealtime(auth, refreshedComanda, updatedItem, businessDate)
      this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate)
    }

    return { itemId, status: dto.status }
  }

  async closeComanda(
    auth: AuthContext,
    comandaId: string,
    dto: CloseComandaDto,
    context: RequestContext,
    options?: OperationsResponseOptionsDto,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveActorEmployee(workspaceOwnerUserId, auth)
    const comanda = await this.helpers.requireAuthorizedComanda(
      this.prisma,
      workspaceOwnerUserId,
      auth,
      comandaId,
      actorEmployee,
    )

    if (comanda.status === ComandaStatus.CLOSED) {
      throw new ConflictException('Esta comanda ja foi encerrada.')
    }

    if (comanda.status === ComandaStatus.CANCELLED) {
      throw new ConflictException('Comandas canceladas nao podem ser encerradas novamente.')
    }

    if (comanda.items.length === 0) {
      throw new ConflictException('Adicione itens antes de fechar a comanda.')
    }

    const notes = sanitizePlainText(dto.notes, 'Observacoes da comanda', {
      allowEmpty: true,
      rejectFormula: false,
    })
    const discountAmount = roundCurrency(dto.discountAmount ?? toNumberOrZero(comanda.discountAmount))
    const serviceFeeAmount = roundCurrency(dto.serviceFeeAmount ?? toNumberOrZero(comanda.serviceFeeAmount))
    assertMonetaryAdjustmentsWithinSubtotal(
      calculateDraftItemsSubtotal(comanda.items),
      discountAmount,
      serviceFeeAmount,
    )

    const helpers = this.helpers
    const { refreshedComanda, refreshedSession, closure, businessDate } = await this.prisma.$transaction(
      async (transaction) => {
        const recalculatedComanda = await helpers.recalculateComanda(transaction, comanda.id, {
          discountAmount,
          serviceFeeAmount,
        })
        const closedComanda = await transaction.comanda.update({
          where: { id: comanda.id },
          data: {
            status: ComandaStatus.CLOSED,
            closedAt: new Date(),
            closedByUserId: auth.userId,
            notes: notes ?? recalculatedComanda.notes,
          },
          include: {
            items: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        })

        await helpers.ensureOrderForClosedComanda(transaction, workspaceOwnerUserId, closedComanda.id)

        const resolvedBusinessDate = await helpers.resolveComandaBusinessDate(transaction, closedComanda)
        const updatedSession = closedComanda.cashSessionId
          ? await helpers.recalculateCashSession(transaction, closedComanda.cashSessionId)
          : null
        const closureSnapshot = await helpers.syncCashClosure(transaction, workspaceOwnerUserId, resolvedBusinessDate)

        return {
          refreshedComanda: closedComanda,
          refreshedSession: updatedSession,
          closure: closureSnapshot,
          businessDate: resolvedBusinessDate,
        }
      },
    )

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'operations.comanda.closed',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        discountAmount,
        serviceFeeAmount,
        totalAmount: toNumberOrZero(refreshedComanda.totalAmount),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    invalidateLiveSnapshotCache(this.cache, workspaceOwnerUserId, businessDate)
    this.publishComandaCloseRealtime(
      auth,
      refreshedComanda,
      refreshedSession,
      closure,
      businessDate,
    )
    void this.cache.del(CacheService.ordersKey(workspaceOwnerUserId))
    this.refreshFinanceSummary(workspaceOwnerUserId)
    void checkLowStockAfterClose(this.prisma, this.auditLogService, auth.userId, workspaceOwnerUserId, refreshedComanda.items)

    return buildComandaResponse(this.helpers, workspaceOwnerUserId, businessDate, refreshedComanda, options)
  }

  private resolveActorEmployee(workspaceOwnerUserId: string, auth: AuthContext) {
    return this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
  }
}
