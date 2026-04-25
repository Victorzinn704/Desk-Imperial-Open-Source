import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import * as api from '@/lib/api'
import { buildComanda, buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'
import { OPERATIONS_LIVE_COMPACT_QUERY_KEY } from '@/lib/operations'
import { useOwnerMobileShellMutations } from './use-owner-mobile-shell-mutations'

vi.mock('@/lib/api', () => ({
  addComandaItem: vi.fn(),
  addComandaItems: vi.fn(),
  closeComanda: vi.fn(),
  createComandaPayment: vi.fn(),
  logout: vi.fn(),
  openCashSession: vi.fn(),
  openComanda: vi.fn(),
  updateComandaStatus: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/components/shared/haptic', () => ({
  haptic: {
    success: vi.fn(),
    error: vi.fn(),
    light: vi.fn(),
    medium: vi.fn(),
    heavy: vi.fn(),
  },
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useOwnerMobileShellMutations', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('aplica snapshot otimista ao abrir uma nova comanda', async () => {
    const snapshot = buildOperationsSnapshot({
      employees: [],
      unassigned: { comandas: [] },
      mesas: [buildMesaRecord({ id: 'mesa-2', label: 'Mesa 2', status: 'livre', comandaId: null })],
    })
    queryClient.setQueryData(OPERATIONS_LIVE_COMPACT_QUERY_KEY, snapshot)

    const request = createDeferred<Awaited<ReturnType<typeof api.openComanda>>>()
    vi.mocked(api.openComanda).mockReturnValue(request.promise)

    const { result } = renderHook(() => useOwnerMobileShellMutations(queryClient, { push: vi.fn() }), {
      wrapper: createWrapper(queryClient),
    })

    let mutationPromise!: Promise<unknown>
    act(() => {
      mutationPromise = result.current.openComandaMutation.mutateAsync({
        mesaId: 'mesa-2',
        tableLabel: '2',
        items: [{ productId: 'prod-1', quantity: 2, unitPrice: 5 }],
      })
    })

    await waitFor(() => {
      const optimistic = queryClient.getQueryData<typeof snapshot>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
      expect(optimistic?.unassigned.comandas).toHaveLength(1)
      expect(optimistic?.unassigned.comandas[0]?.tableLabel).toBe('2')
      expect(optimistic?.mesas[0]?.status).toBe('ocupada')
    })

    request.resolve({
      comanda: buildComanda({
        id: 'c-2',
        mesaId: 'mesa-2',
        tableLabel: '2',
        items: [{ productId: 'prod-1', quantity: 2, unitPrice: 5 }],
      }),
    })

    await act(async () => {
      await mutationPromise
    })

    await waitFor(() => {
      expect(result.current.openComandaMutation.isSuccess).toBe(true)
    })
  })

  it('aplica item otimista ao adicionar itens em comanda existente', async () => {
    const snapshot = buildOperationsSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          displayName: 'Marina',
          comandas: [
            buildComanda({
              id: 'c-1',
              mesaId: 'mesa-1',
              tableLabel: '1',
              currentEmployeeId: 'emp-1',
              items: [{ id: 'item-1', productId: 'prod-base', productName: 'Base', quantity: 1, unitPrice: 10 }],
            }),
          ],
        },
      ],
      mesas: [buildMesaRecord({ id: 'mesa-1', label: 'Mesa 1', status: 'ocupada', comandaId: 'c-1' })],
    })
    queryClient.setQueryData(OPERATIONS_LIVE_COMPACT_QUERY_KEY, snapshot)

    const request = createDeferred<Awaited<ReturnType<typeof api.addComandaItems>>>()
    vi.mocked(api.addComandaItems).mockReturnValue(request.promise)

    const { result } = renderHook(() => useOwnerMobileShellMutations(queryClient, { push: vi.fn() }), {
      wrapper: createWrapper(queryClient),
    })

    let mutationPromise!: Promise<unknown>
    act(() => {
      mutationPromise = result.current.addComandaItemsMutation.mutateAsync({
        comandaId: 'c-1',
        items: [{ productName: 'Suco', quantity: 2, unitPrice: 6 }],
      })
    })

    await waitFor(() => {
      const optimistic = queryClient.getQueryData<typeof snapshot>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
      const comanda = optimistic?.employees[0]?.comandas[0]
      expect(comanda?.items).toHaveLength(2)
      expect(comanda?.subtotalAmount).toBe(22)
      expect(comanda?.totalAmount).toBe(22)
    })

    request.resolve({
      comanda: buildComanda({
        id: 'c-1',
        mesaId: 'mesa-1',
        tableLabel: '1',
        currentEmployeeId: 'emp-1',
        items: [
          { id: 'item-1', productId: 'prod-base', productName: 'Base', quantity: 1, unitPrice: 10 },
          { id: 'item-2', productName: 'Suco', quantity: 2, unitPrice: 6 },
        ],
      }),
    })

    await act(async () => {
      await mutationPromise
    })

    await waitFor(() => {
      expect(result.current.addComandaItemsMutation.isSuccess).toBe(true)
    })
  })

  it('fecha a comanda de forma otimista e libera a mesa antes do roundtrip', async () => {
    const snapshot = buildOperationsSnapshot({
      employees: [],
      unassigned: {
        comandas: [
          buildComanda({
            id: 'c-1',
            mesaId: 'mesa-1',
            tableLabel: '1',
            items: [{ id: 'item-1', productName: 'Base', quantity: 1, unitPrice: 10 }],
          }),
        ],
      },
      mesas: [buildMesaRecord({ id: 'mesa-1', label: 'Mesa 1', status: 'ocupada', comandaId: 'c-1' })],
    })
    queryClient.setQueryData(OPERATIONS_LIVE_COMPACT_QUERY_KEY, snapshot)

    const request = createDeferred<Awaited<ReturnType<typeof api.closeComanda>>>()
    vi.mocked(api.closeComanda).mockReturnValue(request.promise)

    const { result } = renderHook(() => useOwnerMobileShellMutations(queryClient, { push: vi.fn() }), {
      wrapper: createWrapper(queryClient),
    })

    let mutationPromise!: Promise<unknown>
    act(() => {
      mutationPromise = result.current.closeComandaMutation.mutateAsync({
        comandaId: 'c-1',
        discountAmount: 0,
        serviceFeeAmount: 0,
      })
    })

    await waitFor(() => {
      const optimistic = queryClient.getQueryData<typeof snapshot>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
      expect(optimistic?.unassigned.comandas[0]?.status).toBe('CLOSED')
      expect(optimistic?.mesas[0]?.status).toBe('livre')
      expect(optimistic?.mesas[0]?.comandaId).toBeNull()
    })

    request.resolve({
      comanda: buildComanda({
        id: 'c-1',
        mesaId: 'mesa-1',
        tableLabel: '1',
        status: 'CLOSED',
        closedAt: '2026-03-28T12:30:00.000Z',
        items: [{ id: 'item-1', productName: 'Base', quantity: 1, unitPrice: 10 }],
      }),
    })

    await act(async () => {
      await mutationPromise
    })

    await waitFor(() => {
      expect(result.current.closeComandaMutation.isSuccess).toBe(true)
    })
  })

  it('faz rollback do snapshot otimista se adicionar itens falhar', async () => {
    const snapshot = buildOperationsSnapshot({
      employees: [],
      unassigned: {
        comandas: [
          buildComanda({
            id: 'c-1',
            mesaId: 'mesa-1',
            tableLabel: '1',
            items: [{ id: 'item-1', productName: 'Base', quantity: 1, unitPrice: 10 }],
          }),
        ],
      },
      mesas: [buildMesaRecord({ id: 'mesa-1', label: 'Mesa 1', status: 'ocupada', comandaId: 'c-1' })],
    })
    queryClient.setQueryData(OPERATIONS_LIVE_COMPACT_QUERY_KEY, snapshot)

    const request = createDeferred<Awaited<ReturnType<typeof api.addComandaItems>>>()
    vi.mocked(api.addComandaItems).mockReturnValue(request.promise)

    const { result } = renderHook(() => useOwnerMobileShellMutations(queryClient, { push: vi.fn() }), {
      wrapper: createWrapper(queryClient),
    })

    let mutationPromise!: Promise<unknown>
    act(() => {
      mutationPromise = result.current.addComandaItemsMutation.mutateAsync({
        comandaId: 'c-1',
        items: [{ productName: 'Suco', quantity: 2, unitPrice: 6 }],
      })
    })

    await waitFor(() => {
      expect(
        queryClient.getQueryData<typeof snapshot>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)?.unassigned.comandas[0]?.items,
      ).toHaveLength(2)
    })

    request.reject(new Error('Falhou'))

    await act(async () => {
      await expect(mutationPromise).rejects.toThrow('Falhou')
    })

    const restored = queryClient.getQueryData<typeof snapshot>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
    expect(restored?.unassigned.comandas[0]?.items).toHaveLength(1)
    expect(restored?.unassigned.comandas[0]?.subtotalAmount).toBe(10)
  })
})
