import { PrismaService } from '../src/database/prisma.service'

describe('PrismaService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalDirectUrl = process.env.DIRECT_URL

  type PrismaLogHandler = (event: unknown) => void
  type MockLogger = {
    log: jest.Mock
    warn: jest.Mock
    error: jest.Mock
  }
  type PrismaServiceHarness = {
    onModuleInit: PrismaService['onModuleInit']
    onModuleDestroy: PrismaService['onModuleDestroy']
    isHealthy: PrismaService['isHealthy']
    $connect: jest.Mock
    $disconnect: jest.Mock
    $queryRaw: jest.Mock
    $on: jest.Mock
    logger: MockLogger
  }

  function makeService() {
    const service = Object.create(PrismaService.prototype) as PrismaServiceHarness
    const handlers: Record<string, PrismaLogHandler> = {}
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }

    service.$connect = jest.fn()
    service.$disconnect = jest.fn()
    service.$queryRaw = jest.fn()
    service.$on = jest.fn((event: string, handler: PrismaLogHandler) => {
      handlers[event] = handler
      return service
    })
    service.logger = logger

    return {
      service,
      handlers,
      logger,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = 'postgres://user:password@localhost:5432/desk'
    process.env.DIRECT_URL = 'postgres://user:password@localhost:5432/desk_direct'
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl
    process.env.DIRECT_URL = originalDirectUrl
  })

  it('conecta no init, registra handlers de log e mascara credenciais', async () => {
    const { service, handlers, logger } = makeService()
    service.$connect.mockResolvedValue(undefined)

    await service.onModuleInit()

    expect(service.$connect).toHaveBeenCalledTimes(1)
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('DATABASE_URL=postgres://user:***@localhost:5432/desk'),
    )
    expect(logger.log).toHaveBeenCalledWith('Database connection established')
    expect(service.$on).toHaveBeenCalledTimes(3)

    const queryHandler = handlers.query
    const errorHandler = handlers.error
    const warnHandler = handlers.warn

    expect(queryHandler).toBeDefined()
    expect(errorHandler).toBeDefined()
    expect(warnHandler).toBeDefined()

    queryHandler?.({ duration: 600, query: 'SELECT * FROM users' })
    expect(logger.warn).toHaveBeenCalledWith('Slow query (600ms): SELECT * FROM users', 'SlowQuery')

    errorHandler?.({ message: 'db offline' })
    expect(logger.error).toHaveBeenCalledWith('Database error: db offline', 'DatabaseError')

    warnHandler?.({ message: 'db warning' })
    expect(logger.warn).toHaveBeenCalledWith('Database warning: db warning', 'DatabaseWarning')
  })

  it('tenta reconectar em backoff exponencial e segue com conexao lazy no limite', async () => {
    const { service, logger } = makeService()
    service.$connect.mockRejectedValue(new Error('connection refused'))

    jest.useFakeTimers()
    const initPromise = service.onModuleInit()
    await jest.runAllTimersAsync()
    await initPromise

    expect(service.$connect).toHaveBeenCalledTimes(5)
    expect(logger.warn).toHaveBeenCalledWith('Retrying Prisma connection in 1000ms...', 'PrismaService')
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not connect at startup — Prisma will connect lazily on first query.',
      'PrismaService',
    )
  })

  it('desconecta no destroy', async () => {
    const { service } = makeService()

    await service.onModuleDestroy()

    expect(service.$disconnect).toHaveBeenCalledTimes(1)
  })

  it('retorna healthy true quando query de healthcheck funciona', async () => {
    const { service } = makeService()
    service.$queryRaw.mockResolvedValue([{ '?column?': 1 }])

    await expect(service.isHealthy()).resolves.toBe(true)
  })

  it('retorna healthy false e loga erro quando healthcheck falha', async () => {
    const { service, logger } = makeService()
    service.$queryRaw.mockRejectedValue(new Error('query failed'))

    await expect(service.isHealthy()).resolves.toBe(false)
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Prisma healthcheck failed: query failed'))
  })
})
