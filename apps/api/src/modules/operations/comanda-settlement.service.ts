import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ComandaPaymentStatus, ComandaStatus, Prisma } from '@prisma/client'
import { recordOperationsCloseComandaTelemetry } from '../../common/observability/business-telemetry.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { COMANDA_WRITE_ISOLATION_LEVEL } from './comanda.constants'
import { buildComandaResponse, checkLowStockAfterClose } from './comanda-response.utils'
import { ComandaMutationContextService } from './comanda-mutation-context.service'
import { ComandaRealtimePublisher } from './comanda-realtime-publisher.service'
import {
  createFinalComandaPaymentIfNeeded,
  prepareComandaCloseInput,
  prepareComandaPaymentInput,
  type PreparedComandaCloseInput,
} from './comanda-settlement.utils'
import type { ComandaSettlementMutationArgs } from './comanda-settlement.types'
import { recordComandaCloseAudit, recordComandaPaymentAudit } from './comanda-settlement-audit.utils'
import { OperationsHelpersService } from './operations-helpers.service'
import type { CloseComandaDto, CreateComandaPaymentDto } from './operations.schemas'

type MutationContext = Awaited<ReturnType<ComandaMutationContextService['resolve']>>
type AuthorizedComanda = Awaited<ReturnType<OperationsHelpersService['requireAuthorizedComanda']>>
type PaymentTransactionResult = Awaited<ReturnType<ComandaSettlementService['createPaymentInTransaction']>>
type CloseTransactionResult = Awaited<ReturnType<ComandaSettlementService['closeComandaInTransaction']>>

