/**
 * @file cache.service.spec.ts
 * @module Cache
 *
 * Testes unitários do CacheService — módulo de cache com Redis.
 *
 * Cobertura garantida:
 *   ✅ get() — obtenção de dados do cache
 *   ✅ set() — armazenamento com TTL
 *   ✅ del() — remoção de chaves
 *   ✅ isReady() — verificação de disponibilidade
 *   ✅ Graceful degradation (Redis indisponível)
 *   ✅ Chaves específicas (finance, products, orders, employees)
 */

import { CacheService } from '../src/common/services/cache.service'
import Redis from 'ioredis'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
  }))
})

const mockConfigService = {
  get: jest.fn().mockReturnValue('redis://localhost:6379'),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConfigService.get.mockReturnValue('redis://localhost:6379')
  })

  describe('inicialização', () => {
    it('deve inicializar com Redis quando REDIS_URL está definida', () => {
      const service = new CacheService(mockConfigService as any)
      // A inicialização ocorre no onModuleInit em produção
      // Aqui testamos que o serviço pode ser instanciado
      expect(service).toBeDefined()
    })

    it('deve retornar false em isReady quando Redis não está disponível', () => {
      mockConfigService.get.mockReturnValue(undefined)
      const service = new CacheService(mockConfigService as any)
      expect(service.isReady()).toBe(false)
    })
  })

  describe('get', () => {
    it('deve retornar null quando cache está desabilitado', async () => {
      mockConfigService.get.mockReturnValue(undefined)
      const service = new CacheService(mockConfigService as any)

      const result = await service.get('test-key')

      expect(result).toBeNull()
    })

    it('deve retornar null quando chave não existe', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.get as jest.Mock).mockResolvedValue(null)

      const service = new CacheService(mockConfigService as any)
      // Forçar Redis mockado
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      const result = await service.get('nonexistent-key')

      expect(result).toBeNull()
    })

    it('deve retornar dados parseados do cache', async () => {
      const cachedData = { foo: 'bar', count: 42 }
      const mockRedis = new Redis()
      ;(mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedData))

      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      const result = await service.get('test-key')

      expect(result).toEqual(cachedData)
      expect(mockRedis.get).toHaveBeenCalledWith('test-key')
    })

    it('deve retornar null quando JSON é inválido', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.get as jest.Mock).mockResolvedValue('invalid-json')

      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      const result = await service.get('test-key')

      expect(result).toBeNull()
    })

    it('deve retornar null quando Redis lança erro', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.get as jest.Mock).mockRejectedValue(new Error('Redis error'))

      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      const result = await service.get('test-key')

      expect(result).toBeNull()
    })
  })

  describe('set', () => {
    it('deve armazenar dados com TTL quando Redis está disponível', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.set as jest.Mock).mockResolvedValue('OK')

      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      await service.set('test-key', { foo: 'bar' }, 300)

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify({ foo: 'bar' }), 'EX', 300)
    })

    it('deve retornar void silenciosamente quando cache está desabilitado', async () => {
      mockConfigService.get.mockReturnValue(undefined)
      const service = new CacheService(mockConfigService as any)

      await expect(service.set('test-key', { foo: 'bar' }, 300)).resolves.toBeUndefined()
    })

    it('deve falhar silenciosamente quando Redis lança erro', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.set as jest.Mock).mockRejectedValue(new Error('Redis error'))

      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      // Não deve lançar erro
      await expect(service.set('test-key', { foo: 'bar' }, 300)).resolves.toBeUndefined()
    })
  })

  describe('del', () => {
    it('deve deletar chave do cache', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.del as jest.Mock).mockResolvedValue(1)

      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      await service.del('test-key')

      expect(mockRedis.del).toHaveBeenCalledWith('test-key')
    })

    it('deve retornar void silenciosamente quando cache está desabilitado', async () => {
      mockConfigService.get.mockReturnValue(undefined)
      const service = new CacheService(mockConfigService as any)

      await expect(service.del('test-key')).resolves.toBeUndefined()
    })

    it('deve falhar silenciosamente quando Redis lança erro', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.del as jest.Mock).mockRejectedValue(new Error('Redis error'))

      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      await expect(service.del('test-key')).resolves.toBeUndefined()
    })
  })

  describe('isReady', () => {
    it('deve retornar true quando Redis está conectado', () => {
      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = { status: 'ready' }
      ;(service as any).enabled = true

      expect(service.isReady()).toBe(true)
    })

    it('deve retornar false quando cliente não existe', () => {
      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = null
      ;(service as any).enabled = true

      expect(service.isReady()).toBe(false)
    })

    it('deve retornar false quando cache está desabilitado', () => {
      mockConfigService.get.mockReturnValue(undefined)
      const service = new CacheService(mockConfigService as any)

      expect(service.isReady()).toBe(false)
    })
  })

  describe('chaves específicas', () => {
    it('deve gerar chave de finance correta', () => {
      const key = CacheService.financeKey('user-123')

      expect(key).toBe('finance:summary:user-123')
    })

    it('deve gerar chave de ratelimit correta', () => {
      const key = CacheService.ratelimitKey('auth', 'login:user-123')

      expect(key).toBe('ratelimit:auth:login:user-123')
    })

    it('deve gerar chave estática de products correta', () => {
      const key = CacheService.productsKey('user-123')

      expect(key).toBe('products:list:user-123')
    })

    it('deve gerar chave estática de employees correta', () => {
      const key = CacheService.employeesKey('user-123')

      expect(key).toBe('employees:list:user-123')
    })

    it('deve gerar chave estática de orders correta', () => {
      const key = CacheService.ordersKey('user-123')

      expect(key).toBe('orders:summary:user-123')
    })
  })

  describe('graceful degradation', () => {
    it('deve operar sem Redis quando variável não está definida', async () => {
      mockConfigService.get.mockReturnValue(undefined)
      const service = new CacheService(mockConfigService as any)

      expect(service.isReady()).toBe(false)
      await expect(service.get('key')).resolves.toBeNull()
      await expect(service.set('key', {}, 300)).resolves.toBeUndefined()
      await expect(service.del('key')).resolves.toBeUndefined()
    })

    it('deve continuar operando quando Redis falha', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.get as jest.Mock).mockRejectedValue(new Error('Connection lost'))
      ;(mockRedis.set as jest.Mock).mockRejectedValue(new Error('Connection lost'))
      ;(mockRedis.del as jest.Mock).mockRejectedValue(new Error('Connection lost'))

      const service = new CacheService(mockConfigService as any)
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      // Todas as operações devem falhar silenciosamente
      await expect(service.get('key')).resolves.toBeNull()
      await expect(service.set('key', {}, 300)).resolves.toBeUndefined()
      await expect(service.del('key')).resolves.toBeUndefined()
    })
  })
})
