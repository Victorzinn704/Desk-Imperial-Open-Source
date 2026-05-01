import { OperationsRealtimeService } from '../src/modules/operations-realtime/operations-realtime.service'

describe('OperationsRealtimeService', () => {
  let service: OperationsRealtimeService

  const authWithWorkspace = {
    userId: 'actor-1',
    role: 'OWNER',
    workspaceOwnerUserId: 'owner-1',
    companyOwnerUserId: 'owner-1',
  }

  beforeEach(() => {
    service = new OperationsRealtimeService()
  })

  it('publica evento no barramento e no namespace socket quando anexado', () => {
    const emit = jest.fn()
    const namespace = {
      to: jest.fn(() => ({ emit })),
    }

    const listener = jest.fn()
    const unsubscribe = service.subscribeWorkspace('owner-1', listener)
    service.attachNamespace(namespace as any)

    const payload = {
      cashSessionId: 'cash-1',
      openedAt: '2026-04-01T09:00:00.000Z',
      openingAmount: 200,
      currency: 'BRL',
      employeeId: null,
      businessDate: '2026-04-01',
    }

    const envelope = service.publishCashOpened(authWithWorkspace as any, payload as any)

    expect(envelope).toEqual(
      expect.objectContaining({
        event: 'cash.opened',
        workspaceOwnerUserId: 'owner-1',
        workspaceChannel: 'workspace:owner-1',
        actorUserId: 'actor-1',
      }),
    )
    expect(listener).toHaveBeenCalledWith(envelope)
    expect(namespace.to).toHaveBeenCalledWith('workspace:owner-1:cash')
    expect(emit).toHaveBeenCalledWith('cash.opened', envelope)

    unsubscribe()
    service.publishCashOpened(authWithWorkspace as any, payload as any)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('segmenta canais de socket por dominio sem mudar o barramento local', () => {
    const emit = jest.fn()
    const namespace = {
      to: jest.fn(() => ({ emit })),
    }
    service.attachNamespace(namespace as any)

    service.publishKitchenItemQueued(
      authWithWorkspace as any,
      {
        itemId: 'item-1',
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        employeeId: null,
        productName: 'Pastel',
        quantity: 1,
        notes: null,
        kitchenStatus: 'QUEUED',
        kitchenQueuedAt: '2026-04-01T09:00:00.000Z',
        kitchenReadyAt: null,
        businessDate: '2026-04-01',
      } as any,
    )
    service.publishMesaUpserted(
      authWithWorkspace as any,
      {
        mesaId: 'mesa-1',
        label: 'Mesa 1',
        status: 'livre',
      } as any,
    )
    service.publishComandaUpdated(
      authWithWorkspace as any,
      {
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        status: 'OPEN',
        employeeId: null,
        subtotal: 0,
        discountAmount: 0,
        serviceFeeAmount: 0,
        totalAmount: 0,
        totalItems: 0,
        businessDate: '2026-04-01',
      } as any,
    )

    expect(namespace.to).toHaveBeenNthCalledWith(1, 'workspace:owner-1:kitchen')
    expect(namespace.to).toHaveBeenNthCalledWith(2, 'workspace:owner-1:mesa')
    expect(namespace.to).toHaveBeenNthCalledWith(3, 'workspace:owner-1')
  })

  it('resolve workspace com fallback para companyOwnerUserId e userId', () => {
    const listenerCompany = jest.fn()
    service.subscribeWorkspace('owner-company', listenerCompany)

    const envelopeFromCompany = service.publishMesaUpserted(
      {
        userId: 'staff-1',
        role: 'STAFF',
        workspaceOwnerUserId: undefined,
        companyOwnerUserId: 'owner-company',
      } as any,
      {
        mesaId: 'mesa-1',
        label: 'Mesa 01',
        status: 'livre',
      } as any,
    )

    expect(envelopeFromCompany.workspaceOwnerUserId).toBe('owner-company')
    expect(listenerCompany).toHaveBeenCalledWith(envelopeFromCompany)

    const listenerUser = jest.fn()
    service.subscribeWorkspace('solo-user', listenerUser)

    const envelopeFromUser = service.publishMesaUpserted(
      {
        userId: 'solo-user',
        role: 'OWNER',
        workspaceOwnerUserId: undefined,
        companyOwnerUserId: null,
      } as any,
      {
        mesaId: 'mesa-2',
        label: 'Mesa 02',
        status: 'ocupada',
      } as any,
    )

    expect(envelopeFromUser.workspaceOwnerUserId).toBe('solo-user')
    expect(listenerUser).toHaveBeenCalledWith(envelopeFromUser)
  })

  it('encaminha todos os wrappers para publishWorkspaceEvent', () => {
    const spy = jest.spyOn(service, 'publishWorkspaceEvent').mockReturnValue({ id: 'event-id' } as any)

    service.publishCashUpdated(authWithWorkspace as any, {} as any)
    service.publishComandaOpened(authWithWorkspace as any, {} as any)
    service.publishComandaUpdated(authWithWorkspace as any, {} as any)
    service.publishComandaClosed(authWithWorkspace as any, {} as any)
    service.publishCashClosureUpdated(authWithWorkspace as any, {} as any)
    service.publishKitchenItemQueued(authWithWorkspace as any, {} as any)
    service.publishKitchenItemUpdated(authWithWorkspace as any, {} as any)
    service.publishMesaUpserted(authWithWorkspace as any, {} as any)

    expect(spy).toHaveBeenNthCalledWith(1, authWithWorkspace, 'cash.updated', {}, undefined)
    expect(spy).toHaveBeenNthCalledWith(2, authWithWorkspace, 'comanda.opened', {}, undefined)
    expect(spy).toHaveBeenNthCalledWith(3, authWithWorkspace, 'comanda.updated', {}, undefined)
    expect(spy).toHaveBeenNthCalledWith(4, authWithWorkspace, 'comanda.closed', {}, undefined)
    expect(spy).toHaveBeenNthCalledWith(5, authWithWorkspace, 'cash.closure.updated', {}, undefined)
    expect(spy).toHaveBeenNthCalledWith(6, authWithWorkspace, 'kitchen.item.queued', {}, undefined)
    expect(spy).toHaveBeenNthCalledWith(7, authWithWorkspace, 'kitchen.item.updated', {}, undefined)
    expect(spy).toHaveBeenNthCalledWith(8, authWithWorkspace, 'mesa.upserted', {}, undefined)
  })
})
