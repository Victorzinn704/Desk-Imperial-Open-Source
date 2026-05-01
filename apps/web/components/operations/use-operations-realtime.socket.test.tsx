import { QueryClient } from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react'
import { useMemo } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { USER_NOTIFICATION_PREFERENCES_QUERY_KEY } from '@/lib/api'
import { getOperationsPerformanceEvents, resetOperationsPerformanceEvents } from '@/lib/operations/operations-performance-diagnostics'
import { useOperationsRealtime } from './use-operations-realtime'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_SUMMARY_QUERY_KEY,
  scheduleOperationsWorkspaceReconcile,
} from '@/lib/operations'
import { comanda, kitchenItem, kitchenSnapshot, liveSnapshot, summarySnapshot } from './__fixtures__/operations-realtime.fixtures'

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

const { fetchUserNotificationPreferencesMock } = vi.hoisted(() => ({
  fetchUserNotificationPreferencesMock: vi.fn(async () => ({
    preferences: [
      {
        channel: 'WEB_TOAST',
        eventType: 'operations.comanda.status_changed',
        enabled: true,
        inherited: true,
      },
      {
        channel: 'WEB_TOAST',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: true,
        inherited: true,
      },
      {
        channel: 'MOBILE_TOAST',
        eventType: 'operations.comanda.status_changed',
        enabled: true,
        inherited: true,
      },
      {
        channel: 'MOBILE_TOAST',
        eventType: 'operations.kitchen_item.status_changed',
        enabled: true,
        inherited: true,
      },
    ],
  })),
}))

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    fetchUserNotificationPreferences: fetchUserNotificationPreferencesMock,
  }
})

