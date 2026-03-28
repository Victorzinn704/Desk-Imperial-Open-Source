'use client'

import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'
import type {
  ComandaRecord,
  ComandaStatus,
  KitchenItemStatus,
  MesaRecord,
  OperationsLiveResponse,
} from '@contracts/contracts'

const OPERATIONS_EVENTS = [
  'cash.opened',
  'cash.updated',
  'comanda.opened',
  'comanda.updated',
  'cash.closure.updated',
  'kitchen.item.queued',
  'kitchen.item.updated',
  'mesa.upserted',
] as const

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

export function useOperationsRealtime(enabled: boolean, queryClient: QueryClient): { status: RealtimeStatus } {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected') // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    setStatus('connecting')

    const socket = io(buildOperationsSocketUrl(), {
      withCredentials: true,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 10_000,
    })

    const queueOperationsRefresh = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
        queryClient.invalidateQueries({ queryKey: ['mesas'] })
      }, 200)
    }

    const queueCommercialRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    }

    const handleEvent = (envelope?: OperationsRealtimeEnvelope) => {
      if (envelope?.payload && applyRealtimeEnvelope(queryClient, envelope)) {
        return
      }
      queueOperationsRefresh()
    }

    const handleComandaClosed = (envelope?: OperationsRealtimeEnvelope) => {
      handleEvent(envelope)
      queueCommercialRefresh()
    }

    socket.on('connect', () => setStatus('connected'))
    socket.on('disconnect', () => setStatus('disconnected'))
    socket.on('connect_error', () => {
      setStatus('disconnected')
      // fallback: força atualização mesmo sem socket
      handleEvent()
    })

    for (const eventName of OPERATIONS_EVENTS) {
      socket.on(eventName, handleEvent)
    }

    socket.on('comanda.closed', handleComandaClosed)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      for (const eventName of OPERATIONS_EVENTS) {
        socket.off(eventName, handleEvent)
      }

      socket.off('comanda.closed', handleComandaClosed)
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.disconnect()
      setStatus('disconnected')
    }
  }, [enabled, queryClient])

  return { status }
}

function buildOperationsSocketUrl() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  return `${apiBaseUrl}/operations`
}

type OperationsRealtimeEnvelope = {
  event: (typeof OPERATIONS_EVENTS)[number] | 'comanda.closed'
  payload: Record<string, unknown>
}

function applyRealtimeEnvelope(queryClient: QueryClient, envelope: OperationsRealtimeEnvelope) {
  const liveQueries = queryClient.getQueriesData<OperationsLiveResponse>({
    queryKey: ['operations', 'live'],
  })

  let applied = false

  for (const [queryKey, current] of liveQueries) {
    if (!current) {
      continue
    }

    const next = patchOperationsSnapshot(current, envelope)
    if (!next) {
      continue
    }

    queryClient.setQueryData(queryKey, next)
    applied = true
  }

  return applied
}

function patchOperationsSnapshot(snapshot: OperationsLiveResponse, envelope: OperationsRealtimeEnvelope) {
  switch (envelope.event) {
    case 'comanda.opened':
      return upsertComandaFromEvent(snapshot, envelope.payload, 'OPEN')
    case 'comanda.updated':
      return upsertComandaFromEvent(snapshot, envelope.payload)
    case 'comanda.closed':
      return closeComandaFromEvent(snapshot, envelope.payload)
    case 'kitchen.item.queued':
      return upsertKitchenItem(snapshot, envelope.payload, 'QUEUED')
    case 'kitchen.item.updated':
      return upsertKitchenItem(snapshot, envelope.payload)
    case 'cash.updated':
      return patchCashSession(snapshot, envelope.payload)
    case 'cash.closure.updated':
      return patchClosure(snapshot, envelope.payload)
    case 'cash.opened':
      return patchCashOpened(snapshot, envelope.payload)
    case 'mesa.upserted':
      return patchMesa(snapshot, envelope.payload)
    default:
      return null
  }
}

