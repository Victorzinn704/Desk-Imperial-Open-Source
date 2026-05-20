import { MercadoPagoWebhookController } from '../src/modules/operations/mercado-pago-webhook.controller'

function makeRequest() {
  return {
    get: jest.fn(() => null),
    headers: {},
    ip: undefined,
  }
}

function createController(runtimeReady = true) {
  const reconcile = {
    handleWebhook: jest.fn(async () => ({ received: true })),
    validateWebhook: jest.fn(() => 'order-1'),
  }
  const runtime = {
    enqueueWebhook: jest.fn(async () => true),
    isReady: jest.fn(() => runtimeReady),
  }
  const controller = new MercadoPagoWebhookController(reconcile as never, runtime as never)
  return { controller, reconcile, runtime }
}

describe('MercadoPagoWebhookController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('responde rapido e enfileira webhook valido quando Redis esta pronto', async () => {
    const { controller, reconcile, runtime } = createController(true)

    await expect(
      controller.handleWebhook(
        { data: { id: 'order-1' } },
        'request-1',
        'ts=1,v1=signature',
        { 'data.id': 'order-1' },
        makeRequest() as never,
      ),
    ).resolves.toEqual({ accepted: true, received: true })

    expect(reconcile.validateWebhook).toHaveBeenCalledTimes(1)
    expect(reconcile.handleWebhook).not.toHaveBeenCalled()
    expect(runtime.enqueueWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { data: { id: 'order-1' } },
        receivedAt: expect.any(String),
        requestId: 'request-1',
        signature: 'ts=1,v1=signature',
      }),
    )
  })

  it('mantem ACK rapido e processa em fallback local quando Redis esta indisponivel', async () => {
    const { controller, reconcile, runtime } = createController(false)

    await expect(
      controller.handleWebhook(
        { data: { id: 'order-1' } },
        'request-1',
        'ts=1,v1=signature',
        { 'data.id': 'order-1' },
        makeRequest() as never,
      ),
    ).resolves.toEqual({ accepted: true, mode: 'inline-fallback', received: true })

    expect(runtime.enqueueWebhook).not.toHaveBeenCalled()
    expect(reconcile.handleWebhook).toHaveBeenCalledTimes(1)
  })
})