function RealtimeHarness({
  currentUserId = null,
  notificationChannel = 'WEB_TOAST',
  queryClient: providedQueryClient,
}: Readonly<{
  currentUserId?: string | null
  notificationChannel?: 'WEB_TOAST' | 'MOBILE_TOAST'
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

  useOperationsRealtime(true, queryClient, { currentUserId, notificationChannel })
  return null
}

describe('useOperationsRealtime socket wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchUserNotificationPreferencesMock.mockClear()
    resetOperationsPerformanceEvents()
    ;(mockSocket as { connected?: boolean }).connected = false
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(16)
      return 1
    })
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
    expect(getOperationsPerformanceEvents().filter((entry) => entry.type === 'socket-lifecycle')).toEqual([
      {
        type: 'socket-lifecycle',
        at: expect.any(Number),
        phase: 'opened',
        activeSocketInstances: 1,
        listenerCount: 13,
      },
      {
        type: 'socket-lifecycle',
        at: expect.any(Number),
        phase: 'closed',
        activeSocketInstances: 0,
        listenerCount: 13,
      },
    ])
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

  it('emite toast quando outra pessoa muda a comanda para pronta', () => {
    render(<RealtimeHarness currentUserId="user-1" />)

    const updatedSubscription = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'comanda.updated')
    const updatedHandler = updatedSubscription?.[1] as ((envelope: unknown) => void) | undefined

    updatedHandler?.({
      id: 'evt-1',
      event: 'comanda.updated',
      actorUserId: 'user-2',
      payload: {
        comandaId: 'c-1',
        mesaLabel: 'Mesa 4',
        previousStatus: 'IN_PREPARATION',
        status: 'READY',
        businessDate: '2026-03-30',
      },
    })

    expect(toast.success).toHaveBeenCalledWith('Mesa 4 mudou para pronta.')
    expect(getOperationsPerformanceEvents()).toContainEqual({
      type: 'realtime-envelope-processed',
      at: expect.any(Number),
      event: 'comanda.updated',
      isSelfEvent: false,
      durationMs: expect.any(Number),
      paintDelayMs: expect.any(Number),
      livePatched: false,
      liveNeedsRefresh: false,
      kitchenPatched: false,
      kitchenNeedsRefresh: false,
      summaryPatched: false,
      summaryNeedsRefresh: false,
    })
  })

  it('não duplica toast para a própria mutação do usuário atual', () => {
    render(<RealtimeHarness currentUserId="user-1" />)

    const updatedSubscription = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'comanda.updated')
    const updatedHandler = updatedSubscription?.[1] as ((envelope: unknown) => void) | undefined

    updatedHandler?.({
      id: 'evt-2',
      event: 'comanda.updated',
      actorUserId: 'user-1',
      payload: {
        comandaId: 'c-1',
        mesaLabel: 'Mesa 4',
        previousStatus: 'OPEN',
        status: 'IN_PREPARATION',
        businessDate: '2026-03-30',
      },
    })

    expect(toast.info).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('respeita a preferência do usuário e suprime toast web desabilitado', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    queryClient.setQueryData([...USER_NOTIFICATION_PREFERENCES_QUERY_KEY], {
      preferences: [
        {
          channel: 'WEB_TOAST',
          eventType: 'operations.comanda.status_changed',
          enabled: false,
          inherited: false,
        },
      ],
    })

    render(<RealtimeHarness currentUserId="user-2" queryClient={queryClient} />)

    const updatedSubscription = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'comanda.updated')
    const updatedHandler = updatedSubscription?.[1] as ((envelope: unknown) => void) | undefined

    updatedHandler?.({
      id: 'evt-3',
      event: 'comanda.updated',
      actorUserId: 'user-1',
      payload: {
        comandaId: 'c-1',
        mesaLabel: 'Mesa 4',
        previousStatus: 'OPEN',
        status: 'READY',
        businessDate: '2026-03-30',
      },
    })

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('consome o reconcile pendente do proprio fechamento e preserva apenas orders/finance', () => {
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
          displayName: 'Operacao',
          active: true,
          cashSession: null,
          comandas: [comanda({ id: 'comanda-1', mesaId: 'm-1', tableLabel: 'Mesa 1', status: 'OPEN' })],
        },
      }),
    )
    queryClient.setQueryData(
      OPERATIONS_KITCHEN_QUERY_KEY,
      kitchenSnapshot({
        items: [kitchenItem({ comandaId: 'comanda-1', itemId: 'item-1', mesaLabel: 'Mesa 1' })],
        statusCounts: { queued: 1, inPreparation: 0, ready: 0 },
      }),
    )
    queryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, summarySnapshot())
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    scheduleOperationsWorkspaceReconcile(queryClient, ['operations', 'live'], {
      includeKitchen: true,
      includeSummary: true,
      includeOrders: true,
      includeFinance: true,
      delayMs: 200,
    })

    render(<RealtimeHarness currentUserId="user-1" queryClient={queryClient} />)

    const closeSubscription = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'comanda.closed')
    const closeHandler = closeSubscription?.[1] as ((envelope: unknown) => void) | undefined

    closeHandler?.({
      id: 'evt-close-self',
      event: 'comanda.closed',
      actorUserId: 'user-1',
      payload: {
        businessDate: '2026-03-30',
        comandaId: 'comanda-1',
        status: 'CLOSED',
        mesaLabel: 'Mesa 1',
      },
    })

    vi.advanceTimersByTime(700)

    expect(invalidateSpy).toHaveBeenCalledTimes(2)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['finance', 'summary'] })
    vi.useRealTimers()
  })

  it('mede o refresh de reconnect quando o socket volta apos desconexao', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined as never)

    render(<RealtimeHarness queryClient={queryClient} />)

    const disconnectHandler = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'disconnect')?.[1] as
      | (() => void)
      | undefined
    const connectHandler = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'connect')?.[1] as
      | (() => void)
      | undefined

    await act(async () => {
      disconnectHandler?.()
      await connectHandler?.()
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['mesas'] })
    await waitFor(() => {
      expect(getOperationsPerformanceEvents()).toContainEqual({
        type: 'reconnect-refresh',
        at: expect.any(Number),
        status: 'success',
        durationMs: expect.any(Number),
        invalidatedMesas: true,
      })
    })
  })

  it('forca refresh baseline quando a aba volta ao foreground com socket conectado', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined as never)
    ;(mockSocket as { connected?: boolean }).connected = true
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    render(<RealtimeHarness queryClient={queryClient} />)

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['mesas'] })
    await waitFor(() => {
      expect(getOperationsPerformanceEvents()).toContainEqual({
        type: 'reconnect-refresh',
        at: expect.any(Number),
        status: 'success',
        durationMs: expect.any(Number),
        invalidatedMesas: true,
      })
    })
  })

  it('trata operations.error como falha semantica do socket e mostra toast', () => {
    render(<RealtimeHarness />)

    const errorSubscription = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'operations.error')
    const errorHandler = errorSubscription?.[1] as ((payload?: { message?: string }) => void) | undefined

    errorHandler?.({ message: 'Sessao realtime expirada.' })

    expect(toast.error).toHaveBeenCalledWith('Sessao realtime expirada.')
  })

  it('marca envelope fora de ordem quando chega um evento mais antigo da mesma entidade', () => {
    render(<RealtimeHarness />)

    const updatedSubscription = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'comanda.updated')
    const updatedHandler = updatedSubscription?.[1] as ((envelope: unknown) => void) | undefined

    updatedHandler?.({
      id: 'evt-new',
      event: 'comanda.updated',
      createdAt: '2026-05-01T12:00:05.000Z',
      payload: {
        comandaId: 'c-1',
        mesaLabel: 'Mesa 4',
        status: 'READY',
        businessDate: '2026-05-01',
      },
    })

    updatedHandler?.({
      id: 'evt-old',
      event: 'comanda.updated',
      createdAt: '2026-05-01T12:00:01.000Z',
      payload: {
        comandaId: 'c-1',
        mesaLabel: 'Mesa 4',
        status: 'IN_PREPARATION',
        businessDate: '2026-05-01',
      },
    })

    expect(getOperationsPerformanceEvents()).toContainEqual({
      type: 'realtime-envelope-out-of-order',
      at: expect.any(Number),
      event: 'comanda.updated',
      entityKey: 'comanda.updated:c-1',
      eventCreatedAtMs: Date.parse('2026-05-01T12:00:01.000Z'),
      lastSeenCreatedAtMs: Date.parse('2026-05-01T12:00:05.000Z'),
    })
  })

  it('marca descarte local quando há snapshot ativo mas o evento não se aplica a nenhuma slice carregada', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    queryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, summarySnapshot())

    render(<RealtimeHarness queryClient={queryClient} />)

    const mesaSubscription = mockSocket.on.mock.calls.find(([eventName]) => eventName === 'mesa.upserted')
    const mesaHandler = mesaSubscription?.[1] as ((envelope: unknown) => void) | undefined

    mesaHandler?.({
      id: 'evt-mesa-drop',
      event: 'mesa.upserted',
      createdAt: '2026-05-01T12:00:00.000Z',
      payload: {
        mesaId: 'm-9',
        label: 'Mesa 9',
        status: 'FREE',
      },
    })

    expect(getOperationsPerformanceEvents()).toContainEqual({
      type: 'realtime-envelope-dropped',
      at: expect.any(Number),
      event: 'mesa.upserted',
      entityKey: 'mesa.upserted:m-9',
      reason: 'no-applicable-snapshot',
    })
  })
})
