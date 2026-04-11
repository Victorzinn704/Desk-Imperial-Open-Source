import { createServer } from 'node:http'
import Redis from 'ioredis'
import { Server as SocketIOServer } from 'socket.io'
import { io as createSocketClient } from 'socket.io-client'
import { createAdapter } from '@socket.io/redis-adapter'
import { CacheService } from '../src/common/services/cache.service'

const REDIS_ENV_KEYS = ['REDIS_URL', 'REDIS_PRIVATE_URL', 'REDIS_PUBLIC_URL'] as const
const DEFAULT_REDIS_URL =
  process.env.REDIS_URL ?? process.env.REDIS_PRIVATE_URL ?? process.env.REDIS_PUBLIC_URL ?? 'redis://127.0.0.1:6379'
const RealtimeRoom = 'workspace:be-01'
const RealtimeEvent = 'be-01:fanout'

jest.setTimeout(60_000)

type SocketClientLike = {
  once(eventName: string, listener: (...args: unknown[]) => void): unknown
  disconnect(): void
}

type RealtimePayload = {
  source: string
  fanout: boolean
  workspaceRoom: string
}

async function waitFor(condition: () => boolean | Promise<boolean>, timeoutMs = 10_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await condition()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error('Timeout aguardando condição do smoke local do BE-01.')
}

async function waitForSocketEvent<T>(socket: SocketClientLike, eventName: string): Promise<T> {
  return new Promise<T>((resolve) => {
    socket.once(eventName, (...args: unknown[]) => {
      resolve(args[0] as T)
    })
  })
}

async function createRealtimeNode(redisUrl: string) {
  const httpServer = createServer()
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ['websocket'],
  })

  const pubClient = new Redis(redisUrl)
  const subClient = pubClient.duplicate()
  io.adapter(createAdapter(pubClient, subClient))

  io.on('connection', async (socket) => {
    await socket.join(RealtimeRoom)
  })

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve())
  })

  const address = httpServer.address()
  if (!address || typeof address === 'string') {
    throw new Error('Não foi possível determinar a porta do node realtime do smoke.')
  }

  return {
    io,
    pubClient,
    subClient,
    port: address.port,
    async close() {
      await new Promise<void>((resolve) => {
        io.close(() => {
          resolve()
        })
      })
      await new Promise<void>((resolve) => {
        httpServer.close(() => {
          resolve()
        })
      })
      await Promise.allSettled([pubClient.quit(), subClient.quit()])
    },
  }
}

describe('BE-01 operational smoke', () => {
  const previousEnv = {
    REDIS_URL: process.env.REDIS_URL,
    REDIS_PRIVATE_URL: process.env.REDIS_PRIVATE_URL,
    REDIS_PUBLIC_URL: process.env.REDIS_PUBLIC_URL,
  }

  beforeAll(async () => {
    for (const key of REDIS_ENV_KEYS) {
      process.env[key] = DEFAULT_REDIS_URL
    }

    const probe = new Redis(DEFAULT_REDIS_URL)
    try {
      await probe.ping()
    } finally {
      await probe.quit().catch(() => undefined)
    }
  })

  afterAll(() => {
    process.env.REDIS_URL = previousEnv.REDIS_URL
    process.env.REDIS_PRIVATE_URL = previousEnv.REDIS_PRIVATE_URL
    process.env.REDIS_PUBLIC_URL = previousEnv.REDIS_PUBLIC_URL
  })

  it('compartilha cache real entre duas instâncias e propaga realtime via Redis adapter', async () => {
    const cacheNodeA = new CacheService()
    const cacheNodeB = new CacheService()

    cacheNodeA.onModuleInit()
    cacheNodeB.onModuleInit()

    await waitFor(() => cacheNodeA.isReady() && cacheNodeB.isReady())
    expect(await cacheNodeA.ping()).toBe(true)
    expect(await cacheNodeB.ping()).toBe(true)

    const sharedKeyPrefix = `be-01:${Date.now()}`
    const sharedKey = `${sharedKeyPrefix}:cache`
    const sharedPayload = {
      source: 'node-a',
      scope: 'shared-cache',
      verifiedAt: new Date().toISOString(),
    }

    await cacheNodeA.set(sharedKey, sharedPayload, 30)
    expect(await cacheNodeB.get<typeof sharedPayload>(sharedKey)).toEqual(sharedPayload)

    await cacheNodeA.delByPrefix(`${sharedKeyPrefix}:`)
    expect(await cacheNodeB.get(sharedKey)).toBeNull()

    const realtimeNodeA = await createRealtimeNode(DEFAULT_REDIS_URL)
    const realtimeNodeB = await createRealtimeNode(DEFAULT_REDIS_URL)
    const clientOnNodeB = createSocketClient(`http://127.0.0.1:${realtimeNodeB.port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    }) as SocketClientLike

    try {
      await waitForSocketEvent<void>(clientOnNodeB, 'connect')
      await new Promise((resolve) => setTimeout(resolve, 150))

      const fanoutPromise = waitForSocketEvent<RealtimePayload>(clientOnNodeB, RealtimeEvent)
      const realtimePayload: RealtimePayload = {
        source: 'node-a',
        fanout: true,
        workspaceRoom: RealtimeRoom,
      }

      realtimeNodeA.io.to(RealtimeRoom).emit(RealtimeEvent, realtimePayload)

      const receivedPayload = await fanoutPromise
      expect(receivedPayload).toEqual(realtimePayload)
    } finally {
      clientOnNodeB.disconnect()
      await realtimeNodeA.close()
      await realtimeNodeB.close()
      cacheNodeA.onModuleDestroy()
      cacheNodeB.onModuleDestroy()
    }
  })
})
