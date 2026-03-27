import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  CashSessionStatus,
  ComandaStatus,
  KitchenItemStatus,
} from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CacheService } from '../../common/services/cache.service'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import { AddComandaItemDto } from './dto/add-comanda-item.dto'
import { AssignComandaDto } from './dto/assign-comanda.dto'
import { CloseComandaDto } from './dto/close-comanda.dto'
import { OpenComandaDto } from './dto/open-comanda.dto'
import { ReplaceComandaDto } from './dto/replace-comanda.dto'
import { UpdateComandaStatusDto } from './dto/update-comanda-status.dto'
import { UpdateKitchenItemStatusDto } from './dto/update-kitchen-item-status.dto'
import { OperationsHelpersService } from './operations-helpers.service'
import { toComandaRecord } from './operations.types'
import {
  buildCashClosurePayload,
  buildCashUpdatedPayload,
  buildComandaUpdatedPayload,
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

  async openComanda(auth: AuthContext, dto: OpenComandaDto, context: RequestContext) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
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
        const assignedEmployee = await this.helpers.requireOwnedEmployee(this.prisma, workspaceOwnerUserId, dto.employeeId)
        const employeeOpenSession = await this.prisma.cashSession.findFirst({
          where: {
            companyOwnerId: workspaceOwnerUserId,
            employeeId: assignedEmployee.id,
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
        businessDate = resolveBusinessDate()
      }
    }

    await this.helpers.assertOpenTableAvailability(this.prisma, workspaceOwnerUserId, tableLabel)
    await this.helpers.assertBusinessDayOpen(workspaceOwnerUserId, businessDate)

    // Resolve mesaId — if provided, validate ownership and availability
    const resolvedMesaId: string | null = dto.mesaId ?? null
    if (resolvedMesaId) {
      const mesa = await this.prisma.mesa.findUnique({ where: { id: resolvedMesaId } })
      if (!mesa || mesa.companyOwnerId !== workspaceOwnerUserId || !mesa.active) {
        throw new NotFoundException('Mesa não encontrada ou inativa.')
      }
      const ocupada = await this.prisma.comanda.findFirst({
        where: { mesaId: resolvedMesaId, status: { in: ['OPEN', 'IN_PREPARATION', 'READY'] } },
      })
      if (ocupada) throw new ConflictException('Essa mesa já possui uma comanda aberta.')
    }

    const helpers = this.helpers
    const { comanda, closure } = await this.prisma.$transaction(async (transaction) => {
      const createdComanda = await transaction.comanda.create({
        data: {
          companyOwnerId: workspaceOwnerUserId,
          cashSessionId,
          mesaId: resolvedMesaId,
          openedByUserId: auth.userId,
          currentEmployeeId,
          tableLabel,
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
        await transaction.comandaItem.createMany({
          data: draftItems.map((item) => ({
            comandaId: createdComanda.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
            notes: item.notes,
          })),
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

      if (recalculatedComanda.cashSessionId) {
        await helpers.recalculateCashSession(transaction, recalculatedComanda.cashSessionId)
      }

      const closureSnapshot = await helpers.syncCashClosure(transaction, workspaceOwnerUserId, businessDate)
      return {
        comanda: recalculatedComanda,
        closure: closureSnapshot,
      }
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.comanda.opened',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        tableLabel,
        currentEmployeeId,
        cashSessionId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.operationsRealtimeService.publishComandaOpened(auth, {
      comandaId: comanda.id,
      mesaLabel: comanda.tableLabel,
      openedAt: comanda.openedAt.toISOString(),
      employeeId: comanda.currentEmployeeId,
      subtotal: toNumber(comanda.subtotalAmount),
      totalItems: comanda.items.reduce((sum, item) => sum + item.quantity, 0),
    })
    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))

    return {
      comanda: toComandaRecord(comanda),
      snapshot: await this.helpers.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  async addComandaItem(auth: AuthContext, comandaId: string, dto: AddComandaItemDto, context: RequestContext) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
    const comanda = await this.helpers.requireAuthorizedComanda(this.prisma, workspaceOwnerUserId, auth, comandaId, actorEmployee)

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
      requiresKitchen = product.requiresKitchen
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
    const { item, refreshedComanda, businessDate, closure } = await this.prisma.$transaction(async (transaction) => {
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

      if (updatedComanda.cashSessionId) {
        await helpers.recalculateCashSession(transaction, updatedComanda.cashSessionId)
      }

      const closureSnapshot = await helpers.syncCashClosure(transaction, workspaceOwnerUserId, resolvedBusinessDate)

      return {
        item: createdItem,
        refreshedComanda: updatedComanda,
        businessDate: resolvedBusinessDate,
        closure: closureSnapshot,
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

    this.operationsRealtimeService.publishComandaUpdated(auth, buildComandaUpdatedPayload(refreshedComanda))
    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))

    if (requiresKitchen && kitchenQueuedAt) {
      this.operationsRealtimeService.publishKitchenItemQueued(auth, {
        itemId: item.id,
        comandaId: comanda.id,
        mesaLabel: comanda.tableLabel,
        productName,
        quantity: dto.quantity,
        notes: note ?? null,
        kitchenStatus: 'QUEUED',
        kitchenQueuedAt: kitchenQueuedAt.toISOString(),
      })
    }

    return {
      comanda: toComandaRecord(refreshedComanda),
      snapshot: await this.helpers.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  async replaceComanda(auth: AuthContext, comandaId: string, dto: ReplaceComandaDto, context: RequestContext) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
    const comanda = await this.helpers.requireAuthorizedComanda(this.prisma, workspaceOwnerUserId, auth, comandaId, actorEmployee)

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

    await this.helpers.assertOpenTableAvailability(this.prisma, workspaceOwnerUserId, tableLabel, comanda.id)

    const helpers = this.helpers
    const { refreshedComanda, refreshedSession, closure, businessDate } = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.comanda.update({
          where: { id: comanda.id },
          data: {
            tableLabel,
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
            data: draftItems.map((item) => ({
              comandaId: comanda.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              notes: item.notes,
            })),
          })
        }

        const updatedComanda = await helpers.recalculateComanda(transaction, comanda.id, {
          discountAmount,
          serviceFeeAmount,
        })
        const resolvedBusinessDate = await helpers.resolveComandaBusinessDate(transaction, updatedComanda)
        const updatedSession = updatedComanda.cashSessionId
          ? await helpers.recalculateCashSession(transaction, updatedComanda.cashSessionId)
          : null
        const closureSnapshot = await helpers.syncCashClosure(transaction, workspaceOwnerUserId, resolvedBusinessDate)

        return {
          refreshedComanda: updatedComanda,
          refreshedSession: updatedSession,
          closure: closureSnapshot,
          businessDate: resolvedBusinessDate,
        }
      },
    )

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.comanda.replaced',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        tableLabel,
        itemsCount: draftItems.length,
        discountAmount,
        serviceFeeAmount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.operationsRealtimeService.publishComandaUpdated(auth, buildComandaUpdatedPayload(refreshedComanda))
    if (refreshedSession) {
      this.operationsRealtimeService.publishCashUpdated(auth, buildCashUpdatedPayload(refreshedSession))
    }
    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))

    return {
      comanda: toComandaRecord(refreshedComanda),
      snapshot: await this.helpers.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  async assignComanda(auth: AuthContext, comandaId: string, dto: AssignComandaDto, context: RequestContext) {
    assertOwnerRole(auth, 'Somente o dono pode redistribuir mesas entre funcionarios.')
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const comanda = await this.helpers.requireOwnedComanda(this.prisma, workspaceOwnerUserId, comandaId)
    const employee = dto.employeeId
      ? await this.helpers.requireOwnedEmployee(this.prisma, workspaceOwnerUserId, dto.employeeId)
      : null
    const employeeOpenSession = employee
      ? await this.prisma.cashSession.findFirst({
          where: {
            companyOwnerId: workspaceOwnerUserId,
            employeeId: employee.id,
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

    this.operationsRealtimeService.publishComandaUpdated(auth, buildComandaUpdatedPayload(refreshedComanda))

    return {
      comanda: toComandaRecord(refreshedComanda),
      snapshot: await this.helpers.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  async updateComandaStatus(
    auth: AuthContext,
    comandaId: string,
    dto: UpdateComandaStatusDto,
    context: RequestContext,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
    const comanda = await this.helpers.requireAuthorizedComanda(this.prisma, workspaceOwnerUserId, auth, comandaId, actorEmployee)

    if (dto.status === ComandaStatus.CLOSED || dto.status === ComandaStatus.CANCELLED) {
      throw new BadRequestException('Use o endpoint especifico para fechar a comanda.')
    }

    const refreshedComanda = await this.prisma.comanda.update({
      where: { id: comanda.id },
      data: {
        status: dto.status,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
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

    this.operationsRealtimeService.publishComandaUpdated(auth, buildComandaUpdatedPayload(refreshedComanda))

    return {
      comanda: toComandaRecord(refreshedComanda),
      snapshot: await this.helpers.buildLiveSnapshot(
        workspaceOwnerUserId,
        await this.helpers.resolveComandaBusinessDate(this.prisma, refreshedComanda),
      ),
    }
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
      include: { comanda: { select: { id: true, companyOwnerId: true, tableLabel: true } } },
    })

    if (!item || item.comanda.companyOwnerId !== workspaceOwnerUserId) {
      throw new NotFoundException('Item de comanda nao encontrado.')
    }

    if (!item.kitchenStatus) {
      throw new BadRequestException('Este item nao esta na fila da cozinha.')
    }

    const kitchenReadyAt = dto.status === 'READY' ? new Date() : (item.kitchenReadyAt ?? undefined)

    const updatedItem = await this.prisma.comandaItem.update({
      where: { id: itemId },
      data: {
        kitchenStatus: dto.status as KitchenItemStatus,
        kitchenReadyAt: kitchenReadyAt ?? null,
      },
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.kitchen_item.status_updated',
      resource: 'comanda_item',
      resourceId: itemId,
      metadata: { status: dto.status, comandaId: item.comanda.id },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.operationsRealtimeService.publishKitchenItemUpdated(auth, {
      itemId: updatedItem.id,
      comandaId: item.comanda.id,
      mesaLabel: item.comanda.tableLabel,
      productName: updatedItem.productName,
      quantity: updatedItem.quantity,
      notes: updatedItem.notes ?? null,
      kitchenStatus: dto.status,
      kitchenQueuedAt: updatedItem.kitchenQueuedAt?.toISOString() ?? null,
      kitchenReadyAt: updatedItem.kitchenReadyAt?.toISOString() ?? null,
    })

    return { itemId, status: dto.status }
  }

  async closeComanda(auth: AuthContext, comandaId: string, dto: CloseComandaDto, context: RequestContext) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
    const comanda = await this.helpers.requireAuthorizedComanda(this.prisma, workspaceOwnerUserId, auth, comandaId, actorEmployee)

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

    this.operationsRealtimeService.publishComandaClosed(auth, {
      comandaId: refreshedComanda.id,
      mesaLabel: refreshedComanda.tableLabel,
      closedAt: refreshedComanda.closedAt?.toISOString() ?? new Date().toISOString(),
      employeeId: refreshedComanda.currentEmployeeId,
      totalAmount: toNumber(refreshedComanda.totalAmount),
      totalItems: refreshedComanda.items.reduce((sum, item) => sum + item.quantity, 0),
      paymentMethod: null,
    })

    if (refreshedSession) {
      this.operationsRealtimeService.publishCashUpdated(auth, buildCashUpdatedPayload(refreshedSession))
    }

    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))
    void this.cache.del(CacheService.ordersKey(workspaceOwnerUserId))
    void this.cache.del(this.cache.financeKey(workspaceOwnerUserId))

    return {
      comanda: toComandaRecord(refreshedComanda),
      snapshot: await this.helpers.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }
}
