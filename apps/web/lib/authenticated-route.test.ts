import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMobileViewport, resolveAuthenticatedRoute } from './authenticated-route'

describe('authenticated-route', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('mantém celulares com viewport estreita no shell mobile', () => {
    expect(resolveAuthenticatedRoute('OWNER', 430)).toBe('/app/owner')
    expect(isMobileViewport(430)).toBe(true)
  })

  it('força shell mobile em dispositivo com user agent móvel mesmo com viewport maior', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(((query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia)
    vi.stubGlobal(
      'navigator',
      Object.create(navigator, {
        userAgent: {
          configurable: true,
          value:
            'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Mobile Safari/537.36',
        },
      }),
    )

    expect(resolveAuthenticatedRoute('OWNER', 1024)).toBe('/app/owner')
    expect(isMobileViewport(1024)).toBe(true)
  })

  it('mantém desktop no design-lab quando não há sinais reais de dispositivo móvel', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia)

    expect(resolveAuthenticatedRoute('OWNER', 1366)).toBe('/design-lab/overview')
    expect(resolveAuthenticatedRoute('STAFF', 1366)).toBe('/design-lab/pdv')
  })
})
