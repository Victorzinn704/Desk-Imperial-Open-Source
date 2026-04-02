import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import {
  CashClosureStatus,
  CashMovementType,
  CashSessionStatus,
  ComandaStatus,
  CurrencyCode,
  KitchenItemStatus,
} from '@prisma/client'
import type { CacheService } from '../src/common/services/cache.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuthContext } from '../src/modules/auth/auth.types'
import type { ComandaDraftItemDto } from '../src/modules/operations/dto/comanda-draft-item.dto'
import { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'

describe('OperationsHelpersService - branches', () => {
  const prisma = {
    cashClosure: {
      findUnique: jest.fn(),
    },
  }

  const cache = {
    get: jest.fn(),
    set: jest.fn(),
  }

  let service: OperationsHelpersService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new OperationsHelpersService(prisma as unknown as PrismaService, cache as unknown as CacheService)
  })

  it('buildOperationsComandaWhere aplica status e escopo de funcionario quando informados', () => {
    const businessDate = new Date(2026, 3, 1)

    const where = (service as any).buildOperationsComandaWhere('owner-1', businessDate, 'emp-1', {
      statuses: [ComandaStatus.OPEN, ComandaStatus.READY],
    })

    expect(where.companyOwnerId).toBe('owner-1')
    expect(where.currentEmployeeId).toBe('emp-1')
    expect(where.status).toEqual({ in: [ComandaStatus.OPEN, ComandaStatus.READY] })
    expect(where.OR[0]).toEqual({
      cashSession: {
        is: {
          businessDate,
        },
      },
    })
    expect(where.OR[1]).toEqual({
      cashSessionId: null,
      openedAt: {
        gte: new Date(2026, 3, 1, 0, 0, 0, 0),
        lt: new Date(2026, 3, 2, 0, 0, 0, 0),
      },
    })
  })

  it('buildOperationsComandaWhere omite filtros opcionais quando nao informados', () => {
    const where = (service as any).buildOperationsComandaWhere('owner-1', new Date(2026, 3, 1))

    expect(where).not.toHaveProperty('status')
    expect(where).not.toHaveProperty('currentEmployeeId')
  })

  it('buildKitchenItemWhere inclui apenas status de cozinha ativos e comandas abertas', () => {
    const where = (service as any).buildKitchenItemWhere('owner-1', new Date(2026, 3, 1), 'emp-1')

    expect(where.kitchenStatus).toEqual({
      in: [KitchenItemStatus.QUEUED, KitchenItemStatus.IN_PREPARATION, KitchenItemStatus.READY],
    })
    expect(where.comanda.is.currentEmployeeId).toBe('emp-1')
    expect(where.comanda.is.status.in).toEqual([ComandaStatus.OPEN, ComandaStatus.IN_PREPARATION, ComandaStatus.READY])
  })

  it('recalculateCashSession falha quando caixa nao existe', async () => {
    const transaction = {
      cashSession: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    }

    await expect(service.recalculateCashSession(transaction as any, 'cash-x')).rejects.toThrow(NotFoundException)
  })

  it('recalculateCashSession recalcula expected, gross e profit com movimentos e comandas fechadas', async () => {
    const transaction = {
      cashSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cash-1',
          openingCashAmount: 100,
          movements: [
            { type: CashMovementType.OPENING_FLOAT, amount: 100 },
            { type: CashMovementType.SUPPLY, amount: 40 },
            { type: CashMovementType.WITHDRAWAL, amount: 10 },
            { type: CashMovementType.ADJUSTMENT, amount: 5 },
          ],
          comandas: [
            {
              totalAmount: 150,
              items: [
                {
                  quantity: 2,
                  product: { unitCost: 20 },
                },
              ],
            },
            {
              totalAmount: 50,
              items: [
                {
                  quantity: 1,
                  product: null,
                },
              ],
            },
          ],
        }),
        update: jest.fn().mockResolvedValue({ id: 'cash-1' }),
      },
    }

    await service.recalculateCashSession(transaction as any, 'cash-1')

    expect(transaction.cashSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cash-1' },
        data: {
          expectedCashAmount: 335,
          grossRevenueAmount: 200,
          realizedProfitAmount: 160,
        },
      }),
    )
  })

  it('recalculateComanda falha quando comanda nao existe', async () => {
    const transaction = {
      comanda: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    }

    await expect(service.recalculateComanda(transaction as any, 'comanda-x')).rejects.toThrow(NotFoundException)
  })

  it('recalculateComanda aplica overrides de desconto e taxa de servico', async () => {
    const transaction = {
      comanda: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'comanda-1',
          discountAmount: 10,
          serviceFeeAmount: 5,
          items: [{ totalAmount: 100 }, { totalAmount: 50.555 }],
        }),
        update: jest.fn().mockResolvedValue({ id: 'comanda-1' }),
      },
    }

    await service.recalculateComanda(transaction as any, 'comanda-1', {
      discountAmount: 20,
      serviceFeeAmount: 0,
    })

    expect(transaction.comanda.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          subtotalAmount: 150.56,
          discountAmount: 20,
          serviceFeeAmount: 0,
          totalAmount: 130.56,
        },
      }),
    )
  })

  it('syncCashClosure preserva status CLOSED existente', async () => {
    const transaction = {
      cashSession: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              status: CashSessionStatus.OPEN,
              expectedCashAmount: 100,
              grossRevenueAmount: 30,
              realizedProfitAmount: 10,
            },
          ]),
      },
      comanda: {
        count: jest.fn().mockResolvedValue(2),
      },
      cashClosure: {
        findUnique: jest.fn().mockResolvedValue({ status: CashClosureStatus.CLOSED }),
        upsert: jest.fn().mockResolvedValue({ status: CashClosureStatus.CLOSED }),
      },
    }

    await service.syncCashClosure(transaction as any, 'owner-1', new Date(2026, 3, 1))

    expect(transaction.cashClosure.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: CashClosureStatus.CLOSED }),
      }),
    )
  })

  it('syncCashClosure seta PENDING quando ha sessoes ou comandas abertas', async () => {
    const transaction = {
      cashSession: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              status: CashSessionStatus.OPEN,
              expectedCashAmount: 120,
              grossRevenueAmount: 40,
              realizedProfitAmount: 15,
            },
          ]),
      },
      comanda: {
        count: jest.fn().mockResolvedValue(0),
      },
      cashClosure: {
        findUnique: jest.fn().mockResolvedValue({ status: CashClosureStatus.OPEN }),
        upsert: jest.fn().mockResolvedValue({ status: CashClosureStatus.PENDING_EMPLOYEE_CLOSE }),
      },
    }

    await service.syncCashClosure(transaction as any, 'owner-1', new Date(2026, 3, 1))

    expect(transaction.cashClosure.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: CashClosureStatus.PENDING_EMPLOYEE_CLOSE,
          expectedCashAmount: 120,
          grossRevenueAmount: 40,
          realizedProfitAmount: 15,
          openSessionsCount: 1,
          openComandasCount: 0,
        }),
      }),
    )
  })

  it('syncCashClosure seta OPEN quando nao ha pendencias', async () => {
    const transaction = {
      cashSession: {
        findMany: jest.fn().mockResolvedValue([
          {
            status: CashSessionStatus.CLOSED,
            expectedCashAmount: 200,
            grossRevenueAmount: 200,
            realizedProfitAmount: 80,
          },
        ]),
      },
      comanda: {
        count: jest.fn().mockResolvedValue(0),
      },
      cashClosure: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ status: CashClosureStatus.OPEN }),
      },
    }

    await service.syncCashClosure(transaction as any, 'owner-1', new Date(2026, 3, 1))

    expect(transaction.cashClosure.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: CashClosureStatus.OPEN, openSessionsCount: 0, openComandasCount: 0 }),
      }),
    )
  })

  it('requireAuthorizedCashSession permite OWNER sem checagem de funcionario', async () => {
    const ownerAuth = makeOwnerAuthContext()
    const session = { id: 'cash-1', employeeId: 'emp-1' }

    jest.spyOn(service as any, 'requireOwnedCashSession').mockResolvedValue(session)
    const resolveEmployeeSpy = jest.spyOn(service as any, 'resolveEmployeeForStaff')

    const result = await service.requireAuthorizedCashSession({} as any, 'owner-1', ownerAuth, 'cash-1')

    expect(result).toBe(session)
    expect(resolveEmployeeSpy).not.toHaveBeenCalled()
  })

  it('requireAuthorizedCashSession bloqueia STAFF operando caixa de outro funcionario', async () => {
    const staffAuth = makeStaffAuthContext({ employeeId: 'emp-1' })

    jest.spyOn(service as any, 'requireOwnedCashSession').mockResolvedValue({ id: 'cash-1', employeeId: 'emp-2' })
    jest.spyOn(service as any, 'resolveEmployeeForStaff').mockResolvedValue({ id: 'emp-1' })

    await expect(service.requireAuthorizedCashSession({} as any, 'owner-1', staffAuth, 'cash-1')).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('requireAuthorizedCashSession permite STAFF quando caixa pertence ao funcionario autenticado', async () => {
    const staffAuth = makeStaffAuthContext({ employeeId: 'emp-2' })
    const session = { id: 'cash-1', employeeId: 'emp-2' }

    jest.spyOn(service as any, 'requireOwnedCashSession').mockResolvedValue(session)
    jest.spyOn(service as any, 'resolveEmployeeForStaff').mockResolvedValue({ id: 'emp-2' })

    await expect(service.requireAuthorizedCashSession({} as any, 'owner-1', staffAuth, 'cash-1')).resolves.toBe(session)
  })

  it('requireOwnedCashSession falha quando sessao nao pertence ao workspace', async () => {
    const transaction = {
      cashSession: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    }

    await expect(service.requireOwnedCashSession(transaction as any, 'owner-1', 'cash-1')).rejects.toThrow(
      NotFoundException,
    )
  })

  it('requireOwnedCashSession inclui movimentos quando solicitado', async () => {
    const transaction = {
      cashSession: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cash-1' }),
      },
    }

    await service.requireOwnedCashSession(transaction as any, 'owner-1', 'cash-1', { includeMovements: true })

    expect(transaction.cashSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          movements: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      }),
    )
  })

  it('requireAuthorizedComanda permite OWNER e bloqueia STAFF sem vinculo', async () => {
    const ownerAuth = makeOwnerAuthContext()
    const staffAuth = makeStaffAuthContext({ employeeId: 'emp-1' })
    const comanda = { id: 'comanda-1', currentEmployeeId: 'emp-2' }

    jest.spyOn(service as any, 'requireOwnedComanda').mockResolvedValue(comanda)
    jest.spyOn(service as any, 'resolveEmployeeForStaff').mockResolvedValue({ id: 'emp-1' })

    await expect(service.requireAuthorizedComanda({} as any, 'owner-1', ownerAuth, 'comanda-1')).resolves.toBe(comanda)
    await expect(service.requireAuthorizedComanda({} as any, 'owner-1', staffAuth, 'comanda-1')).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('requireAuthorizedComanda permite STAFF quando comanda esta vinculada ao seu atendimento', async () => {
    const staffAuth = makeStaffAuthContext({ employeeId: 'emp-3' })
    const comanda = { id: 'comanda-1', currentEmployeeId: 'emp-3' }

    jest.spyOn(service as any, 'requireOwnedComanda').mockResolvedValue(comanda)
    jest.spyOn(service as any, 'resolveEmployeeForStaff').mockResolvedValue({ id: 'emp-3' })

    await expect(service.requireAuthorizedComanda({} as any, 'owner-1', staffAuth, 'comanda-1')).resolves.toBe(comanda)
  })

  it('requireOwnedComanda e requireOwnedEmployee falham quando recurso nao existe', async () => {
    const transaction = {
      comanda: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    }

    await expect(service.requireOwnedComanda(transaction as any, 'owner-1', 'comanda-1')).rejects.toThrow(
      NotFoundException,
    )
    await expect(service.requireOwnedEmployee(transaction as any, 'owner-1', 'emp-1')).rejects.toThrow(
      NotFoundException,
    )
  })

  it('resolveEmployeeForStaff retorna null para OWNER e para STAFF sem employeeId', async () => {
    const transaction = {
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'emp-1' }),
      },
    }

    await expect(
      service.resolveEmployeeForStaff(transaction as any, 'owner-1', makeOwnerAuthContext()),
    ).resolves.toBeNull()

    await expect(
      service.resolveEmployeeForStaff(transaction as any, 'owner-1', makeStaffAuthContext({ employeeId: null })),
    ).resolves.toBeNull()

    expect(transaction.employee.findFirst).not.toHaveBeenCalled()
  })

  it('resolveEmployeeForStaff carrega funcionario ativo para STAFF com employeeId', async () => {
    const employee = { id: 'emp-1' }
    const transaction = {
      employee: {
        findFirst: jest.fn().mockResolvedValue(employee),
      },
    }

    const result = await service.resolveEmployeeForStaff(
      transaction as any,
      'owner-1',
      makeStaffAuthContext({ employeeId: 'emp-1' }),
    )

    expect(result).toBe(employee)
    expect(transaction.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'emp-1', userId: 'owner-1', active: true }) }),
    )
  })

  it('resolveComandaBusinessDate usa businessDate da sessao quando existente', async () => {
    const transaction = {
      cashSession: {
        findUnique: jest.fn().mockResolvedValue({ businessDate: new Date(2026, 3, 1) }),
      },
    }

    const result = await service.resolveComandaBusinessDate(transaction as any, {
      cashSessionId: 'cash-1',
      openedAt: new Date(2026, 3, 2, 10, 0, 0),
    })

    expect(result).toEqual(new Date(2026, 3, 1))
  })

  it('resolveComandaBusinessDate cai para data da abertura quando sessao nao e encontrada', async () => {
    const transaction = {
      cashSession: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    }

    const result = await service.resolveComandaBusinessDate(transaction as any, {
      cashSessionId: 'cash-x',
      openedAt: new Date(2026, 3, 2, 21, 45, 0),
    })

    expect(result).toEqual(new Date(2026, 3, 2, 0, 0, 0, 0))
  })

  it('resolveComandaDraftItems retorna vazio quando lista nao existe', async () => {
    const transaction = {
      product: {
        findMany: jest.fn(),
      },
    }

    const result = await service.resolveComandaDraftItems(transaction as any, 'owner-1', undefined)

    expect(result).toEqual([])
    expect(transaction.product.findMany).not.toHaveBeenCalled()
  })

  it('resolveComandaDraftItems normaliza itens de catalogo e manuais', async () => {
    const transaction = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'prod-1',
            name: 'Pizza Casa',
            unitPrice: 30,
          },
        ]),
      },
    }

    const draftItems: ComandaDraftItemDto[] = [
      {
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 31.114,
        notes: '  sem cebola ',
      } as ComandaDraftItemDto,
      {
        productName: ' Item Manual ',
        quantity: 1,
        unitPrice: 12.499,
        notes: '   ',
      } as ComandaDraftItemDto,
    ]

    const result = await service.resolveComandaDraftItems(transaction as any, 'owner-1', draftItems)

    expect(result).toEqual([
      {
        productId: 'prod-1',
        productName: 'Pizza Casa',
        quantity: 2,
        unitPrice: 31.11,
        totalAmount: 62.22,
        notes: 'sem cebola',
      },
      {
        productId: null,
        productName: 'Item Manual',
        quantity: 1,
        unitPrice: 12.5,
        totalAmount: 12.5,
        notes: null,
      },
    ])
  })

  it('resolveComandaDraftItems falha quando produto nao existe no catalogo do workspace', async () => {
    const transaction = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    }

    await expect(
      service.resolveComandaDraftItems(transaction as any, 'owner-1', [
        { productId: 'prod-x', quantity: 1 } as ComandaDraftItemDto,
      ]),
    ).rejects.toThrow(NotFoundException)
  })

  it('resolveComandaDraftItems falha para item manual sem unitPrice ou com nome invalido', async () => {
    const transaction = {
      product: {
        findMany: jest.fn(),
      },
    }

    await expect(
      service.resolveComandaDraftItems(transaction as any, 'owner-1', [
        { productName: 'Manual', quantity: 1 } as ComandaDraftItemDto,
      ]),
    ).rejects.toThrow(BadRequestException)

    await expect(
      service.resolveComandaDraftItems(transaction as any, 'owner-1', [
        { productName: '=CSV formula', quantity: 1, unitPrice: 10 } as ComandaDraftItemDto,
      ]),
    ).rejects.toThrow(BadRequestException)
  })

  it('assertOpenTableAvailability bloqueia mesa ocupada e permite mesa livre', async () => {
    const transaction = {
      comanda: {
        findFirst: jest.fn().mockResolvedValueOnce({ id: 'comanda-open' }).mockResolvedValueOnce(null),
      },
    }

    await expect(service.assertOpenTableAvailability(transaction as any, 'owner-1', 'Mesa 1')).rejects.toThrow(
      ConflictException,
    )

    await expect(
      service.assertOpenTableAvailability(transaction as any, 'owner-1', 'Mesa 2', 'comanda-atual'),
    ).resolves.toBeUndefined()
  })

  it('ensureOrderForClosedComanda retorna pedido existente sem recriar', async () => {
    const transaction = {
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: 'order-1' }),
        create: jest.fn(),
      },
      comanda: {
        findFirst: jest.fn(),
      },
    }

    const result = await service.ensureOrderForClosedComanda(transaction as any, 'owner-1', 'comanda-1')

    expect(result).toEqual({ id: 'order-1' })
    expect(transaction.order.create).not.toHaveBeenCalled()
  })

  it('ensureOrderForClosedComanda falha quando comanda nao existe', async () => {
    const transaction = {
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      comanda: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    }

    await expect(service.ensureOrderForClosedComanda(transaction as any, 'owner-1', 'comanda-x')).rejects.toThrow(
      NotFoundException,
    )
  })

  it('ensureOrderForClosedComanda cria pedido consolidado com custos e categorias corretos', async () => {
    const transaction = {
      product: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'order-created' }),
      },
      comanda: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'comanda-1',
          customerName: 'Cliente XPTO',
          customerDocument: '529.982.247-25',
          currentEmployeeId: 'emp-1',
          currentEmployee: {
            employeeCode: 'E001',
            displayName: 'Atendente 1',
          },
          notes: 'Fechamento presencial',
          totalAmount: 50,
          items: [
            {
              productId: 'prod-1',
              productName: 'Pizza',
              quantity: 2,
              unitPrice: 15,
              totalAmount: 30,
              product: {
                unitCost: 10,
                category: 'Alimentos',
              },
            },
            {
              productId: null,
              productName: 'Taxa manual',
              quantity: 1,
              unitPrice: 20,
              totalAmount: 20,
              product: null,
            },
          ],
        }),
      },
    }

    await service.ensureOrderForClosedComanda(transaction as any, 'owner-1', 'comanda-1')

    expect(transaction.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'owner-1',
          comandaId: 'comanda-1',
          buyerType: 'PERSON',
          currency: CurrencyCode.BRL,
          status: 'COMPLETED',
          totalRevenue: 50,
          totalCost: 20,
          totalProfit: 30,
          totalItems: 3,
        }),
      }),
    )

    const createPayload = transaction.order.create.mock.calls[0][0]
    expect(transaction.product.updateMany).toHaveBeenCalledTimes(2)
    expect(createPayload.data.items.create).toEqual([
      expect.objectContaining({ category: 'Alimentos', lineCost: 20, lineRevenue: 30, lineProfit: 10 }),
      expect.objectContaining({ category: 'Comanda manual', lineCost: 0, lineRevenue: 20, lineProfit: 20 }),
    ])
  })

  it('assertBusinessDayOpen bloqueia dias consolidados e permite dias abertos', async () => {
    prisma.cashClosure.findUnique
      .mockResolvedValueOnce({ status: CashClosureStatus.CLOSED })
      .mockResolvedValueOnce({ status: CashClosureStatus.FORCE_CLOSED })
      .mockResolvedValueOnce({ status: CashClosureStatus.OPEN })

    await expect(service.assertBusinessDayOpen('owner-1', new Date(2026, 3, 1))).rejects.toThrow(ConflictException)
    await expect(service.assertBusinessDayOpen('owner-1', new Date(2026, 3, 2))).rejects.toThrow(ConflictException)
    await expect(service.assertBusinessDayOpen('owner-1', new Date(2026, 3, 3))).resolves.toBeUndefined()
  })

  it('assertBusinessDayOpen permite quando nao existe consolidacao para o dia', async () => {
    prisma.cashClosure.findUnique.mockResolvedValue(null)

    await expect(service.assertBusinessDayOpen('owner-1', new Date(2026, 3, 4))).resolves.toBeUndefined()
  })

  it('requireAuthorizedComanda usa actorEmployee informado quando presente', async () => {
    const auth = makeStaffAuthContext({ employeeId: 'emp-9' }) as AuthContext
    const actorEmployee = { id: 'emp-9' }
    const comanda = { id: 'comanda-1', currentEmployeeId: 'emp-9' }

    jest.spyOn(service as any, 'requireOwnedComanda').mockResolvedValue(comanda)
    const resolveEmployeeSpy = jest.spyOn(service as any, 'resolveEmployeeForStaff')

    const result = await service.requireAuthorizedComanda({} as any, 'owner-1', auth, 'comanda-1', actorEmployee as any)

    expect(result).toBe(comanda)
    expect(resolveEmployeeSpy).not.toHaveBeenCalled()
  })
})
