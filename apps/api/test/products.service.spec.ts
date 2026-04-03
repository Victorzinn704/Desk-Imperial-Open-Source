/**
 * @file products.service.spec.ts
 * @module Products
 *
 * Testes unitários do ProductsService — módulo de gestão de portfólio de produtos.
 *
 * Estratégia de teste:
 * - Todos os colaboradores externos (Prisma, Cache, Currency, AuditLog) são mockados
 * - Cada `describe` cobre um cenário de negócio completo com happy path + casos de borda
 * - Foco em validação de entrada, sanitização e regras de negócio
 *
 * Cobertura garantida:
 *   ✅ listForUser() — listagem com cache, filtros e paginação
 *   ✅ createForUser() — criação com validação e sanitização
 *   ✅ updateForUser() — atualização parcial e completa
 *   ✅ archiveForUser() / restoreForUser() — toggle de status
 *   ✅ importForUser() — importação CSV com upsert e tratamento de erros
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { CurrencyCode, Prisma } from '@prisma/client'
import { ProductsService } from '../src/modules/products/products.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { CurrencyService } from '../src/modules/currency/currency.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { CacheService } from '../src/common/services/cache.service'
import type { FinanceService } from '../src/modules/finance/finance.service'
import type { CreateProductDto } from '../src/modules/products/dto/create-product.dto'
import type { UpdateProductDto } from '../src/modules/products/dto/update-product.dto'
import type { ListProductsQueryDto } from '../src/modules/products/dto/list-products.query'
import * as productsImportUtil from '../src/modules/products/products-import.util'
import { makeAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  $transaction: jest.fn(),
  product: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  productComboItem: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
}

const mockCurrencyService = {
  getSnapshot: jest.fn(),
  convert: jest.fn(),
}

const mockAuditLogService = {
  record: jest.fn(),
}

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  isReady: jest.fn(),
  financeKey: jest.fn(),
  productsKey: jest.fn(),
}

const mockFinanceService = {
  invalidateAndWarmSummary: jest.fn(),
}

// ── Factories ─────────────────────────────────────────────────────────────────

function makeProduct(overrides: object = {}) {
  return {
    id: 'product-1',
    userId: 'user-1',
    name: 'Produto Teste',
    brand: 'Marca Teste',
    category: 'Categoria Teste',
    packagingClass: 'Classe Teste',
    measurementUnit: 'UN',
    measurementValue: 1,
    unitsPerPackage: 1,
    isCombo: false,
    comboDescription: null,
    description: 'Descrição teste',
    unitCost: 10.0,
    unitPrice: 20.0,
    currency: CurrencyCode.BRL,
    stock: 100,
    requiresKitchen: false,
    active: true,
    comboComponents: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function makeCreateProductDto(overrides: Partial<CreateProductDto> = {}): CreateProductDto {
  return {
    name: 'Produto Novo',
    category: 'Categoria Nova',
    packagingClass: 'Classe Nova',
    measurementUnit: 'UN',
    measurementValue: 1,
    unitsPerPackage: 1,
    unitCost: 10.0,
    unitPrice: 20.0,
    currency: CurrencyCode.BRL,
    stock: 50,
    ...overrides,
  }
}

function makeListProductsQueryDto(overrides: Partial<ListProductsQueryDto> = {}): ListProductsQueryDto {
  return {
    limit: 20,
    includeInactive: false,
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

function makePrismaUniqueError() {
  const error = new Error('Unique constraint failed')
  Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype)
  ;(error as any).code = 'P2002'
  return error
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let productsService: ProductsService
let mockContext: ReturnType<typeof makeAuthContext>
let requestContext: ReturnType<typeof makeRequestContext>

beforeEach(() => {
  jest.clearAllMocks()

  productsService = new ProductsService(
    mockPrisma as unknown as PrismaService,
    mockCurrencyService as unknown as CurrencyService,
    mockAuditLogService as unknown as AuditLogService,
    mockCache as unknown as CacheService,
    mockFinanceService as unknown as FinanceService,
  )

  mockContext = makeAuthContext({
    userId: 'user-1',
    workspaceOwnerUserId: 'user-1',
    email: 'joao@empresa.com',
    fullName: 'João Silva',
  })
  requestContext = makeRequestContext()

  // Defaults
  mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma))
  mockPrisma.product.findUniqueOrThrow.mockResolvedValue(makeProduct())
  mockCurrencyService.getSnapshot.mockResolvedValue(makeCurrencySnapshot())
  mockCache.isReady.mockReturnValue(true)
  mockCache.financeKey.mockReturnValue('finance:summary:user-1')
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProductsService', () => {
  describe('listForUser', () => {
    it('deve retornar produtos do usuário com cache quando disponível', async () => {
      const cachedResponse = {
        items: [makeProduct()],
        totals: { totalProducts: 1, activeProducts: 1 },
        currency: 'BRL',
        ratesUpdatedAt: new Date().toISOString(),
      }
      mockCache.get.mockResolvedValue(cachedResponse)

      const result = await productsService.listForUser(mockContext, {})

      expect(result).toEqual(cachedResponse)
      expect(mockCache.get).toHaveBeenCalledWith('products:list:user-1:active')
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled()
    })

    it('deve buscar produtos do banco quando cache não disponível', async () => {
      mockCache.get.mockResolvedValue(null)

      const products = [
        makeProduct({ name: 'Produto 1', active: true }),
        makeProduct({ name: 'Produto 2', active: true }),
      ]
      mockPrisma.product.findMany.mockResolvedValue(products)

      const result = await productsService.listForUser(mockContext, makeListProductsQueryDto())

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          where: {
            userId: 'user-1',
            active: true,
          },
          orderBy: [{ createdAt: 'desc' }],
        }),
      )
      expect(result.items).toHaveLength(2)
    })

    it('deve aplicar filtro por categoria quando fornecido', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([])

      await productsService.listForUser(mockContext, makeListProductsQueryDto({ category: 'Bebidas' }))

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: {
              equals: 'Bebidas',
              mode: 'insensitive',
            },
          }),
        }),
      )
    })

    it('deve aplicar filtro por search quando fornecido', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([])

      await productsService.listForUser(mockContext, makeListProductsQueryDto({ search: 'Coca' }))

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'Coca', mode: 'insensitive' } },
              { brand: { contains: 'Coca', mode: 'insensitive' } },
              { category: { contains: 'Coca', mode: 'insensitive' } },
              { packagingClass: { contains: 'Coca', mode: 'insensitive' } },
              { description: { contains: 'Coca', mode: 'insensitive' } },
            ]),
          }),
        }),
      )
    })

    it('deve incluir produtos inativos quando OWNER e includeInactive=true', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([])

      await productsService.listForUser(
        { ...mockContext, role: 'OWNER' },
        makeListProductsQueryDto({ includeInactive: true }),
      )

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            // active não deve estar no filtro quando includeInactive=true
          },
        }),
      )
    })

    it('deve limitar a 2000 produtos mesmo com limit maior', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([])

      await productsService.listForUser(mockContext, makeListProductsQueryDto({ limit: 5000 }))

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 2000,
        }),
      )
    })

    it('deve usar paginação com cursor quando fornecido', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([])

      await productsService.listForUser(mockContext, makeListProductsQueryDto({ cursor: 'product-123', limit: 50 }))

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 1,
          cursor: { id: 'product-123' },
        }),
      )
    })

    it('deve fazer cache do resultado quando sem filtros', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([makeProduct()])

      await productsService.listForUser(mockContext, {})

      expect(mockCache.set).toHaveBeenCalledWith('products:list:user-1:active', expect.any(Object), 300)
    })

    it('NÃO deve fazer cache quando há filtros', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([])

      await productsService.listForUser(mockContext, makeListProductsQueryDto({ category: 'Bebidas' }))

      expect(mockCache.set).not.toHaveBeenCalled()
    })

    it('deve usar cache dedicado para OWNER com includeInactive=true', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([])

      await productsService.listForUser({ ...mockContext, role: 'OWNER' }, { includeInactive: true })

      expect(mockCache.get).toHaveBeenCalledWith('products:list:user-1:all')
      expect(mockCache.set).toHaveBeenCalledWith('products:list:user-1:all', expect.any(Object), 300)
    })

    it('deve evitar snapshot remoto quando todas as moedas ja estao na moeda preferida', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([
        makeProduct({ currency: CurrencyCode.BRL }),
        makeProduct({ id: 'p-2', currency: CurrencyCode.BRL }),
      ])

      await productsService.listForUser({ ...mockContext, preferredCurrency: CurrencyCode.BRL }, {})

      expect(mockCurrencyService.getSnapshot).not.toHaveBeenCalled()
    })

    it('deve buscar snapshot remoto quando ha moedas diferentes da preferida', async () => {
      mockCache.get.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([
        makeProduct({ currency: CurrencyCode.USD }),
        makeProduct({ id: 'p-2', currency: CurrencyCode.BRL }),
      ])

      await productsService.listForUser({ ...mockContext, preferredCurrency: CurrencyCode.BRL }, {})

      expect(mockCurrencyService.getSnapshot).toHaveBeenCalledTimes(1)
    })
  })

  describe('createForUser', () => {
    it('deve criar produto com dados válidos', async () => {
      const dto = makeCreateProductDto()
      const createdProduct = makeProduct(dto)

      mockPrisma.product.create.mockResolvedValue(createdProduct)

      const result = await productsService.createForUser(mockContext, dto, requestContext)

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'Produto Novo',
          category: 'Categoria Nova',
          packagingClass: 'Classe Nova',
          measurementUnit: 'UN',
          measurementValue: 1,
          unitsPerPackage: 1,
          unitCost: 10.0,
          unitPrice: 20.0,
          currency: CurrencyCode.BRL,
          stock: 50,
          active: true,
        }),
      })
      expect(result.product).toBeDefined()
    })

    it('deve sanitizar texto e rejeitar HTML', async () => {
      const dto = makeCreateProductDto({
        name: '<script>alert("xss")</script>Produto',
        description: 'Descrição <b>negrito</b>',
      })

      mockPrisma.product.create.mockResolvedValue(makeProduct())

      await expect(productsService.createForUser(mockContext, dto, requestContext)).rejects.toThrow(BadRequestException)
      await expect(
        productsService.createForUser(mockContext, { ...dto, description: 'ok' }, requestContext),
      ).rejects.toThrow(BadRequestException)
    })

    it('deve rejeitar fórmula de planilha no nome', async () => {
      const dto = makeCreateProductDto({
        name: '=1+1 Produto',
      })

      mockPrisma.product.create.mockResolvedValue(makeProduct())

      await expect(productsService.createForUser(mockContext, dto, requestContext)).rejects.toThrow(BadRequestException)
    })

    it('deve permitir campos opcionais vazios', async () => {
      const dto = makeCreateProductDto({
        brand: undefined,
        description: undefined,
      })

      mockPrisma.product.create.mockResolvedValue(makeProduct())

      await productsService.createForUser(mockContext, dto, requestContext)

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            brand: null,
            description: null,
          }),
        }),
      )
    })

    it('deve lançar ConflictException em caso de duplicate name', async () => {
      const dto = makeCreateProductDto()
      mockPrisma.product.create.mockRejectedValue(makePrismaUniqueError())

      await expect(productsService.createForUser(mockContext, dto, requestContext)).rejects.toThrow(ConflictException)
    })

    it('deve registrar audit log após criação', async () => {
      const dto = makeCreateProductDto()
      mockPrisma.product.create.mockResolvedValue(makeProduct(dto))
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(makeProduct(dto))

      await productsService.createForUser(mockContext, dto, requestContext)

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product.created',
          resource: 'product',
          metadata: expect.objectContaining({
            name: 'Produto Novo',
            category: 'Categoria Nova',
          }),
        }),
      )
    })

    it('deve invalidar cache de produtos e finance após criação', async () => {
      const dto = makeCreateProductDto()
      mockPrisma.product.create.mockResolvedValue(makeProduct(dto))

      await productsService.createForUser(mockContext, dto, requestContext)

      expect(mockFinanceService.invalidateAndWarmSummary).toHaveBeenCalledWith('user-1')
      expect(mockCache.del).toHaveBeenCalledWith('products:list:user-1:active')
      expect(mockCache.del).toHaveBeenCalledWith('products:list:user-1:all')
    })

    it('deve exigir componentes ao criar produto do tipo combo', async () => {
      const dto = makeCreateProductDto({
        isCombo: true,
        comboItems: [],
      })

      await expect(productsService.createForUser(mockContext, dto, requestContext)).rejects.toThrow(
        'pelo menos um componente',
      )
    })

    it('deve rejeitar componente de combo com productId vazio', async () => {
      const dto = makeCreateProductDto({
        isCombo: true,
        comboItems: [
          {
            productId: '   ',
            quantityPackages: 1,
            quantityUnits: 0,
          },
        ],
      })

      await expect(productsService.createForUser(mockContext, dto, requestContext)).rejects.toThrow(
        'precisa informar um produto',
      )
    })

    it('deve rejeitar componente de combo sem quantidade', async () => {
      const dto = makeCreateProductDto({
        isCombo: true,
        comboItems: [
          {
            productId: 'component-1',
            quantityPackages: 0,
            quantityUnits: 0,
          },
        ],
      })

      await expect(productsService.createForUser(mockContext, dto, requestContext)).rejects.toThrow(
        'precisa de quantidade em caixa ou unidade',
      )
    })

    it('deve criar combo agregando componentes repetidos e normalizando quantidades', async () => {
      const dto = makeCreateProductDto({
        name: 'Combo da Casa',
        category: 'Petisco',
        isCombo: true,
        comboDescription: 'Combo com dois itens',
        comboItems: [
          {
            productId: 'component-pack',
            quantityPackages: 1,
            quantityUnits: 2,
          },
          {
            productId: 'component-unit',
            quantityPackages: 2,
            quantityUnits: 3,
          },
          {
            productId: 'component-pack',
            quantityPackages: 0,
            quantityUnits: 1,
          },
        ],
      })
      mockPrisma.product.create.mockResolvedValue(makeProduct({ id: 'combo-1', isCombo: true, name: 'Combo da Casa' }))
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'component-pack', unitsPerPackage: 6 },
        { id: 'component-unit', unitsPerPackage: 1 },
      ])
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(
        makeProduct({ id: 'combo-1', isCombo: true, name: 'Combo da Casa' }),
      )

      await productsService.createForUser(mockContext, dto, requestContext)

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isCombo: true,
            comboDescription: 'Combo com dois itens',
            requiresKitchen: true,
          }),
        }),
      )
      expect(mockPrisma.productComboItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            comboProductId: 'combo-1',
            componentProductId: 'component-pack',
            quantityPackages: 1,
            quantityUnits: 3,
            totalUnits: 9,
          }),
          expect.objectContaining({
            comboProductId: 'combo-1',
            componentProductId: 'component-unit',
            quantityPackages: 0,
            quantityUnits: 5,
            totalUnits: 5,
          }),
        ]),
      })
    })

    it('deve rejeitar combo que referencia o proprio produto', async () => {
      const dto = makeCreateProductDto({
        isCombo: true,
        comboItems: [
          {
            productId: 'combo-1',
            quantityPackages: 1,
            quantityUnits: 0,
          },
        ],
      })
      mockPrisma.product.create.mockResolvedValue(makeProduct({ id: 'combo-1', isCombo: true }))
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'combo-1', unitsPerPackage: 1 }])

      await expect(productsService.createForUser(mockContext, dto, requestContext)).rejects.toThrow(
        /ele mesmo como componente/i,
      )
    })

    it('deve rejeitar combo com componente inexistente', async () => {
      const dto = makeCreateProductDto({
        isCombo: true,
        comboItems: [
          {
            productId: 'component-missing',
            quantityPackages: 1,
            quantityUnits: 0,
          },
        ],
      })
      mockPrisma.product.create.mockResolvedValue(makeProduct({ id: 'combo-1', isCombo: true }))
      mockPrisma.product.findMany.mockResolvedValue([])

      await expect(productsService.createForUser(mockContext, dto, requestContext)).rejects.toThrow(NotFoundException)
    })

    it('deve propagar erro nao mapeado na criacao', async () => {
      const dto = makeCreateProductDto()
      const dbError = new Error('database offline')
      mockPrisma.product.create.mockRejectedValue(dbError)

      await expect(productsService.createForUser(mockContext, dto, requestContext)).rejects.toThrow('database offline')
    })

    it('deve rejeitar criação para role STAFF', async () => {
      const dto = makeCreateProductDto()
      const staffContext = makeAuthContext({ role: 'STAFF' })

      await expect(productsService.createForUser(staffContext, dto, requestContext)).rejects.toThrow(
        'Apenas o dono pode cadastrar produtos.',
      )
    })
  })

  describe('updateForUser', () => {
    it('deve atualizar produto existente com dados fornecidos', async () => {
      const existingProduct = makeProduct()
      const updateDto: UpdateProductDto = {
        name: 'Produto Atualizado',
        unitPrice: 25.0,
      }

      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(existingProduct)
      mockPrisma.product.update.mockResolvedValue({
        ...existingProduct,
        ...updateDto,
      })
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue({
        ...existingProduct,
        ...updateDto,
      })

      const result = await productsService.updateForUser(mockContext, 'product-1', updateDto, requestContext)

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: expect.objectContaining({
          name: 'Produto Atualizado',
          unitPrice: 25.0,
        }),
      })
      expect(result.product.name).toBe('Produto Atualizado')
    })

    it('deve atualizar apenas campos fornecidos (update parcial)', async () => {
      const existingProduct = makeProduct()
      const updateDto: UpdateProductDto = {
        stock: 200,
      }

      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(existingProduct)
      mockPrisma.product.update.mockResolvedValue({
        ...existingProduct,
        stock: 200,
      })

      await productsService.updateForUser(mockContext, 'product-1', updateDto, requestContext)

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stock: 200,
          }),
        }),
      )
    })

    it('deve lançar NotFoundException se produto não existir', async () => {
      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(null)

      await expect(
        productsService.updateForUser(mockContext, 'product-inexistente', makeCreateProductDto(), requestContext),
      ).rejects.toThrow(NotFoundException)
    })

    it('deve registrar audit log com campos atualizados', async () => {
      const existingProduct = makeProduct()
      const updateDto: UpdateProductDto = { name: 'Novo Nome' }

      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(existingProduct)
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, ...updateDto })

      await productsService.updateForUser(mockContext, 'product-1', updateDto, requestContext)

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product.updated',
          metadata: expect.objectContaining({
            updatedFields: expect.arrayContaining(['name']),
          }),
        }),
      )
    })

    it('deve rejeitar componentes quando produto nao e combo', async () => {
      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(makeProduct({ isCombo: false }))

      await expect(
        productsService.updateForUser(
          mockContext,
          'product-1',
          {
            comboItems: [
              {
                productId: 'component-1',
                quantityPackages: 1,
                quantityUnits: 0,
              },
            ],
          },
          requestContext,
        ),
      ).rejects.toThrow('marque o produto como combo')
    })

    it('deve rejeitar combo com lista de componentes vazia na atualizacao', async () => {
      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(makeProduct({ isCombo: true }))

      await expect(
        productsService.updateForUser(
          mockContext,
          'product-1',
          {
            comboItems: [],
          },
          requestContext,
        ),
      ).rejects.toThrow('pelo menos um componente')
    })

    it('deve exigir composicao ao ativar combo em produto simples', async () => {
      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(makeProduct({ isCombo: false }))

      await expect(
        productsService.updateForUser(
          mockContext,
          'product-1',
          {
            isCombo: true,
          },
          requestContext,
        ),
      ).rejects.toThrow(/itens de composi/i)
    })

    it('deve substituir componentes quando atualizar um combo', async () => {
      const existingProduct = makeProduct({ id: 'product-1', isCombo: true })
      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(existingProduct)
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, comboDescription: 'Combo atualizado' })
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'component-1', unitsPerPackage: 4 }])
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(
        makeProduct({ id: 'product-1', isCombo: true, comboDescription: 'Combo atualizado' }),
      )

      await productsService.updateForUser(
        mockContext,
        'product-1',
        {
          isCombo: true,
          comboDescription: 'Combo atualizado',
          comboItems: [
            {
              productId: 'component-1',
              quantityPackages: 1,
              quantityUnits: 1,
            },
          ],
        },
        requestContext,
      )

      expect(mockPrisma.productComboItem.deleteMany).toHaveBeenCalledWith({
        where: {
          comboProductId: 'product-1',
        },
      })
      expect(mockPrisma.productComboItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            comboProductId: 'product-1',
            componentProductId: 'component-1',
            quantityPackages: 1,
            quantityUnits: 1,
            totalUnits: 5,
          }),
        ],
      })
    })

    it('deve mapear violacao de unicidade para ConflictException na atualizacao', async () => {
      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(makeProduct())
      mockPrisma.product.update.mockRejectedValue(makePrismaUniqueError())

      await expect(
        productsService.updateForUser(
          mockContext,
          'product-1',
          {
            name: 'Produto duplicado',
          },
          requestContext,
        ),
      ).rejects.toThrow(ConflictException)
    })

    it('deve rejeitar atualização para role STAFF', async () => {
      const staffContext = makeAuthContext({ role: 'STAFF' })
      const updateDto: UpdateProductDto = { name: 'Novo Nome' }

      await expect(productsService.updateForUser(staffContext, 'product-1', updateDto, requestContext)).rejects.toThrow(
        'Apenas o dono pode editar produtos.',
      )
    })
  })

  describe('archiveForUser / restoreForUser', () => {
    it('deve arquivar produto (active=false)', async () => {
      const existingProduct = makeProduct()
      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(existingProduct)
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, active: false })
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue({ ...existingProduct, active: false })

      const result = await productsService.archiveForUser(mockContext, 'product-1', requestContext)

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { active: false },
        }),
      )
      expect(result.product.active).toBe(false)
    })

    it('deve restaurar produto (active=true)', async () => {
      const existingProduct = makeProduct({ active: false })
      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(existingProduct)
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, active: true })

      const result = await productsService.restoreForUser(mockContext, 'product-1', requestContext)

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { active: true },
        }),
      )
      expect(result.product.active).toBe(true)
    })

    it('deve registrar audit log com evento correto', async () => {
      const existingProduct = makeProduct()
      mockPrisma.product.findFirst = jest.fn().mockResolvedValue(existingProduct)
      mockPrisma.product.update.mockResolvedValue({ ...existingProduct, active: false })

      await productsService.archiveForUser(mockContext, 'product-1', requestContext)

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product.archived',
        }),
      )
    })
  })

  describe('importForUser', () => {
    const makeCsvFile = (content: string) => ({
      buffer: Buffer.from(content),
      originalname: 'produtos.csv',
    })

    const validCsvContent = `name,category,packagingClass,measurementUnit,measurementValue,unitsPerPackage,description,unitCost,unitPrice,currency,stock
  Produto 1,Categoria A,Classe A,UN,1,1,Desc 1,10.00,20.00,BRL,100
  Produto 2,Categoria B,Classe B,UN,1,1,Desc 2,15.00,30.00,BRL,50`

    it('deve importar CSV válido com upsert', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      mockPrisma.product.upsert.mockResolvedValue(makeProduct())

      const result = await productsService.importForUser(mockContext, makeCsvFile(validCsvContent), requestContext)

      expect(result.summary.totalRows).toBe(2)
      expect(result.summary.createdCount).toBeGreaterThanOrEqual(0)
      expect(result.errors).toHaveLength(0)
    })

    it('deve retornar erros de linhas inválidas', async () => {
      const invalidCsvContent = `name,category,packagingClass,measurementUnit,measurementValue,unitsPerPackage,description,unitCost,unitPrice,currency,stock
    ,Categoria A,Classe A,UN,1,1,Desc,10.00,20.00,BRL,100`

      mockPrisma.product.findUnique.mockResolvedValue(null)

      const result = await productsService.importForUser(mockContext, makeCsvFile(invalidCsvContent), requestContext)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('nome valido')
    })

    it('deve rejeitar arquivo vazio', async () => {
      const emptyCsv = makeCsvFile('')

      await expect(productsService.importForUser(mockContext, emptyCsv, requestContext)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('deve rejeitar sem arquivo', async () => {
      await expect(productsService.importForUser(mockContext, undefined, requestContext)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('deve rejeitar moeda não suportada', async () => {
      const invalidCurrencyCsv =
        makeCsvFile(`name,category,packagingClass,measurementUnit,measurementValue,unitsPerPackage,description,unitCost,unitPrice,currency,stock
    Produto 1,Categoria A,Classe A,UN,1,1,Desc,10.00,20.00,XYZ,100`)

      mockPrisma.product.findUnique.mockResolvedValue(null)
      mockPrisma.product.upsert.mockResolvedValue(makeProduct())

      const result = await productsService.importForUser(mockContext, invalidCurrencyCsv, requestContext)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('moeda')
    })

    it('deve sanitizar dados antes de upsert', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      mockPrisma.product.upsert.mockResolvedValue(makeProduct())

      const csvWithHtml =
        makeCsvFile(`name,category,packagingClass,measurementUnit,measurementValue,unitsPerPackage,description,unitCost,unitPrice,currency,stock
    <script>XSS</script>Produto,Categoria A,Classe A,UN,1,1,Desc,10.00,20.00,BRL,100`)

      const result = await productsService.importForUser(mockContext, csvWithHtml, requestContext)

      expect(result.summary.failedCount).toBe(1)
      expect(result.errors[0].message).toContain('HTML')
    })

    it('deve registrar audit log de importação', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      mockPrisma.product.upsert.mockResolvedValue(makeProduct())

      await productsService.importForUser(mockContext, makeCsvFile(validCsvContent), requestContext)

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'product.imported',
          metadata: expect.objectContaining({
            fileName: 'produtos.csv',
            totalRows: 2,
          }),
        }),
      )
    })

    it('deve invalidar cache após importação', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      mockPrisma.product.upsert.mockResolvedValue(makeProduct())

      await productsService.importForUser(mockContext, makeCsvFile(validCsvContent), requestContext)

      expect(mockFinanceService.invalidateAndWarmSummary).toHaveBeenCalledWith('user-1')
      expect(mockCache.del).toHaveBeenCalledWith('products:list:user-1:active')
      expect(mockCache.del).toHaveBeenCalledWith('products:list:user-1:all')
    })

    it('deve converter erro de parse do CSV para BadRequestException', async () => {
      const fileWithNullByte = makeCsvFile(`\0name,category,description,unitCost,unitPrice,stock\nP,C,D,1,2,1`)

      await expect(productsService.importForUser(mockContext, fileWithNullByte, requestContext)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('deve contabilizar registros criados e atualizados', async () => {
      mockPrisma.product.findUnique.mockResolvedValueOnce(makeProduct({ id: 'existing-1' })).mockResolvedValueOnce(null)
      mockPrisma.product.upsert.mockResolvedValue(makeProduct())

      const result = await productsService.importForUser(mockContext, makeCsvFile(validCsvContent), requestContext)

      expect(result.summary.updatedCount).toBe(1)
      expect(result.summary.createdCount).toBe(1)
    })

    it('deve usar mensagem padrao quando erro da linha nao e instancia de Error', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      mockPrisma.product.upsert.mockRejectedValue('falha-inesperada')

      const result = await productsService.importForUser(mockContext, makeCsvFile(validCsvContent), requestContext)

      expect(result.summary.failedCount).toBe(2)
      expect(result.errors[0].message).toContain('Falha inesperada ao importar a linha')
    })

    it('deve ajustar requiresKitchen no update do upsert conforme categoria', async () => {
      const csv =
        makeCsvFile(`name,category,packagingClass,measurementUnit,measurementValue,unitsPerPackage,description,unitCost,unitPrice,currency,stock
    Cerveja Pilsen,Cerveja,Classe A,UN,1,1,Desc,10,20,BRL,10
    Prato Feito,Prato,Classe B,UN,1,1,Desc,12,30,BRL,5`)
      mockPrisma.product.findUnique.mockResolvedValue(makeProduct())
      mockPrisma.product.upsert.mockResolvedValue(makeProduct())

      await productsService.importForUser(mockContext, csv, requestContext)

      expect(mockPrisma.product.upsert.mock.calls[0][0].update.requiresKitchen).toBeUndefined()
      expect(mockPrisma.product.upsert.mock.calls[1][0].update.requiresKitchen).toBe(true)
    })

    it.each([
      {
        label: 'categoria invalida',
        row: 'Produto,C,Classe,UN,1,1,Desc,10,20,BRL,1',
        expected: 'categoria valida',
      },
      {
        label: 'classe de cadastro invalida',
        row: 'Produto,Categoria,C,UN,1,1,Desc,10,20,BRL,1',
        expected: 'classe de cadastro valida',
      },
      {
        label: 'measurementValue invalido',
        row: 'Produto,Categoria,Classe,UN,0,1,Desc,10,20,BRL,1',
        expected: 'medida por item precisa ser numerica',
      },
      {
        label: 'unitsPerPackage invalido',
        row: 'Produto,Categoria,Classe,UN,1,0,Desc,10,20,BRL,1',
        expected: 'quantidade por caixa/fardo precisa ser um inteiro maior que zero',
      },
    ])('deve registrar erro de validacao para $label', async ({ row, expected }) => {
      const csv = makeCsvFile(
        `name,category,packagingClass,measurementUnit,measurementValue,unitsPerPackage,description,unitCost,unitPrice,currency,stock
    ${row}`,
      )

      const result = await productsService.importForUser(mockContext, csv, requestContext)

      expect(result.summary.failedCount).toBe(1)
      expect(result.errors[0].message).toContain(expected)
    })

    it('deve aplicar validacoes defensivas quando parser retorna dados inconsistentes', async () => {
      const parserSpy = jest.spyOn(productsImportUtil, 'parseProductImportCsv').mockReturnValue([
        {
          line: 2,
          name: 'Produto A',
          brand: null,
          category: 'Categoria',
          packagingClass: 'Classe',
          measurementUnit: '',
          measurementValue: 1,
          unitsPerPackage: 1,
          description: null,
          unitCost: 10,
          unitPrice: 20,
          currency: 'BRL',
          stockPackages: 0,
          stockLooseUnits: 0,
          stock: 1,
        },
        {
          line: 3,
          name: 'Produto B',
          brand: null,
          category: 'Categoria',
          packagingClass: 'Classe',
          measurementUnit: 'UN',
          measurementValue: 1,
          unitsPerPackage: 1,
          description: null,
          unitCost: -1,
          unitPrice: 20,
          currency: 'BRL',
          stockPackages: 0,
          stockLooseUnits: 0,
          stock: 1,
        },
        {
          line: 4,
          name: 'Produto C',
          brand: null,
          category: 'Categoria',
          packagingClass: 'Classe',
          measurementUnit: 'UN',
          measurementValue: 1,
          unitsPerPackage: 1,
          description: null,
          unitCost: 10,
          unitPrice: -2,
          currency: 'BRL',
          stockPackages: 0,
          stockLooseUnits: 0,
          stock: 1,
        },
        {
          line: 5,
          name: 'Produto D',
          brand: null,
          category: 'Categoria',
          packagingClass: 'Classe',
          measurementUnit: 'UN',
          measurementValue: 1,
          unitsPerPackage: 1,
          description: null,
          unitCost: 10,
          unitPrice: 20,
          currency: 'BRL',
          stockPackages: 0,
          stockLooseUnits: 0,
          stock: -1,
        },
      ])

      const result = await productsService.importForUser(mockContext, makeCsvFile('ignored'), requestContext)

      expect(result.summary.failedCount).toBe(4)
      expect(result.errors.map((error) => error.message).join(' | ')).toContain('unidade de medida valida')
      expect(result.errors.map((error) => error.message).join(' | ')).toContain(
        'custo unitario precisa ser numerico e nao negativo',
      )
      expect(result.errors.map((error) => error.message).join(' | ')).toContain(
        'preco unitario precisa ser numerico e nao negativo',
      )
      expect(result.errors.map((error) => error.message).join(' | ')).toContain(
        'estoque precisa ser um inteiro nao negativo',
      )

      parserSpy.mockRestore()
    })

    it('deve rejeitar importação para role STAFF', async () => {
      const staffContext = makeAuthContext({ role: 'STAFF' })

      await expect(
        productsService.importForUser(staffContext, makeCsvFile(validCsvContent), requestContext),
      ).rejects.toThrow('Apenas o dono pode importar produtos.')
    })
  })

  describe('combo internals', () => {
    type ComboPayloadInput = {
      productId: string
      quantityPackages: number
      quantityUnits: number
    }

    const getBuildComboItemsPayload = () => {
      const internals = productsService as unknown as {
        buildComboItemsPayload: (
          transaction: unknown,
          workspaceUserId: string,
          comboProductId: string,
          normalizedItems: ComboPayloadInput[],
        ) => Promise<unknown>
      }

      return internals.buildComboItemsPayload
    }

    it('deve rejeitar payload interno de combo vazio', async () => {
      const buildComboItemsPayload = getBuildComboItemsPayload()

      await expect(buildComboItemsPayload(mockPrisma, 'user-1', 'combo-1', [])).rejects.toThrow(BadRequestException)
    })

    it('deve rejeitar payload interno com total de unidades <= 0', async () => {
      const buildComboItemsPayload = getBuildComboItemsPayload()
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'component-1', unitsPerPackage: 6 }])

      await expect(
        buildComboItemsPayload(mockPrisma, 'user-1', 'combo-1', [
          {
            productId: 'component-1',
            quantityPackages: 0,
            quantityUnits: 0,
          },
        ]),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('invalidateProductsCache', () => {
    it('deve deletar cache de produtos do usuário', async () => {
      await productsService.invalidateProductsCache('user-123')

      expect(mockCache.del).toHaveBeenCalledWith('products:list:user-123:active')
      expect(mockCache.del).toHaveBeenCalledWith('products:list:user-123:all')
    })
  })
})