@Injectable()
export class ComandaSettlementService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(OperationsHelpersService) private readonly helpers: OperationsHelpersService,
    @Inject(ComandaMutationContextService) private readonly context: ComandaMutationContextService,
    @Inject(ComandaRealtimePublisher) private readonly realtime: ComandaRealtimePublisher,
  ) {}

  async createComandaPayment(args: ComandaSettlementMutationArgs<CreateComandaPaymentDto>) {
    const { auth, comandaId, context, dto, options } = args
    const mutationStartedAtMs = performance.now()
    const { comanda, mutationContext } = await this.resolvePayableComanda(auth, comandaId)
    this.context.assertOpenForPayment(comanda.status)
    const { amount, note } = prepareComandaPaymentInput(dto, comanda)
    const result = await this.createPaymentInTransaction({
      amount,
      auth,
      comanda,
      context: mutationContext,
      method: dto.method,
      note,
    })

    await recordComandaPaymentAudit({
      amount,
      auditLogService: this.auditLogService,
      auth,
      comandaId: comanda.id,
      context,
      method: dto.method,
      refreshedComanda: result.refreshedComanda,
    })
    this.publishPaymentResult({
      auth,
      mutationStartedAtMs,
      result,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })

    return buildComandaResponse(
      this.helpers,
      mutationContext.workspaceOwnerUserId,
      result.businessDate,
      result.refreshedComanda,
      options,
    )
  }

  async closeComanda(args: ComandaSettlementMutationArgs<CloseComandaDto>) {
    const startedAt = performance.now()

    try {
      return await this.closeComandaMeasured({ ...args, mutationStartedAtMs: startedAt })
    } finally {
      recordOperationsCloseComandaTelemetry(performance.now() - startedAt, {
        'desk.operations.actor_role': args.auth.role,
        'desk.operations.comanda_id_present': Boolean(args.comandaId),
      })
    }
  }

  private async resolvePayableComanda(auth: AuthContext, comandaId: string) {
    const mutationContext = await this.context.resolve(auth)
    const comanda = await this.helpers.requireAuthorizedComanda({
      transaction: this.prisma,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
      auth,
      comandaId,
      actorEmployee: mutationContext.actorEmployee,
    })

    return { comanda, mutationContext }
  }

  private async closeComandaMeasured(
    params: ComandaSettlementMutationArgs<CloseComandaDto> & { mutationStartedAtMs: number },
  ) {
    const { comanda, mutationContext } = await this.resolvePayableComanda(params.auth, params.comandaId)
    const closeInput = prepareComandaCloseInput(params.dto, comanda)
    const result = await this.closeComandaInTransaction({
      auth: params.auth,
      context: mutationContext,
      comanda,
      input: closeInput,
    })

    await recordComandaCloseAudit({
      auditLogService: this.auditLogService,
      auth: params.auth,
      comandaId: comanda.id,
      context: params.context,
      input: closeInput,
      refreshedComanda: result.refreshedComanda,
    })
    this.publishCloseResult({
      auth: params.auth,
      mutationStartedAtMs: params.mutationStartedAtMs,
      result,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })
    void checkLowStockAfterClose(
      this.prisma,
      this.auditLogService,
      params.auth.userId,
      mutationContext.workspaceOwnerUserId,
      result.refreshedComanda.items,
    )

    return buildComandaResponse(
      this.helpers,
      mutationContext.workspaceOwnerUserId,
      result.businessDate,
      result.refreshedComanda,
      params.options,
    )
  }

  private createPaymentInTransaction(params: {
    amount: number
    auth: AuthContext
    comanda: AuthorizedComanda
    context: MutationContext
    method: CreateComandaPaymentDto['method']
    note: string | null
  }) {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.comandaPayment.create({
          data: {
            amount: params.amount,
            cashSessionId: params.comanda.cashSessionId,
            comandaId: params.comanda.id,
            companyOwnerId: params.context.workspaceOwnerUserId,
            createdByUserId: params.auth.userId,
            employeeId: params.comanda.currentEmployeeId ?? params.context.actorEmployee?.id ?? null,
            method: params.method,
            note: params.note,
          },
        })

        const refreshedComanda = await this.loadComandaWithPayments(transaction, params.comanda.id)
        const cashState = await this.syncComandaCashState(
          transaction,
          params.context.workspaceOwnerUserId,
          refreshedComanda,
        )
        return { refreshedComanda, ...cashState }
      },
      { isolationLevel: COMANDA_WRITE_ISOLATION_LEVEL },
    )
  }

  private closeComandaInTransaction(params: {
    auth: AuthContext
    context: MutationContext
    comanda: AuthorizedComanda
    input: PreparedComandaCloseInput
  }) {
    return this.prisma.$transaction(async (transaction) => {
      const recalculatedComanda = await this.helpers.recalculateComanda(transaction, params.comanda.id, {
        discountAmount: params.input.discountAmount,
        serviceFeeAmount: params.input.serviceFeeAmount,
      })
      await createFinalComandaPaymentIfNeeded({
        comanda: params.comanda,
        context: params.context,
        paymentMethod: params.input.paymentMethod,
        totalAmount: recalculatedComanda.totalAmount,
        transaction,
      })
      await transaction.comanda.update({
        where: { id: params.comanda.id },
        data: {
          closedAt: new Date(),
          closedByUserId: params.auth.userId,
          notes: params.input.notes ?? recalculatedComanda.notes,
          status: ComandaStatus.CLOSED,
        },
      })
      const refreshedComanda = await this.loadComandaWithPayments(transaction, params.comanda.id)
      await this.helpers.ensureOrderForClosedComanda(
        transaction,
        params.context.workspaceOwnerUserId,
        refreshedComanda.id,
      )
      const cashState = await this.syncComandaCashState(
        transaction,
        params.context.workspaceOwnerUserId,
        refreshedComanda,
      )
      return { refreshedComanda, ...cashState }
    })
  }

  private async loadComandaWithPayments(transaction: Prisma.TransactionClient, comandaId: string) {
    const comanda = await transaction.comanda.findUnique({
      where: { id: comandaId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        payments: { where: { status: ComandaPaymentStatus.CONFIRMED }, orderBy: { paidAt: 'asc' } },
      },
    })

    if (!comanda) {
      throw new NotFoundException('Comanda nao encontrada.')
    }

    return comanda
  }

  private async syncComandaCashState(
    transaction: Prisma.TransactionClient,
    workspaceOwnerUserId: string,
    comanda: AuthorizedComanda,
  ) {
    const businessDate = await this.helpers.resolveComandaBusinessDate(transaction, comanda)
    const refreshedSession = comanda.cashSessionId
      ? await this.helpers.recalculateCashSession(transaction, comanda.cashSessionId)
      : null
    const closure = await this.helpers.syncCashClosure(transaction, workspaceOwnerUserId, businessDate)

    return { businessDate, closure, refreshedSession }
  }

  private publishPaymentResult(params: {
    auth: AuthContext
    mutationStartedAtMs: number
    result: PaymentTransactionResult
    workspaceOwnerUserId: string
  }) {
    const { auth, mutationStartedAtMs, result, workspaceOwnerUserId } = params
    this.realtime.invalidate(workspaceOwnerUserId, result.businessDate)
    this.realtime.publishUpdated({
      auth,
      businessDate: result.businessDate,
      comanda: result.refreshedComanda,
      instrumentation: { mutationName: 'create-comanda-payment', mutationStartedAtMs },
    })
    if (result.refreshedSession) {
      this.realtime.publishCashUpdated({ auth, session: result.refreshedSession, businessDate: result.businessDate })
    }
    if (result.closure) {
      this.realtime.publishCashClosureUpdated({ auth, closure: result.closure })
    }
  }

  private publishCloseResult(params: {
    auth: AuthContext
    mutationStartedAtMs: number
    result: CloseTransactionResult
    workspaceOwnerUserId: string
  }) {
    const { auth, mutationStartedAtMs, result, workspaceOwnerUserId } = params
    this.realtime.invalidate(workspaceOwnerUserId, result.businessDate)
    this.realtime.publishClosed({
      auth,
      businessDate: result.businessDate,
      closure: result.closure,
      comanda: result.refreshedComanda,
      instrumentation: { mutationName: 'close-comanda', mutationStartedAtMs },
      refreshedSession: result.refreshedSession,
    })
    this.realtime.deleteOrdersCache(workspaceOwnerUserId)
    this.realtime.refreshFinanceSummary(workspaceOwnerUserId)
  }
}
