import { ComandaStatus, KitchenItemStatus } from '@prisma/client'
import { makeOwnerAuth } from './helpers/comanda-service-fixtures'
import {
  PUBLISHER_BUSINESS_DATE as BUSINESS_DATE,
  PUBLISHER_CLOSED_AT as CLOSED_AT,
  createPublisherTestEnv,
  makePublishedComanda,
  makePublishedComandaItem,
  makePublishedComandaPayment,
} from './helpers/publisher-test-env'

describe('Operations realtime publishers', () => {
  const auth = makeOwnerAuth()

  it('emite comanda aberta sem payload legada completa', () => {
    const { publisher, realtimeService } = createPublisherTestEnv()

    publisher.publishOpened({
      auth,
      comanda: makePublishedComanda({
        cashSessionId: 'cash-1',
        customerName: 'Ana',
        items: [makePublishedComandaItem({ notes: 'Sem gelo' })],
        mesaId: 'mesa-1',
        participantCount: 2,
        payments: [makePublishedComandaPayment()],
      }),
      businessDate: BUSINESS_DATE,
    })

    expect(realtimeService.publishComandaOpened).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishComandaOpened.mock.calls[0][0]).toBe(auth)
    expect(realtimeService.publishComandaOpened.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 01',
        openedAt: '2026-03-30T10:00:00.000Z',
        employeeId: 'emp-1',
        status: 'OPEN',
        subtotal: 120,
        discountAmount: 10,
        serviceFeeAmount: 5,
        totalAmount: 115,
        totalItems: 2,
        businessDate: '2026-03-30',
        cashSessionId: 'cash-1',
        customerName: 'Ana',
        mesaId: 'mesa-1',
        participantCount: 2,
        paidAmount: 40,
        remainingAmount: 75,
        paymentStatus: 'PARTIAL',
        items: [expect.objectContaining({ id: 'item-1', productName: 'Coca-Cola', quantity: 2 })],
        payments: [expect.objectContaining({ id: 'payment-1', method: 'PIX', amount: 40 })],
      }),
    )
    expect(realtimeService.publishComandaOpened.mock.calls[0][1]).not.toHaveProperty('comanda')
  })

  it('emite item de cozinha sem snapshot completo', () => {
    const { publisher, realtimeService } = createPublisherTestEnv()

    publisher.publishKitchenQueued({
      auth,
      comanda: { id: 'comanda-1', tableLabel: 'Mesa 01', currentEmployeeId: null } as never,
      item: {
        id: 'item-1',
        productName: 'Pizza',
        quantity: 2,
        notes: 'Sem cebola',
        kitchenStatus: KitchenItemStatus.QUEUED,
        kitchenQueuedAt: new Date('2026-03-30T10:01:00.000Z'),
        kitchenReadyAt: null,
      },
      businessDate: BUSINESS_DATE,
    })

    expect(realtimeService.publishKitchenItemQueued).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishKitchenItemQueued.mock.calls[0][0]).toBe(auth)
    const payload = realtimeService.publishKitchenItemQueued.mock.calls[0][1]
    expect(payload).toEqual(
      expect.objectContaining({
        itemId: 'item-1',
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 01',
        employeeId: null,
        productName: 'Pizza',
        quantity: 2,
        notes: 'Sem cebola',
        kitchenStatus: 'QUEUED',
        kitchenQueuedAt: '2026-03-30T10:01:00.000Z',
        kitchenReadyAt: null,
        businessDate: '2026-03-30',
      }),
    )
    expect(payload).not.toHaveProperty('item')
    expect(payload).not.toHaveProperty('comanda')
  })

  it('permite sinalizar refresh de cozinha apenas nos fluxos que realmente precisam', () => {
    const { publisher, realtimeService } = createPublisherTestEnv()

    publisher.publishUpdated({
      auth,
      comanda: makePublishedComanda(),
      businessDate: BUSINESS_DATE,
      options: { requiresKitchenRefresh: true },
    })

    expect(realtimeService.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishComandaUpdated.mock.calls[0][0]).toBe(auth)
    expect(realtimeService.publishComandaUpdated.mock.calls[0][1]).toEqual(
      expect.objectContaining({ comandaId: 'comanda-1', requiresKitchenRefresh: true }),
    )
  })

  it('emite replaceKitchenItems enxuto para replaceComanda sem snapshot completo', () => {
    const { publisher, realtimeService } = createPublisherTestEnv()

    publisher.publishUpdated({
      auth,
      comanda: makePublishedComanda({ status: ComandaStatus.IN_PREPARATION }),
      businessDate: BUSINESS_DATE,
      options: {
        replaceKitchenItems: true,
        kitchenItems: [
          {
            itemId: 'item-1',
            comandaId: 'comanda-1',
            mesaLabel: 'Mesa 01',
            employeeId: 'emp-1',
            productName: 'Pizza',
            quantity: 2,
            notes: 'Sem cebola',
            kitchenStatus: 'READY',
            kitchenQueuedAt: '2026-03-30T10:01:00.000Z',
            kitchenReadyAt: '2026-03-30T10:10:00.000Z',
            businessDate: '2026-03-30',
          },
        ],
      },
    })

    expect(realtimeService.publishComandaUpdated).toHaveBeenCalledTimes(1)
    const payload = realtimeService.publishComandaUpdated.mock.calls[0][1]
    expect(payload).toEqual(
      expect.objectContaining({
        comandaId: 'comanda-1',
        replaceKitchenItems: true,
        kitchenItems: [expect.objectContaining({ itemId: 'item-1', productName: 'Pizza', kitchenStatus: 'READY' })],
      }),
    )
    expect(payload).not.toHaveProperty('comanda')
  })

  it('emite comanda fechada com deltas mínimos e totais', () => {
    const { publisher, realtimeService } = createPublisherTestEnv()

    publisher.publishClosed({
      auth,
      comanda: makePublishedComanda({
        cashSessionId: 'cash-1',
        closedAt: CLOSED_AT,
        customerName: 'Maria',
        items: [makePublishedComandaItem({ notes: 'Sem gelo' })],
        mesaId: 'mesa-1',
        notes: 'Entregar rapido',
        openedAt: new Date('2026-03-30T10:00:00.000Z'),
        participantCount: 2,
        payments: [
          makePublishedComandaPayment({
            amount: 115,
            method: 'CREDIT',
            note: 'Mercado Pago Point - CREDIT. Transacao MP payment-provider-1',
            paidAt: new Date('2026-03-30T11:00:00.000Z'),
          }),
        ],
      }),
      refreshedSession: null,
      closure: {
        id: 'closure-1',
        status: 'CLOSED',
        createdAt: new Date('2026-03-30T08:00:00.000Z'),
        closedAt: CLOSED_AT,
        expectedCashAmount: 100,
        grossRevenueAmount: 115,
        realizedProfitAmount: 30,
        countedCashAmount: 115,
        differenceAmount: 0,
        openComandasCount: 0,
        openSessionsCount: 0,
      } as never,
      businessDate: BUSINESS_DATE,
    })

    expect(realtimeService.publishComandaClosed).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishComandaClosed.mock.calls[0][0]).toBe(auth)
    const payload = realtimeService.publishComandaClosed.mock.calls[0][1]
    expect(payload).toEqual(
      expect.objectContaining({
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 01',
        closedAt: '2026-03-30T11:00:00.000Z',
        employeeId: 'emp-1',
        status: 'CLOSED',
        subtotal: 120,
        discountAmount: 10,
        serviceFeeAmount: 5,
        totalAmount: 115,
        totalItems: 2,
        paymentMethod: 'CREDIT',
        businessDate: '2026-03-30',
        customerName: 'Maria',
        cashSessionId: 'cash-1',
        mesaId: 'mesa-1',
        paidAmount: 115,
        remainingAmount: 0,
        paymentStatus: 'PAID',
        payments: [expect.objectContaining({ id: 'payment-1', method: 'CREDIT' })],
        items: [expect.objectContaining({ id: 'item-1', productName: 'Coca-Cola' })],
      }),
    )
    expect(payload).not.toHaveProperty('comanda')
  })
})
