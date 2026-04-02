import { ServiceUnavailableException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { CurrencyService } from '../src/modules/currency/currency.service'

describe('CurrencyService', () => {
  const configValues: Record<string, string | undefined> = {}
  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  }

  const originalFetch = global.fetch
  let now = 1_700_000_000_000
  let service: CurrencyService

  beforeEach(() => {
    jest.clearAllMocks()

    configValues.EXCHANGE_RATES_URL = undefined
    configValues.EXCHANGE_RATES_API_KEY = undefined
    configValues.EXCHANGE_RATES_CACHE_SECONDS = '300'
    configValues.EXCHANGE_RATES_STALE_CACHE_SECONDS = '21600'
    configValues.EXCHANGE_RATES_RATE_LIMIT_BACKOFF_SECONDS = '600'
    configValues.EXCHANGE_RATES_FALLBACK_USD_BRL = '5.5'
    configValues.EXCHANGE_RATES_FALLBACK_EUR_BRL = '6'

    service = new CurrencyService(configService as unknown as ConfigService)
    ;(global as any).fetch = jest.fn()
    jest.spyOn(Date, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    ;(global as any).fetch = originalFetch
  })

  it('retorna snapshot live e reutiliza cache fresco', async () => {
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        USDBRL: { bid: '5.10', create_date: '2026-04-01 10:00:00' },
        EURBRL: { bid: '6.20', create_date: '2026-04-01 11:00:00' },
      }),
    })

    const first = await service.getSnapshot()
    now += 60_000
    const second = await service.getSnapshot()

    expect(first.source).toBe('live')
    expect(first.rates.USD_BRL).toBe(5.1)
    expect(first.rates.EUR_BRL).toBe(6.2)
    expect(second).toBe(first)
    expect((global as any).fetch).toHaveBeenCalledTimes(1)
  })

  it('usa URL customizada /last e injeta header de API key', async () => {
    configValues.EXCHANGE_RATES_URL = 'https://rates.example.com/last/'
    configValues.EXCHANGE_RATES_API_KEY = '  secret-key '
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        USDBRL: { bid: '5.00', create_date: '2026-04-01 09:00:00' },
      }),
    })

    await service.getSnapshot()

    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://rates.example.com/last/USD-BRL,EUR-BRL,BRL-USD,BRL-EUR,USD-EUR,EUR-USD',
      expect.objectContaining({
        headers: {
          'x-api-key': 'secret-key',
        },
      }),
    )
  })

  it('entra em stale-cache apos erro 429 e respeita retry-after', async () => {
    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        USDBRL: { bid: '5.10', create_date: '2026-04-01 10:00:00' },
      }),
    })

    await service.getSnapshot()

    now += 301_000
    ;(global as any).fetch.mockResolvedValueOnce({ ok: false, status: 429 })

    const staleAfter429 = await service.getSnapshot()
    expect(staleAfter429.source).toBe('stale-cache')
    expect(staleAfter429.notice).toContain('Cotacao ao vivo indisponivel')
    ;(global as any).fetch.mockClear()
    const staleByRetryWindow = await service.getSnapshot()

    expect(staleByRetryWindow.source).toBe('stale-cache')
    expect(staleByRetryWindow.notice).toContain('Limite temporario de consultas atingido')
    expect((global as any).fetch).not.toHaveBeenCalled()
  })

  it('usa stale-cache prolongado quando cache existe mesmo fora da janela stale', async () => {
    ;(global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        USDBRL: { bid: '5.20', create_date: '2026-04-01 10:00:00' },
      }),
    })

    await service.getSnapshot()

    now += 21_700_000
    ;(global as any).fetch.mockRejectedValueOnce(new Error('timeout'))

    const snapshot = await service.getSnapshot()
    expect(snapshot.source).toBe('stale-cache')
    expect(snapshot.notice).toContain('ultima leitura conhecida')
  })

  it('cai para fallback quando nao ha cache e a API falha', async () => {
    configValues.EXCHANGE_RATES_FALLBACK_USD_BRL = '-1'
    configValues.EXCHANGE_RATES_FALLBACK_EUR_BRL = 'abc'
    ;(global as any).fetch.mockRejectedValueOnce(new Error('network down'))

    const snapshot = await service.getSnapshot()

    expect(snapshot.source).toBe('fallback')
    expect(snapshot.updatedAt).toBeNull()
    expect(snapshot.rates.USD_BRL).toBe(5.5)
    expect(snapshot.rates.EUR_BRL).toBe(6)
  })

  it('converte valores por taxa direta, inversa e via moeda base', () => {
    const snapshot = {
      updatedAt: null,
      source: 'live',
      notice: null,
      rates: {
        USD_BRL: 5,
        EUR_BRL: 6,
      },
    }

    expect(service.convert(10, 'USD', 'USD', snapshot as any)).toBe(10)
    expect(service.convert(10, 'USD', 'BRL', snapshot as any)).toBe(50)
    expect(service.convert(10, 'BRL', 'USD', snapshot as any)).toBe(2)
    expect(service.convert(10, 'USD', 'EUR', snapshot as any)).toBe(8.33)

    expect(() =>
      service.convert(10, 'EUR', 'USD', {
        ...snapshot,
        rates: {},
      } as any),
    ).toThrow(ServiceUnavailableException)
  })

  it('retorna lista de moedas suportadas sem expor referencia mutavel', () => {
    const first = service.getSupportedCurrencies()
    ;(first as any).push('GBP')

    const second = service.getSupportedCurrencies()

    expect(second).toEqual(['BRL', 'USD', 'EUR'])
  })
})