function upsertComandaFromEvent(
  snapshot: OperationsLiveResponse,
  payload: Record<string, unknown>,
  fallbackStatus?: Extract<ComandaStatus, 'OPEN'>,
) {
  const comandaId = asString(payload.comandaId)
  const mesaLabel = asString(payload.mesaLabel)
  const employeeId = asNullableString(payload.employeeId)

  if (!comandaId || !mesaLabel) {
    return null
  }

  const target = resolveTargetGroup(snapshot, employeeId)
  if (!target) {
    return patchMesa(snapshot, { mesaLabel, status: 'ocupada' })
  }

  const existing = findComandaInSnapshot(snapshot, comandaId)

  const status = mapRealtimeComandaStatus(asNullableString(payload.status)) ?? fallbackStatus ?? 'OPEN'
  const openedAt = asString(payload.openedAt) ?? new Date().toISOString()
  const subtotal = asNumber(payload.subtotal)
  const totalAmount = asNumber(payload.totalAmount) ?? subtotal ?? 0
  const discountAmount = asNumber(payload.discountAmount) ?? 0
  const serviceFeeAmount = Math.max(0, totalAmount - (subtotal ?? totalAmount) + discountAmount)

  const comanda: ComandaRecord = {
    id: comandaId,
    companyOwnerId: snapshot.companyOwnerId,
    cashSessionId: null,
    mesaId: findMesaByLabel(snapshot.mesas, mesaLabel)?.id ?? null,
    currentEmployeeId: employeeId,
    tableLabel: mesaLabel,
    customerName: null,
    customerDocument: null,
    participantCount: 1,
    status,
    subtotalAmount: subtotal ?? totalAmount,
    discountAmount,
    serviceFeeAmount,
    totalAmount,
    notes: null,
    openedAt,
    closedAt: null,
    items: [],
  }

  const updatedGroups = snapshot.employees.map((group) => {
    if (group.employeeId !== target.employeeId) {
      return {
        ...group,
        comandas: group.comandas.filter((item) => item.id !== comandaId),
      }
    }

    return {
      ...group,
      comandas: upsertComanda(group.comandas, comanda),
    }
  })

  const updatedUnassigned =
    target.employeeId === null
      ? {
          ...snapshot.unassigned,
          comandas: upsertComanda(snapshot.unassigned.comandas, comanda),
        }
      : {
          ...snapshot.unassigned,
          comandas: snapshot.unassigned.comandas.filter((item) => item.id !== comandaId),
        }

  const nextSnapshot = {
    ...snapshot,
    employees: updatedGroups,
    unassigned: updatedUnassigned,
    mesas: upsertMesaStatus(snapshot.mesas, mesaLabel, 'ocupada', comandaId, employeeId),
  }

  if (!existing || existing.status === 'CLOSED' || existing.status === 'CANCELLED') {
    return patchClosureOpenComandasCount(nextSnapshot, 1)
  }

  return nextSnapshot
}

function closeComandaFromEvent(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const comandaId = asString(payload.comandaId)
  const mesaLabel = asString(payload.mesaLabel)

  if (!comandaId || !mesaLabel) {
    return null
  }

  const existing = findComandaInSnapshot(snapshot, comandaId)
  const nextSnapshot = {
    ...snapshot,
    ...patchComandaCollections(snapshot, (comanda) =>
      comanda.id === comandaId
        ? {
            ...comanda,
            status: 'CLOSED' as const,
            closedAt: asString(payload.closedAt) ?? new Date().toISOString(),
            totalAmount: asNumber(payload.totalAmount) ?? comanda.totalAmount,
          }
        : comanda,
    ),
    mesas: upsertMesaStatus(snapshot.mesas, mesaLabel, 'livre', null, null),
  }

  if (existing && existing.status !== 'CLOSED' && existing.status !== 'CANCELLED') {
    return patchClosureOpenComandasCount(nextSnapshot, -1)
  }

  return nextSnapshot
}

function upsertKitchenItem(
  snapshot: OperationsLiveResponse,
  payload: Record<string, unknown>,
  fallbackStatus?: KitchenItemStatus,
) {
  const comandaId = asString(payload.comandaId)
  const itemId = asString(payload.itemId)

  if (!comandaId || !itemId) {
    return null
  }

  const kitchenStatus = mapKitchenStatus(asNullableString(payload.kitchenStatus)) ?? fallbackStatus ?? null
  const queuedAt = asNullableString(payload.kitchenQueuedAt)
  const readyAt = asNullableString(payload.kitchenReadyAt)
  const item = {
    id: itemId,
    productId: null,
    productName: asString(payload.productName) ?? 'Item',
    quantity: asNumber(payload.quantity) ?? 1,
    unitPrice: 0,
    totalAmount: 0,
    notes: asNullableString(payload.notes),
    kitchenStatus,
    kitchenQueuedAt: queuedAt,
    kitchenReadyAt: readyAt,
  }

  return {
    ...snapshot,
    ...patchComandaCollections(snapshot, (comanda) =>
      comanda.id === comandaId
        ? {
            ...comanda,
            items:
              kitchenStatus === 'DELIVERED'
                ? comanda.items.filter((existing) => existing.id !== itemId)
                : upsertComandaItem(comanda.items, item),
          }
        : comanda,
    ),
  }
}

