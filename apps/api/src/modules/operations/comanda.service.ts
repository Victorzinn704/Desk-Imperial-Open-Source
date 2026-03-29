import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CashSessionStatus, ComandaStatus, KitchenItemStatus } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CacheService } from '../../common/services/cache.service'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import type { AuditLogService } from '../monitoring/audit-log.service'
import type { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import type { AddComandaItemDto } from './dto/add-comanda-item.dto'
import type { AssignComandaDto } from './dto/assign-comanda.dto'
import type { CloseComandaDto } from './dto/close-comanda.dto'
import type { OpenComandaDto } from './dto/open-comanda.dto'
import type { OperationsResponseOptionsDto } from './dto/operations-response-options.dto'
import type { ReplaceComandaDto } from './dto/replace-comanda.dto'
import type { UpdateComandaStatusDto } from './dto/update-comanda-status.dto'
import type { UpdateKitchenItemStatusDto } from './dto/update-kitchen-item-status.dto'
import type { OperationsHelpersService } from './operations-helpers.service'
import { toCashSessionRecord, toComandaItemRecord, toComandaRecord } from './operations.types'
import { isKitchenCategory } from '../../common/utils/is-kitchen-category.util'
import {
  buildOptionalOperationsSnapshot,
  buildCashClosurePayload,
  buildCashUpdatedPayload,
  buildComandaUpdatedPayload,
  formatBusinessDateKey,
  invalidateOperationsLiveCache,
  OPEN_COMANDA_STATUSES,
  isOpenComandaStatus,
  resolveBusinessDate,
  toNumber,
} from './operations-domain.utils'

@Injectable()
export class ComandaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly auditLogService: AuditLogService,
    private readonly operationsRealtimeService: OperationsRealtimeService,
    private readonly helpers: OperationsHelpersService,
  ) {}

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

    if (participantCount < 1) {
      throw new BadRequestException('A comanda precisa ter pelo menos uma pessoa.')
    }

    const operationalBusinessDate = resolveBusinessDate()
    let currentEmployeeId: string | null = null
    let cashSessionId: string | null = dto.cashSessionId ?? null
    let businessDate: Date

    if (auth.role === 'STAFF') {
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
        orderBy: {
          openedAt: 'desc',
        },
      })

      if (!openSession) {
        throw new ConflictException('Abra o caixa do funcionario antes de criar comandas.')
      }

      currentEmployeeId = actorEmployee.id
      cashSessionId = openSession.id
      businessDate = openSession.businessDate
    } else {
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
          orderBy: {
            openedAt: 'desc',
          },
        })

        if (!employeeOpenSession) {
          throw new ConflictException('O funcionario precisa abrir o proprio caixa antes de receber uma mesa.')
        }

        currentEmployeeId = assignedEmployee.id
        cashSessionId = cashSessionId ?? employeeOpenSession.id
      }

      if (cashSessionId) {
        const session = await this.helpers.requireOwnedCashSession(this.prisma, workspaceOwnerUserId, cashSessionId)
        businessDate = session.businessDate
      } else {
        businessDate = operationalBusinessDate
      }
    }

    const mesaSelection = await this.resolveMesaSelection(workspaceOwnerUserId, tableLabel, dto.mesaId)
    const resolvedMesaId = mesaSelection.mesaId
    const resolvedTableLabel = mesaSelection.tableLabel

    await this.helpers.assertBusinessDayOpen(workspaceOwnerUserId, businessDate)

    const helpers = this.helpers
    const { comanda } = await this.prisma.$transaction(async (transaction) => {
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

      return {
        comanda: recalculatedComanda,
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

    return this.buildComandaResponse(workspaceOwnerUserId, businessDate, comanda, options)
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
      unitPrice = roundCurrency(dto.unitPrice ?? toNumber(product.unitPrice))
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
    const { item, refreshedComanda, businessDate } = await this.prisma.$transaction(async (transaction) => {
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
    })

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
    const discountAmount = roundCurrency(dto.discountAmount ?? toNumber(comanda.discountAmount))
    const serviceFeeAmount = roundCurrency(dto.serviceFeeAmount ?? toNumber(comanda.serviceFeeAmount))

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
    this.publishComandaUpdatedRealtime(auth, refreshedComanda, businessDate)

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

    const item = await this.prisma.comandaItem.findUnique({
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

    // Update the individual item
    const updatedItem = await this.prisma.comandaItem.update({
      where: { id: itemId },
      data: {
        kitchenStatus: dto.status as KitchenItemStatus,
        kitchenReadyAt: kitchenReadyAt ?? null,
      },
    })

    // ── Propagate to comanda status ──────────────────────────────────────────
    const allItems = await this.prisma.comandaItem.findMany({
      where: { comandaId: item.comanda.id },
      select: { kitchenStatus: true },
    })

    const kitchenItems = allItems.filter((i) => i.kitchenStatus !== null)
    let refreshedComanda: Awaited<ReturnType<typeof this.helpers.recalculateComanda>> | undefined

    if (kitchenItems.length > 0 && isOpenComandaStatus(item.comanda.status)) {
      const allReady = kitchenItems.every(
        (i) => i.kitchenStatus === KitchenItemStatus.READY || i.kitchenStatus === KitchenItemStatus.DELIVERED,
      )
      const anyInPrep = kitchenItems.some((i) => i.kitchenStatus === KitchenItemStatus.IN_PREPARATION)

      let newComandaStatus: ComandaStatus | null = null
      if (allReady) {
        newComandaStatus = ComandaStatus.READY
      } else if (anyInPrep && item.comanda.status === ComandaStatus.OPEN) {
        newComandaStatus = ComandaStatus.IN_PREPARATION
      }

      if (newComandaStatus) {
        refreshedComanda = await this.prisma.comanda.update({
          where: { id: item.comanda.id },
          data: { status: newComandaStatus },
          include: { items: { orderBy: { createdAt: 'asc' } } },
        })
      }
    }

    // If status didn't change, still fetch the comanda for the realtime event
    if (!refreshedComanda) {
      refreshedComanda =
        (await this.prisma.comanda.findUnique({
          where: { id: item.comanda.id },
          include: { items: { orderBy: { createdAt: 'asc' } } },
        })) ?? undefined
    }
    // ─────────────────────────────────────────────────────────────────────────

    const businessDate = await this.helpers.resolveComandaBusinessDate(
      this.prisma,
      refreshedComanda ?? {
        cashSessionId: item.comanda.cashSessionId,
        openedAt: item.comanda.openedAt,
      },
    )

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.kitchen_item.status_updated',
      resource: 'comanda_item',
      resourceId: itemId,
      metadata: { status: dto.status, comandaId: item.comanda.id },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)

    // Emit kitchen item event (for Cozinha tab)
    if (refreshedComanda) {
      this.publishKitchenItemUpdatedRealtime(auth, refreshedComanda, updatedItem, businessDate)
    }

    // Emit comanda updated event (for Pedidos tab + web PDV drag-and-drop)
    if (refreshedComanda) {
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
    const discountAmount = roundCurrency(dto.discountAmount ?? toNumber(comanda.discountAmount))
    const serviceFeeAmount = roundCurrency(dto.serviceFeeAmount ?? toNumber(comanda.serviceFeeAmount))

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
        totalAmount: toNumber(refreshedComanda.totalAmount),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.invalidateLiveSnapshotCache(workspaceOwnerUserId, businessDate)
    this.publishComandaCloseRealtime(auth, refreshedComanda, refreshedSession, closure, businessDate)
    void this.cache.del(CacheService.ordersKey(workspaceOwnerUserId))
    void this.cache.del(CacheService.financeKey(workspaceOwnerUserId))

    return this.buildComandaResponse(workspaceOwnerUserId, businessDate, refreshedComanda, options)
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
      ...buildComandaUpdatedPayload(comanda),
      openedAt: comanda.openedAt.toISOString(),
      businessDate: formatBusinessDateKey(businessDate),
      comanda: toComandaRecord(comanda),
    })
  }

  private publishComandaUpdatedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof toComandaRecord>[0],
    businessDate: Date,
  ) {
    this.operationsRealtimeService.publishComandaUpdated(auth, {
      ...buildComandaUpdatedPayload(comanda),
      businessDate: formatBusinessDateKey(businessDate),
      comanda: toComandaRecord(comanda),
    })
  }

  private publishKitchenItemQueuedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof toComandaRecord>[0],
    item: Parameters<typeof toComandaItemRecord>[0],
    businessDate: Date,
  ) {
    this.operationsRealtimeService.publishKitchenItemQueued(auth, {
      itemId: item.id,
      comandaId: comanda.id,
      mesaLabel: comanda.tableLabel,
      productName: item.productName,
      quantity: item.quantity,
      notes: item.notes ?? null,
      kitchenStatus: 'QUEUED',
      kitchenQueuedAt: item.kitchenQueuedAt?.toISOString() ?? new Date().toISOString(),
      businessDate: formatBusinessDateKey(businessDate),
      item: toComandaItemRecord(item),
      comanda: toComandaRecord(comanda),
    })
  }

  private publishKitchenItemUpdatedRealtime(
    auth: AuthContext,
    comanda: Parameters<typeof toComandaRecord>[0],
    item: Parameters<typeof toComandaItemRecord>[0],
    businessDate: Date,
  ) {
    this.operationsRealtimeService.publishKitchenItemUpdated(auth, {
      itemId: item.id,
      comandaId: comanda.id,
      mesaLabel: comanda.tableLabel,
      productName: item.productName,
      quantity: item.quantity,
      notes: item.notes ?? null,
      kitchenStatus: item.kitchenStatus === 'DELIVERED' ? 'DELIVERED' : (item.kitchenStatus ?? 'QUEUED'),
      kitchenQueuedAt: item.kitchenQueuedAt?.toISOString() ?? null,
      kitchenReadyAt: item.kitchenReadyAt?.toISOString() ?? null,
      businessDate: formatBusinessDateKey(businessDate),
      item: toComandaItemRecord(item),
      comanda: toComandaRecord(comanda),
    })
  }

  private publishComandaCloseRealtime(
    auth: AuthContext,
    comanda: {
      id: string
      tableLabel: string
      currentEmployeeId: string | null
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
      totalAmount: toNumber(comanda.totalAmount),
      totalItems: comanda.items.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethod: null,
      businessDate: formatBusinessDateKey(businessDate),
      comanda: toComandaRecord(comanda),
    })

    if (refreshedSession) {
      this.operationsRealtimeService.publishCashUpdated(auth, {
        ...buildCashUpdatedPayload(refreshedSession),
        businessDate: formatBusinessDateKey(businessDate),
        cashSession: toCashSessionRecord(refreshedSession),
      })
    }

    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))
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
        roundCurrency(toNumber(existingItem.unitPrice)) === roundCurrency(nextItem.unitPrice) &&
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
