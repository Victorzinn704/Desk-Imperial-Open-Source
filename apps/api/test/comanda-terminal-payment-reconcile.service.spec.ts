import { UnauthorizedException } from '@nestjs/common'
import {
  ComandaPaymentMethod,
  ComandaStatus,
  PaymentTerminalIntentStatus,
  PaymentTerminalProvider,
} from '@prisma/client'
import { createHmac } from 'node:crypto'
import { ComandaTerminalPaymentReconcileService } from '../src/modules/operations/comanda-terminal-payment-reconcile.service'
import { makeRequestContext } from './helpers/request-context.factory'

const SECRET = 'mercado-pago-webhook-secret'
const REQUEST_ID = 'request-1'
const ORDER_ID = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3'

function signWebhook(dataId = ORDER_ID, requestId: string | null = REQUEST_ID) {
  const timestamp = '1742505638683'
  const requestIdFragment = requestId ? `request-id:${requestId};` : ''
  const manifest = `id:${dataId};${requestIdFragment}ts:${timestamp};`
  const signature = createHmac('sha256', SECRET).update(manifest).digest('hex')
  return `ts=${timestamp},v1=${signature}`
}

function makeIntent(overrides: Record<string, unknown> = {}) {
  return {
    amount: 120,
    cashSessionId: 'cash-1',
    comandaId: 'comanda-1',
    companyOwnerId: 'owner-1',
    comandaPaymentId: null,
    createdByUserId: 'owner-1',
    employeeId: null,
    externalReference: 'desk-reference-1',
    id: 'intent-1',
    method: ComandaPaymentMethod.CREDIT,
    note: null,
    provider: PaymentTerminalProvider.MERCADO_PAGO_POINT,
    providerOrderId: ORDER_ID,
    providerPaymentId: null,
    providerStatus: 'created',
    status: PaymentTerminalIntentStatus.PENDING,
    ...overrides,
  }
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    externalReference: 'desk-reference-1',
    orderId: ORDER_ID,
    paidAmount: 120,
    paymentId: 'payment-provider-1',
    paymentStatus: 'approved',
    status: 'processed',
    ...overrides,
  }
}

function makeComanda() {
  return {
    closedAt: null,
    currentEmployeeId: null,
    discountAmount: 0,
    id: 'comanda-1',
    items: [],
    openedAt: new Date('2026-05-03T18:00:00.000Z'),
    payments: [{ amount: 120, status: 'CONFIRMED' }],
    serviceFeeAmount: 0,
    status: ComandaStatus.OPEN,
    subtotalAmount: 120,
    tableLabel: 'Mesa 1',
    totalAmount: 120,
  }
}

function makeClosedComanda() {
  return {
    ...makeComanda(),
    closedAt: new Date('2026-05-03T18:10:00.000Z'),
    status: ComandaStatus.CLOSED,
  }
}

function createSetup() {
  const prisma = {
    $transaction: jest.fn(),
    comanda: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    comandaPayment: {
      create: jest.fn(),
    },
    paymentTerminalIntent: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  }
  prisma.$transaction.mockImplementation(async (callback: (transaction: typeof prisma) => Promise<unknown>) =>
    callback(prisma),
  )
  const config = {
    get: jest.fn((key: string) => (key === 'MERCADO_PAGO_WEBHOOK_SECRET' ? SECRET : null)),
  }
  const helpers = {
    ensureOrderForClosedComanda: jest.fn(),
    recalculateCashSession: jest.fn(),
    resolveComandaBusinessDate: jest.fn(),
    syncCashClosure: jest.fn(),
  }
  const realtime = {
    deleteOrdersCache: jest.fn(),
    invalidate: jest.fn(),
    publishCashClosureUpdated: jest.fn(),
    publishCashUpdated: jest.fn(),
    publishClosed: jest.fn(),
    refreshFinanceSummary: jest.fn(),
    publishUpdated: jest.fn(),
  }
  const audit = {
    record: jest.fn(async () => {}),
  }
  const mercadoPagoPoint = {
    getOrder: jest.fn(),
  }
  const service = new ComandaTerminalPaymentReconcileService(
    prisma as never,
    helpers as never,
    realtime as never,
    audit as never,
    mercadoPagoPoint as never,
  )
  Object.assign(service as object, { configService: config })

  return { audit, helpers, mercadoPagoPoint, prisma, realtime, service }
}

function makeWebhookInput(signature = signWebhook(), requestId: string | null | undefined = REQUEST_ID) {
  return {
    body: { data: { id: ORDER_ID } },
    context: makeRequestContext(),
    query: { 'data.id': ORDER_ID },
    requestId: requestId ?? undefined,
    signature,
  }
}

