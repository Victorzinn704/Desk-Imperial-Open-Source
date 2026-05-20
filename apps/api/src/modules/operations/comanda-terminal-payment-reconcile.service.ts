import { Inject, Injectable } from '@nestjs/common'
import { ComandaStatus, PaymentTerminalIntentStatus, PaymentTerminalProvider, Prisma } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import { AuditLogService } from '../monitoring/audit-log.service'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { COMANDA_WRITE_ISOLATION_LEVEL } from './comanda.constants'
import { ComandaRealtimePublisher } from './comanda-realtime-publisher.service'
import { MercadoPagoPointClient, type MercadoPagoPointOrderResult } from './mercado-pago-point.client'
import { assertMercadoPagoWebhookSignature } from './mercado-pago-webhook-signature.util'
import {
  type ApprovedIntentResult,
  buildTerminalPaymentNote,
  loadComandaWithPayments,
  type LoadedComandaWithPayments,
  publishApprovedTerminalPayment,
  recordApprovedTerminalPaymentAudit,
  shouldCloseComandaAfterTerminalPayment,
} from './comanda-terminal-payment-reconcile.helpers'
import {
  buildProviderPaymentIdUpdate,
  buildTerminalIntentStatusDates,
  type ExistingPaymentTerminalIntent,
  isApprovedOrderSafeForIntent,
  type MercadoPagoWebhookInput,
  resolveIntentStatus,
  resolveProviderStatus,
  resolveWebhookDataId,
} from './comanda-terminal-payment-reconcile.utils'
import { OperationsHelpersService } from './operations-helpers.service'

const PROVIDER_AMOUNT_MISMATCH_CODE = 'MERCADO_PAGO_POINT_AMOUNT_MISMATCH'

@Injectable()
export class ComandaTerminalPaymentReconcileService {
  @Inject(ConfigService)
  private readonly configService!: ConfigService

  constructor(
    private readonly prisma: PrismaService,
    private readonly helpers: OperationsHelpersService,
    private readonly realtime: ComandaRealtimePublisher,
    private readonly auditLogService: AuditLogService,
    private readonly mercadoPagoPoint: MercadoPagoPointClient,
  ) {}

  async handleWebhook(input: MercadoPagoWebhookInput) {
    const mutationStartedAtMs = performance.now()
    const orderId = this.validateWebhook(input)
    const order = await this.mercadoPagoPoint.getOrder(orderId)
    return this.reconcileOrder(order, input.context, mutationStartedAtMs)
  }

  validateWebhook(input: MercadoPagoWebhookInput) {
    const orderId = resolveWebhookDataId(input)
    assertMercadoPagoWebhookSignature({
      dataId: orderId,
      requestId: input.requestId,
      secret: this.configService.get<string>('MERCADO_PAGO_WEBHOOK_SECRET'),
      signature: input.signature,
    })
    return orderId
  }

  private async reconcileOrder(
    order: MercadoPagoPointOrderResult,
    requestContext: RequestContext,
    mutationStartedAtMs: number,
  ) {
    const intent = await this.findIntentForOrder(order)
    if (!intent) {
      return { received: true, reconciled: false }
    }

    const status = resolveIntentStatus(order)
    if (status !== PaymentTerminalIntentStatus.APPROVED) {
      await this.updateNonApprovedIntent(intent.id, order, status)
      return { received: true, reconciled: status !== PaymentTerminalIntentStatus.PENDING, status }
    }

    if (!isApprovedOrderSafeForIntent(order, intent)) {
      await this.markIntentAsFailed(intent.id, order)
      return { received: true, reconciled: false, status: PaymentTerminalIntentStatus.FAILED }
    }

    const result = await this.approveIntentInTransaction(intent, order)
    if (result.createdPayment) {
      publishApprovedTerminalPayment(this.realtime, result, mutationStartedAtMs)
      await recordApprovedTerminalPaymentAudit(this.auditLogService, result, requestContext)
    }

    return { received: true, reconciled: true, status: PaymentTerminalIntentStatus.APPROVED }
  }

  private findIntentForOrder(order: MercadoPagoPointOrderResult) {
    return this.prisma.paymentTerminalIntent.findFirst({
      where: {
        provider: PaymentTerminalProvider.MERCADO_PAGO_POINT,
        OR: [
          { providerOrderId: order.orderId },
          ...(order.externalReference ? [{ externalReference: order.externalReference }] : []),
        ],
      },
    })
  }

  private updateNonApprovedIntent(
    intentId: string,
    order: MercadoPagoPointOrderResult,
    status: PaymentTerminalIntentStatus,
  ) {
    return this.prisma.paymentTerminalIntent.update({
      where: { id: intentId },
      data: {
        ...buildTerminalIntentStatusDates(status),
        ...buildProviderPaymentIdUpdate(order),
        providerStatus: resolveProviderStatus(order),
        status,
      },
    })
  }

