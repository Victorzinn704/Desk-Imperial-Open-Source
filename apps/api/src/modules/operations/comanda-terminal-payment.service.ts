import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import {
  AuditSeverity,
  ComandaPaymentMethod,
  PaymentTerminalIntentStatus,
  PaymentTerminalProvider,
  Prisma,
} from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { ComandaMutationContextService } from './comanda-mutation-context.service'
import { calculateConfirmedPaidAmount } from './comanda-settlement.utils'
import { ComandaTerminalPaymentProviderService } from './comanda-terminal-payment-provider.service'
import { OperationsHelpersService } from './operations-helpers.service'
import { toNumberOrZero } from './operations-domain.utils'
import type { CreateComandaTerminalPaymentIntentDto } from './operations.schemas'

const TERMINAL_INTENT_EXPIRES_IN_MS = 15 * 60 * 1000
const TERMINAL_INTENT_FAILED_CODE = 'MERCADO_PAGO_POINT_CREATE_ORDER_FAILED'
const TERMINAL_INTENT_REPLACED_STATUS = 'replaced-by-cashier'

type CreateTerminalPaymentIntentArgs = {
  auth: AuthContext
  comandaId: string
  context: RequestContext
  dto: CreateComandaTerminalPaymentIntentDto
}

type AuthorizedComanda = Awaited<ReturnType<OperationsHelpersService['requireAuthorizedComanda']>>

@Injectable()
export class ComandaTerminalPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly contextService: ComandaMutationContextService,
    private readonly helpers: OperationsHelpersService,
    private readonly terminalPaymentProvider: ComandaTerminalPaymentProviderService,
  ) {}

  async createIntent(args: CreateTerminalPaymentIntentArgs) {
    const mutationContext = await this.contextService.resolve(args.auth)
    const comanda = await this.resolveAuthorizedComanda(args, mutationContext)
    this.contextService.assertOpenForPayment(comanda.status)
    this.terminalPaymentProvider.assertConfigured()

    const terminalId = this.resolveTerminalId(args.dto)
    const amount = resolveIntentAmount(args.dto.amount, comanda)
    await this.resolvePendingIntentForNewCharge(args, comanda.id)
    const intent = await this.createPendingIntent({ amount, args, comanda, mutationContext, terminalId })
    if (await this.enqueueProviderOrderCreation(args, intent.id)) {
      return { terminalPaymentIntent: toTerminalPaymentIntentRecord(intent) }
    }

    return this.createProviderOrderInline({ amount, args, intent, terminalId })
  }

  private async createProviderOrderInline(params: {
    amount: number
    args: CreateTerminalPaymentIntentArgs
    intent: TerminalPaymentIntentRecordSource
    terminalId: string
  }) {
    try {
      const providerOrder = await this.terminalPaymentProvider.createOrder({
        amount: params.amount,
        description: 'Desk Imperial comanda',
        externalReference: params.intent.externalReference,
        idempotencyKey: params.intent.idempotencyKey,
        method: params.args.dto.method,
        terminalId: params.terminalId,
      })
      const updatedIntent = await this.markIntentAsQueued(params.intent.id, providerOrder)
      await this.recordCreatedAudit(params.args, updatedIntent)
      return { terminalPaymentIntent: toTerminalPaymentIntentRecord(updatedIntent) }
    } catch (error) {
      await this.markIntentAsFailed(params.intent.id, error).catch(() => undefined)
      throw error
    }
  }

  private async enqueueProviderOrderCreation(args: CreateTerminalPaymentIntentArgs, intentId: string) {
    return this.terminalPaymentProvider.enqueueOrderCreation({
      context: args.context,
      intentId,
      receivedAt: new Date().toISOString(),
    })
  }

  private resolveAuthorizedComanda(
    args: CreateTerminalPaymentIntentArgs,
    mutationContext: Awaited<ReturnType<ComandaMutationContextService['resolve']>>,
  ) {
    return this.helpers.requireAuthorizedComanda({
      actorEmployee: mutationContext.actorEmployee,
      auth: args.auth,
      comandaId: args.comandaId,
      transaction: this.prisma,
      workspaceOwnerUserId: mutationContext.workspaceOwnerUserId,
    })
  }

  private resolveTerminalId(dto: CreateComandaTerminalPaymentIntentDto) {
    const terminalId = dto.terminalId?.trim() || this.terminalPaymentProvider.getDefaultTerminalId()
    if (!terminalId) {
      throw new BadRequestException('Informe uma maquininha Mercado Pago Point para cobrar esta comanda.')
    }

    return terminalId
  }

  private async resolvePendingIntentForNewCharge(args: CreateTerminalPaymentIntentArgs, comandaId: string) {
    const pendingIntent = await this.prisma.paymentTerminalIntent.findFirst({
      where: { comandaId, status: PaymentTerminalIntentStatus.PENDING },
      select: { id: true, providerOrderId: true },
    })

    if (!pendingIntent) {
      return
    }

    if (!args.dto.replacePending) {
      throw new ConflictException('Esta comanda ja possui uma cobranca pendente na maquininha.')
    }

    await this.cancelPendingIntent(pendingIntent)
  }

  private async cancelPendingIntent(intent: { id: string; providerOrderId: string | null }) {
    const providerOrderId = intent.providerOrderId
    if (providerOrderId) {
      await this.terminalPaymentProvider.cancelOrder({ idempotencyKey: randomUUID(), orderId: providerOrderId })
    }

    const cancelled = await this.prisma.paymentTerminalIntent.updateMany({
      where: { id: intent.id, status: PaymentTerminalIntentStatus.PENDING },
      data: {
        cancelledAt: new Date(),
        errorCode: null,
        errorMessage: null,
        providerStatus: TERMINAL_INTENT_REPLACED_STATUS,
        status: PaymentTerminalIntentStatus.CANCELLED,
      },
    })

    if (cancelled.count === 0) {
      throw new ConflictException('A cobranca pendente mudou de estado. Atualize a tela antes de reenviar.')
    }
  }

  private async createPendingIntent(params: {
    amount: number
    args: CreateTerminalPaymentIntentArgs
    comanda: AuthorizedComanda
    mutationContext: Awaited<ReturnType<ComandaMutationContextService['resolve']>>
    terminalId: string
  }) {
    try {
      return await this.prisma.paymentTerminalIntent.create({
        data: {
          amount: params.amount,
          cashSessionId: params.comanda.cashSessionId,
          comandaId: params.comanda.id,
          companyOwnerId: params.mutationContext.workspaceOwnerUserId,
          createdByUserId: params.args.auth.userId,
          employeeId: params.comanda.currentEmployeeId ?? params.mutationContext.actorEmployee?.id ?? null,
          expiresAt: new Date(Date.now() + TERMINAL_INTENT_EXPIRES_IN_MS),
          externalReference: `desk-${randomUUID()}`,
          idempotencyKey: randomUUID(),
          method: params.args.dto.method as ComandaPaymentMethod,
          note: sanitizePlainText(params.args.dto.note, 'Observacao da cobranca', {
            allowEmpty: true,
            rejectFormula: false,
          }),
          providerTerminalId: params.terminalId,
        },
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Esta comanda ja possui uma cobranca pendente na maquininha.')
      }

      throw error
    }
  }

  private markIntentAsQueued(
    intentId: string,
    providerOrder: Awaited<ReturnType<ComandaTerminalPaymentProviderService['createOrder']>>,
  ) {
    return this.prisma.paymentTerminalIntent.update({
      where: { id: intentId },
      data: {
        providerOrderId: providerOrder.orderId,
        providerPaymentId: providerOrder.paymentId,
        providerStatus: providerOrder.status,
      },
    })
  }

  private markIntentAsFailed(intentId: string, error: unknown) {
    return this.prisma.paymentTerminalIntent.update({
      where: { id: intentId },
      data: {
        errorCode: TERMINAL_INTENT_FAILED_CODE,
        errorMessage: toSafeErrorMessage(error),
        status: PaymentTerminalIntentStatus.FAILED,
      },
    })
  }

  private recordCreatedAudit(args: CreateTerminalPaymentIntentArgs, intent: TerminalPaymentIntentRecordSource) {
    return this.auditLogService.record({
      actorUserId: args.auth.userId,
      event: 'operations.comanda_terminal_payment_intent.created',
      ipAddress: args.context.ipAddress,
      metadata: {
        amount: toNumberOrZero(intent.amount),
        comandaId: intent.comandaId,
        method: intent.method,
        provider: intent.provider,
        providerOrderId: intent.providerOrderId,
      },
      resource: 'payment-terminal-intent',
      resourceId: intent.id,
      severity: AuditSeverity.INFO,
      userAgent: args.context.userAgent,
    })
  }
}

