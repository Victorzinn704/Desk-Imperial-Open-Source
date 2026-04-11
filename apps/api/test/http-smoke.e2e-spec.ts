import { type INestApplication, Test, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { AppController } from '../src/app.controller'
import { AppService } from '../src/app.service'
import { AuthController } from '../src/modules/auth/auth.controller'
import { AuthService } from '../src/modules/auth/auth.service'
import { CsrfGuard } from '../src/modules/auth/guards/csrf.guard'
import { SessionGuard } from '../src/modules/auth/guards/session.guard'
import { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import { CacheService } from '../src/common/services/cache.service'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../src/database/prisma.service'

describe('HTTP smoke (e2e)', () => {
  let app: INestApplication

  const mockPrisma = {
    isHealthy: jest.fn(),
  }

  const mockCache = {
    ping: jest.fn(),
  }

  const mockAuthService = {
    login: jest.fn(),
  }

  const mockAuditLogService = {
    record: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController, AuthController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: ConfigService, useValue: mockConfigService },
        SessionGuard,
        CsrfGuard,
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/health', () => {
    it('returns ok when db and redis are healthy', async () => {
      mockPrisma.isHealthy.mockResolvedValue(true)
      mockCache.ping.mockResolvedValue(true)

      const response = await request(app.getHttpServer()).get('/api/health').expect(200)

      expect(response.body.status).toBe('ok')
      expect(response.body.service).toBe('desk-imperial-api')
      expect(response.body.dbHealthy).toBe(true)
      expect(response.body.redisHealthy).toBe(true)
    })

    it('returns error when db is unhealthy', async () => {
      mockPrisma.isHealthy.mockResolvedValue(false)
      mockCache.ping.mockResolvedValue(true)

      const response = await request(app.getHttpServer()).get('/api/health').expect(503)

      expect(response.body.status).toBe('error')
      expect(response.body.dbHealthy).toBe(false)
      expect(response.body.redisHealthy).toBe(true)
    })

    it('returns error when redis is unhealthy', async () => {
      mockPrisma.isHealthy.mockResolvedValue(true)
      mockCache.ping.mockResolvedValue(false)

      const response = await request(app.getHttpServer()).get('/api/health').expect(503)

      expect(response.body.status).toBe('error')
      expect(response.body.dbHealthy).toBe(true)
      expect(response.body.redisHealthy).toBe(false)
    })
  })

  describe('POST /api/auth/login', () => {
    it('rejects invalid payload with validation error', async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/login').send({}).expect(400)

      expect(response.body.message).toBeDefined()
    })

    it('reaches the controller and returns a cookie on valid payload', async () => {
      mockAuthService.login.mockImplementation(
        async (
          _dto: unknown,
          response: {
            cookie: (name: string, value: string, options?: Record<string, unknown>) => void
          },
        ) => {
          response.cookie('session', 'session-token', {
            httpOnly: true,
            sameSite: 'strict',
          })

          return {
            user: {
              id: 'user-1',
            },
          }
        },
      )

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'ceo@empresa.com',
          loginMode: 'OWNER',
          password: 'Strong@123',
        })
        .expect(201)

      expect(mockAuthService.login).toHaveBeenCalledTimes(1)
      const cookies = response.headers['set-cookie'] as unknown as string[]
      expect(cookies).toBeDefined()
      expect(cookies.some((value) => value.startsWith('session='))).toBe(true)
    })

    it('accepts staff login payload with 6-digit PIN', async () => {
      mockAuthService.login.mockImplementation(
        async (
          _dto: unknown,
          response: {
            cookie: (name: string, value: string, options?: Record<string, unknown>) => void
          },
        ) => {
          response.cookie('session', 'session-token', {
            httpOnly: true,
            sameSite: 'strict',
          })

          return {
            user: {
              id: 'staff-1',
            },
          }
        },
      )

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          loginMode: 'STAFF',
          companyEmail: 'ceo@empresa.com',
          employeeCode: 'VD-001',
          password: '123456',
        })
        .expect(201)

      expect(mockAuthService.login).toHaveBeenCalledTimes(1)
    })

    it('rejects owner login payload shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'ceo@empresa.com',
          loginMode: 'OWNER',
          password: '1234567',
        })
        .expect(400)

      expect(response.body.message).toContain('Senha da empresa deve ter no mínimo 8 caracteres')
    })
  })
})
