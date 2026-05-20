import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { ComandaStatus } from '@prisma/client'
import { makeStaffAuthContext } from './helpers/auth-context.factory'
import { COMANDA_ID, makeComanda, makeOwnerAuth, makeRequest } from './helpers/comanda-service-fixtures'
import { type ComandaServiceHarness, createComandaServiceHarness } from './helpers/comanda-service-harness'

describe('ComandaService (public branches)', () => {
  let harness: ComandaServiceHarness
  const ownerAuth = makeOwnerAuth()
  const staffAuth = makeStaffAuthContext()

  const makeDraftItems = () => [
    {
      productId: 'prod-1',
      productName: 'Produto',
      quantity: 1,
      unitPrice: 100,
      totalAmount: 100,
      notes: null,
    },
  ]

  const mockAuthorizedComanda = (status: ComandaStatus, overrides: Record<string, unknown> = {}) => {
    harness.helpers.resolveEmployeeForStaff.mockResolvedValue(null)
    harness.helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda({ status, ...overrides }))
  }

  const mockDraftItems = () => {
    harness.helpers.resolveComandaDraftItems.mockResolvedValue(makeDraftItems())
  }

  const closeComanda = (overrides: Record<string, unknown> = {}) =>
    harness.service.closeComanda(
      ownerAuth,
      COMANDA_ID,
      { discountAmount: 0, serviceFeeAmount: 0, ...overrides } as never,
      makeRequest(),
    )

  const replaceComanda = (overrides: Record<string, unknown> = {}) =>
    harness.service.replaceComanda(
      ownerAuth,
      COMANDA_ID,
      { tableLabel: 'Mesa 2', items: [], ...overrides } as never,
      makeRequest(),
    )

  const updateComandaStatus = (status: ComandaStatus) =>
    harness.service.updateComandaStatus(ownerAuth, COMANDA_ID, { status } as never, makeRequest())

  beforeEach(() => {
    harness = createComandaServiceHarness()
  })

  it('retorna detalhes da comanda quando encontrada', async () => {
    harness.prisma.comanda.findFirst.mockResolvedValue(makeComanda())

    const result = await harness.service.getComandaDetails(ownerAuth, COMANDA_ID)

    expect(result.comanda.id).toBe(COMANDA_ID)
    expect(result.comanda.tableLabel).toBe('Mesa 1')
  })

  it('falha ao buscar detalhes quando comanda nao existe', async () => {
    harness.prisma.comanda.findFirst.mockResolvedValue(null)

    await expect(harness.service.getComandaDetails(ownerAuth, 'comanda-x')).rejects.toThrow(NotFoundException)
  })

  it('permite STAFF consultar comanda aberta de outro atendimento do mesmo workspace', async () => {
    harness.prisma.comanda.findFirst.mockResolvedValue(
      makeComanda({ status: ComandaStatus.OPEN, currentEmployeeId: 'emp-2' }),
    )
    harness.helpers.resolveEmployeeForStaff.mockResolvedValue({ id: 'emp-1' })

    const result = await harness.service.getComandaDetails(makeStaffAuthContext({ employeeId: 'emp-1' }), COMANDA_ID)

    expect(result.comanda.id).toBe(COMANDA_ID)
  })

  it('bloqueia STAFF consultando historico fechado de outro atendimento', async () => {
    harness.prisma.comanda.findFirst.mockResolvedValue(
      makeComanda({ status: ComandaStatus.CLOSED, currentEmployeeId: 'emp-2' }),
    )
    harness.helpers.resolveEmployeeForStaff.mockResolvedValue({ id: 'emp-1' })

    await expect(
      harness.service.getComandaDetails(makeStaffAuthContext({ employeeId: 'emp-1' }), COMANDA_ID),
    ).rejects.toThrow(ForbiddenException)
  })

  it('bloqueia addComandaItem quando comanda esta encerrada', async () => {
    mockAuthorizedComanda(ComandaStatus.CLOSED)

    await expect(
      harness.service.addComandaItem(
        staffAuth,
        COMANDA_ID,
        { quantity: 1, productId: 'prod-1' } as never,
        makeRequest(),
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia addComandaItems quando comanda esta cancelada', async () => {
    mockAuthorizedComanda(ComandaStatus.CANCELLED)

    await expect(
      harness.service.addComandaItems(
        staffAuth,
        COMANDA_ID,
        { items: [{ quantity: 1, productId: 'prod-1' }] } as never,
        makeRequest(),
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('bloqueia replaceComanda quando comanda ja esta fechada', async () => {
    mockAuthorizedComanda(ComandaStatus.CLOSED)

    await expect(replaceComanda()).rejects.toThrow(ConflictException)
  })

  it('bloqueia replaceComanda quando comanda esta cancelada', async () => {
    mockAuthorizedComanda(ComandaStatus.CANCELLED)

    await expect(replaceComanda()).rejects.toThrow(ConflictException)
  })

  it('bloqueia assignComanda para STAFF', async () => {
    await expect(
      harness.service.assignComanda(staffAuth, COMANDA_ID, { employeeId: 'emp-1' } as never, makeRequest()),
    ).rejects.toThrow(ForbiddenException)
  })

  it('bloqueia updateComandaStatus quando novo status e CLOSED', async () => {
    mockAuthorizedComanda(ComandaStatus.OPEN)

    await expect(updateComandaStatus(ComandaStatus.CLOSED)).rejects.toThrow(BadRequestException)
  })

  it('bloqueia updateComandaStatus quando comanda ja esta CLOSED', async () => {
    mockAuthorizedComanda(ComandaStatus.CLOSED)

    await expect(updateComandaStatus(ComandaStatus.OPEN)).rejects.toThrow(ConflictException)
  })

  it('bloqueia updateComandaStatus quando comanda ja esta CANCELLED', async () => {
    mockAuthorizedComanda(ComandaStatus.CANCELLED)

    await expect(updateComandaStatus(ComandaStatus.OPEN)).rejects.toThrow(ConflictException)
  })

  it('bloqueia closeComanda quando ja estava CLOSED', async () => {
    mockAuthorizedComanda(ComandaStatus.CLOSED)

    await expect(closeComanda()).rejects.toThrow(ConflictException)
  })

  it('bloqueia closeComanda quando estava CANCELLED', async () => {
    mockAuthorizedComanda(ComandaStatus.CANCELLED)

    await expect(closeComanda()).rejects.toThrow(ConflictException)
  })

  it('bloqueia closeComanda sem itens', async () => {
    mockAuthorizedComanda(ComandaStatus.OPEN, { items: [] })

    await expect(closeComanda()).rejects.toThrow(ConflictException)
  })

  it('bloqueia closeComanda quando desconto supera o subtotal', async () => {
    mockAuthorizedComanda(ComandaStatus.OPEN)

    await expect(closeComanda({ discountAmount: 120 })).rejects.toThrow(BadRequestException)
  })

  it('bloqueia openComanda quando taxa de servico supera o subtotal dos itens', async () => {
    mockDraftItems()

    await expect(
      harness.service.openComanda(
        ownerAuth,
        {
          tableLabel: 'Mesa 1',
          items: [{ productId: 'prod-1', quantity: 1 }],
          serviceFeeAmount: 120,
        } as never,
        makeRequest(),
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('bloqueia replaceComanda quando desconto supera o subtotal dos itens', async () => {
    mockAuthorizedComanda(ComandaStatus.OPEN)
    mockDraftItems()

    await expect(
      replaceComanda({
        discountAmount: 120,
        items: [{ productId: 'prod-1', quantity: 1 }],
        tableLabel: 'Mesa 1',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('falha updateKitchenItemStatus quando item nao existe', async () => {
    harness.prisma.comandaItem.findUnique.mockResolvedValue(null)

    await expect(
      harness.service.updateKitchenItemStatus(ownerAuth, 'item-x', { status: 'READY' } as never, makeRequest()),
    ).rejects.toThrow(NotFoundException)
  })

  it('falha updateKitchenItemStatus quando item nao pertence a fila de cozinha', async () => {
    harness.prisma.comandaItem.findUnique.mockResolvedValue({
      id: 'item-1',
      kitchenStatus: null,
      kitchenQueuedAt: null,
      kitchenReadyAt: null,
      comanda: {
        id: COMANDA_ID,
        companyOwnerId: 'owner-1',
        tableLabel: 'Mesa 1',
        status: ComandaStatus.OPEN,
        cashSessionId: 'cash-1',
        openedAt: new Date('2026-04-01T10:00:00.000Z'),
      },
    })

    await expect(
      harness.service.updateKitchenItemStatus(ownerAuth, 'item-1', { status: 'READY' } as never, makeRequest()),
    ).rejects.toThrow(BadRequestException)
  })
})
