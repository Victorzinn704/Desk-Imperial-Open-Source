import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  AuditSeverity,
  CashClosureStatus,
  CashMovementType,
  CashSessionStatus,
  ComandaStatus,
  Prisma,
  type CashClosure,
  type Employee,
} from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import { AssignComandaDto } from './dto/assign-comanda.dto'
import { AddComandaItemDto } from './dto/add-comanda-item.dto'
import { CloseCashClosureDto } from './dto/close-cash-closure.dto'
import { CloseCashSessionDto } from './dto/close-cash-session.dto'
import { CloseComandaDto } from './dto/close-comanda.dto'
import { CreateCashMovementDto } from './dto/create-cash-movement.dto'
import { GetOperationsLiveQueryDto } from './dto/get-operations-live.query'
import { OpenCashSessionDto } from './dto/open-cash-session.dto'
import { OpenComandaDto } from './dto/open-comanda.dto'
import { UpdateComandaStatusDto } from './dto/update-comanda-status.dto'
import {
  buildEmployeeOperationsRecord,
  toCashMovementRecord,
  toCashSessionRecord,
  toClosureRecord,
  toComandaRecord,
  type OperationsLiveResponse,
} from './operations.types'

const OPEN_COMANDA_STATUSES: ComandaStatus[] = [
  ComandaStatus.OPEN,
  ComandaStatus.IN_PREPARATION,
  ComandaStatus.READY,
]

