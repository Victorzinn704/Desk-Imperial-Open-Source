import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { useMemo } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOperationsRealtime } from './use-operations-realtime'
import { OPERATIONS_LIVE_COMPACT_QUERY_KEY, OPERATIONS_SUMMARY_QUERY_KEY } from '@/lib/operations'
import { liveSnapshot, summarySnapshot } from './__fixtures__/operations-realtime.fixtures'

const { mockSocket, ioMock } = vi.hoisted(() => {
  const socket = {
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  }

  return {
    mockSocket: socket,
    ioMock: vi.fn(() => socket),
  }
})

vi.mock('socket.io-client', () => ({
  io: ioMock,
}))

function RealtimeHarness({
  queryClient: providedQueryClient,
}: Readonly<{
  queryClient?: QueryClient
}>) {
  const queryClient = useMemo(
    () =>
      providedQueryClient ??
      new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        }),
    [providedQueryClient],
  )

  useOperationsRealtime(true, queryClient)
  return null
}

describe('useOperationsRealtime socket wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('assina e limpa o evento comanda.closed no ciclo de vida do socket', () => {
    const { unmount } = render(<RealtimeHarness />)

    const closeSubscription = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'comanda.closed')
    expect(closeSubscription).toBeDefined()
    expect(closeSubscription?.[1]).toEqual(expect.any(Function))

    const closeHandler = closeSubscription?.[1]
    unmount()

    expect(mockSocket.off).toHaveBeenCalledWith('comanda.closed', closeHandler)
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
  })

  it('abre o socket operacional apenas por websocket sem fallback para polling', () => {
    render(<RealtimeHarness />)

    expect(ioMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        transports: ['websocket'],
        upgrade: false,
        timeout: 8_000,
      }),
    )
  })

  it('não refaz summary quando o patch local já sincroniza o resumo a partir do live snapshot', () => {
    vi.useFakeTimers()
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    queryClient.setQueryData(
      OPERATIONS_LIVE_COMPACT_QUERY_KEY,
      liveSnapshot({
        unassigned: {
          employeeId: null,
          employeeCode: null,
          displayName: 'Operação',
          active: true,
          cashSession: null,
          comandas: [],
        },
      }),
    )
    queryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, summarySnapshot())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    render(<RealtimeHarness queryClient={queryClient} />)
    const openedSubscription = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'comanda.opened')
    const openedHandler = openedSubscription?.[1] as ((envelope: unknown) => void) | undefined

    openedHandler?.({
      event: 'comanda.opened',
      payload: {
        businessDate: '2026-03-30',
        comandaId: 'c-99',
        items: [
          {
            id: 'i-99',
            productId: 'p-99',
            productName: 'Café',
            quantity: 1,
            unitPrice: 10,
            totalAmount: 10,
            notes: null,
            kitchenStatus: null,
            kitchenQueuedAt: null,
            kitchenReadyAt: null,
          },
        ],
        openedAt: '2026-03-30T10:00:00.000Z',
        status: 'OPEN',
        tableLabel: 'Mesa 9',
        totalAmount: 10,
      },
    })
    vi.advanceTimersByTime(2_000)

    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY })
    vi.useRealTimers()
  })
})
