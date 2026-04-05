import { describe, expect, it } from 'vitest'
import type {
  CashMovementRecord,
  CashSessionRecord,
  ComandaItemRecord,
  ComandaRecord,
  OperationsLiveResponse,
} from '@contracts/contracts'
import { buildOperationsViewModel } from './operations-adapters'

function createComandaItem(quantity: number): ComandaItemRecord {
  return {
    id: `item-${quantity}`,
    productId: `product-${quantity}`,
    productName: `Produto ${quantity}`,
    quantity,
    unitPrice: 10,
    totalAmount: quantity * 10,
    notes: null,
    kitchenStatus: null,
    kitchenQueuedAt: null,
    kitchenReadyAt: null,
  }
}

function createMovement(overrides: Partial<CashMovementRecord>): CashMovementRecord {
  return {
    id: 'movement-1',
    cashSessionId: 'cash-1',
    employeeId: 'emp-1',
    type: 'SUPPLY',
    amount: 0,
    note: null,
    createdAt: '2026-04-03T08:00:00.000Z',
    ...overrides,
  }
}

function createCashSession(overrides: Partial<CashSessionRecord>): CashSessionRecord {
  return {
    id: 'cash-1',
    companyOwnerId: 'owner-1',
    employeeId: 'emp-1',
    status: 'OPEN',
    businessDate: '2026-04-03',
    openingCashAmount: 0,
    countedCashAmount: null,
    expectedCashAmount: 0,
    differenceAmount: null,
    grossRevenueAmount: 0,
    realizedProfitAmount: 0,
    notes: null,
    openedAt: '2026-04-03T08:00:00.000Z',
    closedAt: null,
    movements: [],
    ...overrides,
  }
}

function createComanda(overrides: Partial<ComandaRecord>): ComandaRecord {
  return {
    id: 'comanda-1',
    companyOwnerId: 'owner-1',
    cashSessionId: 'cash-1',
    mesaId: null,
    currentEmployeeId: 'emp-1',
    tableLabel: '1',
    customerName: null,
    customerDocument: null,
    participantCount: 1,
    status: 'OPEN',
    subtotalAmount: 0,
    discountAmount: 0,
    serviceFeeAmount: 0,
    totalAmount: 0,
    notes: null,
    openedAt: '2026-04-03T09:00:00.000Z',
    closedAt: null,
    items: [],
    ...overrides,
  }
}

