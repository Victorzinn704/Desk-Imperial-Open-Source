import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { ComandaStatus } from '@prisma/client'
import type { CacheService } from '../src/common/services/cache.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuthContext } from '../src/modules/auth/auth.types'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import { ComandaService } from '../src/modules/operations/comanda.service'
import type { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'
import type { OperationsRealtimeService } from '../src/modules/operations-realtime/operations-realtime.service'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

describe('ComandaService (public branches)', () => {
  const prisma = {
    comanda: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    comandaItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    cashSession: {
      findFirst: jest.fn(),
    },
    mesa: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const cache = {
    delByPrefix: jest.fn(async () => {}),
    del: jest.fn(async () => {}),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const operationsRealtimeService = {
    publishComandaOpened: jest.fn(),
    publishComandaUpdated: jest.fn(),
    publishComandaClosed: jest.fn(),
    publishCashUpdated: jest.fn(),
    publishCashClosureUpdated: jest.fn(),
    publishKitchenItemQueued: jest.fn(),
    publishKitchenItemUpdated: jest.fn(),
  }

  const helpers = {
    resolveEmployeeForStaff: jest.fn(),
    resolveComandaDraftItems: jest.fn(),
    requireAuthorizedComanda: jest.fn(),
    requireOwnedComanda: jest.fn(),
    resolveComandaBusinessDate: jest.fn(),
    syncCashClosure: jest.fn(),
  }

  const service = new ComandaService(
    prisma as unknown as PrismaService,
    cache as unknown as CacheService,
    auditLogService as unknown as AuditLogService,
    operationsRealtimeService as unknown as OperationsRealtimeService,
    helpers as unknown as OperationsHelpersService,
  )

  const ownerAuth = makeOwnerAuthContext() as AuthContext
  const staffAuth = makeStaffAuthContext() as AuthContext

  function makeComanda(status: ComandaStatus = ComandaStatus.OPEN, overrides: Record<string, unknown> = {}) {
    return {
      id: 'comanda-1',
      companyOwnerId: 'owner-1',
      cashSessionId: 'cash-1',
      mesaId: 'mesa-1',
      currentEmployeeId: 'emp-1',
      tableLabel: 'Mesa 1',
      customerName: 'Cliente',
      customerDocument: null,
      participantCount: 2,
      status,
      subtotalAmount: 100,
      discountAmount: 10,
      serviceFeeAmount: 5,
      totalAmount: 95,
      notes: null,
      openedAt: new Date('2026-04-01T10:00:00.000Z'),
      closedAt: null,
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Produto',
          quantity: 1,
          unitPrice: 100,
          totalAmount: 100,
          notes: null,
          kitchenStatus: null,
          kitchenQueuedAt: null,
          kitchenReadyAt: null,
        },
      ],
      ...overrides,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retorna detalhes da comanda quando encontrada', async () => {
    prisma.comanda.findUnique.mockResolvedValue(makeComanda())

    const result = await service.getComandaDetails(ownerAuth, 'comanda-1')

    expect(result.comanda.id).toBe('comanda-1')
    expect(result.comanda.tableLabel).toBe('Mesa 1')
  })

  it('falha ao buscar detalhes quando comanda nao existe', async () => {
    prisma.comanda.findUnique.mockResolvedValue(null)

    await expect(service.getComandaDetails(ownerAuth, 'comanda-x')).rejects.toThrow(NotFoundException)
  })

  it('bloqueia addComandaItem quando comanda esta encerrada', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.CLOSED))

    await expect(
      service.addComandaItem(staffAuth, 'comanda-1', { quantity: 1, productId: 'prod-1' }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia addComandaItems quando comanda esta cancelada', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.CANCELLED))

    await expect(
      service.addComandaItems(staffAuth, 'comanda-1', { items: [{ quantity: 1, productId: 'prod-1' }] }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia replaceComanda quando comanda ja esta fechada', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.CLOSED))

    await expect(
      service.replaceComanda(ownerAuth, 'comanda-1', { tableLabel: 'Mesa 2', items: [] }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia assignComanda para STAFF', async () => {
    await expect(
      service.assignComanda(staffAuth, 'comanda-1', { employeeId: 'emp-1' }, makeRequestContext()),
    ).rejects.toThrow(ForbiddenException)
  })

  it('bloqueia updateComandaStatus quando novo status e CLOSED', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.OPEN))

    await expect(
      service.updateComandaStatus(ownerAuth, 'comanda-1', { status: ComandaStatus.CLOSED }, makeRequestContext()),
    ).rejects.toThrow(BadRequestException)
  })

  it('bloqueia updateComandaStatus quando comanda ja esta CLOSED', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.CLOSED))

    await expect(
      service.updateComandaStatus(ownerAuth, 'comanda-1', { status: ComandaStatus.OPEN }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia updateComandaStatus quando comanda ja esta CANCELLED', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.CANCELLED))

    await expect(
      service.updateComandaStatus(ownerAuth, 'comanda-1', { status: ComandaStatus.OPEN }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia closeComanda quando ja estava CLOSED', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.CLOSED))

    await expect(
      service.closeComanda(ownerAuth, 'comanda-1', { discountAmount: 0, serviceFeeAmount: 0 }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia closeComanda quando estava CANCELLED', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.CANCELLED))

    await expect(
      service.closeComanda(ownerAuth, 'comanda-1', { discountAmount: 0, serviceFeeAmount: 0 }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia closeComanda sem itens', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.OPEN, { items: [] }))

    await expect(
      service.closeComanda(ownerAuth, 'comanda-1', { discountAmount: 0, serviceFeeAmount: 0 }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia closeComanda quando desconto supera o subtotal', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.OPEN))

    await expect(
      service.closeComanda(ownerAuth, 'comanda-1', { discountAmount: 120, serviceFeeAmount: 0 }, makeRequestContext()),
    ).rejects.toThrow(BadRequestException)
  })

  it('bloqueia openComanda quando taxa de serviço supera o subtotal dos itens', async () => {
    helpers.resolveComandaDraftItems.mockResolvedValue([
      {
        productId: 'prod-1',
        productName: 'Produto',
        quantity: 1,
        unitPrice: 100,
        totalAmount: 100,
        notes: null,
      },
    ])

    await expect(
      service.openComanda(
        ownerAuth,
        {
          tableLabel: 'Mesa 1',
          items: [{ productId: 'prod-1', quantity: 1 }],
          serviceFeeAmount: 120,
        } as never,
        makeRequestContext(),
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('bloqueia replaceComanda quando desconto supera o subtotal dos itens', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda(ComandaStatus.OPEN))
    helpers.resolveComandaDraftItems.mockResolvedValue([
      {
        productId: 'prod-1',
        productName: 'Produto',
        quantity: 1,
        unitPrice: 100,
        totalAmount: 100,
        notes: null,
      },
    ])

    await expect(
      service.replaceComanda(
        ownerAuth,
        'comanda-1',
        {
          tableLabel: 'Mesa 1',
          items: [{ productId: 'prod-1', quantity: 1 }],
          discountAmount: 120,
        } as never,
        makeRequestContext(),
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('falha updateKitchenItemStatus quando item nao existe', async () => {
    prisma.comandaItem.findUnique.mockResolvedValue(null)

    await expect(
      service.updateKitchenItemStatus(ownerAuth, 'item-x', { status: 'READY' as any }, makeRequestContext()),
    ).rejects.toThrow(NotFoundException)
  })

  it('falha updateKitchenItemStatus quando item nao pertence a fila de cozinha', async () => {
    prisma.comandaItem.findUnique.mockResolvedValue({
      id: 'item-1',
      kitchenStatus: null,
      kitchenQueuedAt: null,
      kitchenReadyAt: null,
      comanda: {
        id: 'comanda-1',
        companyOwnerId: 'owner-1',
        tableLabel: 'Mesa 1',
        status: ComandaStatus.OPEN,
        cashSessionId: 'cash-1',
        openedAt: new Date('2026-04-01T10:00:00.000Z'),
      },
    })

    await expect(
      service.updateKitchenItemStatus(ownerAuth, 'item-1', { status: 'READY' as any }, makeRequestContext()),
    ).rejects.toThrow(BadRequestException)
  })
})