type TransactionClient = Prisma.TransactionClient

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly operationsRealtimeService: OperationsRealtimeService,
  ) {}

  async getLiveSnapshot(auth: AuthContext, query: GetOperationsLiveQueryDto): Promise<OperationsLiveResponse> {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const businessDate = resolveBusinessDate(query.businessDate)
    const scopedEmployeeId =
      auth.role === 'STAFF'
        ? (await this.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth))?.id ?? null
        : null

    return this.buildLiveSnapshot(workspaceOwnerUserId, businessDate, scopedEmployeeId)
  }

  async openCashSession(auth: AuthContext, dto: OpenCashSessionDto, context: RequestContext) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const businessDate = resolveBusinessDate(dto.businessDate)
    const openingCashAmount = roundCurrency(dto.openingCashAmount)
    const notes = sanitizePlainText(dto.notes, 'Observacoes da abertura', {
      allowEmpty: true,
      rejectFormula: false,
    })

    await this.assertBusinessDayOpen(workspaceOwnerUserId, businessDate)

    const employee = await this.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
    const employeeId = auth.role === 'STAFF' ? employee?.id ?? null : null

    if (auth.role === 'STAFF' && !employeeId) {
      throw new ForbiddenException('Seu acesso precisa estar vinculado a um funcionario ativo para abrir caixa.')
    }

    const existingSession = await this.prisma.cashSession.findFirst({
      where: {
        companyOwnerId: workspaceOwnerUserId,
        employeeId,
        businessDate,
        status: CashSessionStatus.OPEN,
      },
    })

    if (existingSession) {
      throw new ConflictException('Ja existe um caixa aberto para este usuario nesta data operacional.')
    }

    const { session, closure } = await this.prisma.$transaction(async (transaction) => {
      const createdSession = await transaction.cashSession.create({
        data: {
          companyOwnerId: workspaceOwnerUserId,
          employeeId,
          openedByUserId: auth.userId,
          businessDate,
          status: CashSessionStatus.OPEN,
          openingCashAmount,
          expectedCashAmount: openingCashAmount,
          notes,
        },
      })

      await transaction.cashMovement.create({
        data: {
          cashSessionId: createdSession.id,
          companyOwnerId: workspaceOwnerUserId,
          employeeId,
          createdByUserId: auth.userId,
          type: CashMovementType.OPENING_FLOAT,
          amount: openingCashAmount,
          note: notes ?? 'Abertura do caixa operacional',
        },
      })

      const refreshedSession = await this.recalculateCashSession(transaction, createdSession.id)
      const closureSnapshot = await this.syncCashClosure(transaction, workspaceOwnerUserId, businessDate)

      return {
        session: refreshedSession,
        closure: closureSnapshot,
      }
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.cash_session.opened',
      resource: 'cash_session',
      resourceId: session.id,
      metadata: {
        businessDate: formatBusinessDateKey(businessDate),
        employeeId,
        openingCashAmount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.operationsRealtimeService.publishCashOpened(auth, {
      cashSessionId: session.id,
      openedAt: session.openedAt.toISOString(),
      openingAmount: toNumber(session.openingCashAmount),
      currency: auth.preferredCurrency,
      employeeId: session.employeeId,
    })
    this.operationsRealtimeService.publishCashUpdated(auth, buildCashUpdatedPayload(session))
    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))

    return {
      cashSession: toCashSessionRecord(session),
      snapshot: await this.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  async createCashMovement(
    auth: AuthContext,
    cashSessionId: string,
    dto: CreateCashMovementDto,
    context: RequestContext,
  ) {
    if (dto.type === CashMovementType.OPENING_FLOAT) {
      throw new BadRequestException('O tipo OPENING_FLOAT e reservado para a abertura do caixa.')
    }

    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
    const session = await this.requireAuthorizedCashSession(this.prisma, workspaceOwnerUserId, auth, cashSessionId)

    if (session.status !== CashSessionStatus.OPEN) {
      throw new ConflictException('Somente caixas abertos aceitam movimentacoes.')
    }

    const note = sanitizePlainText(dto.note, 'Observacao da movimentacao', {
      allowEmpty: true,
      rejectFormula: false,
    })

    const { movement, refreshedSession, closure } = await this.prisma.$transaction(async (transaction) => {
      const createdMovement = await transaction.cashMovement.create({
        data: {
          cashSessionId: session.id,
          companyOwnerId: workspaceOwnerUserId,
          employeeId: session.employeeId ?? actorEmployee?.id ?? null,
          createdByUserId: auth.userId,
          type: dto.type,
          amount: roundCurrency(dto.amount),
          note,
        },
      })

      const updatedSession = await this.recalculateCashSession(transaction, session.id)
      const closureSnapshot = await this.syncCashClosure(transaction, workspaceOwnerUserId, session.businessDate)

      return {
        movement: createdMovement,
        refreshedSession: updatedSession,
        closure: closureSnapshot,
      }
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.cash_movement.created',
      resource: 'cash_session',
      resourceId: session.id,
      metadata: {
        movementId: movement.id,
        type: movement.type,
        amount: dto.amount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.operationsRealtimeService.publishCashUpdated(auth, buildCashUpdatedPayload(refreshedSession))
    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))

    return {
      movement: toCashMovementRecord(movement),
      cashSession: toCashSessionRecord(refreshedSession),
      snapshot: await this.buildLiveSnapshot(workspaceOwnerUserId, session.businessDate),
    }
  }

  async closeCashSession(
    auth: AuthContext,
    cashSessionId: string,
    dto: CloseCashSessionDto,
    context: RequestContext,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const session = await this.requireAuthorizedCashSession(this.prisma, workspaceOwnerUserId, auth, cashSessionId)

    if (session.status !== CashSessionStatus.OPEN) {
      throw new ConflictException('Este caixa ja foi encerrado.')
    }

    const openComandas = await this.prisma.comanda.count({
      where: {
        cashSessionId: session.id,
        status: {
          in: OPEN_COMANDA_STATUSES,
        },
      },
    })

    if (openComandas > 0) {
      throw new ConflictException('Feche ou reatribua todas as comandas antes de encerrar o caixa.')
    }

    const countedCashAmount = roundCurrency(dto.countedCashAmount)
    const notes = sanitizePlainText(dto.notes, 'Observacoes do fechamento', {
      allowEmpty: true,
      rejectFormula: false,
    })

    const { refreshedSession, closure } = await this.prisma.$transaction(async (transaction) => {
      const recalculatedSession = await this.recalculateCashSession(transaction, session.id)
      const differenceAmount = roundCurrency(countedCashAmount - toNumber(recalculatedSession.expectedCashAmount))

      const closedSession = await transaction.cashSession.update({
        where: { id: session.id },
        data: {
          countedCashAmount,
          differenceAmount,
          status: CashSessionStatus.CLOSED,
          closedByUserId: auth.userId,
          closedAt: new Date(),
          notes: notes ?? recalculatedSession.notes,
        },
        include: {
          movements: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      })

      const closureSnapshot = await this.syncCashClosure(transaction, workspaceOwnerUserId, session.businessDate)
      return {
        refreshedSession: closedSession,
        closure: closureSnapshot,
      }
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.cash_session.closed',
      resource: 'cash_session',
      resourceId: session.id,
      metadata: {
        countedCashAmount,
        differenceAmount: toCashSessionRecord(refreshedSession).differenceAmount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.operationsRealtimeService.publishCashUpdated(auth, buildCashUpdatedPayload(refreshedSession))
    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))

    return {
      cashSession: toCashSessionRecord(refreshedSession),
      snapshot: await this.buildLiveSnapshot(workspaceOwnerUserId, session.businessDate),
    }
  }

  async openComanda(auth: AuthContext, dto: OpenComandaDto, context: RequestContext) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
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
        const assignedEmployee = await this.requireOwnedEmployee(this.prisma, workspaceOwnerUserId, dto.employeeId)
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
        const session = await this.requireOwnedCashSession(this.prisma, workspaceOwnerUserId, cashSessionId)
        businessDate = session.businessDate
      } else {
        businessDate = resolveBusinessDate()
      }
    }

    await this.assertBusinessDayOpen(workspaceOwnerUserId, businessDate)

    const { comanda } = await this.prisma.$transaction(async (transaction) => {
      const createdComanda = await transaction.comanda.create({
        data: {
          companyOwnerId: workspaceOwnerUserId,
          cashSessionId,
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

      await this.syncCashClosure(transaction, workspaceOwnerUserId, businessDate)
      return {
        comanda: createdComanda,
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

    return {
      comanda: toComandaRecord(comanda),
      snapshot: await this.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  async addComandaItem(auth: AuthContext, comandaId: string, dto: AddComandaItemDto, context: RequestContext) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
    const comanda = await this.requireAuthorizedComanda(this.prisma, workspaceOwnerUserId, auth, comandaId, actorEmployee)

    if (!isOpenComandaStatus(comanda.status)) {
      throw new ConflictException('Nao e possivel adicionar itens em uma comanda encerrada ou cancelada.')
    }

    let productId: string | null = null
    let productName: string
    let unitPrice: number

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
        },
      })

      const updatedComanda = await this.recalculateComanda(transaction, comanda.id)
      const resolvedBusinessDate = await this.resolveComandaBusinessDate(transaction, updatedComanda)

      if (updatedComanda.cashSessionId) {
        await this.recalculateCashSession(transaction, updatedComanda.cashSessionId)
      }

      const closureSnapshot = await this.syncCashClosure(transaction, workspaceOwnerUserId, resolvedBusinessDate)

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

    return {
      comanda: toComandaRecord(refreshedComanda),
      snapshot: await this.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  async assignComanda(auth: AuthContext, comandaId: string, dto: AssignComandaDto, context: RequestContext) {
    assertOwnerRole(auth, 'Somente o dono pode redistribuir mesas entre funcionarios.')
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const comanda = await this.requireOwnedComanda(this.prisma, workspaceOwnerUserId, comandaId)
    const employee = await this.requireOwnedEmployee(this.prisma, workspaceOwnerUserId, dto.employeeId)
    const employeeOpenSession = await this.prisma.cashSession.findFirst({
      where: {
        companyOwnerId: workspaceOwnerUserId,
        employeeId: employee.id,
        status: CashSessionStatus.OPEN,
      },
      orderBy: {
        openedAt: 'desc',
      },
    })

    if (!employeeOpenSession) {
      throw new ConflictException('O funcionario precisa abrir o proprio caixa antes de assumir uma mesa.')
    }

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

      await transaction.comandaAssignment.create({
        data: {
          companyOwnerId: workspaceOwnerUserId,
          comandaId: comanda.id,
          employeeId: employee.id,
          assignedByUserId: auth.userId,
        },
      })

      const updatedComanda = await transaction.comanda.update({
        where: { id: comanda.id },
        data: {
          currentEmployeeId: employee.id,
          cashSessionId: employeeOpenSession.id,
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
        businessDate: await this.resolveComandaBusinessDate(transaction, updatedComanda),
      }
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.comanda.assigned',
      resource: 'comanda',
      resourceId: comanda.id,
      metadata: {
        employeeId: employee.id,
        cashSessionId: employeeOpenSession.id,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.operationsRealtimeService.publishComandaUpdated(auth, buildComandaUpdatedPayload(refreshedComanda))

    return {
      comanda: toComandaRecord(refreshedComanda),
      snapshot: await this.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  async updateComandaStatus(
    auth: AuthContext,
    comandaId: string,
    dto: UpdateComandaStatusDto,
    context: RequestContext,
  ) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
    const comanda = await this.requireAuthorizedComanda(this.prisma, workspaceOwnerUserId, auth, comandaId, actorEmployee)

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
      snapshot: await this.buildLiveSnapshot(
        workspaceOwnerUserId,
        await this.resolveComandaBusinessDate(this.prisma, refreshedComanda),
      ),
    }
  }

  async closeComanda(auth: AuthContext, comandaId: string, dto: CloseComandaDto, context: RequestContext) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const actorEmployee = await this.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth)
    const comanda = await this.requireAuthorizedComanda(this.prisma, workspaceOwnerUserId, auth, comandaId, actorEmployee)

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

    const { refreshedComanda, refreshedSession, closure, businessDate } = await this.prisma.$transaction(
      async (transaction) => {
        const recalculatedComanda = await this.recalculateComanda(transaction, comanda.id, {
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

        const resolvedBusinessDate = await this.resolveComandaBusinessDate(transaction, closedComanda)
        const updatedSession = closedComanda.cashSessionId
          ? await this.recalculateCashSession(transaction, closedComanda.cashSessionId)
          : null
        const closureSnapshot = await this.syncCashClosure(transaction, workspaceOwnerUserId, resolvedBusinessDate)

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

    return {
      comanda: toComandaRecord(refreshedComanda),
      snapshot: await this.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  async closeCashClosure(auth: AuthContext, dto: CloseCashClosureDto, context: RequestContext) {
    assertOwnerRole(auth, 'Somente o dono pode fechar o caixa consolidado da empresa.')
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const businessDate = resolveBusinessDate(dto.businessDate)
    const countedCashAmount = roundCurrency(dto.countedCashAmount)
    const notes = sanitizePlainText(dto.notes, 'Observacoes do fechamento consolidado', {
      allowEmpty: true,
      rejectFormula: false,
    })
    const forceClose = dto.forceClose ?? false

    const { closure } = await this.prisma.$transaction(async (transaction) => {
      const syncedClosure = await this.syncCashClosure(transaction, workspaceOwnerUserId, businessDate)

      if (!forceClose && (syncedClosure.openSessionsCount > 0 || syncedClosure.openComandasCount > 0)) {
        await transaction.cashClosure.update({
          where: {
            companyOwnerId_businessDate: {
              companyOwnerId: workspaceOwnerUserId,
              businessDate,
            },
          },
          data: {
            status: CashClosureStatus.PENDING_EMPLOYEE_CLOSE,
          },
        })

        throw new ConflictException(
          'Ainda existem caixas ou comandas em aberto. Feche as operacoes dos funcionarios antes de consolidar o dia.',
        )
      }

      const differenceAmount = roundCurrency(countedCashAmount - toNumber(syncedClosure.expectedCashAmount))

      return {
        closure: await transaction.cashClosure.update({
          where: {
            companyOwnerId_businessDate: {
              companyOwnerId: workspaceOwnerUserId,
              businessDate,
            },
          },
          data: {
            countedCashAmount,
            differenceAmount,
            notes,
            status: forceClose ? CashClosureStatus.FORCE_CLOSED : CashClosureStatus.CLOSED,
            closedByUserId: auth.userId,
            closedAt: new Date(),
          },
        }),
      }
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: forceClose ? 'operations.cash_closure.force_closed' : 'operations.cash_closure.closed',
      resource: 'cash_closure',
      resourceId: closure.id,
      severity: forceClose ? AuditSeverity.WARN : AuditSeverity.INFO,
      metadata: {
        businessDate: formatBusinessDateKey(businessDate),
        countedCashAmount,
        differenceAmount: toClosureRecord(closure)?.differenceAmount,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.operationsRealtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))

    return {
      closure: toClosureRecord(closure),
      snapshot: await this.buildLiveSnapshot(workspaceOwnerUserId, businessDate),
    }
  }

  private async buildLiveSnapshot(
    workspaceOwnerUserId: string,
    businessDate: Date,
    scopedEmployeeId?: string | null,
  ): Promise<OperationsLiveResponse> {
    const window = buildBusinessDateWindow(businessDate)
    const [employees, sessions, comandas, closure] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          userId: workspaceOwnerUserId,
          ...(scopedEmployeeId ? { id: scopedEmployeeId } : {}),
        },
        orderBy: [{ active: 'desc' }, { employeeCode: 'asc' }],
      }),
      this.prisma.cashSession.findMany({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
          ...(scopedEmployeeId ? { employeeId: scopedEmployeeId } : {}),
        },
        include: {
          movements: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          openedAt: 'desc',
        },
      }),
      this.prisma.comanda.findMany({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          openedAt: {
            gte: window.start,
            lt: window.end,
          },
          ...(scopedEmployeeId
            ? {
                OR: [{ currentEmployeeId: scopedEmployeeId }, { currentEmployeeId: null }],
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
        orderBy: {
          openedAt: 'asc',
        },
      }),
      this.prisma.cashClosure.findUnique({
        where: {
          companyOwnerId_businessDate: {
            companyOwnerId: workspaceOwnerUserId,
            businessDate,
          },
        },
      }),
    ])

    const sessionsByEmployee = new Map<string | null, (typeof sessions)[number]>()
    for (const session of sessions) {
      const key = session.employeeId ?? null
      if (!sessionsByEmployee.has(key)) {
        sessionsByEmployee.set(key, session)
      }
    }

    const comandasByEmployee = new Map<string | null, typeof comandas>()
    for (const comanda of comandas) {
      const key = comanda.currentEmployeeId ?? null
      const bucket = comandasByEmployee.get(key) ?? []
      bucket.push(comanda)
      comandasByEmployee.set(key, bucket)
    }

    return {
      businessDate: formatBusinessDateKey(businessDate),
      companyOwnerId: workspaceOwnerUserId,
      closure: toClosureRecord(closure),
      employees: employees.map((employee) =>
        buildEmployeeOperationsRecord({
          employee,
          cashSession: sessionsByEmployee.get(employee.id) ?? null,
          comandas: comandasByEmployee.get(employee.id) ?? [],
        }),
      ),
      unassigned: buildEmployeeOperationsRecord({
        employee: null,
        cashSession: sessionsByEmployee.get(null) ?? null,
        comandas: comandasByEmployee.get(null) ?? [],
      }),
    }
  }

  private async recalculateCashSession(transaction: TransactionClient, cashSessionId: string) {
    const session = await transaction.cashSession.findUnique({
      where: { id: cashSessionId },
      include: {
        movements: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        comandas: {
          where: {
            status: ComandaStatus.CLOSED,
          },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Caixa nao encontrado.')
    }

    const supplyAmount = session.movements
      .filter((movement) => movement.type === CashMovementType.SUPPLY)
      .reduce((sum, movement) => sum + toNumber(movement.amount), 0)
    const withdrawalAmount = session.movements
      .filter((movement) => movement.type === CashMovementType.WITHDRAWAL)
      .reduce((sum, movement) => sum + toNumber(movement.amount), 0)
    const adjustmentAmount = session.movements
      .filter((movement) => movement.type === CashMovementType.ADJUSTMENT)
      .reduce((sum, movement) => sum + toNumber(movement.amount), 0)
    const grossRevenueAmount = roundCurrency(
      session.comandas.reduce((sum, comanda) => sum + toNumber(comanda.totalAmount), 0),
    )
    const expectedCashAmount = roundCurrency(
      toNumber(session.openingCashAmount) + supplyAmount + adjustmentAmount - withdrawalAmount + grossRevenueAmount,
    )

    return transaction.cashSession.update({
      where: { id: session.id },
      data: {
        expectedCashAmount,
        grossRevenueAmount,
        realizedProfitAmount: 0,
      },
      include: {
        movements: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })
  }

  private async recalculateComanda(
    transaction: TransactionClient,
    comandaId: string,
    overrides?: {
      discountAmount?: number
      serviceFeeAmount?: number
    },
  ) {
    const comanda = await transaction.comanda.findUnique({
      where: { id: comandaId },
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

    const subtotalAmount = roundCurrency(
      comanda.items.reduce((sum, item) => sum + toNumber(item.totalAmount), 0),
    )
    const discountAmount = roundCurrency(overrides?.discountAmount ?? toNumber(comanda.discountAmount))
    const serviceFeeAmount = roundCurrency(overrides?.serviceFeeAmount ?? toNumber(comanda.serviceFeeAmount))
    const totalAmount = roundCurrency(Math.max(0, subtotalAmount - discountAmount + serviceFeeAmount))

    return transaction.comanda.update({
      where: { id: comanda.id },
      data: {
        subtotalAmount,
        discountAmount,
        serviceFeeAmount,
        totalAmount,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })
  }

  private async syncCashClosure(
    transaction: TransactionClient,
    workspaceOwnerUserId: string,
    businessDate: Date,
  ) {
    const window = buildBusinessDateWindow(businessDate)
    const [sessions, openComandasCount, existingClosure] = await Promise.all([
      transaction.cashSession.findMany({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
        },
      }),
      transaction.comanda.count({
        where: {
          companyOwnerId: workspaceOwnerUserId,
          status: {
            in: OPEN_COMANDA_STATUSES,
          },
          openedAt: {
            gte: window.start,
            lt: window.end,
          },
        },
      }),
      transaction.cashClosure.findUnique({
        where: {
          companyOwnerId_businessDate: {
            companyOwnerId: workspaceOwnerUserId,
            businessDate,
          },
        },
      }),
    ])

    const openSessionsCount = sessions.filter((session) => session.status === CashSessionStatus.OPEN).length
    const expectedCashAmount = roundCurrency(
      sessions.reduce((sum, session) => sum + toNumber(session.expectedCashAmount), 0),
    )
    const grossRevenueAmount = roundCurrency(
      sessions.reduce((sum, session) => sum + toNumber(session.grossRevenueAmount), 0),
    )
    const realizedProfitAmount = roundCurrency(
      sessions.reduce((sum, session) => sum + toNumber(session.realizedProfitAmount), 0),
    )

    const status =
      existingClosure?.status === CashClosureStatus.CLOSED ||
      existingClosure?.status === CashClosureStatus.FORCE_CLOSED
        ? existingClosure.status
        : openSessionsCount > 0 || openComandasCount > 0
          ? CashClosureStatus.PENDING_EMPLOYEE_CLOSE
          : CashClosureStatus.OPEN

    return transaction.cashClosure.upsert({
      where: {
        companyOwnerId_businessDate: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
        },
      },
      create: {
        companyOwnerId: workspaceOwnerUserId,
        businessDate,
        status,
        expectedCashAmount,
        grossRevenueAmount,
        realizedProfitAmount,
        openSessionsCount,
        openComandasCount,
      },
      update: {
        status,
        expectedCashAmount,
        grossRevenueAmount,
        realizedProfitAmount,
        openSessionsCount,
        openComandasCount,
      },
    })
  }

  private async requireAuthorizedCashSession(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    auth: AuthContext,
    cashSessionId: string,
  ) {
    const session = await this.requireOwnedCashSession(transaction, workspaceOwnerUserId, cashSessionId, {
      includeMovements: true,
    })

    if (auth.role === 'OWNER') {
      return session
    }

    const employee = await this.resolveEmployeeForStaff(transaction, workspaceOwnerUserId, auth)

    if (!employee || session.employeeId !== employee.id) {
      throw new ForbiddenException('Seu acesso nao pode operar o caixa de outro funcionario.')
    }

    return session
  }

  private async requireOwnedCashSession(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    cashSessionId: string,
    options?: {
      includeMovements?: boolean
    },
  ) {
    const session = await transaction.cashSession.findFirst({
      where: {
        id: cashSessionId,
        companyOwnerId: workspaceOwnerUserId,
      },
      include: options?.includeMovements
        ? {
            movements: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          }
        : undefined,
    })

    if (!session) {
      throw new NotFoundException('Caixa nao encontrado para esta empresa.')
    }

    return session
  }

  private async requireAuthorizedComanda(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    auth: AuthContext,
    comandaId: string,
    actorEmployee?: Employee | null,
  ) {
    const comanda = await this.requireOwnedComanda(transaction, workspaceOwnerUserId, comandaId)

    if (auth.role === 'OWNER') {
      return comanda
    }

    const employee = actorEmployee ?? (await this.resolveEmployeeForStaff(transaction, workspaceOwnerUserId, auth))

    if (!employee || comanda.currentEmployeeId !== employee.id) {
      throw new ForbiddenException('Seu acesso so pode operar mesas vinculadas ao seu atendimento.')
    }

    return comanda
  }

  private async requireOwnedComanda(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    comandaId: string,
  ) {
    const comanda = await transaction.comanda.findFirst({
      where: {
        id: comandaId,
        companyOwnerId: workspaceOwnerUserId,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!comanda) {
      throw new NotFoundException('Comanda nao encontrada para esta empresa.')
    }

    return comanda
  }

  private async requireOwnedEmployee(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    employeeId: string,
  ) {
    const employee = await transaction.employee.findFirst({
      where: {
        id: employeeId,
        userId: workspaceOwnerUserId,
        active: true,
      },
    })

    if (!employee) {
      throw new NotFoundException('Funcionario nao encontrado para esta empresa.')
    }

    return employee
  }

  private async resolveEmployeeForStaff(
    transaction: PrismaService | TransactionClient,
    workspaceOwnerUserId: string,
    auth: AuthContext,
  ) {
    if (auth.role !== 'STAFF') {
      return null
    }

    return transaction.employee.findFirst({
      where: {
        userId: workspaceOwnerUserId,
        loginUserId: auth.userId,
        active: true,
      },
    })
  }

  private async resolveComandaBusinessDate(
    transaction: PrismaService | TransactionClient,
    comanda: {
      cashSessionId: string | null
      openedAt: Date
    },
  ) {
    if (comanda.cashSessionId) {
      const session = await transaction.cashSession.findUnique({
        where: {
          id: comanda.cashSessionId,
        },
        select: {
          businessDate: true,
        },
      })

      if (session) {
        return session.businessDate
      }
    }

    return new Date(comanda.openedAt.getFullYear(), comanda.openedAt.getMonth(), comanda.openedAt.getDate())
  }

  private async assertBusinessDayOpen(workspaceOwnerUserId: string, businessDate: Date) {
    const closure = await this.prisma.cashClosure.findUnique({
      where: {
        companyOwnerId_businessDate: {
          companyOwnerId: workspaceOwnerUserId,
          businessDate,
        },
      },
    })

    if (
      closure?.status === CashClosureStatus.CLOSED ||
      closure?.status === CashClosureStatus.FORCE_CLOSED
    ) {
      throw new ConflictException('A operacao deste dia ja foi consolidada e nao aceita novas aberturas.')
    }
  }
}

function resolveBusinessDate(value?: string) {
  const source = value ? new Date(`${value}T00:00:00`) : new Date()

  if (Number.isNaN(source.getTime())) {
    throw new BadRequestException('Informe uma data operacional valida no formato YYYY-MM-DD.')
  }

  return new Date(source.getFullYear(), source.getMonth(), source.getDate())
}

function buildBusinessDateWindow(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

function formatBusinessDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return 0
  }

  return typeof value === 'number' ? value : value.toNumber()
}

function isOpenComandaStatus(status: ComandaStatus) {
  return (
    status === ComandaStatus.OPEN ||
    status === ComandaStatus.IN_PREPARATION ||
    status === ComandaStatus.READY
  )
}

function buildCashUpdatedPayload(session: {
  id: string
  status: CashSessionStatus
  openingCashAmount: { toNumber(): number } | number
  countedCashAmount: { toNumber(): number } | number | null
  expectedCashAmount: { toNumber(): number } | number
  differenceAmount: { toNumber(): number } | number | null
  movements: Array<{
    type: CashMovementType
    amount: { toNumber(): number } | number
  }>
}) {
  const inflowAmount = roundCurrency(
    session.movements
      .filter((movement) => movement.type === CashMovementType.SUPPLY || movement.type === CashMovementType.ADJUSTMENT)
      .reduce((sum, movement) => sum + toNumber(movement.amount), 0),
  )
  const outflowAmount = roundCurrency(
    session.movements
      .filter((movement) => movement.type === CashMovementType.WITHDRAWAL)
      .reduce((sum, movement) => sum + toNumber(movement.amount), 0),
  )

  return {
    cashSessionId: session.id,
    status: session.status === CashSessionStatus.OPEN ? 'OPEN' : 'CLOSED',
    openingAmount: toNumber(session.openingCashAmount),
    inflowAmount,
    outflowAmount,
    expectedAmount: toNumber(session.expectedCashAmount),
    countedAmount: session.countedCashAmount == null ? null : toNumber(session.countedCashAmount),
    differenceAmount: session.differenceAmount == null ? null : toNumber(session.differenceAmount),
    movementCount: session.movements.length,
  } as const
}

function buildComandaUpdatedPayload(comanda: {
  id: string
  tableLabel: string
  status: ComandaStatus
  currentEmployeeId: string | null
  subtotalAmount: { toNumber(): number } | number
  discountAmount: { toNumber(): number } | number
  totalAmount: { toNumber(): number } | number
  items: Array<{ quantity: number }>
}) {
  return {
    comandaId: comanda.id,
    mesaLabel: comanda.tableLabel,
    status:
      comanda.status === ComandaStatus.OPEN
        ? 'ABERTA'
        : comanda.status === ComandaStatus.IN_PREPARATION
          ? 'EM_PREPARO'
          : comanda.status === ComandaStatus.READY
            ? 'PRONTA'
            : 'FECHADA',
    employeeId: comanda.currentEmployeeId,
    subtotal: toNumber(comanda.subtotalAmount),
    discountAmount: toNumber(comanda.discountAmount),
    totalAmount: toNumber(comanda.totalAmount),
    totalItems: comanda.items.reduce((sum, item) => sum + item.quantity, 0),
  } as const
}

function buildCashClosurePayload(closure: CashClosure) {
  return {
    closureId: closure.id,
    status:
      closure.status === CashClosureStatus.CLOSED || closure.status === CashClosureStatus.FORCE_CLOSED
        ? 'CLOSED'
        : closure.status === CashClosureStatus.PENDING_EMPLOYEE_CLOSE
          ? 'PENDING'
          : 'OPEN',
    openedAt: closure.createdAt.toISOString(),
    closedAt: closure.closedAt?.toISOString() ?? null,
    expectedAmount: toNumber(closure.expectedCashAmount),
    countedAmount: closure.countedCashAmount == null ? null : toNumber(closure.countedCashAmount),
    differenceAmount: closure.differenceAmount == null ? null : toNumber(closure.differenceAmount),
    pendingCashSessions: closure.openSessionsCount,
    closedCashSessions: 0,
  } as const
}