describe('buildOperationsViewModel', () => {
  it('returns empty collections when snapshot is null', () => {
    const view = buildOperationsViewModel(null)

    expect(view.rows).toEqual([])
    expect(view.resources).toEqual([])
    expect(view.timelineItems).toEqual([])
  })

  it('maps employees, tables, movements and timeline with status conversions', () => {
    const snapshot: OperationsLiveResponse = {
      companyOwnerId: 'owner-1',
      businessDate: '2026-04-03',
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'E01',
          displayName: 'Marina',
          active: true,
          cashSession: createCashSession({
            id: 'cash-1',
            employeeId: 'emp-1',
            status: 'OPEN',
            openingCashAmount: 150,
            expectedCashAmount: 220,
            countedCashAmount: null,
            differenceAmount: null,
            grossRevenueAmount: 900,
            realizedProfitAmount: 370,
            movements: [
              createMovement({
                id: 'mov-1',
                type: 'OPENING_FLOAT',
                amount: 150,
                note: null,
                createdAt: '2026-04-03T08:00:00.000Z',
              }),
              createMovement({
                id: 'mov-2',
                type: 'SUPPLY',
                amount: 70,
                note: 'Reposicao',
                createdAt: '2026-04-03T10:00:00.000Z',
              }),
              createMovement({
                id: 'mov-3',
                type: 'WITHDRAWAL',
                amount: 50,
                note: null,
                createdAt: '2026-04-03T11:00:00.000Z',
              }),
            ],
          }),
          comandas: [
            createComanda({
              id: 'c-open',
              tableLabel: '1',
              status: 'OPEN',
              openedAt: '2026-04-03T09:00:00.000Z',
              closedAt: null,
              subtotalAmount: 20,
              discountAmount: 0,
              totalAmount: 20,
              notes: null,
              items: [createComandaItem(2)],
            }),
            createComanda({
              id: 'c-prep',
              tableLabel: '2',
              status: 'IN_PREPARATION',
              openedAt: '2026-04-03T09:10:00.000Z',
              closedAt: null,
              subtotalAmount: 30,
              discountAmount: 0,
              totalAmount: 30,
              notes: 'sem acucar',
              items: [createComandaItem(1)],
            }),
            createComanda({
              id: 'c-ready',
              tableLabel: '3',
              status: 'READY',
              openedAt: '2026-04-03T09:20:00.000Z',
              closedAt: null,
              subtotalAmount: 40,
              discountAmount: 2,
              totalAmount: 38,
              notes: null,
              items: [createComandaItem(3)],
            }),
            createComanda({
              id: 'c-closed',
              tableLabel: '4',
              status: 'CLOSED',
              openedAt: '2026-04-03T09:30:00.000Z',
              closedAt: '2026-04-03T10:10:00.000Z',
              subtotalAmount: 50,
              discountAmount: 0,
              totalAmount: 50,
              notes: null,
              items: [createComandaItem(1)],
            }),
            createComanda({
              id: 'c-cancelled',
              tableLabel: '5',
              status: 'CANCELLED',
              openedAt: '2026-04-03T09:40:00.000Z',
              closedAt: '2026-04-03T10:20:00.000Z',
              subtotalAmount: 15,
              discountAmount: 0,
              totalAmount: 15,
              notes: null,
              items: [createComandaItem(1)],
            }),
          ],
        },
      ],
      unassigned: {
        employeeId: null,
        employeeCode: null,
        displayName: 'Owner',
        active: true,
        cashSession: createCashSession({
          id: 'cash-2',
          employeeId: null,
          status: 'FORCE_CLOSED',
          openingCashAmount: 0,
          expectedCashAmount: 0,
          countedCashAmount: 0,
          differenceAmount: 0,
          grossRevenueAmount: 0,
          realizedProfitAmount: 0,
          movements: [
            createMovement({
              id: 'mov-4',
              cashSessionId: 'cash-2',
              employeeId: null,
              type: 'ADJUSTMENT',
              amount: 10,
              note: null,
              createdAt: '2026-04-03T10:30:00.000Z',
            }),
          ],
        }),
        comandas: [
          createComanda({
            id: 'c-owner',
            cashSessionId: 'cash-2',
            currentEmployeeId: null,
            tableLabel: '8',
            status: 'OPEN',
            openedAt: '2026-04-03T12:00:00.000Z',
            closedAt: null,
            subtotalAmount: 22,
            discountAmount: 0,
            totalAmount: 22,
            notes: null,
            items: [createComandaItem(1)],
          }),
        ],
      },
      closure: null,
      mesas: [],
    }

    const view = buildOperationsViewModel(snapshot)

    expect(view.rows).toHaveLength(2)
    expect(view.resources).toHaveLength(2)
    expect(view.timelineItems.length).toBeGreaterThanOrEqual(6)

    const staffRow = view.rows[0]
    expect(staffRow.employee.cashSessionStatus).toBe('open')
    expect(staffRow.employee.activeTables).toEqual(['1', '2', '3'])
    expect(staffRow.employee.closedTablesToday).toEqual(['4'])

    const ownerRow = view.rows[1]
    expect(ownerRow.employee.employeeId).toBe('unassigned')
    expect(ownerRow.employee.cashSessionStatus).toBe('closed')

    expect(staffRow.tables.map((table) => table.status)).toEqual([
      'open',
      'in_preparation',
      'ready',
      'closed',
      'closed',
    ])
    expect(staffRow.movements.map((movement) => movement.type)).toEqual(['opening', 'supply', 'withdrawal'])
    expect(ownerRow.movements.map((movement) => movement.type)).toEqual(['adjustment'])

    const closedTimelineItem = view.timelineItems.find((item) => item.id === 'c-closed')
    expect(closedTimelineItem?.status).toBe('closed')
    expect(closedTimelineItem?.end).toBe('2026-04-03T10:10:00.000Z')
  })

  it('prefers counted cash as current cash when the session already has a counted amount', () => {
    const snapshot: OperationsLiveResponse = {
      companyOwnerId: 'owner-1',
      businessDate: '2026-04-03',
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'E01',
          displayName: 'Marina',
          active: true,
          cashSession: createCashSession({
            id: 'cash-1',
            employeeId: 'emp-1',
            status: 'OPEN',
            openingCashAmount: 150,
            expectedCashAmount: 220,
            countedCashAmount: 214,
            differenceAmount: -6,
          }),
          comandas: [],
        },
      ],
      unassigned: {
        employeeId: null,
        employeeCode: null,
        displayName: 'Owner',
        active: true,
        cashSession: null,
        comandas: [],
      },
      closure: null,
      mesas: [],
    }

    const view = buildOperationsViewModel(snapshot)

    expect(view.rows[0]?.employee.cashCurrentAmount).toBe(214)
    expect(view.rows[0]?.employee.cashExpectedAmount).toBe(220)
  })
})
