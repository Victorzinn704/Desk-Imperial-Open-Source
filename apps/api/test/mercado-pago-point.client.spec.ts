import { ConfigService } from '@nestjs/config'
import { MercadoPagoPointClient } from '../src/modules/operations/mercado-pago-point.client'

function createClient() {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        MERCADO_PAGO_ACCESS_TOKEN: 'TEST-TOKEN',
        MERCADO_PAGO_ORDERS_URL: 'https://example.test/orders',
        MERCADO_PAGO_POINT_TERMINAL_ID: 'POINT-1',
      }
      return values[key]
    }),
  }

  return new MercadoPagoPointClient(config as unknown as ConfigService)
}

function mockSuccessfulOrder() {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 201,
    text: jest.fn(async () =>
      JSON.stringify({
        external_reference: 'desk-comanda-1',
        id: 'mp-order-1',
        status: 'created',
        transactions: { payments: [{ id: 'payment-1', status: 'pending' }] },
      }),
    ),
  } as unknown as Response)
}

function readFetchBody() {
  const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0]
  return JSON.parse(String(init.body))
}

describe('MercadoPagoPointClient', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('envia debito como cobranca direta de debit_card', async () => {
    mockSuccessfulOrder()

    await createClient().createOrder(makeInput({ method: 'DEBIT' }))

    expect(readFetchBody().config.payment_method).toEqual({ default_type: 'debit_card' })
  })

  it('mantem pix sem default_type para validar suporte no Point', async () => {
    mockSuccessfulOrder()

    await createClient().createOrder(makeInput({ method: 'PIX' }))

    expect(readFetchBody().config.payment_method).toBeUndefined()
  })

  it('explicita o codigo retornado pelo Mercado Pago quando a cobranca e recusada', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn(async () => JSON.stringify({ errors: [{ code: 'unsupported_properties' }] })),
    } as unknown as Response)

    await expect(createClient().createOrder(makeInput({ method: 'PIX' }))).rejects.toThrow(
      'Mercado Pago Point recusou a criacao da cobranca (unsupported_properties).',
    )
  })

  it('cancela ordem point pendente antes de substituir cobranca', async () => {
    mockSuccessfulOrder()

    await createClient().cancelOrder({ idempotencyKey: 'cancel-1', orderId: 'mp-order-1' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.test/orders/mp-order-1/cancel',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Idempotency-Key': 'cancel-1' }),
      }),
    )
  })

  it('trata ordem ja cancelada no Mercado Pago como cancelamento concluido', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 409,
      text: jest.fn(async () => JSON.stringify({ errors: [{ code: 'order_already_canceled' }] })),
    } as unknown as Response)

    await expect(createClient().cancelOrder({ idempotencyKey: 'cancel-1', orderId: 'mp-order-1' })).resolves.toEqual(
      expect.objectContaining({ orderId: 'mp-order-1', status: 'canceled' }),
    )
  })
})

function makeInput(overrides: Partial<Parameters<MercadoPagoPointClient['createOrder']>[0]> = {}) {
  return {
    amount: 12.5,
    description: 'Comanda Mesa 2',
    externalReference: 'desk-comanda-1',
    idempotencyKey: 'idempotency-1',
    method: 'DEBIT' as const,
    terminalId: 'POINT-1',
    ...overrides,
  }
}
