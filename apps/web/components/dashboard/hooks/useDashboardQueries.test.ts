import { describe, expect, it, vi } from 'vitest'

// Mock react-query
const mockUseQuery = vi.fn()
vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: 'keepPreviousData',
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

// Mock API functions
vi.mock('@/lib/api', () => ({
  fetchConsentOverview: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchEmployees: vi.fn(),
  fetchFinanceSummary: vi.fn(),
  fetchOrders: vi.fn(),
  fetchProducts: vi.fn(),
}))

import { renderHook } from '@testing-library/react'
import { useDashboardQueries, useDashboardScopedQueries } from './useDashboardQueries'

describe('useDashboardQueries', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useDashboardQueries (main)', () => {
    it('calls useQuery for session (auth/me)', () => {
      renderHook(() => useDashboardQueries())

      const sessionCall = mockUseQuery.mock.calls.find((call: unknown[]) => {
        const opts = call[0] as { queryKey: string[] }
        return opts.queryKey[0] === 'auth' && opts.queryKey[1] === 'me'
      })
      expect(sessionCall).toBeDefined()
    })

    it('passes section to scoped queries', () => {
      renderHook(() => useDashboardQueries({ section: 'financeiro' }))
      // Should still invoke all expected queries
      expect(mockUseQuery).toHaveBeenCalled()
    })

    it('returns sessionQuery and all scoped queries', () => {
      mockUseQuery.mockReturnValue({ data: { user: { userId: '123', role: 'OWNER' } }, isLoading: false })
      const { result } = renderHook(() => useDashboardQueries())
      expect(result.current).toHaveProperty('sessionQuery')
      expect(result.current).toHaveProperty('consentQuery')
      expect(result.current).toHaveProperty('productsQuery')
      expect(result.current).toHaveProperty('ordersQuery')
      expect(result.current).toHaveProperty('employeesQuery')
      expect(result.current).toHaveProperty('financeQuery')
    })
  })

  describe('useDashboardScopedQueries', () => {
    it('enables consent query for settings section', () => {
      renderHook(() => useDashboardScopedQueries({ userId: '123', isOwner: true, section: 'settings' }))

      const consentCall = mockUseQuery.mock.calls.find((call: unknown[]) => {
        const opts = call[0] as { queryKey: string[]; enabled: boolean }
        return opts.queryKey[0] === 'consent'
      })
      expect(consentCall).toBeDefined()
      expect((consentCall![0] as { enabled: boolean }).enabled).toBe(true)
    })

    it('disables consent query for non-settings section', () => {
      renderHook(() => useDashboardScopedQueries({ userId: '123', isOwner: true, section: 'financeiro' }))

      const consentCall = mockUseQuery.mock.calls.find((call: unknown[]) => {
        const opts = call[0] as { queryKey: string[] }
        return opts.queryKey[0] === 'consent'
      })
      expect(consentCall).toBeDefined()
      expect((consentCall![0] as { enabled: boolean }).enabled).toBe(false)
    })

    it('enables products for overview, financeiro, pedidos, sales, portfolio and pdv sections', () => {
      for (const section of ['overview', 'financeiro', 'pedidos', 'sales', 'portfolio', 'pdv'] as const) {
        mockUseQuery.mockClear()
        renderHook(() => useDashboardScopedQueries({ userId: '123', isOwner: true, section }))

        const productsCall = mockUseQuery.mock.calls.find((call: unknown[]) => {
          const opts = call[0] as { queryKey: string[] }
          return opts.queryKey[0] === 'products'
        })
        expect(productsCall).toBeDefined()
        expect((productsCall![0] as { enabled: boolean }).enabled).toBe(true)
      }
    })

    it('disables products for settings section', () => {
      renderHook(() => useDashboardScopedQueries({ userId: '123', isOwner: true, section: 'settings' }))

      const productsCall = mockUseQuery.mock.calls.find((call: unknown[]) => {
        const opts = call[0] as { queryKey: string[] }
        return opts.queryKey[0] === 'products'
      })
      expect((productsCall![0] as { enabled: boolean }).enabled).toBe(false)
    })

    it('enables orders for overview, financeiro, pedidos, sales and map', () => {
      for (const section of ['overview', 'financeiro', 'pedidos', 'sales', 'map'] as const) {
        mockUseQuery.mockClear()
        renderHook(() => useDashboardScopedQueries({ userId: '123', isOwner: true, section }))

        const ordersCall = mockUseQuery.mock.calls.find((call: unknown[]) => {
          const opts = call[0] as { queryKey: string[] }
          return opts.queryKey[0] === 'orders'
        })
        expect((ordersCall![0] as { enabled: boolean }).enabled).toBe(true)
      }

      // Should be disabled for portfolio
      mockUseQuery.mockClear()
      renderHook(() => useDashboardScopedQueries({ userId: '123', isOwner: true, section: 'portfolio' }))
      const ordersCall = mockUseQuery.mock.calls.find((call: unknown[]) => {
        const opts = call[0] as { queryKey: string[] }
        return opts.queryKey[0] === 'orders'
      })
      expect((ordersCall![0] as { enabled: boolean }).enabled).toBe(false)
    })

    it('disables employee and finance queries for non-owner', () => {
      renderHook(() => useDashboardScopedQueries({ userId: '123', isOwner: false, section: 'overview' }))

      const employeesCall = mockUseQuery.mock.calls.find((call: unknown[]) => {
        const opts = call[0] as { queryKey: string[] }
        return opts.queryKey[0] === 'employees'
      })
      const financeCall = mockUseQuery.mock.calls.find((call: unknown[]) => {
        const opts = call[0] as { queryKey: string[] }
        return opts.queryKey[0] === 'finance'
      })
      // isOwner=false, so enabled should be false
      expect((employeesCall![0] as { enabled: boolean }).enabled).toBe(false)
      expect((financeCall![0] as { enabled: boolean }).enabled).toBe(false)
    })

    it('disables all queries when userId is undefined', () => {
      renderHook(() => useDashboardScopedQueries({ userId: undefined, isOwner: true }))

      // All queries should have enabled=false since Boolean(undefined) is false
      for (const call of mockUseQuery.mock.calls) {
        const opts = call[0] as { enabled: boolean }
        expect(opts.enabled).toBe(false)
      }
    })

    it('enables all queries for undefined section (full dashboard)', () => {
      renderHook(() => useDashboardScopedQueries({ userId: '123', isOwner: true, section: undefined }))

      // All 5 queries should be enabled
      for (const call of mockUseQuery.mock.calls) {
        const opts = call[0] as { enabled: boolean }
        expect(opts.enabled).toBe(true)
      }
    })
  })
})
