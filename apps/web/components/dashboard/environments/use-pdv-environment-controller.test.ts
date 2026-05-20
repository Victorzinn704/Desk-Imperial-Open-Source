import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseDashboardQueries = vi.fn()
const mockUseOperationsRealtime = vi.fn()
const mockUseQuery = vi.fn()
const mockUseQueryClient = vi.fn()
const mockBuildOperationsViewModel = vi.fn()
const mockBuildPdvComandas = vi.fn()
const mockBuildPdvMesas = vi.fn()
const mockBuildPdvOperationalMetrics = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: 'keepPreviousData',
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => mockUseQueryClient(),
}))

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: (...args: unknown[]) => mockUseDashboardQueries(...args),
}))

vi.mock('@/components/operations/use-operations-realtime', () => ({
  useOperationsRealtime: (...args: unknown[]) => mockUseOperationsRealtime(...args),
}))

vi.mock('@/lib/operations', () => ({
  buildOperationsViewModel: (...args: unknown[]) => mockBuildOperationsViewModel(...args),
}))

vi.mock('@/components/pdv/pdv-operations', () => ({
  buildPdvComandas: (...args: unknown[]) => mockBuildPdvComandas(...args),
  buildPdvMesas: (...args: unknown[]) => mockBuildPdvMesas(...args),
}))

vi.mock('./pdv-environment.model', () => ({
  buildPdvOperationalMetrics: (...args: unknown[]) => mockBuildPdvOperationalMetrics(...args),
}))

import { usePdvEnvironmentController } from './use-pdv-environment-controller'

describe('usePdvEnvironmentController', () => {
  beforeEach(() => {
    mockUseQueryClient.mockReturnValue({ marker: 'query-client' })
    mockUseDashboardQueries.mockReturnValue({
      productsQuery: { data: { items: [] } },
      sessionQuery: {
        data: { user: { userId: 'user-1', role: 'OWNER' } },
        error: null,
        isLoading: false,
      },
    })
    mockUseQuery.mockReturnValue({
      data: undefined,
      dataUpdatedAt: 0,
      error: null,
      isFetching: false,
      isLoading: false,
    })
    mockUseOperationsRealtime.mockReturnValue({ status: 'connected' })
    mockBuildOperationsViewModel.mockReturnValue({ timelineItems: [] })
    mockBuildPdvComandas.mockReturnValue([])
    mockBuildPdvMesas.mockReturnValue([])
    mockBuildPdvOperationalMetrics.mockReturnValue([])
  })

  it('monta o realtime no PDV standalone quando ha sessao ativa', () => {
    renderHook(() => usePdvEnvironmentController('grid'))

    expect(mockUseOperationsRealtime).toHaveBeenCalledWith(
      true,
      { marker: 'query-client' },
      {
        currentUserId: 'user-1',
        notificationChannel: 'WEB_TOAST',
      },
    )
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchInterval: false,
      }),
    )
  })

  it('desabilita o realtime quando a sessao ainda nao esta autenticada', () => {
    mockUseDashboardQueries.mockReturnValue({
      productsQuery: { data: { items: [] } },
      sessionQuery: {
        data: { user: null },
        error: null,
        isLoading: false,
      },
    })

    renderHook(() => usePdvEnvironmentController('grid'))

    expect(mockUseOperationsRealtime).toHaveBeenCalledWith(
      false,
      { marker: 'query-client' },
      {
        currentUserId: null,
        notificationChannel: 'WEB_TOAST',
      },
    )
  })

  it('ativa fallback de polling curto quando o realtime cai', () => {
    mockUseOperationsRealtime.mockReturnValue({ status: 'disconnected' })

    renderHook(() => usePdvEnvironmentController('grid'))

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchInterval: 2500,
      }),
    )
  })
})