function patchCashSession(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const cashSessionId = asString(payload.cashSessionId)

  if (!cashSessionId) {
    return null
  }

  return {
    ...snapshot,
    employees: snapshot.employees.map((group) => ({
      ...group,
      cashSession:
        group.cashSession?.id === cashSessionId
          ? {
              ...group.cashSession,
              status: mapCashSessionStatus(asNullableString(payload.status)) ?? group.cashSession.status,
              openingCashAmount: asNumber(payload.openingAmount) ?? group.cashSession.openingCashAmount,
              expectedCashAmount: asNumber(payload.expectedAmount) ?? group.cashSession.expectedCashAmount,
              countedCashAmount: asNullableNumber(payload.countedAmount) ?? group.cashSession.countedCashAmount,
              differenceAmount: asNullableNumber(payload.differenceAmount) ?? group.cashSession.differenceAmount,
            }
          : group.cashSession,
    })),
    unassigned: {
      ...snapshot.unassigned,
      cashSession:
        snapshot.unassigned.cashSession?.id === cashSessionId
          ? {
              ...snapshot.unassigned.cashSession,
              status: mapCashSessionStatus(asNullableString(payload.status)) ?? snapshot.unassigned.cashSession.status,
              openingCashAmount: asNumber(payload.openingAmount) ?? snapshot.unassigned.cashSession.openingCashAmount,
              expectedCashAmount:
                asNumber(payload.expectedAmount) ?? snapshot.unassigned.cashSession.expectedCashAmount,
              countedCashAmount:
                asNullableNumber(payload.countedAmount) ?? snapshot.unassigned.cashSession.countedCashAmount,
              differenceAmount:
                asNullableNumber(payload.differenceAmount) ?? snapshot.unassigned.cashSession.differenceAmount,
            }
          : snapshot.unassigned.cashSession,
    },
  }
}

function patchCashOpened(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const employeeId = asNullableString(payload.employeeId)
  const target = resolveTargetGroup(snapshot, employeeId)
  const cashSessionId = asString(payload.cashSessionId)

  if (!target || !cashSessionId) {
    return null
  }

  const nextSession = {
    id: cashSessionId,
    companyOwnerId: snapshot.companyOwnerId,
    employeeId,
    status: 'OPEN' as const,
    businessDate: snapshot.businessDate,
    openingCashAmount: asNumber(payload.openingAmount) ?? 0,
    countedCashAmount: null,
    expectedCashAmount: asNumber(payload.openingAmount) ?? 0,
    differenceAmount: null,
    grossRevenueAmount: 0,
    realizedProfitAmount: 0,
    notes: null,
    openedAt: asString(payload.openedAt) ?? new Date().toISOString(),
    closedAt: null,
    movements: [],
  }

  return {
    ...snapshot,
    employees: snapshot.employees.map((group) =>
      group.employeeId === target.employeeId ? { ...group, cashSession: nextSession } : group,
    ),
    unassigned: target.employeeId === null ? { ...snapshot.unassigned, cashSession: nextSession } : snapshot.unassigned,
  }
}

function patchClosure(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  if (!snapshot.closure) {
    return null
  }

  return {
    ...snapshot,
    closure: {
      ...snapshot.closure,
      status: mapClosureStatus(asNullableString(payload.status)) ?? snapshot.closure.status,
      expectedCashAmount: asNumber(payload.expectedAmount) ?? snapshot.closure.expectedCashAmount,
      grossRevenueAmount: asNumber(payload.grossRevenueAmount) ?? snapshot.closure.grossRevenueAmount,
      realizedProfitAmount: asNumber(payload.realizedProfitAmount) ?? snapshot.closure.realizedProfitAmount,
      countedCashAmount: asNullableNumber(payload.countedAmount) ?? snapshot.closure.countedCashAmount,
      differenceAmount: asNullableNumber(payload.differenceAmount) ?? snapshot.closure.differenceAmount,
      openSessionsCount: asNumber(payload.pendingCashSessions) ?? snapshot.closure.openSessionsCount,
      openComandasCount: asNumber(payload.openComandasCount) ?? snapshot.closure.openComandasCount,
    },
  }
}

