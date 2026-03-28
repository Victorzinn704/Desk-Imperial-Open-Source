/**
 * @file orders.service.spec.ts
 * @module Orders
 *
 * Testes unitários do OrdersService — módulo de gestão de pedidos e vendas.
 *
 * Estratégia de teste:
 * - Todos os colaboradores externos (Prisma, Cache, Currency, Geocoding, AuditLog, AdminPin) são mockados
 * - Cada `describe` cobre um cenário de negócio completo com happy path + casos de borda
 * - Foco em validação de estoque, desconto, CPF/CNPJ e regras de negócio
 *
 * Cobertura garantida:
 *   ✅ listForUser() — listagem com cache e agregações
 *   ✅ createForUser() — criação com validação de estoque, desconto e PIN
 *   ✅ cancelForUser() — cancelamento com retorno de estoque
 *   ✅ Validação de CPF/CNPJ
 *   ✅ Limite de desconto para STAFF (15%)
 *   ✅ Admin PIN para descontos maiores
 */

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { BuyerType, CurrencyCode, OrderStatus } from '@prisma/client'
import { OrdersService } from '../src/modules/orders/orders.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { CurrencyService } from '../src/modules/currency/currency.service'
import type { GeocodingService } from '../src/modules/geocoding/geocoding.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { AdminPinService } from '../src/modules/admin-pin/admin-pin.service'
import type { CacheService } from '../src/common/services/cache.service'
import type { CreateOrderDto } from '../src/modules/orders/dto/create-order.dto'
import { makeAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  product: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  orderItem: {
    aggregate: jest.fn(),
  },
  employee: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockCurrencyService = {
  getSnapshot: jest.fn(),
  convert: jest.fn(),
}

const mockGeocodingService = {
  geocodeCityLocation: jest.fn(),
}

const mockAuditLogService = {
  record: jest.fn(),
}

const mockAdminPinService = {
  hasPinConfigured: jest.fn(),
  extractVerificationProof: jest.fn(),
  validateVerificationProof: jest.fn(),
}

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  isReady: jest.fn(),
  financeKey: jest.fn(),
  ordersKey: jest.fn(),
}

// ── Factories ─────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'product-1',
    userId: 'user-1',
    name: 'Produto Teste',
    category: 'Categoria Teste',
    unitCost: 10.0,
    unitPrice: 20.0,
    currency: CurrencyCode.BRL,
    stock: 100,
    active: true,
    ...overrides,
  }
}

function makeOrderItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-item-1',
    productId: 'product-1',
    productName: 'Produto Teste',
    category: 'Categoria Teste',
    quantity: 1,
    currency: CurrencyCode.BRL,
    unitPrice: 20,
    unitCost: 10,
    lineRevenue: 20,
    lineCost: 10,
    lineProfit: 10,
    ...overrides,
  }
}

function makeOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    customerName: 'João Cliente',
    buyerType: BuyerType.PERSON,
    buyerDocument: '52998224725',
    buyerDistrict: 'Centro',
    buyerCity: 'São Paulo',
    buyerState: 'SP',
    buyerCountry: 'Brasil',
    currency: CurrencyCode.BRL,
    status: OrderStatus.COMPLETED,
    totalRevenue: 100.0,
    totalCost: 50.0,
    totalProfit: 50.0,
    totalItems: 5,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    cancelledAt: null,
    items: [makeOrderItem()],
    ...overrides,
  }
}

function makeCreateOrderDto(overrides: Partial<CreateOrderDto> = {}): CreateOrderDto {
  return {
    items: [
      { productId: 'product-1', quantity: 2 },
      { productId: 'product-2', quantity: 1 },
    ],
    customerName: 'João Cliente',
    buyerType: BuyerType.PERSON,
    buyerDocument: '52998224725',
    buyerCity: 'São Paulo',
    buyerCountry: 'Brasil',
    currency: CurrencyCode.BRL,
    ...overrides,
  }
}

