import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { CashSessionService } from '../src/modules/operations/cash-session.service'
import type { ComandaService } from '../src/modules/operations/comanda.service'
import type { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'
import { OperationsService } from '../src/modules/operations/operations.service'
import type { OperationsRealtimeService } from '../src/modules/operations-realtime/operations-realtime.service'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

describe('OperationsService (facade)', () => {
  const prisma = {
    mesa: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    comanda: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  }

  const cashSession = {
    openCashSession: jest.fn(),
    createCashMovement: jest.fn(),
    closeCashSession: jest.fn(),
    closeCashClosure: jest.fn(),
  }

  const comanda = {
    openComanda: jest.fn(),
    addComandaItem: jest.fn(),
    addComandaItems: jest.fn(),
    replaceComanda: jest.fn(),
    assignComanda: jest.fn(),
    updateComandaStatus: jest.fn(),
    getComandaDetails: jest.fn(),
    closeComanda: jest.fn(),
    updateKitchenItemStatus: jest.fn(),
  }

  const helpers = {
    buildLiveSnapshot: jest.fn(),
    buildKitchenView: jest.fn(),
    buildSummaryView: jest.fn(),
  }

  const realtime = {
    publishMesaUpserted: jest.fn(),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const service = new OperationsService(
    prisma as unknown as PrismaService,
    cashSession as unknown as CashSessionService,
    comanda as unknown as ComandaService,
    helpers as unknown as OperationsHelpersService,
    realtime as unknown as OperationsRealtimeService,
    auditLogService as unknown as AuditLogService,
  )

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.comanda.findFirst.mockResolvedValue(null)
  })

  it('delega consultas de snapshot para helpers com escopo correto', async () => {
    helpers.buildLiveSnapshot.mockResolvedValue({ snapshot: 'live' })
    helpers.buildKitchenView.mockResolvedValue({ snapshot: 'kitchen' })
    helpers.buildSummaryView.mockResolvedValue({ snapshot: 'summary' })

    const staffAuth = makeStaffAuthContext({ employeeId: 'employee-9' })
    const ownerAuth = makeOwnerAuthContext()

    const live = await service.getLiveSnapshot(staffAuth, {
      businessDate: '2026-04-01',
      includeCashMovements: true,
      compactMode: true,
    })
    const kitchen = await service.getKitchenView(ownerAuth, { businessDate: '2026-04-01' })
    const summary = await service.getSummaryView(ownerAuth, { businessDate: '2026-04-01' })

    expect(live).toEqual({ snapshot: 'live' })
    expect(kitchen).toEqual({ snapshot: 'kitchen' })
    expect(summary).toEqual({ snapshot: 'summary' })

    expect(helpers.buildLiveSnapshot).toHaveBeenCalledWith(
      'owner-1',
      expect.any(Date),
      'employee-9',
      expect.objectContaining({ includeCashMovements: true, compactMode: true }),
    )
    expect(helpers.buildKitchenView).toHaveBeenCalledWith('owner-1', expect.any(Date), null)
    expect(helpers.buildSummaryView).toHaveBeenCalledWith('owner-1', expect.any(Date), null)
  })

  it('delega wrappers de caixa e comanda para os serviços internos', async () => {
    const auth = makeOwnerAuthContext()
    const context = makeRequestContext()
    const options = { includeSnapshot: false }

    cashSession.openCashSession.mockResolvedValue({ ok: 'open-cash' })
    cashSession.createCashMovement.mockResolvedValue({ ok: 'movement' })
    cashSession.closeCashSession.mockResolvedValue({ ok: 'close-cash' })
    cashSession.closeCashClosure.mockResolvedValue({ ok: 'close-closure' })
    comanda.openComanda.mockResolvedValue({ ok: 'open-comanda' })
    comanda.addComandaItem.mockResolvedValue({ ok: 'add-item' })
    comanda.addComandaItems.mockResolvedValue({ ok: 'add-items' })
    comanda.replaceComanda.mockResolvedValue({ ok: 'replace' })
    comanda.assignComanda.mockResolvedValue({ ok: 'assign' })
    comanda.updateComandaStatus.mockResolvedValue({ ok: 'status' })
    comanda.getComandaDetails.mockResolvedValue({ ok: 'details' })
    comanda.closeComanda.mockResolvedValue({ ok: 'close' })
    comanda.updateKitchenItemStatus.mockResolvedValue({ ok: 'kitchen' })

    await expect(service.openCashSession(auth, {} as any, context, options as any)).resolves.toEqual({
      ok: 'open-cash',
    })
    await expect(service.createCashMovement(auth, 'cash-1', {} as any, context, options as any)).resolves.toEqual({
      ok: 'movement',
    })
    await expect(service.closeCashSession(auth, 'cash-1', {} as any, context, options as any)).resolves.toEqual({
      ok: 'close-cash',
    })
    await expect(service.closeCashClosure(auth, {} as any, context, options as any)).resolves.toEqual({
      ok: 'close-closure',
    })
    await expect(service.openComanda(auth, {} as any, context, options as any)).resolves.toEqual({ ok: 'open-comanda' })
    await expect(service.addComandaItem(auth, 'comanda-1', {} as any, context, options as any)).resolves.toEqual({
      ok: 'add-item',
    })
    await expect(service.addComandaItems(auth, 'comanda-1', {} as any, context, options as any)).resolves.toEqual({
      ok: 'add-items',
    })
    await expect(service.replaceComanda(auth, 'comanda-1', {} as any, context, options as any)).resolves.toEqual({
      ok: 'replace',
    })
    await expect(service.assignComanda(auth, 'comanda-1', {} as any, context, options as any)).resolves.toEqual({
      ok: 'assign',
    })
    await expect(service.updateComandaStatus(auth, 'comanda-1', {} as any, context, options as any)).resolves.toEqual({
      ok: 'status',
    })
    await expect(service.getComandaDetails(auth, 'comanda-1')).resolves.toEqual({ ok: 'details' })
    await expect(service.closeComanda(auth, 'comanda-1', {} as any, context, options as any)).resolves.toEqual({
      ok: 'close',
    })
    await expect(service.updateKitchenItemStatus(auth, 'item-1', {} as any, context)).resolves.toEqual({
      ok: 'kitchen',
    })
  })

  it('lista mesas com status livre, ocupada e reservada', async () => {
    prisma.mesa.findMany.mockResolvedValue([
      {
        id: 'mesa-1',
        label: 'Mesa 1',
        capacity: 4,
        section: null,
        positionX: 10,
        positionY: 20,
        active: true,
        reservedUntil: null,
      },
      {
        id: 'mesa-2',
        label: 'Mesa 2',
        capacity: 6,
        section: 'Varanda',
        positionX: 30,
        positionY: 40,
        active: true,
        reservedUntil: new Date(Date.now() + 60_000),
      },
    ])
    prisma.comanda.findMany.mockResolvedValue([
      { id: 'comanda-1', mesaId: 'mesa-1', currentEmployeeId: 'emp-1', status: 'OPEN' },
    ])

    const result = await service.listMesas(makeOwnerAuthContext())

    expect(result).toHaveLength(2)
    const firstMesa = result[0]
    const secondMesa = result[1]
    expect(firstMesa).toBeDefined()
    expect(secondMesa).toBeDefined()
    expect(firstMesa?.status).toBe('ocupada')
    expect(firstMesa?.comandaId).toBe('comanda-1')
    expect(secondMesa?.status).toBe('reservada')
  })

  it('bloqueia listagem de mesas para STAFF', async () => {
    await expect(service.listMesas(makeStaffAuthContext())).rejects.toThrow(ForbiddenException)
  })

  it('cria mesa e publica evento realtime', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce(null)
    prisma.mesa.create.mockResolvedValue({
      id: 'mesa-10',
      label: 'Mesa 10',
      capacity: 8,
      section: 'Principal',
      positionX: 100,
      positionY: 120,
      active: true,
      reservedUntil: null,
    })

    const result = await service.createMesa(
      makeOwnerAuthContext(),
      {
        label: '  Mesa 10  ',
        capacity: 8,
        section: 'Principal',
        positionX: 100,
        positionY: 120,
      },
      makeRequestContext(),
    )

    expect(result.id).toBe('mesa-10')
    expect(result.status).toBe('livre')
    expect(prisma.mesa.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ label: 'Mesa 10', section: 'Principal' }),
      }),
    )
    expect(auditLogService.record).toHaveBeenCalled()
    expect(realtime.publishMesaUpserted).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ mesaId: 'mesa-10', label: 'Mesa 10' }),
    )
  })

  it('falha ao criar mesa com label duplicado', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce({ id: 'mesa-duplicada' })

    await expect(service.createMesa(makeOwnerAuthContext(), { label: 'Mesa 1' }, makeRequestContext())).rejects.toThrow(
      ConflictException,
    )
  })

  it('falha ao atualizar mesa inexistente ou de outro workspace', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce(null)

    await expect(
      service.updateMesa(makeOwnerAuthContext(), 'mesa-x', { label: 'Mesa nova' }, makeRequestContext()),
    ).rejects.toThrow(NotFoundException)
  })

  it('falha ao atualizar mesa com label em conflito', async () => {
    prisma.mesa.findUnique
      .mockResolvedValueOnce({ id: 'mesa-1', companyOwnerId: 'owner-1', label: 'Mesa 1' })
      .mockResolvedValueOnce({ id: 'mesa-2' })

    await expect(
      service.updateMesa(makeOwnerAuthContext(), 'mesa-1', { label: 'Mesa 2' }, makeRequestContext()),
    ).rejects.toThrow(ConflictException)
  })

  it('atualiza mesa com sucesso e publica evento realtime', async () => {
    prisma.mesa.findUnique
      .mockResolvedValueOnce({ id: 'mesa-1', companyOwnerId: 'owner-1', label: 'Mesa 1' })
      .mockResolvedValueOnce(null)
    prisma.mesa.update.mockResolvedValue({
      id: 'mesa-1',
      label: 'Mesa Nova',
      capacity: 10,
      section: 'Varanda',
      positionX: 300,
      positionY: 200,
      active: true,
      reservedUntil: null,
    })

    const result = await service.updateMesa(
      makeOwnerAuthContext(),
      'mesa-1',
      {
        label: 'Mesa Nova',
        capacity: 10,
        section: 'Varanda',
        positionX: 300,
        positionY: 200,
      },
      makeRequestContext(),
    )

    expect(result.label).toBe('Mesa Nova')
    expect(result.capacity).toBe(10)
    expect(prisma.mesa.update).toHaveBeenCalled()
    expect(auditLogService.record).toHaveBeenCalled()
    expect(realtime.publishMesaUpserted).toHaveBeenCalled()
  })

  it('rejeita reservedUntil inválido no updateMesa', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce({ id: 'mesa-1', companyOwnerId: 'owner-1', label: 'Mesa 1' })

    await expect(
      service.updateMesa(
        makeOwnerAuthContext(),
        'mesa-1',
        {
          reservedUntil: 'not-a-date',
        },
        makeRequestContext(),
      ),
    ).rejects.toThrow(BadRequestException)

    expect(prisma.mesa.update).not.toHaveBeenCalled()
  })

  it('sanitiza section no updateMesa e bloqueia formula injection', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce({ id: 'mesa-1', companyOwnerId: 'owner-1', label: 'Mesa 1' })
    prisma.mesa.update.mockResolvedValue({
      id: 'mesa-1',
      label: 'Mesa 1',
      capacity: 4,
      section: 'Varanda Norte',
      positionX: null,
      positionY: null,
      active: true,
      reservedUntil: null,
    })

    await service.updateMesa(
      makeOwnerAuthContext(),
      'mesa-1',
      {
        section: '  Varanda\nNorte  ',
      },
      makeRequestContext(),
    )

    expect(prisma.mesa.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ section: 'Varanda Norte' }),
      }),
    )

    prisma.mesa.findUnique.mockResolvedValueOnce({ id: 'mesa-1', companyOwnerId: 'owner-1', label: 'Mesa 1' })

    await expect(
      service.updateMesa(
        makeOwnerAuthContext(),
        'mesa-1',
        {
          section: "=1+cmd('calc')",
        },
        makeRequestContext(),
      ),
    ).rejects.toThrow(BadRequestException)
  })
})
