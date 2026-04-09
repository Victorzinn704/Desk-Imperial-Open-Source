/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { AuditSeverity, CashSessionStatus, ComandaStatus, KitchenItemStatus, Prisma } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CacheService } from '../../common/services/cache.service'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import type { AddComandaItemDto } from './dto/add-comanda-item.dto'
import type { AddComandaItemsBatchDto } from './dto/add-comanda-items-batch.dto'
import type { AssignComandaDto } from './dto/assign-comanda.dto'
import type { CloseComandaDto } from './dto/close-comanda.dto'
import type { OpenComandaDto } from './dto/open-comanda.dto'
import type { OperationsResponseOptionsDto } from './dto/operations-response-options.dto'
import type { ReplaceComandaDto } from './dto/replace-comanda.dto'
import type { UpdateComandaStatusDto } from './dto/update-comanda-status.dto'
import type { UpdateKitchenItemStatusDto } from './dto/update-kitchen-item-status.dto'
import { OperationsHelpersService } from './operations-helpers.service'
import { toComandaRecord } from './operations.types'
import { isKitchenCategory } from '../../common/utils/is-kitchen-category.util'
import { FinanceService } from '../finance/finance.service'
import {
  buildOptionalOperationsSnapshot,
  buildCashClosurePayload,
  buildCashUpdatedPayload,
  formatBusinessDateKey,
  invalidateOperationsLiveCache,
  OPEN_COMANDA_STATUSES,
  isOpenComandaStatus,
  resolveBusinessDate,
  toNumberOrZero,
} from './operations-domain.utils'

const COMANDA_WRITE_ISOLATION_LEVEL = Prisma.TransactionIsolationLevel.Serializable

const REALTIME_STATUS_MAP: Record<string, 'OPEN' | 'IN_PREPARATION' | 'READY' | 'CLOSED'> = {
  OPEN: 'OPEN',
  IN_PREPARATION: 'IN_PREPARATION',
  READY: 'READY',
}

function toRealtimeStatus(status: string): 'OPEN' | 'IN_PREPARATION' | 'READY' | 'CLOSED' {
  return REALTIME_STATUS_MAP[status] ?? 'CLOSED'
}

