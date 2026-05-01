import { AuthSessionService, NEGATIVE_SESSION_CACHE_TTL_SECONDS } from '../src/modules/auth/auth-session.service'

describe('AuthSessionService', () => {
  function makeCacheDouble() {
    const store = new Map<string, string>()

    return {
      get: jest.fn(async <T>(key: string) => {
        const raw = store.get(key)
        return raw ? (JSON.parse(raw) as T) : null
      }),
      set: jest.fn(async (key: string, value: unknown) => {
        store.set(key, JSON.stringify(value))
      }),
      del: jest.fn(async (key: string) => {
        store.delete(key)
      }),
      isReady: jest.fn(() => true),
      __store: store,
    }
  }

  function makeService(overrides?: {
    prisma?: {
      session?: {
        findUnique?: jest.Mock
        findMany?: jest.Mock
        updateMany?: jest.Mock
      }
    }
    cache?: ReturnType<typeof makeCacheDouble>
    realtimeSessions?: {
      disconnectSessions: jest.Mock
    }
  }) {
    const prisma = {
      session: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(async () => ({ count: 0 })),
        ...(overrides?.prisma?.session ?? {}),
      },
    }
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') {
          return 'test'
        }
        if (key === 'CSRF_SECRET') {
          return 'test-csrf-secret-with-32-characters'
        }
        return undefined
      }),
    }
    const demoAccess = {
      closeGrantForSession: jest.fn(async () => {}),
      buildEvaluationAccess: jest.fn(() => null),
    }
    const realtimeSessions = overrides?.realtimeSessions ?? {
      disconnectSessions: jest.fn(),
    }
    const cache = overrides?.cache ?? makeCacheDouble()

    return {
      service: new AuthSessionService(
        prisma as any,
        config as any,
        demoAccess as any,
        realtimeSessions as any,
        cache as any,
      ),
      prisma,
      cache,
      realtimeSessions,
      demoAccess,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('grava negative cache para token ausente e evita lookup repetido no banco', async () => {
    const { service, prisma, cache } = makeService()
    prisma.session.findUnique.mockResolvedValue(null)

    await expect(service.validateSessionToken('invalid-token')).resolves.toBeNull()
    await expect(service.validateSessionToken('invalid-token')).resolves.toBeNull()

    expect(prisma.session.findUnique).toHaveBeenCalledTimes(1)
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining('auth:session:negative:'),
      expect.objectContaining({
        negative: true,
        reason: 'missing',
      }),
      NEGATIVE_SESSION_CACHE_TTL_SECONDS,
    )
  })

  it('revoga sessoes de employee, invalida cache e desconecta sockets rastreados', async () => {
    const { service, prisma, realtimeSessions, demoAccess, cache } = makeService()
    prisma.session.findMany.mockResolvedValue([
      { id: 'session-1', tokenHash: 'hash-1' },
      { id: 'session-2', tokenHash: 'hash-2' },
    ])

    await service.revokeEmployeeSessions('employee-1')

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { employeeId: 'employee-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    expect(realtimeSessions.disconnectSessions).toHaveBeenCalledWith(['session-1', 'session-2'])
    expect(demoAccess.closeGrantForSession).toHaveBeenCalledTimes(2)
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining('auth:session:negative:hash-1'),
      expect.objectContaining({ negative: true, reason: 'revoked' }),
      NEGATIVE_SESSION_CACHE_TTL_SECONDS,
    )
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining('auth:session:negative:hash-2'),
      expect.objectContaining({ negative: true, reason: 'revoked' }),
      NEGATIVE_SESSION_CACHE_TTL_SECONDS,
    )
  })
})
