import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { useDashboardMutations } from './useDashboardMutations'
import * as api from '@/lib/api'
import type { AuthUser } from '@/lib/api'
import { clearAdminPinVerification } from '@/lib/admin-pin'
import { invalidateOperationsWorkspace, OPERATIONS_LIVE_QUERY_PREFIX } from '@/lib/operations'

vi.mock('@/lib/api', () => ({
  archiveEmployee: vi.fn(),
  archiveProduct: vi.fn(),
  cancelOrder: vi.fn(),
  createEmployee: vi.fn(),
  createOrder: vi.fn(),
  createProduct: vi.fn(),
  deleteProductPermanently: vi.fn(),
  importProducts: vi.fn(),
  logout: vi.fn(),
  restoreEmployee: vi.fn(),
  restoreProduct: vi.fn(),
  updateCookiePreferences: vi.fn(),
  updateProduct: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock('@/lib/admin-pin', () => ({
  clearAdminPinVerification: vi.fn(),
}))

vi.mock('@/lib/operations', () => ({
  OPERATIONS_LIVE_QUERY_PREFIX: ['operations', 'live', 'compact'],
  invalidateOperationsWorkspace: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useDashboardMutations', () => {
  let queryClient: QueryClient

  const authUser: AuthUser = {
    userId: 'owner-1',
    sessionId: 'session-1',
    role: 'OWNER',
    workspaceOwnerUserId: 'owner-1',
    companyOwnerUserId: null,
    employeeId: null,
    employeeCode: null,
    fullName: 'Joao',
    companyName: 'Desk Imperial',
    companyLocation: {
      streetLine1: null,
      streetNumber: null,
      addressComplement: null,
      district: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
      latitude: null,
      longitude: null,
      precision: 'city',
    },
    workforce: {
      hasEmployees: true,
      employeeCount: 3,
    },
    email: 'owner@deskimperial.test',
    emailVerified: true,
    preferredCurrency: 'USD',
    status: 'ACTIVE',
    evaluationAccess: null,
    cookiePreferences: {
      necessary: true,
      analytics: true,
      marketing: false,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    })
  })

  it('invalida auth, finance, products, orders e operations após updateProfile', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const payload: Awaited<ReturnType<typeof api.updateProfile>> = {
      user: authUser,
    }

    vi.mocked(api.updateProfile).mockResolvedValue(payload)

    const { result } = renderHook(() => useDashboardMutations(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.updateProfileMutation.mutateAsync({
        fullName: 'Joao',
        companyName: 'Desk Imperial',
        preferredCurrency: 'USD',
      })
    })

    expect(queryClient.getQueryData(['auth', 'me'])).toEqual(payload)
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['finance'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['products'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['orders'] })
    expect(invalidateOperationsWorkspace).toHaveBeenCalledWith(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeOrders: true,
      includeFinance: true,
    })
  })

  it('limpa o pin administrativo ao concluir logout', async () => {
    vi.mocked(api.logout).mockResolvedValue({ success: true })
    const clearSpy = vi.spyOn(queryClient, 'clear')

    const { result } = renderHook(() => useDashboardMutations(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.logoutMutation.mutateAsync()
    })

    expect(clearSpy).toHaveBeenCalled()
    expect(clearAdminPinVerification).toHaveBeenCalled()
  })
})
