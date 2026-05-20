import {
  ComandaPaymentMethod,
  ComandaStatus,
  PaymentTerminalIntentStatus,
  PaymentTerminalProvider,
} from '@prisma/client'
import { ServiceUnavailableException } from '@nestjs/common'
import { makeOwnerAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'
import { ComandaTerminalPaymentService } from '../src/modules/operations/comanda-terminal-payment.service'

const OWNER_ID = 'owner-1'
const COMANDA_ID = 'comanda-1'

function makeComanda(overrides: Record<string, unknown> = {}) {
  return {
    cashSessionId: 'cash-1',
    companyOwnerId: OWNER_ID,
    currentEmployeeId: null,
    id: COMANDA_ID,
    items: [],
    payments: [],
    status: ComandaStatus.OPEN,
    tableLabel: 'Mesa 1',
    totalAmount: 120,
    ...overrides,
  }
}

function makeIntent(overrides: Record<string, unknown> = {}) {
  return {
    amount: 120,
    comandaId: COMANDA_ID,
    createdAt: new Date('2026-05-03T18:00:00.000Z'),
    expiresAt: new Date('2026-05-03T18:15:00.000Z'),
    externalReference: 'desk-11111111-1111-4111-8111-111111111111',
    id: 'terminal-intent-1',
    idempotencyKey: '22222222-2222-4222-8222-222222222222',
    method: ComandaPaymentMethod.CREDIT,
    provider: PaymentTerminalProvider.MERCADO_PAGO_POINT,
    providerOrderId: null,
    providerPaymentId: null,
    providerStatus: null,
    providerTerminalId: 'POINT-1',
    status: PaymentTerminalIntentStatus.PENDING,
    ...overrides,
  }
}

function createSetup() {
  const prisma = {
    comandaPayment: {
      create: jest.fn(),
    },
    paymentTerminalIntent: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  }
  const audit = {
    record: jest.fn(async () => {}),
  }
  const context = {
    assertOpenForPayment: jest.fn(),
    resolve: jest.fn(async (auth) => ({ actorEmployee: null, auth, workspaceOwnerUserId: OWNER_ID })),
  }
  const helpers = {
    requireAuthorizedComanda: jest.fn(),
  }
  const terminalPaymentProvider = {
    assertConfigured: jest.fn(),
    cancelOrder: jest.fn(),
    createOrder: jest.fn(),
    enqueueOrderCreation: jest.fn(async () => false),
    getDefaultTerminalId: jest.fn(() => 'POINT-1'),
  }
  const service = new ComandaTerminalPaymentService(
    prisma as never,
    audit as never,
    context as never,
    helpers as never,
    terminalPaymentProvider as never,
  )

  return { audit, context, helpers, prisma, service, terminalPaymentProvider }
}

describe('ComandaTerminalPaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('cria intent pendente na maquininha sem confirmar pagamento local', async () => {
    const setup = createSetup()
    const intent = makeIntent()
    setup.helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue(null)
    setup.prisma.paymentTerminalIntent.create.mockResolvedValue(intent)
    setup.terminalPaymentProvider.createOrder.mockResolvedValue({
      orderId: 'mp-order-1',
      paymentId: 'mp-payment-1',
      status: 'created',
    })
    setup.prisma.paymentTerminalIntent.update.mockResolvedValue(
      makeIntent({ providerOrderId: 'mp-order-1', providerPaymentId: 'mp-payment-1', providerStatus: 'created' }),
    )

    const result = await setup.service.createIntent({
      auth: makeOwnerAuthContext({ workspaceOwnerUserId: OWNER_ID }),
      comandaId: COMANDA_ID,
      context: makeRequestContext(),
      dto: { method: 'CREDIT' },
    })

    expect(result.terminalPaymentIntent).toEqual(
      expect.objectContaining({ providerOrderId: 'mp-order-1', status: 'PENDING', terminalId: 'POINT-1' }),
    )
    expect(setup.terminalPaymentProvider.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 120, method: 'CREDIT', terminalId: 'POINT-1' }),
    )
    expect(setup.prisma.comandaPayment.create).not.toHaveBeenCalled()
    expect(setup.audit.record).toHaveBeenCalledTimes(1)
  })

  it('enfileira criacao de order quando Redis esta pronto para resposta rapida no PWA', async () => {
    const setup = createSetup()
    const intent = makeIntent()
    setup.terminalPaymentProvider.enqueueOrderCreation.mockResolvedValue(true)
    setup.helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue(null)
    setup.prisma.paymentTerminalIntent.create.mockResolvedValue(intent)

    const result = await setup.service.createIntent({
      auth: makeOwnerAuthContext({ workspaceOwnerUserId: OWNER_ID }),
      comandaId: COMANDA_ID,
      context: makeRequestContext(),
      dto: { method: 'DEBIT' },
    })

    expect(result.terminalPaymentIntent).toEqual(
      expect.objectContaining({ providerOrderId: null, status: 'PENDING', terminalId: 'POINT-1' }),
    )
    expect(setup.terminalPaymentProvider.enqueueOrderCreation).toHaveBeenCalledWith(
      expect.objectContaining({ intentId: intent.id }),
    )
    expect(setup.terminalPaymentProvider.createOrder).not.toHaveBeenCalled()
    expect(setup.audit.record).not.toHaveBeenCalled()
  })

  it('bloqueia nova intent quando a comanda ja tem cobranca pendente', async () => {
    const setup = createSetup()
    setup.helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue({ id: 'terminal-intent-pending' })

    await expect(
      setup.service.createIntent({
        auth: makeOwnerAuthContext({ workspaceOwnerUserId: OWNER_ID }),
        comandaId: COMANDA_ID,
        context: makeRequestContext(),
        dto: { method: 'DEBIT' },
      }),
    ).rejects.toThrow('Esta comanda ja possui uma cobranca pendente na maquininha.')

    expect(setup.prisma.paymentTerminalIntent.create).not.toHaveBeenCalled()
    expect(setup.terminalPaymentProvider.createOrder).not.toHaveBeenCalled()
  })

  it('substitui intent pendente quando operador troca a cobranca', async () => {
    const setup = createSetup()
    const intent = makeIntent()
    setup.helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue({
      id: 'terminal-intent-pending',
      providerOrderId: 'mp-order-old',
    })
    setup.prisma.paymentTerminalIntent.updateMany.mockResolvedValue({ count: 1 })
    setup.prisma.paymentTerminalIntent.create.mockResolvedValue(intent)
    setup.terminalPaymentProvider.createOrder.mockResolvedValue({
      orderId: 'mp-order-new',
      paymentId: 'mp-payment-new',
      status: 'created',
    })
    setup.prisma.paymentTerminalIntent.update.mockResolvedValue(
      makeIntent({ providerOrderId: 'mp-order-new', providerPaymentId: 'mp-payment-new', providerStatus: 'created' }),
    )

    await setup.service.createIntent({
      auth: makeOwnerAuthContext({ workspaceOwnerUserId: OWNER_ID }),
      comandaId: COMANDA_ID,
      context: makeRequestContext(),
      dto: { method: 'PIX', replacePending: true },
    })

    expect(setup.terminalPaymentProvider.cancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'mp-order-old' }),
    )
    expect(setup.prisma.paymentTerminalIntent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PaymentTerminalIntentStatus.CANCELLED }),
        where: expect.objectContaining({ id: 'terminal-intent-pending', status: PaymentTerminalIntentStatus.PENDING }),
      }),
    )
    expect(setup.terminalPaymentProvider.createOrder).toHaveBeenCalledWith(expect.objectContaining({ method: 'PIX' }))
  })

  it('nao cria intent quando Mercado Pago Point nao esta configurado', async () => {
    const setup = createSetup()
    setup.helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    setup.prisma.paymentTerminalIntent.findFirst.mockResolvedValue(null)
    setup.terminalPaymentProvider.assertConfigured.mockImplementation(() => {
      throw new ServiceUnavailableException('Mercado Pago Point nao esta configurado.')
    })

    await expect(
      setup.service.createIntent({
        auth: makeOwnerAuthContext({ workspaceOwnerUserId: OWNER_ID }),
        comandaId: COMANDA_ID,
        context: makeRequestContext(),
        dto: { method: 'PIX', terminalId: 'POINT-2' },
      }),
    ).rejects.toThrow('Mercado Pago Point nao esta configurado.')

    expect(setup.prisma.paymentTerminalIntent.create).not.toHaveBeenCalled()
    expect(setup.terminalPaymentProvider.createOrder).not.toHaveBeenCalled()
  })
})
