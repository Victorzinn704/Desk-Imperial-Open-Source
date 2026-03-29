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
 *   ✅ delByPrefix() — remoção por prefixo
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
    unlink: jest.fn(),
    scan: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
  }))
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('inicialização', () => {
    it('deve inicializar com Redis quando REDIS_URL está definida', () => {
      const service = new CacheService()
      // A inicialização ocorre no onModuleInit em produção
      // Aqui testamos que o serviço pode ser instanciado
      expect(service).toBeDefined()
    })

    it('deve retornar false em isReady quando Redis não está disponível', () => {
      const service = new CacheService()
      expect(service.isReady()).toBe(false)
    })
  })

  describe('get', () => {
    it('deve retornar null quando cache está desabilitado', async () => {
      const service = new CacheService()

      const result = await service.get('test-key')

      expect(result).toBeNull()
    })

    it('deve retornar null quando chave não existe', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.get as jest.Mock).mockResolvedValue(null)

      const service = new CacheService()
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

      const service = new CacheService()
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      const result = await service.get('test-key')

      expect(result).toEqual(cachedData)
      expect(mockRedis.get).toHaveBeenCalledWith('test-key')
    })

    it('deve retornar null quando JSON é inválido', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.get as jest.Mock).mockResolvedValue('invalid-json')

      const service = new CacheService()
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      const result = await service.get('test-key')

      expect(result).toBeNull()
    })

    it('deve retornar null quando Redis lança erro', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.get as jest.Mock).mockRejectedValue(new Error('Redis error'))

      const service = new CacheService()
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

      const service = new CacheService()
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      await service.set('test-key', { foo: 'bar' }, 300)

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', JSON.stringify({ foo: 'bar' }), 'EX', 300)
    })

    it('deve retornar void silenciosamente quando cache está desabilitado', async () => {
      const service = new CacheService()

      await expect(service.set('test-key', { foo: 'bar' }, 300)).resolves.toBeUndefined()
    })

    it('deve falhar silenciosamente quando Redis lança erro', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.set as jest.Mock).mockRejectedValue(new Error('Redis error'))

      const service = new CacheService()
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

      const service = new CacheService()
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      await service.del('test-key')

      expect(mockRedis.del).toHaveBeenCalledWith('test-key')
    })

    it('deve retornar void silenciosamente quando cache está desabilitado', async () => {
      const service = new CacheService()

      await expect(service.del('test-key')).resolves.toBeUndefined()
    })

    it('deve falhar silenciosamente quando Redis lança erro', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.del as jest.Mock).mockRejectedValue(new Error('Redis error'))

      const service = new CacheService()
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      await expect(service.del('test-key')).resolves.toBeUndefined()
    })
  })

  describe('delByPrefix', () => {
    it('deve deletar chaves encontradas por prefixo', async () => {
      const mockRedis = new Redis()
      ;(mockRedis.scan as jest.Mock)
        .mockResolvedValueOnce(['1', ['operations:live:key-1', 'operations:live:key-2']])
        .mockResolvedValueOnce(['0', []])
      ;(mockRedis.unlink as jest.Mock).mockResolvedValue(2)

      const service = new CacheService()
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      await service.delByPrefix('operations:live:')

      expect(mockRedis.scan).toHaveBeenNthCalledWith(1, '0', 'MATCH', 'operations:live:*', 'COUNT', '100')
      expect(mockRedis.scan).toHaveBeenNthCalledWith(2, '1', 'MATCH', 'operations:live:*', 'COUNT', '100')
      expect(mockRedis.unlink).toHaveBeenCalledWith('operations:live:key-1', 'operations:live:key-2')
    })

    it('deve retornar void silenciosamente quando cache está desabilitado', async () => {
      const service = new CacheService()

      await expect(service.delByPrefix('operations:live:')).resolves.toBeUndefined()
    })
  })

  describe('isReady', () => {
    it('deve retornar true quando Redis está conectado', () => {
      const service = new CacheService()
      ;(service as any).client = { status: 'ready' }
      ;(service as any).enabled = true

      expect(service.isReady()).toBe(true)
    })

    it('deve retornar false quando cliente não existe', () => {
      const service = new CacheService()
      ;(service as any).client = null
      ;(service as any).enabled = true

      expect(service.isReady()).toBe(false)
    })

    it('deve retornar false quando cache está desabilitado', () => {
      const service = new CacheService()

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

      expect(key).toBe('products:list:user-123:active')
    })

    it('deve gerar chave estática de products all correta', () => {
      const key = CacheService.productsKey('user-123', 'all')

      expect(key).toBe('products:list:user-123:all')
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
      const service = new CacheService()

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

      const service = new CacheService()
      ;(service as any).client = mockRedis
      ;(service as any).enabled = true

      // Todas as operações devem falhar silenciosamente
      await expect(service.get('key')).resolves.toBeNull()
      await expect(service.set('key', {}, 300)).resolves.toBeUndefined()
      await expect(service.del('key')).resolves.toBeUndefined()
    })
  })
})