function patchClosureOpenComandasCount(snapshot: OperationsLiveResponse, delta: number) {
  if (!snapshot.closure) {
    return snapshot
  }

  return {
    ...snapshot,
    closure: {
      ...snapshot.closure,
      openComandasCount: Math.max(0, snapshot.closure.openComandasCount + delta),
    },
  }
}

function patchMesa(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const mesaId = asNullableString(payload.mesaId)
  const mesaLabel = asNullableString(payload.label) ?? asNullableString(payload.mesaLabel)
  const status = mapMesaStatus(asNullableString(payload.status))

  if (!status || (!mesaId && !mesaLabel)) {
    return null
  }

  return {
    ...snapshot,
    mesas: snapshot.mesas.map((mesa) =>
      mesa.id === mesaId || mesa.label === mesaLabel
        ? {
            ...mesa,
            status,
          }
        : mesa,
    ),
  }
}

function resolveTargetGroup(snapshot: OperationsLiveResponse, employeeId: string | null) {
  if (!employeeId) {
    return snapshot.unassigned
  }

  return snapshot.employees.find((group) => group.employeeId === employeeId) ?? null
}

function patchComandaCollections(snapshot: OperationsLiveResponse, patcher: (comanda: ComandaRecord) => ComandaRecord) {
  return {
    employees: snapshot.employees.map((group) => ({
      ...group,
      comandas: group.comandas.map(patcher),
    })),
    unassigned: {
      ...snapshot.unassigned,
      comandas: snapshot.unassigned.comandas.map(patcher),
    },
  }
}

function upsertComanda(list: ComandaRecord[], next: ComandaRecord) {
  const existing = list.find((comanda) => comanda.id === next.id)
  if (!existing) {
    return [next, ...list]
  }

  return list.map((comanda) => (comanda.id === next.id ? { ...existing, ...next, items: existing.items } : comanda))
}

function upsertComandaItem(comandaItems: ComandaRecord['items'], nextItem: ComandaRecord['items'][number]) {
  const exists = comandaItems.find((item) => item.id === nextItem.id)
  if (!exists) {
    return [...comandaItems, nextItem]
  }

  return comandaItems.map((item) => (item.id === nextItem.id ? { ...item, ...nextItem } : item))
}

function upsertMesaStatus(
  mesas: MesaRecord[],
  mesaLabel: string,
  status: MesaRecord['status'],
  comandaId: string | null,
  currentEmployeeId: string | null,
) {
  return mesas.map((mesa) =>
    mesa.label === mesaLabel
      ? {
          ...mesa,
          status,
          comandaId,
          currentEmployeeId,
        }
      : mesa,
  )
}

function findMesaByLabel(mesas: MesaRecord[], label: string) {
  return mesas.find((mesa) => mesa.label === label) ?? null
}

function findComandaInSnapshot(snapshot: OperationsLiveResponse, comandaId: string) {
  for (const group of [...snapshot.employees, snapshot.unassigned]) {
    const comanda = group.comandas.find((item) => item.id === comandaId)
    if (comanda) {
      return comanda
    }
  }

  return null
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asNullableString(value: unknown) {
  return typeof value === 'string' ? value : value == null ? null : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

function asNullableNumber(value: unknown) {
  return typeof value === 'number' ? value : value == null ? null : null
}

function mapRealtimeComandaStatus(value: string | null): ComandaStatus | null {
  switch (value) {
    case 'ABERTA':
      return 'OPEN'
    case 'EM_PREPARO':
      return 'IN_PREPARATION'
    case 'PRONTA':
      return 'READY'
    case 'FECHADA':
      return 'CLOSED'
    default:
      return null
  }
}

function mapKitchenStatus(value: string | null): KitchenItemStatus | null {
  switch (value) {
    case 'QUEUED':
    case 'IN_PREPARATION':
    case 'READY':
    case 'DELIVERED':
      return value
    default:
      return null
  }
}

function mapCashSessionStatus(value: string | null) {
  switch (value) {
    case 'OPEN':
    case 'CLOSED':
      return value
    default:
      return null
  }
}

type ClosureRecord = NonNullable<OperationsLiveResponse['closure']>

function mapClosureStatus(value: string | null): ClosureRecord['status'] | null {
  switch (value) {
    case 'OPEN':
      return 'OPEN'
    case 'PENDING':
      return 'PENDING_EMPLOYEE_CLOSE'
    case 'CLOSED':
      return 'CLOSED'
    default:
      return null
  }
}

function mapMesaStatus(value: string | null): MesaRecord['status'] | null {
  switch (value) {
    case 'livre':
    case 'ocupada':
    case 'reservada':
      return value
    default:
      return null
  }
}