  private markIntentAsFailed(intentId: string, order: MercadoPagoPointOrderResult) {
    return this.prisma.paymentTerminalIntent.update({
      where: { id: intentId },
      data: {
        errorCode: PROVIDER_AMOUNT_MISMATCH_CODE,
        errorMessage: 'Mercado Pago aprovou uma cobranca com referencia ou valor divergente.',
        ...buildProviderPaymentIdUpdate(order),
        providerStatus: resolveProviderStatus(order),
        status: PaymentTerminalIntentStatus.FAILED,
      },
    })
  }

  private approveIntentInTransaction(
    intent: ExistingPaymentTerminalIntent,
    order: MercadoPagoPointOrderResult,
  ): Promise<ApprovedIntentResult> {
    return this.prisma.$transaction((transaction) => this.approveIntentInTransactionStep(transaction, intent, order), {
      isolationLevel: COMANDA_WRITE_ISOLATION_LEVEL,
    })
  }

  private async approveIntentInTransactionStep(
    transaction: Prisma.TransactionClient,
    intent: ExistingPaymentTerminalIntent,
    order: MercadoPagoPointOrderResult,
  ): Promise<ApprovedIntentResult> {
    const claimed = await this.claimPendingIntent(transaction, intent, order)
    if (!claimed) {
      return { createdPayment: false, intent }
    }

    const payment = await this.createApprovedPayment(transaction, intent, order)
    await this.attachPaymentToIntent(transaction, intent.id, payment.id)
    return this.finalizeApprovedIntent(transaction, intent)
  }

  private async claimPendingIntent(
    transaction: Prisma.TransactionClient,
    intent: ExistingPaymentTerminalIntent,
    order: MercadoPagoPointOrderResult,
  ) {
    const claimed = await transaction.paymentTerminalIntent.updateMany({
      where: { comandaPaymentId: null, id: intent.id, status: PaymentTerminalIntentStatus.PENDING },
      data: {
        approvedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        providerPaymentId: order.paymentId ?? intent.providerPaymentId,
        providerStatus: resolveProviderStatus(order),
        status: PaymentTerminalIntentStatus.APPROVED,
      },
    })

    return claimed.count > 0
  }

  private createApprovedPayment(
    transaction: Prisma.TransactionClient,
    intent: ExistingPaymentTerminalIntent,
    order: MercadoPagoPointOrderResult,
  ) {
    return transaction.comandaPayment.create({
      data: {
        amount: intent.amount,
        cashSessionId: intent.cashSessionId,
        comandaId: intent.comandaId,
        companyOwnerId: intent.companyOwnerId,
        createdByUserId: intent.createdByUserId,
        employeeId: intent.employeeId,
        method: intent.method,
        note: buildTerminalPaymentNote(intent, order),
      },
    })
  }

  private attachPaymentToIntent(transaction: Prisma.TransactionClient, intentId: string, paymentId: string) {
    return transaction.paymentTerminalIntent.update({
      where: { id: intentId },
      data: { comandaPaymentId: paymentId },
    })
  }

  private async finalizeApprovedIntent(
    transaction: Prisma.TransactionClient,
    intent: ExistingPaymentTerminalIntent,
  ): Promise<ApprovedIntentResult> {
    const { closedComanda, refreshedComanda } = await this.refreshApprovedComanda(transaction, intent)
    const businessDate = await this.helpers.resolveComandaBusinessDate(transaction, refreshedComanda)
    const refreshedSession = await this.recalculateCashSessionForIntent(transaction, intent.cashSessionId)
    const closure = await this.helpers.syncCashClosure(transaction, intent.companyOwnerId, businessDate)

    return {
      businessDate,
      closedComanda,
      closure,
      createdPayment: true,
      intent,
      refreshedComanda,
      refreshedSession,
    }
  }

  private async refreshApprovedComanda(transaction: Prisma.TransactionClient, intent: ExistingPaymentTerminalIntent) {
    let refreshedComanda = await loadComandaWithPayments(transaction, intent.comandaId)
    const closedComanda = await this.closeComandaWhenFullyPaid(transaction, intent, refreshedComanda)
    if (closedComanda) {
      refreshedComanda = await loadComandaWithPayments(transaction, intent.comandaId)
      await this.helpers.ensureOrderForClosedComanda(transaction, intent.companyOwnerId, refreshedComanda.id)
    }

    return { closedComanda, refreshedComanda }
  }

  private recalculateCashSessionForIntent(transaction: Prisma.TransactionClient, cashSessionId: string | null) {
    if (!cashSessionId) {
      return Promise.resolve(null)
    }

    return this.helpers.recalculateCashSession(transaction, cashSessionId)
  }

  private async closeComandaWhenFullyPaid(
    transaction: Prisma.TransactionClient,
    intent: ExistingPaymentTerminalIntent,
    comanda: LoadedComandaWithPayments,
  ) {
    if (!shouldCloseComandaAfterTerminalPayment(comanda)) {
      return false
    }

    await transaction.comanda.update({
      where: { id: intent.comandaId },
      data: {
        closedAt: new Date(),
        closedByUserId: intent.createdByUserId,
        status: ComandaStatus.CLOSED,
      },
    })
    return true
  }
}
