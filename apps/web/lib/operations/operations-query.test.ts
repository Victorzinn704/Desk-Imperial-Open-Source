import type { QueryClient } from '@tanstack/react-query'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
  invalidateOperationsWorkspace,
  patchComandaInSnapshot,
  patchOperationsSnapshot,
  scheduleOperationsWorkspaceReconcile,
  settleScheduledOperationsWorkspaceReconcile,
} from './operations-query'
import { getOperationsPerformanceEvents, resetOperationsPerformanceEvents } from './operations-performance-diagnostics'

describe('operations query helpers', () => {
  beforeEach(() => {
    resetOperationsPerformanceEvents()
  })

  it('invalidates default operations workspace queries', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as unknown as QueryClient

    await invalidateOperationsWorkspace(queryClient)

    expect(invalidateQueries).toHaveBeenCalledTimes(3)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY })
    expect(getOperationsPerformanceEvents()).toEqual([
      {
        type: 'workspace-invalidated',
        at: expect.any(Number),
        queryKey: JSON.stringify(OPERATIONS_LIVE_QUERY_PREFIX),
        scopes: {
          includeLive: true,
          includeKitchen: true,
          includeSummary: true,
          includeOrders: false,
          includeFinance: false,
        },
        invalidateCount: 3,
      },
    ])
  })

  it('respects include options when invalidating workspace', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as unknown as QueryClient

    await invalidateOperationsWorkspace(queryClient, ['operations', 'live', 'compact'], {
      includeKitchen: false,
      includeSummary: false,
      includeOrders: true,
      includeFinance: true,
    })

    expect(invalidateQueries).toHaveBeenCalledTimes(3)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['operations', 'live', 'compact'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['finance', 'summary'] })
  })

  it('coalesces repeated scheduled reconciles for the same workspace and merges refresh scopes', () => {
    vi.useFakeTimers()
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as unknown as QueryClient

    scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeSummary: false,
      delayMs: 700,
    })
    scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeOrders: true,
      delayMs: 200,
    })
    scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeFinance: true,
      delayMs: 400,
    })

    vi.advanceTimersByTime(199)
    expect(invalidateQueries).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(invalidateQueries).toHaveBeenCalledTimes(5)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['finance', 'summary'] })
    expect(getOperationsPerformanceEvents().map((entry) => entry.type)).toEqual([
      'reconcile-scheduled',
      'reconcile-merged',
      'reconcile-merged',
      'workspace-invalidated',
    ])

    vi.advanceTimersByTime(1_000)
    expect(invalidateQueries).toHaveBeenCalledTimes(5)
    vi.useRealTimers()
  })

  it('cancels a pending reconcile when realtime already satisfied the scheduled scopes', () => {
    vi.useFakeTimers()
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as unknown as QueryClient

    scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeKitchen: true,
      includeSummary: true,
      delayMs: 300,
    })

    settleScheduledOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeLive: true,
      includeKitchen: true,
      includeSummary: true,
    })

    vi.advanceTimersByTime(500)
    expect(invalidateQueries).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('preserves only residual scopes when partially settling a pending reconcile', () => {
    vi.useFakeTimers()
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as unknown as QueryClient

    scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeKitchen: true,
      includeSummary: true,
      includeOrders: true,
      includeFinance: true,
      delayMs: 300,
    })

    settleScheduledOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeLive: true,
      includeKitchen: true,
      includeSummary: true,
    })

    vi.advanceTimersByTime(300)
    expect(invalidateQueries).toHaveBeenCalledTimes(2)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['finance', 'summary'] })
    vi.useRealTimers()
  })

  it('patches whole snapshot with updater', () => {
    const snapshot = {
      companyOwnerId: 'owner-1',
      businessDate: '2026-04-03',
      closure: null,
      employees: [],
      mesas: [],
      unassigned: {
        employeeId: null,
        employeeCode: null,
        displayName: 'Owner',
        cashSession: null,
        comandas: [],
      },
    } as unknown as OperationsLiveResponse

    const next = patchOperationsSnapshot(snapshot, (current) => ({
      ...current,
      businessDate: '2026-04-04',
    }))

    expect(next.businessDate).toBe('2026-04-04')
  })

  it('patches comanda in employee and unassigned groups', () => {
    const snapshot = {
      companyOwnerId: 'owner-1',
      businessDate: '2026-04-03',
      closure: null,
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'E01',
          displayName: 'Marina',
          cashSession: null,
          comandas: [
            {
              id: 'c-1',
              companyOwnerId: 'owner-1',
              cashSessionId: null,
              mesaId: null,
              currentEmployeeId: 'emp-1',
              tableLabel: '1',
              customerName: null,
              customerDocument: null,
              participantCount: 1,
              status: 'OPEN',
              subtotalAmount: 10,
              discountAmount: 0,
              serviceFeeAmount: 0,
              totalAmount: 10,
              notes: null,
              openedAt: '2026-04-03T09:00:00.000Z',
              closedAt: null,
              items: [],
            },
            {
              id: 'c-2',
              companyOwnerId: 'owner-1',
              cashSessionId: null,
              mesaId: null,
              currentEmployeeId: 'emp-1',
              tableLabel: '2',
              customerName: null,
              customerDocument: null,
              participantCount: 1,
              status: 'OPEN',
              subtotalAmount: 20,
              discountAmount: 0,
              serviceFeeAmount: 0,
              totalAmount: 20,
              notes: null,
              openedAt: '2026-04-03T09:05:00.000Z',
              closedAt: null,
              items: [],
            },
          ],
        },
      ],
      mesas: [],
      unassigned: {
        employeeId: null,
        employeeCode: null,
        displayName: 'Owner',
        cashSession: null,
        comandas: [
          {
            id: 'c-3',
            companyOwnerId: 'owner-1',
            cashSessionId: null,
            mesaId: null,
            currentEmployeeId: null,
            tableLabel: '3',
            customerName: null,
            customerDocument: null,
            participantCount: 1,
            status: 'OPEN',
            subtotalAmount: 30,
            discountAmount: 0,
            serviceFeeAmount: 0,
            totalAmount: 30,
            notes: null,
            openedAt: '2026-04-03T09:10:00.000Z',
            closedAt: null,
            items: [],
          },
        ],
      },
    } as unknown as OperationsLiveResponse

    const updatedEmployee = patchComandaInSnapshot(snapshot, 'c-2', (comanda) => ({
      ...comanda,
      status: 'READY',
    }))

    expect(updatedEmployee.employees[0].comandas[1].status).toBe('READY')
    expect(updatedEmployee.unassigned.comandas[0].status).toBe('OPEN')

    const updatedUnassigned = patchComandaInSnapshot(updatedEmployee, 'c-3', (comanda) => ({
      ...comanda,
      status: 'CLOSED',
    }))

    expect(updatedUnassigned.unassigned.comandas[0].status).toBe('CLOSED')
  })

  it('returns snapshot unchanged when comanda is not found', () => {
    const snapshot = {
      companyOwnerId: 'owner-1',
      businessDate: '2026-04-03',
      closure: null,
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'E01',
          displayName: 'Marina',
          cashSession: null,
          comandas: [
            {
              id: 'c-1',
              companyOwnerId: 'owner-1',
              cashSessionId: null,
              mesaId: null,
              currentEmployeeId: 'emp-1',
              tableLabel: '1',
              customerName: null,
              customerDocument: null,
              participantCount: 1,
              status: 'OPEN',
              subtotalAmount: 10,
              discountAmount: 0,
              serviceFeeAmount: 0,
              totalAmount: 10,
              notes: null,
              openedAt: '2026-04-03T09:00:00.000Z',
              closedAt: null,
              items: [],
            },
          ],
        },
      ],
      mesas: [],
      unassigned: {
        employeeId: null,
        employeeCode: null,
        displayName: 'Owner',
        cashSession: null,
        comandas: [],
      },
    } as unknown as OperationsLiveResponse

    const next = patchComandaInSnapshot(snapshot, 'missing', (comanda) => ({
      ...comanda,
      status: 'CLOSED',
    }))

    expect(next).toEqual(snapshot)
  })
})
