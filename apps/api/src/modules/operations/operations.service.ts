import { Injectable } from '@nestjs/common'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CashSessionService } from './cash-session.service'
import { ComandaService } from './comanda.service'
import { OperationsHelpersService } from './operations-helpers.service'
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
import { ReplaceComandaDto } from './dto/replace-comanda.dto'
import { UpdateComandaStatusDto } from './dto/update-comanda-status.dto'
import { UpdateKitchenItemStatusDto } from './dto/update-kitchen-item-status.dto'
import { toMesaRecord, type MesaRecord } from './operations.types'
import type { CreateMesaDto } from './dto/create-mesa.dto'
import type { UpdateMesaDto } from './dto/update-mesa.dto'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { resolveBusinessDate } from './operations-domain.utils'
import { AuditLogService } from '../monitoring/audit-log.service'

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashSession: CashSessionService,
    private readonly comanda: ComandaService,
    private readonly helpers: OperationsHelpersService,
    private readonly realtime: OperationsRealtimeService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── Live snapshot ─────────────────────────────────────────────────────────

  async getLiveSnapshot(auth: AuthContext, query: GetOperationsLiveQueryDto) {
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const businessDate = resolveBusinessDate(query.businessDate)
    const scopedEmployeeId =
      auth.role === 'STAFF'
        ? (await this.helpers.resolveEmployeeForStaff(this.prisma, workspaceOwnerUserId, auth))?.id ?? null
        : null

    return this.helpers.buildLiveSnapshot(workspaceOwnerUserId, businessDate, scopedEmployeeId)
  }

  // ── Cash session delegation ───────────────────────────────────────────────

  openCashSession(auth: AuthContext, dto: OpenCashSessionDto, context: RequestContext) {
    return this.cashSession.openCashSession(auth, dto, context)
  }

  createCashMovement(auth: AuthContext, cashSessionId: string, dto: CreateCashMovementDto, context: RequestContext) {
    return this.cashSession.createCashMovement(auth, cashSessionId, dto, context)
  }

  closeCashSession(auth: AuthContext, cashSessionId: string, dto: CloseCashSessionDto, context: RequestContext) {
    return this.cashSession.closeCashSession(auth, cashSessionId, dto, context)
  }

  closeCashClosure(auth: AuthContext, dto: CloseCashClosureDto, context: RequestContext) {
    return this.cashSession.closeCashClosure(auth, dto, context)
  }

  // ── Comanda delegation ────────────────────────────────────────────────────

  openComanda(auth: AuthContext, dto: OpenComandaDto, context: RequestContext) {
    return this.comanda.openComanda(auth, dto, context)
  }

  addComandaItem(auth: AuthContext, comandaId: string, dto: AddComandaItemDto, context: RequestContext) {
    return this.comanda.addComandaItem(auth, comandaId, dto, context)
  }

  replaceComanda(auth: AuthContext, comandaId: string, dto: ReplaceComandaDto, context: RequestContext) {
    return this.comanda.replaceComanda(auth, comandaId, dto, context)
  }

  assignComanda(auth: AuthContext, comandaId: string, dto: AssignComandaDto, context: RequestContext) {
    return this.comanda.assignComanda(auth, comandaId, dto, context)
  }

  updateComandaStatus(auth: AuthContext, comandaId: string, dto: UpdateComandaStatusDto, context: RequestContext) {
    return this.comanda.updateComandaStatus(auth, comandaId, dto, context)
  }

  closeComanda(auth: AuthContext, comandaId: string, dto: CloseComandaDto, context: RequestContext) {
    return this.comanda.closeComanda(auth, comandaId, dto, context)
  }

  updateKitchenItemStatus(auth: AuthContext, itemId: string, dto: UpdateKitchenItemStatusDto, context: RequestContext) {
    return this.comanda.updateKitchenItemStatus(auth, itemId, dto, context)
  }

  // ── Mesa CRUD ─────────────────────────────────────────────────────────────

  async listMesas(auth: AuthContext): Promise<MesaRecord[]> {
    assertOwnerRole(auth, 'Somente o dono pode gerenciar mesas.')
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const [mesas, openComandas] = await Promise.all([
      this.prisma.mesa.findMany({
        where: { companyOwnerId: workspaceOwnerUserId },
        orderBy: [{ active: 'desc' }, { section: 'asc' }, { label: 'asc' }],
      }),
      this.prisma.comanda.findMany({
        where: { companyOwnerId: workspaceOwnerUserId, status: { in: ['OPEN', 'IN_PREPARATION', 'READY'] } },
        select: { id: true, mesaId: true, currentEmployeeId: true, status: true },
      }),
    ])
    return mesas.map((m) => toMesaRecord(m, openComandas.filter((c) => c.mesaId === m.id)))
  }

  async createMesa(auth: AuthContext, dto: CreateMesaDto, context: RequestContext): Promise<MesaRecord> {
    assertOwnerRole(auth, 'Somente o dono pode criar mesas.')
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const label = sanitizePlainText(dto.label, 'Label da mesa', { allowEmpty: false, rejectFormula: true })!
    const section = dto.section
      ? sanitizePlainText(dto.section, 'Secao da mesa', { allowEmpty: true, rejectFormula: true })
      : null
    const existing = await this.prisma.mesa.findUnique({
      where: { companyOwnerId_label: { companyOwnerId: workspaceOwnerUserId, label } },
    })
    if (existing) throw new ConflictException(`Já existe uma mesa com o label "${label}".`)
    const mesa = await this.prisma.mesa.create({
      data: {
        companyOwnerId: workspaceOwnerUserId,
        label,
        capacity: dto.capacity ?? 4,
        section,
        positionX: dto.positionX ?? null,
        positionY: dto.positionY ?? null,
      },
    })
    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.mesa.created',
      resource: 'mesa',
      resourceId: mesa.id,
      metadata: { label, capacity: dto.capacity ?? 4, section },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
    this.realtime.publishMesaUpserted(auth, { mesaId: mesa.id, label: mesa.label, status: 'livre' })
    return toMesaRecord(mesa, [])
  }

  async updateMesa(auth: AuthContext, mesaId: string, dto: UpdateMesaDto, context: RequestContext): Promise<MesaRecord> {
    assertOwnerRole(auth, 'Somente o dono pode editar mesas.')
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    const mesa = await this.prisma.mesa.findUnique({ where: { id: mesaId } })
    if (!mesa || mesa.companyOwnerId !== workspaceOwnerUserId) throw new NotFoundException('Mesa não encontrada.')
    if (dto.label && dto.label !== mesa.label) {
      const conflict = await this.prisma.mesa.findUnique({
        where: { companyOwnerId_label: { companyOwnerId: workspaceOwnerUserId, label: dto.label } },
      })
      if (conflict) throw new ConflictException(`Já existe uma mesa com o label "${dto.label}".`)
    }
    const updated = await this.prisma.mesa.update({
      where: { id: mesaId },
      data: {
        ...(dto.label !== undefined && { label: sanitizePlainText(dto.label, 'Label da mesa', { allowEmpty: false, rejectFormula: true })! }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.section !== undefined && { section: dto.section }),
        ...(dto.positionX !== undefined && { positionX: dto.positionX }),
        ...(dto.positionY !== undefined && { positionY: dto.positionY }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.reservedUntil !== undefined && {
          reservedUntil: dto.reservedUntil ? new Date(dto.reservedUntil) : null,
        }),
      },
    })
    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'operations.mesa.updated',
      resource: 'mesa',
      resourceId: mesaId,
      metadata: { label: dto.label, active: dto.active },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
    this.realtime.publishMesaUpserted(auth, { mesaId: updated.id, label: updated.label, status: 'livre' })
    return toMesaRecord(updated, [])
  }
}
