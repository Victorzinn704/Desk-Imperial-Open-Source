import { beforeEach, describe, expect, it, vi } from 'vitest'

const faroApiMock = vi.hoisted(() => ({
  pushError: vi.fn(),
  pushEvent: vi.fn(),
  pushMeasurement: vi.fn(),
}))

const initializeFaroMock = vi.hoisted(() => vi.fn((_options?: unknown) => ({ api: faroApiMock })))
const getWebInstrumentationsMock = vi.hoisted(() => vi.fn(() => []))
const fetchTransportConstructorMock = vi.hoisted(() => vi.fn())

vi.mock('@grafana/faro-web-sdk', () => ({
  FetchTransport: class {
    constructor(options: unknown) {
      fetchTransportConstructorMock(options)
    }
  },
  getWebInstrumentations: getWebInstrumentationsMock,
  initializeFaro: initializeFaroMock,
}))

async function loadFaroModule() {
  vi.resetModules()
  return import('./faro')
}

describe('faro telemetry behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_FARO_ALLOW_INSECURE_COLLECTOR
    delete process.env.NEXT_PUBLIC_FARO_SAMPLE_RATE
    delete process.env.NEXT_PUBLIC_FARO_SLOW_API_SAMPLE_RATE
    delete process.env.NEXT_PUBLIC_FARO_MAX_SIGNALS_PER_MINUTE
    delete process.env.NEXT_PUBLIC_FARO_ERROR_DEDUPE_WINDOW_MS

    Reflect.set(process.env, 'NODE_ENV', 'test')
    process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL = 'https://collector.example.com/collect'
  })

  it('initializes faro once and reuses the same instance', async () => {
    const faro = await loadFaroModule()

    const first = faro.initializeFrontendFaro()
    const second = faro.initializeFrontendFaro()

    expect(first).toBeTruthy()
    expect(second).toBe(first)
    expect(initializeFaroMock).toHaveBeenCalledTimes(1)
    expect(getWebInstrumentationsMock).toHaveBeenCalledTimes(1)
  })

  it('sanitizes transport items in beforeSend and returns the same item', async () => {
    const faro = await loadFaroModule()

    faro.initializeFrontendFaro()

    const config = initializeFaroMock.mock.calls.at(0)?.[0] as unknown as {
      beforeSend: (item: unknown) => unknown
    }

    const item = {
      payload: {
        context: {
          email: 'owner@example.com',
          path: '/orders/123456?secret=1',
        },
        attributes: {
          token: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        },
      },
    }

    expect(config).toBeTruthy()

    const returned = config.beforeSend(item)

    expect(returned).toBe(item)
    expect(item).toEqual({
      payload: {
        context: {
          email: '[redacted]',
          path: '/orders/:id',
        },
        attributes: {
          token: '[redacted]',
        },
      },
    })
  })

  it('sanitizes and deduplicates repeated api errors', async () => {
    const faro = await loadFaroModule()

    faro.reportApiErrorToFaro(new Error('boom'), {
      path: '/orders/123/token/ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      method: 'post',
      status: 500,
      requestId: ' req-1 ',
    })

    faro.reportApiErrorToFaro(new Error('boom'), {
      path: '/orders/123/token/ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      method: 'post',
      status: 500,
      requestId: ' req-1 ',
    })

    expect(faroApiMock.pushError).toHaveBeenCalledTimes(1)
    expect(faroApiMock.pushEvent).toHaveBeenCalledTimes(1)

    const context = faroApiMock.pushError.mock.calls[0]?.[1] as { context: Record<string, string> }
    expect(context.context).toEqual(
      expect.objectContaining({
        method: 'POST',
        path: '/orders/:id/token/:token',
        status: '500',
        requestId: 'req-1',
      }),
    )
  })

  it('reports frontend exceptions with dedupe', async () => {
    const faro = await loadFaroModule()

    faro.reportFrontendExceptionToFaro(new Error('render failed'), {
      component: 'DashboardPage',
      digest: 'abc123',
    })

    faro.reportFrontendExceptionToFaro(new Error('render failed'), {
      component: 'DashboardPage',
      digest: 'abc123',
    })

    expect(faroApiMock.pushError).toHaveBeenCalledTimes(1)
    expect(faroApiMock.pushEvent).toHaveBeenCalledWith(
      'frontend_exception',
      expect.objectContaining({ component: 'DashboardPage', digest: 'abc123' }),
      'desk-imperial-web',
    )
  })

  it('reports measurement and slow event for slow api requests', async () => {
    const faro = await loadFaroModule()

    faro.reportApiRequestMeasurementToFaro({
      path: '/orders/123',
      method: 'get',
      status: 200,
      durationMs: 1600,
      requestId: ' req-2 ',
    })

    expect(faroApiMock.pushMeasurement).toHaveBeenCalledTimes(1)
    expect(faroApiMock.pushEvent).toHaveBeenCalledWith(
      'api_slow_request',
      expect.objectContaining({
        method: 'GET',
        path: '/orders/:id',
        requestId: 'req-2',
        status: '200',
      }),
      'desk-imperial-web',
    )
  })

  it('skips healthy fast requests when sample rate is zero and keeps server errors', async () => {
    process.env.NEXT_PUBLIC_FARO_SLOW_API_SAMPLE_RATE = '0'
    const faro = await loadFaroModule()

    faro.reportApiRequestMeasurementToFaro({
      path: '/orders/123',
      method: 'get',
      status: 200,
      durationMs: 100,
      requestId: null,
    })

    expect(faroApiMock.pushMeasurement).not.toHaveBeenCalled()

    faro.reportApiRequestMeasurementToFaro({
      path: '/orders/123',
      method: 'get',
      status: 503,
      durationMs: 100,
      requestId: null,
    })

    expect(faroApiMock.pushMeasurement).toHaveBeenCalledTimes(1)
  })

  it('samples healthy fast requests when random is within the configured rate', async () => {
    process.env.NEXT_PUBLIC_FARO_SLOW_API_SAMPLE_RATE = '1'
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const faro = await loadFaroModule()

    faro.reportApiRequestMeasurementToFaro({
      path: '/orders/123',
      method: 'get',
      status: 200,
      durationMs: 100,
      requestId: null,
    })

    expect(faroApiMock.pushMeasurement).toHaveBeenCalledTimes(1)
    expect(faroApiMock.pushEvent).not.toHaveBeenCalledWith(
      'api_slow_request',
      expect.anything(),
      'desk-imperial-web',
    )

    randomSpy.mockRestore()
  })

  it('does not initialize when collector url is missing', async () => {
    delete process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL
    const faro = await loadFaroModule()

    expect(faro.initializeFrontendFaro()).toBeNull()
    expect(initializeFaroMock).not.toHaveBeenCalled()
  })
})