function toRealtimeOpenStatus(status: string): 'OPEN' | 'IN_PREPARATION' | 'READY' {
  return (REALTIME_STATUS_MAP[status] as 'OPEN' | 'IN_PREPARATION' | 'READY') ?? 'OPEN'
}

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
    this.assertMonetaryAdjustmentsWithinSubtotal(
      this.calculateDraftItemsSubtotal(draftItems),
      discountAmount,
      serviceFeeAmount,
    )

    if (participantCount < 1) {
      throw new BadRequestException('A comanda precisa ter pelo menos uma pessoa.')
    }

    const operationalBusinessDate = resolveBusinessDate()
    const sessionContext = await this.resolveComandaSessionContext(
      auth,
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
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishComandaOpenedRealtime(auth, comanda, businessDate)

    for (const kitchenItem of kitchenItems) {
      if (kitchenItem.kitchenStatus === KitchenItemStatus.QUEUED && kitchenItem.kitchenQueuedAt) {
        this.publishKitchenItemQueuedRealtime(auth, comanda, kitchenItem, businessDate)
      }
    }

    return this.buildComandaResponse(workspaceOwnerUserId, businessDate, comanda, options)
  }

  private async resolveComandaSessionContext(
    auth: AuthContext,
    workspaceOwnerUserId: string,
    operationalBusinessDate: Date,
    actorEmployee: { id: string } | null,
    dto: OpenComandaDto,
  ): Promise<{ currentEmployeeId: string | null; cashSessionId: string | null; businessDate: Date }> {
    if (auth.role === 'STAFF') {
      return this.resolveStaffSessionContext(workspaceOwnerUserId, operationalBusinessDate, actorEmployee)
    }
    return this.resolveOwnerSessionContext(workspaceOwnerUserId, operationalBusinessDate, dto)
  }

  private async resolveStaffSessionContext(
    workspaceOwnerUserId: string,
    operationalBusinessDate: Date,
    actorEmployee: { id: string } | null,
  ) {
    if (!actorEmployee) {
      throw new ForbiddenException('Seu acesso precisa estar vinculado a um funcionario ativo.')
    }

    const openSession = await this.prisma.cashSession.findFirst({
      where: {
        companyOwnerId: workspaceOwnerUserId,
        employeeId: actorEmployee.id,
        businessDate: operationalBusinessDate,
        status: CashSessionStatus.OPEN,
      },
      orderBy: { openedAt: 'desc' },
    })

    if (!openSession) {
      throw new ConflictException('Abra o caixa do funcionario antes de criar comandas.')
    }

    return {
      currentEmployeeId: actorEmployee.id,
      cashSessionId: openSession.id,
      businessDate: openSession.businessDate,
    }
  }

  private async resolveOwnerSessionContext(
    workspaceOwnerUserId: string,
    operationalBusinessDate: Date,
    dto: OpenComandaDto,
  ) {
    let currentEmployeeId: string | null = null
    let cashSessionId: string | null = dto.cashSessionId ?? null

    if (dto.employeeId) {
      const assignedEmployee = await this.helpers.requireOwnedEmployee(
        this.prisma,
        workspaceOwnerUserId,
        dto.employeeId,
      )
      const employeeOpenSession = await this.prisma.cashSession.findFirst({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          employeeId: assignedEmployee.id,
          businessDate: operationalBusinessDate,
          status: CashSessionStatus.OPEN,
        },
        orderBy: { openedAt: 'desc' },
      })

      if (!employeeOpenSession) {
        throw new ConflictException('O funcionario precisa abrir o proprio caixa antes de receber uma mesa.')
      }

      currentEmployeeId = assignedEmployee.id
      cashSessionId = cashSessionId ?? employeeOpenSession.id
    }

    const businessDate = cashSessionId
      ? (await this.helpers.requireOwnedCashSession(this.prisma, workspaceOwnerUserId, cashSessionId)).businessDate
      : operationalBusinessDate

    return { currentEmployeeId, cashSessionId, businessDate }
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
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate)

    if (requiresKitchen && kitchenQueuedAt) {
      this.publishKitchenItemQueuedRealtime(auth, refreshedComanda, item, businessDate)
    }

    return this.buildComandaResponse(workspaceOwnerUserId, businessDate, refreshedComanda, options)
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
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate, {
      replaceKitchenItems: true,
      kitchenItems: this.buildKitchenItemRealtimeDeltas(refreshedComanda, businessDate),
    })

    for (const item of createdItems) {
      if (item.kitchenStatus === KitchenItemStatus.QUEUED && item.kitchenQueuedAt) {
        this.publishKitchenItemQueuedRealtime(auth, refreshedComanda, item, businessDate)
      }
    }

    return this.buildComandaResponse(workspaceOwnerUserId, businessDate, refreshedComanda, options)
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
    this.assertMonetaryAdjustmentsWithinSubtotal(
      this.calculateDraftItemsSubtotal(draftItems),
      discountAmount,
      serviceFeeAmount,
    )

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
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate, {
      replaceKitchenItems: true,
      kitchenItems: this.buildKitchenItemRealtimeDeltas(refreshedComanda, businessDate),
    })

    return this.buildComandaResponse(workspaceOwnerUserId, businessDate, refreshedComanda, options)
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
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate)

    return this.buildComandaResponse(workspaceOwnerUserId, businessDate, refreshedComanda, options)
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
      actorUserId: auth.userId,
      event: 'operations.comanda.status_updated',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        status: dto.status,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate)
    if (closure) {
      this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))
    }

    return this.buildComandaResponse(workspaceOwnerUserId, businessDate, refreshedComanda, options)
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

        const txRefreshedComanda = await this.propagateKitchenStatusToComanda(tx, item.comanda)

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
      actorUserId: auth.userId,
      event: 'operations.kitchen_item.status_updated',
      resource: 'comanda_item',
      resourceId: itemId,
      metadata: { status: dto.status, comandaId },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)

    if (refreshedComanda) {
      this.publishKitchenItemUpdatedRealtime(auth, refreshedComanda, updatedItem, businessDate)
      this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate)
    }

    return { itemId, status: dto.status }
  }

  private async propagateKitchenStatusToComanda(
    tx: any,
    comanda: { id: string; status: ComandaStatus; cashSessionId: string | null; openedAt: Date },
  ) {
    const allItems = await tx.comandaItem.findMany({
      where: { comandaId: comanda.id },
      select: { kitchenStatus: true },
    })

    const kitchenItems = allItems.filter((i: { kitchenStatus: KitchenItemStatus | null }) => i.kitchenStatus !== null)
    const newStatus = this.deriveComandaStatusFromKitchen(kitchenItems, comanda.status)

    if (newStatus) {
      return tx.comanda.update({
        where: { id: comanda.id },
        data: { status: newStatus },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })
    }

    return (
      (await tx.comanda.findUnique({
        where: { id: comanda.id },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })) ?? undefined
    )
  }

  private deriveComandaStatusFromKitchen(
    kitchenItems: Array<{ kitchenStatus: KitchenItemStatus | null }>,
    currentStatus: ComandaStatus,
  ): ComandaStatus | null {
    if (kitchenItems.length === 0) return null
    if (!isOpenComandaStatus(currentStatus)) return null

    const allReady = kitchenItems.every(
      (i) => i.kitchenStatus === KitchenItemStatus.READY || i.kitchenStatus === KitchenItemStatus.DELIVERED,
    )
    if (allReady) return ComandaStatus.READY

    const anyInPrep = kitchenItems.some((i) => i.kitchenStatus === KitchenItemStatus.IN_PREPARATION)
    if (anyInPrep && currentStatus === ComandaStatus.OPEN) return ComandaStatus.IN_PREPARATION

    return null
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
    this.assertMonetaryAdjustmentsWithinSubtotal(
      this.calculateDraftItemsSubtotal(comanda.items),
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
      actorUserId: auth.userId,
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

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishComandaCloseRealtime(auth, refreshedComanda, refreshedSession, closure, businessDate)
    void this.cache.del(CacheService.ordersKey(workspaceOwnerUserId))
    this.refreshFinanceSummary(workspaceOwnerUserId)
    void this.checkLowStockAfterClose(auth.userId, workspaceOwnerUserId, refreshedComanda.items)

    return this.buildComandaResponse(workspaceOwnerUserId, businessDate, refreshedComanda, options)
  }

  private async checkLowStockAfterClose(
    actorUserId: string,
    workspaceOwnerUserId: string,
    items: Array<{ productId: string | null; productName: string }>,
  ) {
    const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))] as string[]
    if (!productIds.length) return

    const products =
      (await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          userId: workspaceOwnerUserId,
          lowStockThreshold: { not: null },
        },
        select: { id: true, name: true, stock: true, lowStockThreshold: true },
      })) ?? []

    for (const product of products) {
      if (product.lowStockThreshold != null && product.stock <= product.lowStockThreshold) {
        void this.auditLogService.record({
          actorUserId,
          event: 'product.stock.low',
          resource: 'product',
          resourceId: product.id,
          severity: AuditSeverity.WARN,
          metadata: {
            name: product.name,
            stock: product.stock,
            lowStockThreshold: product.lowStockThreshold,
          },
        })
      }
    }
  }

  private async buildOptionalSnapshot(
    workspaceOwnerUserId: string,
    businessDate: Date,
    options?: OperationsResponseOptionsDto,
  ) {
    return buildOptionalOperationsSnapshot(this.helpers, workspaceOwnerUserId, businessDate, options)
  }

  private invalidateLiveSnapshotCache(workspaceOwnerUserId: string, businessDate: Date) {
    invalidateOperationsLiveCache(this.cache, workspaceOwnerUserId, businessDate)
  }

  private resolveActorEmployee(workspaceOwnerUserId: string, auth: AuthContext) {
    return this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
  }

  private async buildComandaResponse(
    workspaceOwnerUserId: string,
    businessDate: Date,
    comanda: Parameters<typeof toComandaRecord>[0],
    options?: OperationsResponseOptionsDto,
  ) {
    return {
      comanda: toComandaRecord(comanda),
      ...(await this.buildOptionalSnapshot(workspaceOwnerUserId, businessDate, options)),
    }
  }

  private publishComandaOpenedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof toComandaRecord>[0],
    businessDate: Date,
  ) {
    this.operationsRealtimeService.publishComandaOpened(auth, {
      comandaId: comanda.id,
      mesaLabel: comanda.tableLabel,
      openedAt: comanda.openedAt.toISOString(),
      employeeId: comanda.currentEmployeeId,
      status: toRealtimeOpenStatus(comanda.status),
      subtotal: toNumberOrZero(comanda.subtotalAmount),
      discountAmount: toNumberOrZero(comanda.discountAmount),
      serviceFeeAmount: toNumberOrZero(comanda.serviceFeeAmount),
      totalAmount: toNumberOrZero(comanda.totalAmount),
      totalItems: comanda.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
      businessDate: formatBusinessDateKey(businessDate),
    })
  }

  private publishComandaUpdatedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof toComandaRecord>[0],
    businessDate: Date,
    options?: {
      requiresKitchenRefresh?: boolean
      replaceKitchenItems?: boolean
      kitchenItems?: Array<{
        itemId: string
        comandaId: string
        mesaLabel: string
        employeeId: string | null
        productName: string
        quantity: number
        notes: string | null
        kitchenStatus: 'QUEUED' | 'IN_PREPARATION' | 'READY' | 'DELIVERED'
        kitchenQueuedAt: string | null
        kitchenReadyAt: string | null
        businessDate: string
      }>
    },
  ) {
    this.operationsRealtimeService.publishComandaUpdated(auth, {
      comandaId: comanda.id,
      mesaLabel: comanda.tableLabel,
      status: toRealtimeStatus(comanda.status),
      employeeId: comanda.currentEmployeeId,
      subtotal: toNumberOrZero(comanda.subtotalAmount),
      discountAmount: toNumberOrZero(comanda.discountAmount),
      serviceFeeAmount: toNumberOrZero(comanda.serviceFeeAmount),
      totalAmount: toNumberOrZero(comanda.totalAmount),
      totalItems: comanda.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
      businessDate: formatBusinessDateKey(businessDate),
      ...(options?.requiresKitchenRefresh ? { requiresKitchenRefresh: true } : {}),
      ...(options?.replaceKitchenItems ? { replaceKitchenItems: true } : {}),
      ...(options?.kitchenItems ? { kitchenItems: options.kitchenItems } : {}),
    })
  }

  private publishKitchenItemQueuedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof toComandaRecord>[0],
    item: {
      id: string
      productName: string
      quantity: number
      notes: string | null
      kitchenStatus: KitchenItemStatus | null
      kitchenQueuedAt: Date | null
      kitchenReadyAt: Date | null
    },
    businessDate: Date,
  ) {
    const payload = this.buildKitchenItemRealtimeDelta(comanda, item, businessDate)
    this.operationsRealtimeService.publishKitchenItemQueued(auth, {
      ...payload,
      kitchenStatus: 'QUEUED',
      kitchenQueuedAt: payload.kitchenQueuedAt ?? new Date().toISOString(),
    })
  }

  private publishKitchenItemUpdatedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof toComandaRecord>[0],
    item: {
      id: string
      productName: string
      quantity: number
      notes: string | null
      kitchenStatus: KitchenItemStatus | null
      kitchenQueuedAt: Date | null
      kitchenReadyAt: Date | null
    },
    businessDate: Date,
  ) {
    const payload = this.buildKitchenItemRealtimeDelta(comanda, item, businessDate)
    this.operationsRealtimeService.publishKitchenItemUpdated(auth, {
      ...payload,
      kitchenStatus:
        item.kitchenStatus === 'DELIVERED' ? 'DELIVERED' : item.kitchenStatus === 'READY' ? 'READY' : 'IN_PREPARATION',
    })
  }

  private publishComandaCloseRealtime(
    auth: AuthContext,
    comanda: {
      id: string
      tableLabel: string
      currentEmployeeId: string | null
      subtotalAmount: { toNumber(): number } | number
      discountAmount: { toNumber(): number } | number
      serviceFeeAmount: { toNumber(): number } | number
      totalAmount: { toNumber(): number } | number
      closedAt: Date | null
      items: Array<{ quantity: number }>
    },
    refreshedSession: Parameters<typeof buildCashUpdatedPayload>[0] | null,
    closure: Parameters<typeof buildCashClosurePayload>[0],
    businessDate: Date,
  ) {
    this.operationsRealtimeService.publishComandaClosed(auth, {
      comandaId: comanda.id,
      mesaLabel: comanda.tableLabel,
      closedAt: comanda.closedAt?.toISOString() ?? new Date().toISOString(),
      employeeId: comanda.currentEmployeeId,
      status: 'CLOSED',
      subtotal: toNumberOrZero(comanda.subtotalAmount),
      discountAmount: toNumberOrZero(comanda.discountAmount),
      serviceFeeAmount: toNumberOrZero(comanda.serviceFeeAmount),
      totalAmount: toNumberOrZero(comanda.totalAmount),
      totalItems: comanda.items.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethod: null,
      businessDate: formatBusinessDateKey(businessDate),
    })

    if (refreshedSession) {
      this.operationsRealtimeService.publishCashUpdated(auth, {
        ...buildCashUpdatedPayload(refreshedSession),
        businessDate: formatBusinessDateKey(businessDate),
      })
    }

    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))
  }

  private calculateDraftItemsSubtotal(
    items: Array<{
      totalAmount: { toNumber(): number } | number
    }>,
  ) {
    return roundCurrency(items.reduce((sum, item) => sum + toNumberOrZero(item.totalAmount), 0))
  }

  private assertMonetaryAdjustmentsWithinSubtotal(
    subtotalAmount: number,
    discountAmount: number,
    serviceFeeAmount: number,
  ) {
    if (discountAmount > subtotalAmount) {
      throw new BadRequestException('O desconto não pode ser maior que o subtotal da comanda.')
    }

    if (serviceFeeAmount > subtotalAmount) {
      throw new BadRequestException('A taxa de serviço não pode ser maior que o subtotal da comanda.')
    }
  }

  private buildKitchenItemRealtimeDeltas(comanda: Parameters<typeof toComandaRecord>[0], businessDate: Date) {
    return (comanda.items ?? [])
      .filter(
        (
          item,
        ): item is NonNullable<Parameters<typeof toComandaRecord>[0]['items']>[number] & {
          kitchenStatus: KitchenItemStatus
        } => item.kitchenStatus != null,
      )
      .map((item) => this.buildKitchenItemRealtimeDelta(comanda, item, businessDate))
  }

  private buildKitchenItemRealtimeDelta(
    comanda: Parameters<typeof toComandaRecord>[0],
    item: {
      id: string
      productName: string
      quantity: number
      notes: string | null
      kitchenStatus: KitchenItemStatus | null
      kitchenQueuedAt: Date | string | null
      kitchenReadyAt: Date | string | null
    },
    businessDate: Date,
  ) {
    return {
      itemId: item.id,
      comandaId: comanda.id,
      mesaLabel: comanda.tableLabel,
      employeeId: comanda.currentEmployeeId,
      productName: item.productName,
      quantity: item.quantity,
      notes: item.notes ?? null,
      kitchenStatus:
        item.kitchenStatus === 'DELIVERED'
          ? 'DELIVERED'
          : item.kitchenStatus === 'READY'
            ? 'READY'
            : item.kitchenStatus === 'IN_PREPARATION'
              ? 'IN_PREPARATION'
              : 'QUEUED',
      kitchenQueuedAt:
        item.kitchenQueuedAt instanceof Date ? item.kitchenQueuedAt.toISOString() : (item.kitchenQueuedAt ?? null),
      kitchenReadyAt:
        item.kitchenReadyAt instanceof Date ? item.kitchenReadyAt.toISOString() : (item.kitchenReadyAt ?? null),
      businessDate: formatBusinessDateKey(businessDate),
    } as const
  }

  private async resolveMesaSelection(
    workspaceOwnerUserId: string,
    tableLabel: string,
    mesaId?: string | null,
    currentComandaId?: string,
  ) {
    if (mesaId) {
      const mesa = await this.prisma.mesa.findUnique({
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

      await this.helpers.assertOpenTableAvailability(this.prisma, workspaceOwnerUserId, mesa.label, currentComandaId)
      await this.assertMesaAvailability(mesa.id, currentComandaId)

      return {
        mesaId: mesa.id,
        tableLabel: mesa.label,
      }
    }

    const mesa = await this.prisma.mesa.findUnique({
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

    await this.helpers.assertOpenTableAvailability(
      this.prisma,
      workspaceOwnerUserId,
      resolvedTableLabel,
      currentComandaId,
    )

    if (resolvedMesaId) {
      await this.assertMesaAvailability(resolvedMesaId, currentComandaId)
    }

    return {
      mesaId: resolvedMesaId,
      tableLabel: resolvedTableLabel,
    }
  }

  private takeMatchingKitchenState(
    existingItems: Array<{
      productId: string | null
      productName: string
      quantity: number
      unitPrice: { toNumber(): number } | number
      notes: string | null
      kitchenStatus: KitchenItemStatus | null
      kitchenQueuedAt: Date | null
      kitchenReadyAt: Date | null
    }>,
    nextItem: {
      productId: string | null
      productName: string
      quantity: number
      unitPrice: number
      notes: string | null
    },
    needsKitchen: boolean,
    fallbackQueuedAt: Date,
  ) {
    if (!needsKitchen) {
      return {
        kitchenStatus: null,
        kitchenQueuedAt: null,
        kitchenReadyAt: null,
      }
    }

    const matchingItemIndex = existingItems.findIndex(
      (existingItem) =>
        existingItem.productId === nextItem.productId &&
        existingItem.productName === nextItem.productName &&
        existingItem.quantity === nextItem.quantity &&
        roundCurrency(toNumberOrZero(existingItem.unitPrice)) === roundCurrency(nextItem.unitPrice) &&
        (existingItem.notes ?? null) === (nextItem.notes ?? null),
    )

    if (matchingItemIndex === -1) {
      return {
        kitchenStatus: KitchenItemStatus.QUEUED,
        kitchenQueuedAt: fallbackQueuedAt,
        kitchenReadyAt: null,
      }
    }

    const [matchingItem] = existingItems.splice(matchingItemIndex, 1)

    return {
      kitchenStatus: matchingItem.kitchenStatus ?? KitchenItemStatus.QUEUED,
      kitchenQueuedAt: matchingItem.kitchenQueuedAt ?? fallbackQueuedAt,
      kitchenReadyAt: matchingItem.kitchenReadyAt,
    }
  }

  private async assertMesaAvailability(mesaId: string, currentComandaId?: string) {
    const occupiedComanda = await this.prisma.comanda.findFirst({
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
}