describe('ComandaTerminalPaymentReconcileService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('cria pagamento local apenas depois de order aprovada e assinada', async () => {
    const setup = createSetup()
    setup.mercadoPagoPoint.getOrder.mockResolvedValue(makeOrder())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue(makeIntent())
    setup.prisma.paymentTerminalIntent.updateMany.mockResolvedValue({ count: 1 })
    setup.prisma.comandaPayment.create.mockResolvedValue({ id: 'payment-1' })
    setup.prisma.paymentTerminalIntent.update.mockResolvedValue(makeIntent({ comandaPaymentId: 'payment-1' }))
    setup.prisma.comanda.findUnique.mockResolvedValueOnce(makeComanda()).mockResolvedValueOnce(makeClosedComanda())
    setup.helpers.resolveComandaBusinessDate.mockResolvedValue(new Date('2026-05-03T00:00:00.000Z'))
    setup.helpers.recalculateCashSession.mockResolvedValue({ id: 'cash-1', status: 'OPEN' })
    setup.helpers.syncCashClosure.mockResolvedValue({ id: 'closure-1', status: 'OPEN' })

    const result = await setup.service.handleWebhook(makeWebhookInput())

    expect(result).toEqual({ received: true, reconciled: true, status: 'APPROVED' })
    expect(setup.prisma.comandaPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 120,
          comandaId: 'comanda-1',
          method: ComandaPaymentMethod.CREDIT,
          note: expect.stringContaining('Mercado Pago Point - CREDIT'),
        }),
      }),
    )
    expect(setup.prisma.comandaPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          note: expect.stringContaining('Transacao MP payment-provider-1'),
        }),
      }),
    )
    expect(setup.prisma.comanda.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ closedByUserId: 'owner-1', status: ComandaStatus.CLOSED }),
      }),
    )
    expect(setup.helpers.ensureOrderForClosedComanda).toHaveBeenCalledWith(expect.anything(), 'owner-1', 'comanda-1')
    expect(setup.realtime.publishClosed).toHaveBeenCalledTimes(1)
    expect(setup.realtime.publishUpdated).not.toHaveBeenCalled()
    expect(setup.audit.record).toHaveBeenCalledTimes(1)
  })

  it('nao duplica pagamento quando intent ja foi reconciliada', async () => {
    const setup = createSetup()
    setup.mercadoPagoPoint.getOrder.mockResolvedValue(makeOrder())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue(makeIntent())
    setup.prisma.paymentTerminalIntent.updateMany.mockResolvedValue({ count: 0 })

    await expect(setup.service.handleWebhook(makeWebhookInput())).resolves.toEqual({
      received: true,
      reconciled: true,
      status: 'APPROVED',
    })
    expect(setup.prisma.comandaPayment.create).not.toHaveBeenCalled()
    expect(setup.realtime.publishUpdated).not.toHaveBeenCalled()
  })

  it('rejeita webhook sem assinatura valida antes de consultar provider', async () => {
    const setup = createSetup()

    await expect(setup.service.handleWebhook(makeWebhookInput('ts=1,v1=bad'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(setup.mercadoPagoPoint.getOrder).not.toHaveBeenCalled()
  })

  it('nao cria pagamento quando valor aprovado diverge da intent local', async () => {
    const setup = createSetup()
    setup.mercadoPagoPoint.getOrder.mockResolvedValue(makeOrder({ paidAmount: 119 }))
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue(makeIntent())

    const result = await setup.service.handleWebhook(makeWebhookInput())

    expect(result).toEqual({ received: true, reconciled: false, status: 'FAILED' })
    expect(setup.prisma.comandaPayment.create).not.toHaveBeenCalled()
    expect(setup.prisma.paymentTerminalIntent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          errorCode: 'MERCADO_PAGO_POINT_AMOUNT_MISMATCH',
          status: PaymentTerminalIntentStatus.FAILED,
        }),
      }),
    )
  })

  it('aceita assinatura valida mesmo sem request id no webhook', async () => {
    const setup = createSetup()
    setup.mercadoPagoPoint.getOrder.mockResolvedValue(makeOrder())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue(makeIntent())
    setup.prisma.paymentTerminalIntent.updateMany.mockResolvedValue({ count: 0 })

    await expect(setup.service.handleWebhook(makeWebhookInput(signWebhook(ORDER_ID, null), null))).resolves.toEqual({
      received: true,
      reconciled: true,
      status: 'APPROVED',
    })
    expect(setup.mercadoPagoPoint.getOrder).toHaveBeenCalledWith(ORDER_ID)
  })

  it('preserva o case do id da order assinado pelo Mercado Pago', async () => {
    const setup = createSetup()
    setup.mercadoPagoPoint.getOrder.mockResolvedValue(makeOrder())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue(makeIntent())
    setup.prisma.paymentTerminalIntent.updateMany.mockResolvedValue({ count: 0 })

    await setup.service.handleWebhook(makeWebhookInput())

    expect(setup.mercadoPagoPoint.getOrder).toHaveBeenCalledWith(ORDER_ID)
  })

  it('aceita data.id quando o parser HTTP entrega query aninhada', async () => {
    const setup = createSetup()
    setup.mercadoPagoPoint.getOrder.mockResolvedValue(makeOrder())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue(makeIntent())
    setup.prisma.paymentTerminalIntent.updateMany.mockResolvedValue({ count: 0 })

    await setup.service.handleWebhook({
      ...makeWebhookInput(),
      body: {},
      query: { data: { id: ORDER_ID } },
    })

    expect(setup.mercadoPagoPoint.getOrder).toHaveBeenCalledWith(ORDER_ID)
  })
})
