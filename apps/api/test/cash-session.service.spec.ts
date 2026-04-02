/**
 * @file cash-session.service.spec.ts
 * @module Operations/CashSession
 *
 * Documenta os contratos principais de abertura, movimentacao e fechamento de caixa,
 * incluindo regras de permissao, conflitos de estado e efeitos de realtime/auditoria.
 */

import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common'
import { AuditSeverity, CashClosureStatus, CashMovementType, CashSessionStatus } from '@prisma/client'
import type { CacheService } from '../src/common/services/cache.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import { CashSessionService } from '../src/modules/operations/cash-session.service'
import type { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'
import type { OperationsRealtimeService } from '../src/modules/operations-realtime/operations-realtime.service'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

describe('CashSessionService', () => {
  const prisma = {
    cashSession: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    cashMovement: {
      create: jest.fn(),
    },
    comanda: {
      count: jest.fn(),
    },
    cashClosure: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  }

  const cache = {
    delByPrefix: jest.fn(async () => {}),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const operationsRealtimeService = {
    publishCashUpdated: jest.fn(),
    publishCashOpened: jest.fn(),
    publishCashClosureUpdated: jest.fn(),
  }

  const helpers = {
    assertBusinessDayOpen: jest.fn(async () => {}),
    resolveEmployeeForStaff: jest.fn(),
    requireAuthorizedCashSession: jest.fn(),
    recalculateCashSession: jest.fn(),
    syncCashClosure: jest.fn(),
    buildLiveSnapshot: jest.fn(async () => ({ marker: 'live' })),
  }

  const service = new CashSessionService(
    prisma as unknown as PrismaService,
    cache as unknown as CacheService,
    auditLogService as unknown as AuditLogService,
    operationsRealtimeService as unknown as OperationsRealtimeService,
    helpers as unknown as OperationsHelpersService,
  )

  function makeSession(overrides: Record<string, unknown> = {}) {
    return {
      id: 'cash-1',
      companyOwnerId: 'owner-1',
      employeeId: null,
      status: CashSessionStatus.OPEN,
      businessDate: new Date('2026-04-01T00:00:00.000Z'),
      openingCashAmount: 200,
      countedCashAmount: null,
      expectedCashAmount: 200,
      differenceAmount: null,
      grossRevenueAmount: 0,
      realizedProfitAmount: 0,
      notes: null,
      openedAt: new Date('2026-04-01T09:00:00.000Z'),
      closedAt: null,
      movements: [
        {
          id: 'mov-1',
          cashSessionId: 'cash-1',
          employeeId: null,
          type: CashMovementType.OPENING_FLOAT,
          amount: 200,
          note: 'Abertura',
          createdAt: new Date('2026-04-01T09:00:00.000Z'),
        },
      ],
      ...overrides,
    }
  }

  function makeClosure(overrides: Record<string, unknown> = {}) {
    return {
      id: 'closure-1',
      status: CashClosureStatus.OPEN,
      createdAt: new Date('2026-04-01T08:00:00.000Z'),
      closedAt: null,
      expectedCashAmount: 200,
      countedCashAmount: null,
      differenceAmount: null,
      grossRevenueAmount: 0,
      realizedProfitAmount: 0,
      openSessionsCount: 1,
      openComandasCount: 0,
      ...overrides,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('bloqueia abertura para STAFF sem employee ativo vinculado', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)

    await expect(
      service.openCashSession(
        makeStaffAuthContext({ employeeId: null }),
        { businessDate: '2026-04-01', openingCashAmount: 100 },
        makeRequestContext(),
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('bloqueia abertura quando ja existe caixa aberto', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    prisma.cashSession.findFirst.mockResolvedValue({ id: 'already-open' })

    await expect(
      service.openCashSession(
        makeOwnerAuthContext(),
        { businessDate: '2026-04-01', openingCashAmount: 100 },
        makeRequestContext(),
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('abre caixa com sucesso, registra auditoria e publica eventos', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    prisma.cashSession.findFirst.mockResolvedValue(null)

    const createdSession = makeSession({ expectedCashAmount: 250 })
    const closure = makeClosure()
    const tx = {
      cashSession: {
        create: jest.fn(async () => createdSession),
      },
      cashMovement: {
        create: jest.fn(async () => ({ id: 'mov-opened' })),
      },
    }

    helpers.recalculateCashSession.mockResolvedValue(createdSession)
    helpers.syncCashClosure.mockResolvedValue(closure)
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx))

    const result = await service.openCashSession(
      makeOwnerAuthContext(),
      { businessDate: '2026-04-01', openingCashAmount: 250, notes: 'Abertura do dia' },
      makeRequestContext(),
      { includeSnapshot: true },
    )

    expect(result.cashSession.id).toBe('cash-1')
    expect(result.snapshot).toEqual({ marker: 'live' })
    expect(auditLogService.record).toHaveBeenCalled()
    expect(operationsRealtimeService.publishCashOpened).toHaveBeenCalled()
    expect(operationsRealtimeService.publishCashClosureUpdated).toHaveBeenCalled()
  })

  it('bloqueia movimentacao OPENING_FLOAT manual', async () => {
    await expect(
      service.createCashMovement(
        makeOwnerAuthContext(),
        'cash-1',
        { type: CashMovementType.OPENING_FLOAT, amount: 10 },
        makeRequestContext(),
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('bloqueia movimentacao para caixa fechado', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedCashSession.mockResolvedValue(makeSession({ status: CashSessionStatus.CLOSED }))

    await expect(
      service.createCashMovement(
        makeOwnerAuthContext(),
        'cash-1',
        { type: CashMovementType.SUPPLY, amount: 10 },
        makeRequestContext(),
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('cria movimentacao com sucesso e retorna cashSession atualizado', async () => {
    helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    helpers.requireAuthorizedCashSession.mockResolvedValue(makeSession())

    const movement = {
      id: 'mov-2',
      cashSessionId: 'cash-1',
      employeeId: null,
      type: CashMovementType.SUPPLY,
      amount: 50,
      note: 'Reforco',
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
    }
    const refreshedSession = makeSession({ expectedCashAmount: 250 })
    const closure = makeClosure({ expectedCashAmount: 250 })

    const tx = {
      cashMovement: {
        create: jest.fn(async () => movement),
      },
    }
    helpers.recalculateCashSession.mockResolvedValue(refreshedSession)
    helpers.syncCashClosure.mockResolvedValue(closure)
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx))

    const result = await service.createCashMovement(
      makeOwnerAuthContext(),
      'cash-1',
      { type: CashMovementType.SUPPLY, amount: 50, note: 'Reforco' },
      makeRequestContext(),
      { includeSnapshot: false },
    )

    expect(result.movement.id).toBe('mov-2')
    expect(result.cashSession.expectedCashAmount).toBe(250)
    expect(operationsRealtimeService.publishCashUpdated).toHaveBeenCalled()
    expect(operationsRealtimeService.publishCashClosureUpdated).toHaveBeenCalled()
  })

  it('bloqueia fechamento de caixa quando sessao ja esta encerrada', async () => {
    helpers.requireAuthorizedCashSession.mockResolvedValue(makeSession({ status: CashSessionStatus.CLOSED }))

    await expect(
      service.closeCashSession(makeOwnerAuthContext(), 'cash-1', { countedCashAmount: 300 }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia fechamento de caixa com comandas abertas', async () => {
    helpers.requireAuthorizedCashSession.mockResolvedValue(makeSession())
    prisma.comanda.count.mockResolvedValue(2)

    await expect(
      service.closeCashSession(makeOwnerAuthContext(), 'cash-1', { countedCashAmount: 300 }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('fecha caixa com sucesso e publica eventos', async () => {
    const session = makeSession({ expectedCashAmount: 240 })
    helpers.requireAuthorizedCashSession.mockResolvedValue(session)
    prisma.comanda.count.mockResolvedValue(0)

    const recalculated = makeSession({ expectedCashAmount: 240 })
    const closed = makeSession({
      status: CashSessionStatus.CLOSED,
      expectedCashAmount: 240,
      countedCashAmount: 250,
      differenceAmount: 10,
      closedAt: new Date('2026-04-01T19:00:00.000Z'),
    })
    const closure = makeClosure({
      status: CashClosureStatus.PENDING_EMPLOYEE_CLOSE,
      expectedCashAmount: 240,
      countedCashAmount: 250,
      differenceAmount: 10,
    })

    const tx = {
      cashSession: {
        update: jest.fn(async () => closed),
      },
    }

    helpers.recalculateCashSession.mockResolvedValue(recalculated)
    helpers.syncCashClosure.mockResolvedValue(closure)
    prisma.$transaction.mockImplementation(async (callback: any) => callback(tx))

    const result = await service.closeCashSession(
      makeOwnerAuthContext(),
      'cash-1',
      { countedCashAmount: 250, notes: 'Fechamento ok' },
      makeRequestContext(),
    )

    expect(result.cashSession.status).toBe(CashSessionStatus.CLOSED)
    expect(result.cashSession.differenceAmount).toBe(10)
    expect(auditLogService.record).toHaveBeenCalled()
    expect(operationsRealtimeService.publishCashUpdated).toHaveBeenCalled()
  })

  it('bloqueia fechamento consolidado para STAFF', async () => {
    await expect(
      service.closeCashClosure(
        makeStaffAuthContext(),
        { businessDate: '2026-04-01', countedCashAmount: 100 },
        makeRequestContext(),
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('marca fechamento consolidado como pendente e lanca conflito sem forceClose', async () => {
    const syncedClosure = makeClosure({
      openSessionsCount: 1,
      openComandasCount: 0,
      expectedCashAmount: 300,
    })

    helpers.syncCashClosure.mockResolvedValue(syncedClosure)
    prisma.$transaction.mockImplementation(async (callback: any) => callback({}))
    prisma.cashClosure.update.mockResolvedValue({
      ...syncedClosure,
      status: CashClosureStatus.PENDING_EMPLOYEE_CLOSE,
    })

    await expect(
      service.closeCashClosure(
        makeOwnerAuthContext(),
        { businessDate: '2026-04-01', countedCashAmount: 300, forceClose: false },
        makeRequestContext(),
      ),
    ).rejects.toThrow(ConflictException)

    expect(prisma.cashClosure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: CashClosureStatus.PENDING_EMPLOYEE_CLOSE }),
      }),
    )
  })

  it('fecha consolidado com forceClose e grava severity WARN na auditoria', async () => {
    const syncedClosure = makeClosure({
      expectedCashAmount: 300,
      openSessionsCount: 2,
      openComandasCount: 1,
    })
    const closedClosure = makeClosure({
      status: CashClosureStatus.FORCE_CLOSED,
      expectedCashAmount: 300,
      countedCashAmount: 280,
      differenceAmount: -20,
      closedAt: new Date('2026-04-01T23:10:00.000Z'),
      openSessionsCount: 0,
      openComandasCount: 0,
    })

    helpers.syncCashClosure.mockResolvedValue(syncedClosure)
    prisma.$transaction.mockImplementation(async (callback: any) => callback({}))
    prisma.cashClosure.update.mockResolvedValue(closedClosure)

    const result = await service.closeCashClosure(
      makeOwnerAuthContext(),
      { businessDate: '2026-04-01', countedCashAmount: 280, forceClose: true },
      makeRequestContext(),
      { includeSnapshot: false },
    )

    expect(result.closure?.status).toBe(CashClosureStatus.FORCE_CLOSED)
    expect(result.closure?.differenceAmount).toBe(-20)
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ severity: AuditSeverity.WARN }))
    expect(operationsRealtimeService.publishCashClosureUpdated).toHaveBeenCalled()
  })
})