type PaymentComanda = {
  payments?: Array<{ amount: Prisma.Decimal | number; status?: string }>
  totalAmount: Prisma.Decimal | number
}

type TerminalPaymentIntentRecordSource = {
  amount: Prisma.Decimal | number
  comandaId: string
  createdAt: Date
  expiresAt: Date | null
  externalReference: string
  id: string
  idempotencyKey: string
  method: ComandaPaymentMethod
  providerOrderId: string | null
  providerPaymentId: string | null
  providerTerminalId: string
  provider: PaymentTerminalProvider
  status: PaymentTerminalIntentStatus
}

function resolveIntentAmount(inputAmount: number | undefined, comanda: PaymentComanda) {
  const remainingAmount = roundCurrency(
    Math.max(0, toNumberOrZero(comanda.totalAmount) - calculateConfirmedPaidAmount(comanda)),
  )
  const amount = roundCurrency(inputAmount ?? remainingAmount)

  if (amount <= 0) {
    throw new BadRequestException('Esta comanda nao possui saldo pendente para cobrar.')
  }

  if (amount > remainingAmount) {
    throw new BadRequestException('A cobranca informada passa do saldo restante da comanda.')
  }

  return amount
}

function toTerminalPaymentIntentRecord(intent: TerminalPaymentIntentRecordSource) {
  return {
    amount: toNumberOrZero(intent.amount),
    comandaId: intent.comandaId,
    createdAt: intent.createdAt.toISOString(),
    expiresAt: intent.expiresAt?.toISOString() ?? null,
    externalReference: intent.externalReference,
    id: intent.id,
    method: intent.method,
    provider: intent.provider,
    providerOrderId: intent.providerOrderId,
    providerPaymentId: intent.providerPaymentId,
    status: intent.status,
    terminalId: intent.providerTerminalId,
  }
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function toSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 240) : 'Erro desconhecido ao criar cobranca.'
}
