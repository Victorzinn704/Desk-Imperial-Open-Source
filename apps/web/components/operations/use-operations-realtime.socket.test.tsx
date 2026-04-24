import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { useMemo } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOperationsRealtime } from './use-operations-realtime'

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

function RealtimeHarness() {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      }),
    [],
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
})