function makeCurrencySnapshot() {
  return {
    rates: { BRL: 1, USD: 0.2, EUR: 0.18 },
    updatedAt: new Date().toISOString(),
    source: 'awesomeapi',
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let ordersService: OrdersService
let mockContext: ReturnType<typeof makeAuthContext>
let mockRequest: ReturnType<typeof makeRequestContext>
let mockHttpRequest: any

beforeEach(() => {
  jest.clearAllMocks()

  ordersService = new OrdersService(
    mockPrisma as unknown as PrismaService,
    mockCurrencyService as unknown as CurrencyService,
    mockGeocodingService as unknown as GeocodingService,
    mockAuditLogService as unknown as AuditLogService,
    mockAdminPinService as unknown as AdminPinService,
    mockCache as unknown as CacheService,
  )

  mockContext = makeAuthContext({
    userId: 'user-1',
    workspaceOwnerUserId: 'user-1',
    email: 'joao@empresa.com',
    fullName: 'João Silva',
  })
  mockRequest = makeRequestContext()
  mockHttpRequest = { headers: {}, cookies: {} }

  // Defaults
  mockCurrencyService.getSnapshot.mockResolvedValue(makeCurrencySnapshot())
  mockCurrencyService.convert.mockImplementation((value) => value)
  mockCache.isReady.mockReturnValue(true)
  mockCache.ordersKey.mockReturnValue('orders:summary:user-1')
  mockCache.financeKey.mockReturnValue('finance:summary:user-1')
  mockAdminPinService.hasPinConfigured.mockResolvedValue(false)
  mockPrisma.product.updateMany.mockResolvedValue({ count: 1 })
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      product: mockPrisma.product,
      order: mockPrisma.order,
    }),
  )
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  describe('listForUser', () => {
    it('deve retornar pedidos com cache quando disponível', async () => {
      const cachedResponse = {
        items: [makeOrder()],
        totals: {
          completedOrders: 10,
          cancelledOrders: 2,
          realizedRevenue: 1000.0,
          realizedProfit: 500.0,
          soldUnits: 100,
        },
      }
      mockCache.get.mockResolvedValue(cachedResponse)

      const result = await ordersService.listForUser(mockContext, { limit: 10 })

      expect(result).toEqual(cachedResponse)
      expect(mockCache.get).toHaveBeenCalledWith('orders:summary:user-1')
      expect(mockPrisma.order.findMany).not.toHaveBeenCalled()
    })

    it('deve buscar pedidos do banco quando cache não disponível', async () => {
      mockCache.get.mockResolvedValue(null)

      const orders = [makeOrder(), makeOrder({ id: 'order-2' })]
      mockPrisma.order.findMany.mockResolvedValue(orders)
      mockPrisma.order.aggregate.mockResolvedValue({
        _count: 10,
        _sum: { totalRevenue: 1000, totalProfit: 500, totalItems: 100 },
      })
      mockPrisma.order.count.mockResolvedValue(2)
      mockPrisma.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 150 } })

      const result = await ordersService.listForUser(mockContext, { limit: 10 })

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', status: OrderStatus.COMPLETED },
          take: 10,
        }),
      )
      expect(result.items).toHaveLength(2)
    })

    it('deve incluir pedidos cancelados quando includeCancelled=true', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.order.aggregate.mockResolvedValue({ _count: 0, _sum: {} })
      mockPrisma.order.count.mockResolvedValue(0)
      mockPrisma.orderItem.aggregate.mockResolvedValue({ _sum: {} })

      await ordersService.listForUser(mockContext, { limit: 10, includeCancelled: true })

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      )
    })

    it('deve fazer cache do resultado quando sem filtros', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.order.findMany.mockResolvedValue([makeOrder()])
      mockPrisma.order.aggregate.mockResolvedValue({ _count: 1, _sum: {} })
      mockPrisma.order.count.mockResolvedValue(0)
      mockPrisma.orderItem.aggregate.mockResolvedValue({ _sum: {} })

      await ordersService.listForUser(mockContext, { limit: 10 })

      expect(mockCache.set).toHaveBeenCalledWith('orders:summary:user-1', expect.any(Object), 90)
    })
  })

  describe('createForUser', () => {
    it('deve criar pedido com dados válidos', async () => {
      const dto = makeCreateOrderDto()
      const products = [makeProduct({ id: 'product-1', stock: 100 }), makeProduct({ id: 'product-2', stock: 50 })]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.create.mockResolvedValue(makeOrder())
      mockGeocodingService.geocodeCityLocation.mockResolvedValue({
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        latitude: -23.5505,
        longitude: -46.6333,
        label: 'Centro, São Paulo, SP, Brasil',
      })

      const result = await ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)

      expect(mockPrisma.order.create).toHaveBeenCalled()
      expect(result.order).toBeDefined()
    })

    it('deve rejeitar pedido sem itens', async () => {
      const dto = makeCreateOrderDto({ items: [] })

      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        BadRequestException,
      )
      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        'Adicione pelo menos um produto ao pedido.',
      )
    })

    it('deve validar existência dos produtos', async () => {
      const dto = makeCreateOrderDto()
      mockPrisma.product.findMany.mockResolvedValue([])

      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('deve validar disponibilidade de estoque', async () => {
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 2 }],
      })
      const products = [
        makeProduct({ id: 'product-1', stock: 1 }), // Estoque insuficiente
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)

      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('deve validar CPF para pessoa física', async () => {
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 2 }],
        buyerType: BuyerType.PERSON,
        buyerDocument: '123456789', // CPF inválido
      })
      const products = [makeProduct()]
      mockPrisma.product.findMany.mockResolvedValue(products)

      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        BadRequestException,
      )
      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        'CPF valido',
      )
    })

    it('deve validar CNPJ para pessoa jurídica', async () => {
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 2 }],
        buyerType: BuyerType.COMPANY,
        buyerDocument: '123456789', // CNPJ inválido
      })
      const products = [makeProduct()]
      mockPrisma.product.findMany.mockResolvedValue(products)

      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        BadRequestException,
      )
      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        'CNPJ valido',
      )
    })

    it('deve aceitar CPF válido', async () => {
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 2 }],
        buyerType: BuyerType.PERSON,
        buyerDocument: '52998224725',
      })
      const products = [makeProduct()]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.create.mockResolvedValue(makeOrder())
      mockGeocodingService.geocodeCityLocation.mockResolvedValue({
        city: 'São Paulo',
        country: 'Brasil',
        label: 'São Paulo, Brasil',
      })

      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).resolves.toBeDefined()
    })

    it('deve exigir Admin PIN para desconto > 15% com STAFF', async () => {
      const staffContext = makeAuthContext({ role: 'STAFF', employeeId: 'emp-1', workspaceOwnerUserId: 'user-1' })
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 1, unitPrice: 10.0 }],
      })
      const products = [makeProduct({ unitPrice: 20.0 })]

      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.employee.findFirst.mockResolvedValue({ id: 'emp-1', employeeCode: '001' })
      mockAdminPinService.hasPinConfigured.mockResolvedValue(true)
      mockAdminPinService.extractVerificationProof.mockReturnValue('invalid-proof')
      mockAdminPinService.validateVerificationProof.mockResolvedValue(false)

      await expect(ordersService.createForUser(staffContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('deve permitir desconto até 15% para STAFF sem PIN', async () => {
      const staffContext = makeAuthContext({ role: 'STAFF', employeeId: 'emp-1', workspaceOwnerUserId: 'user-1' })
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 1, unitPrice: 17.0 }], // 15% desconto
      })
      const products = [makeProduct({ unitPrice: 20.0 })]

      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.employee.findFirst.mockResolvedValue({ id: 'emp-1', employeeCode: '001' })
      mockPrisma.order.create.mockResolvedValue(makeOrder())
      mockGeocodingService.geocodeCityLocation.mockResolvedValue({
        city: 'São Paulo',
        country: 'Brasil',
        label: 'São Paulo, Brasil',
      })
      mockAdminPinService.hasPinConfigured.mockResolvedValue(false)

      await expect(ordersService.createForUser(staffContext, dto, mockRequest, mockHttpRequest)).resolves.toBeDefined()
    })

    it('deve exigir funcionário ativo para STAFF', async () => {
      const staffContext = makeAuthContext({ role: 'STAFF', employeeId: 'emp-1', workspaceOwnerUserId: 'user-1' })
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 1 }],
      })
      const products = [makeProduct()]

      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.employee.findFirst.mockResolvedValue(null)

      await expect(ordersService.createForUser(staffContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('deve decrementar estoque em transação', async () => {
      const dto = makeCreateOrderDto()
      const products = [makeProduct({ id: 'product-1', stock: 100 }), makeProduct({ id: 'product-2', stock: 50 })]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.product.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.order.create.mockResolvedValue(makeOrder())
      mockGeocodingService.geocodeCityLocation.mockResolvedValue({
        city: 'São Paulo',
        country: 'Brasil',
        label: 'São Paulo, Brasil',
      })

      await ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)

      expect(mockPrisma.product.updateMany).toHaveBeenCalledTimes(2)
    })

    it('deve registrar audit log após criação', async () => {
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 1 }],
      })
      const products = [makeProduct()]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.create.mockResolvedValue(makeOrder())
      mockGeocodingService.geocodeCityLocation.mockResolvedValue({
        city: 'São Paulo',
        country: 'Brasil',
        label: 'São Paulo, Brasil',
      })

      await ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'order.created',
          resource: 'order',
        }),
      )
    })

    it('deve invalidar cache de pedidos e finance após criação', async () => {
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 1 }],
      })
      const products = [makeProduct()]
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.order.create.mockResolvedValue(makeOrder())
      mockGeocodingService.geocodeCityLocation.mockResolvedValue({
        city: 'São Paulo',
        country: 'Brasil',
        label: 'São Paulo, Brasil',
      })

      await ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)

      expect(mockCache.del).toHaveBeenCalledWith('finance:summary:user-1')
      expect(mockCache.del).toHaveBeenCalledWith('orders:summary:user-1')
    })

    it('deve sanitizar dados do comprador', async () => {
      const dto = makeCreateOrderDto({
        items: [{ productId: 'product-1', quantity: 1 }],
        customerName: '<script>alert("xss")</script>João',
        buyerDocument: '=1+1 fraude',
      })
      const products = [makeProduct()]
      mockPrisma.product.findMany.mockResolvedValue(products)

      await expect(ordersService.createForUser(mockContext, dto, mockRequest, mockHttpRequest)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('cancelForUser', () => {
    it('deve cancelar pedido e retornar estoque', async () => {
      const order = makeOrder({
        status: OrderStatus.COMPLETED,
        items: [makeOrderItem({ productId: 'product-1', quantity: 2, lineRevenue: 40, lineCost: 20, lineProfit: 20 })],
      })
      mockPrisma.order.findFirst.mockResolvedValue(order)
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED })

      const result = await ordersService.cancelForUser(mockContext, 'order-1', mockRequest)

      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'product-1',
          }),
          data: expect.objectContaining({
            stock: { increment: 2 },
          }),
        }),
      )
      expect(result.order.status).toBe(OrderStatus.CANCELLED)
    })

    it('deve rejeitar cancelamento de pedido já cancelado', async () => {
      const order = makeOrder({ status: OrderStatus.CANCELLED })
      mockPrisma.order.findFirst.mockResolvedValue(order)

      await expect(ordersService.cancelForUser(mockContext, 'order-1', mockRequest)).rejects.toThrow(
        BadRequestException,
      )
      await expect(ordersService.cancelForUser(mockContext, 'order-1', mockRequest)).rejects.toThrow('ja foi cancelado')
    })

    it('deve rejeitar cancelamento de pedido inexistente', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null)

      await expect(ordersService.cancelForUser(mockContext, 'order-inexistente', mockRequest)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('deve pular produtos sem productId ou com comandaId', async () => {
      const order = makeOrder({
        status: OrderStatus.COMPLETED,
        items: [
          makeOrderItem({
            productId: null,
            quantity: 2,
            lineRevenue: 40,
            lineCost: 20,
            lineProfit: 20,
            comandaId: 'comanda-1',
          }),
          makeOrderItem({ id: 'order-item-2', productId: 'product-1', quantity: 1 }),
        ],
      })
      mockPrisma.order.findFirst.mockResolvedValue(order)
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED })

      await ordersService.cancelForUser(mockContext, 'order-1', mockRequest)

      expect(mockPrisma.product.updateMany).toHaveBeenCalledTimes(1)
    })

    it('deve registrar audit log de cancelamento', async () => {
      const order = makeOrder({ status: OrderStatus.COMPLETED })
      mockPrisma.order.findFirst.mockResolvedValue(order)
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED })

      await ordersService.cancelForUser(mockContext, 'order-1', mockRequest)

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'order.cancelled',
          severity: 'WARN',
        }),
      )
    })

    it('deve invalidar cache após cancelamento', async () => {
      const order = makeOrder({ status: OrderStatus.COMPLETED })
      mockPrisma.order.findFirst.mockResolvedValue(order)
      mockPrisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED })

      await ordersService.cancelForUser(mockContext, 'order-1', mockRequest)

      expect(mockCache.del).toHaveBeenCalledWith('finance:summary:user-1')
      expect(mockCache.del).toHaveBeenCalledWith('orders:summary:user-1')
    })

    it('deve rejeitar cancelamento para role STAFF', async () => {
      const staffContext = makeAuthContext({ role: 'STAFF' })

      await expect(ordersService.cancelForUser(staffContext, 'order-1', mockRequest)).rejects.toThrow(
        'Apenas o dono pode cancelar vendas',
      )
    })
  })

  describe('invalidateOrdersCache', () => {
    it('deve deletar cache de pedidos do usuário', async () => {
      await ordersService.invalidateOrdersCache('user-123')

      expect(mockCache.del).toHaveBeenCalledWith('orders:summary:user-123')
    })
  })
})
