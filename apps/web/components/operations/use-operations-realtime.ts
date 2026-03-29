'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'
import type {
  CashSessionRecord,
  ComandaItemRecord,
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

// Debounce para operações (200ms) e comercial (500ms para coalescer múltiplos closes)
const OPERATIONS_DEBOUNCE_MS = 200
const COMMERCIAL_DEBOUNCE_MS = 500

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

export function useOperationsRealtime(enabled: boolean, queryClient: QueryClient): { status: RealtimeStatus } {
  // CORREÇÃO: Estado inicial baseado em enabled para evitar setStatus no effect body
  const [status, setStatus] = useState<RealtimeStatus>(() => (enabled ? 'connecting' : 'disconnected'))
  const operationsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commercialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // CORREÇÃO: Referências estáveis com useCallback para evitar vazamento de listeners
  // Problema original: arrow functions criadas no render tinham referência diferente
  // no cleanup, fazendo socket.off() não remover o listener correto
  const queueOperationsRefresh = useCallback(() => {
    if (operationsTimerRef.current) clearTimeout(operationsTimerRef.current)
    operationsTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
    }, OPERATIONS_DEBOUNCE_MS)
  }, [queryClient])

  // CORREÇÃO: Debounce separado para commercial com janela maior (500ms)
  // Isso permite coalescer múltiplos comanda.closed em um único invalidate
  const queueCommercialRefresh = useCallback(() => {
    if (commercialTimerRef.current) clearTimeout(commercialTimerRef.current)
    commercialTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    }, COMMERCIAL_DEBOUNCE_MS)
  }, [queryClient])

  const handleEvent = useCallback(
    (envelope?: OperationsRealtimeEnvelope) => {
      const supportsLocalPatch = Boolean(envelope?.payload)

      if (supportsLocalPatch && envelope?.payload && applyRealtimeEnvelope(queryClient, envelope)) {
        return
      }
      queueOperationsRefresh()
    },
    [queryClient, queueOperationsRefresh],
  )

  const handleComandaClosed = useCallback(
    (envelope?: OperationsRealtimeEnvelope) => {
      handleEvent(envelope)
      queueCommercialRefresh()
    },
    [handleEvent, queueCommercialRefresh],
  )

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected') // eslint-disable-line react-hooks/set-state-in-effect -- sync with prop
      return
    }

    setStatus('connecting')

    const socket = io(buildOperationsSocketUrl(), {
      withCredentials: true,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 10_000,
    })
    socketRef.current = socket

    const onConnect = () => setStatus('connected')
    const onDisconnect = () => setStatus('disconnected')
    const onConnectError = () => {
      setStatus('disconnected')
      // fallback: força atualização mesmo sem socket
      handleEvent()
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    for (const eventName of OPERATIONS_EVENTS) {
      socket.on(eventName, handleEvent)
    }

    socket.on('comanda.closed', handleComandaClosed)

    return () => {
      // CORREÇÃO: Limpar todos os timers pendentes
      if (operationsTimerRef.current) clearTimeout(operationsTimerRef.current)
      if (commercialTimerRef.current) clearTimeout(commercialTimerRef.current)

      // CORREÇÃO: Agora remove corretamente porque as refs são estáveis
      for (const eventName of OPERATIONS_EVENTS) {
        socket.off(eventName, handleEvent)
      }

      socket.off('comanda.closed', handleComandaClosed)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, handleEvent, handleComandaClosed])

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
  const payloadBusinessDate = asNullableString(envelope.payload.businessDate)
  if (payloadBusinessDate && payloadBusinessDate !== snapshot.businessDate) {
    return snapshot
  }

  switch (envelope.event) {
    case 'comanda.opened':
      return upsertComandaFromEvent(snapshot, envelope.payload, 'OPEN', 1)
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
  fallbackOpenComandasDelta = 0,
) {
  const comanda = asComandaRecord(payload.comanda)
  if (!comanda) {
    return null
  }

  const existing = findComandaInSnapshot(snapshot, comanda.id)
  const nextComanda: ComandaRecord = {
    ...comanda,
    status: fallbackStatus ?? comanda.status,
  }

  const nextSnapshot = upsertComandaRecord(snapshot, nextComanda)
  const existingWasOpen = existing ? isOpenComandaStatus(existing.status) : false
  const nextIsOpen = isOpenComandaStatus(nextComanda.status)

  if (!existing) {
    return patchClosureOpenComandasCount(nextSnapshot, nextIsOpen ? fallbackOpenComandasDelta : 0)
  }

  if (existingWasOpen === nextIsOpen) {
    return nextSnapshot
  }

  return patchClosureOpenComandasCount(nextSnapshot, nextIsOpen ? 1 : -1)
}

function closeComandaFromEvent(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const comanda = asComandaRecord(payload.comanda)
  if (!comanda) {
    return null
  }

  const existing = findComandaInSnapshot(snapshot, comanda.id)
  const nextSnapshot = upsertComandaRecord(snapshot, {
    ...comanda,
    status: 'CLOSED',
  })

  if (existing && existing.status !== 'CLOSED' && existing.status !== 'CANCELLED') {
    return patchClosureOpenComandasCount(nextSnapshot, -1)
  }

  return existing ? nextSnapshot : patchClosureOpenComandasCount(nextSnapshot, -1)
}

function upsertKitchenItem(
  snapshot: OperationsLiveResponse,
  payload: Record<string, unknown>,
  fallbackStatus?: KitchenItemStatus,
) {
  const comanda = asComandaRecord(payload.comanda)
  if (comanda) {
    return upsertComandaRecord(snapshot, comanda)
  }

  const item = asComandaItemRecord(payload.item)
  const comandaId = asString(payload.comandaId)
  if (!item || !comandaId) {
    return null
  }

  return {
    ...snapshot,
    ...patchComandaCollections(snapshot, (comanda) =>
      comanda.id === comandaId
        ? {
            ...comanda,
            items:
              (mapKitchenStatus(asNullableString(payload.kitchenStatus)) ?? fallbackStatus ?? item.kitchenStatus) ===
              'DELIVERED'
                ? comanda.items.filter((existing) => existing.id !== item.id)
                : upsertComandaItem(comanda.items, item),
          }
        : comanda,
    ),
  }
}

function patchCashSession(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const cashSession = asCashSessionRecord(payload.cashSession)
  if (!cashSession) {
    const cashSessionId = asString(payload.cashSessionId)
    if (!cashSessionId) {
      return null
    }

    return {
      ...snapshot,
      employees: snapshot.employees.map((group) =>
        group.cashSession?.id === cashSessionId
          ? withGroupMetrics({
              ...group,
              cashSession: {
                ...group.cashSession,
                status: mapCashSessionStatus(asNullableString(payload.status)) ?? group.cashSession.status,
                openingCashAmount: asNumber(payload.openingAmount) ?? group.cashSession.openingCashAmount,
                expectedCashAmount: asNumber(payload.expectedAmount) ?? group.cashSession.expectedCashAmount,
                countedCashAmount: asNullableNumber(payload.countedAmount) ?? group.cashSession.countedCashAmount,
                differenceAmount: asNullableNumber(payload.differenceAmount) ?? group.cashSession.differenceAmount,
              },
            })
          : group,
      ),
      unassigned:
        snapshot.unassigned.cashSession?.id === cashSessionId
          ? withGroupMetrics({
              ...snapshot.unassigned,
              cashSession: {
                ...snapshot.unassigned.cashSession,
                status:
                  mapCashSessionStatus(asNullableString(payload.status)) ?? snapshot.unassigned.cashSession.status,
                openingCashAmount: asNumber(payload.openingAmount) ?? snapshot.unassigned.cashSession.openingCashAmount,
                expectedCashAmount:
                  asNumber(payload.expectedAmount) ?? snapshot.unassigned.cashSession.expectedCashAmount,
                countedCashAmount:
                  asNullableNumber(payload.countedAmount) ?? snapshot.unassigned.cashSession.countedCashAmount,
                differenceAmount:
                  asNullableNumber(payload.differenceAmount) ?? snapshot.unassigned.cashSession.differenceAmount,
              },
            })
          : snapshot.unassigned,
    }
  }

  const target = resolveTargetGroup(snapshot, cashSession.employeeId)
  if (!target) {
    return snapshot
  }

  return {
    ...snapshot,
    employees: snapshot.employees.map((group) =>
      group.employeeId === target.employeeId ? withGroupMetrics({ ...group, cashSession }) : group,
    ),
    unassigned:
      target.employeeId === null ? withGroupMetrics({ ...snapshot.unassigned, cashSession }) : snapshot.unassigned,
  }
}

function patchCashOpened(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const cashSession = asCashSessionRecord(payload.cashSession)
  if (!cashSession) {
    return null
  }

  const target = resolveTargetGroup(snapshot, cashSession.employeeId)
  if (!target) {
    return snapshot
  }

  return {
    ...snapshot,
    employees: snapshot.employees.map((group) =>
      group.employeeId === target.employeeId ? withGroupMetrics({ ...group, cashSession }) : group,
    ),
    unassigned:
      target.employeeId === null ? withGroupMetrics({ ...snapshot.unassigned, cashSession }) : snapshot.unassigned,
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
  const mesa = asMesaRecord(payload.mesa)
  if (mesa) {
    return {
      ...snapshot,
      mesas: upsertMesa(snapshot.mesas, mesa),
    }
  }

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
    employees: snapshot.employees.map((group) => withGroupMetrics({ ...group, comandas: group.comandas.map(patcher) })),
    unassigned: withGroupMetrics({
      ...snapshot.unassigned,
      comandas: snapshot.unassigned.comandas.map(patcher),
    }),
  }
}

function upsertComanda(list: ComandaRecord[], next: ComandaRecord) {
  const existing = list.find((comanda) => comanda.id === next.id)
  if (!existing) {
    return [next, ...list]
  }

  return list.map((comanda) => (comanda.id === next.id ? { ...existing, ...next } : comanda))
}

function upsertComandaItem(comandaItems: ComandaRecord['items'], nextItem: ComandaRecord['items'][number]) {
  const exists = comandaItems.find((item) => item.id === nextItem.id)
  if (!exists) {
    return [...comandaItems, nextItem]
  }

  return comandaItems.map((item) => (item.id === nextItem.id ? { ...item, ...nextItem } : item))
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

function upsertComandaRecord(snapshot: OperationsLiveResponse, nextComanda: ComandaRecord) {
  const groupsWithoutComanda = snapshot.employees.map((group) => ({
    ...group,
    comandas: group.comandas.filter((item) => item.id !== nextComanda.id),
  }))
  const unassignedWithoutComanda = {
    ...snapshot.unassigned,
    comandas: snapshot.unassigned.comandas.filter((item) => item.id !== nextComanda.id),
  }

  let targetWasVisible = false
  const employees = groupsWithoutComanda.map((group) => {
    if (group.employeeId !== nextComanda.currentEmployeeId) {
      return withGroupMetrics(group)
    }

    targetWasVisible = true
    return withGroupMetrics({
      ...group,
      comandas: upsertComanda(group.comandas, nextComanda),
    })
  })

  const shouldUseUnassigned = nextComanda.currentEmployeeId == null
  const unassigned = shouldUseUnassigned
    ? withGroupMetrics({
        ...unassignedWithoutComanda,
        comandas: upsertComanda(unassignedWithoutComanda.comandas, nextComanda),
      })
    : withGroupMetrics(unassignedWithoutComanda)

  return {
    ...snapshot,
    employees,
    unassigned,
    mesas: upsertMesaForComanda(
      snapshot.mesas,
      nextComanda,
      shouldUseUnassigned || targetWasVisible || findComandaInSnapshot(snapshot, nextComanda.id) != null,
    ),
  }
}

function upsertMesaForComanda(mesas: MesaRecord[], comanda: ComandaRecord, shouldTrack: boolean) {
  if (!shouldTrack) {
    return mesas
  }

  const nextStatus: MesaRecord['status'] = isOpenComandaStatus(comanda.status) ? 'ocupada' : 'livre'
  const nextComandaId = nextStatus === 'ocupada' ? comanda.id : null
  const nextEmployeeId = nextStatus === 'ocupada' ? comanda.currentEmployeeId : null

  return mesas.map((mesa): MesaRecord => {
    if (mesa.id === comanda.mesaId || mesa.label === comanda.tableLabel) {
      return {
        ...mesa,
        status: nextStatus,
        comandaId: nextComandaId,
        currentEmployeeId: nextEmployeeId,
      }
    }

    if (nextComandaId && mesa.comandaId === comanda.id) {
      return {
        ...mesa,
        status: 'livre',
        comandaId: null,
        currentEmployeeId: null,
      }
    }

    return mesa
  })
}

function upsertMesa(list: MesaRecord[], next: MesaRecord) {
  const existing = list.find((mesa) => mesa.id === next.id)
  if (!existing) {
    return [next, ...list]
  }

  return list.map((mesa) => (mesa.id === next.id ? next : mesa))
}

function withGroupMetrics<
  TGroup extends OperationsLiveResponse['employees'][number] | OperationsLiveResponse['unassigned'],
>(group: TGroup): TGroup {
  const openTables = group.comandas.filter((item) => isOpenComandaStatus(item.status)).length
  const closedTables = group.comandas.filter((item) => item.status === 'CLOSED').length

  return {
    ...group,
    metrics: {
      openTables,
      closedTables,
      grossRevenueAmount: group.cashSession?.grossRevenueAmount ?? 0,
      realizedProfitAmount: group.cashSession?.realizedProfitAmount ?? 0,
      expectedCashAmount: group.cashSession?.expectedCashAmount ?? 0,
    },
  }
}

function asComandaRecord(value: unknown): ComandaRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const maybeComanda = value as ComandaRecord
  return typeof maybeComanda.id === 'string' && Array.isArray(maybeComanda.items) ? maybeComanda : null
}

function asComandaItemRecord(value: unknown): ComandaItemRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const maybeItem = value as ComandaItemRecord
  return typeof maybeItem.id === 'string' && typeof maybeItem.productName === 'string' ? maybeItem : null
}

function asCashSessionRecord(value: unknown): CashSessionRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const maybeSession = value as CashSessionRecord
  return typeof maybeSession.id === 'string' && Array.isArray(maybeSession.movements) ? maybeSession : null
}

function asMesaRecord(value: unknown): MesaRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const maybeMesa = value as MesaRecord
  return typeof maybeMesa.id === 'string' && typeof maybeMesa.label === 'string' ? maybeMesa : null
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

function isOpenComandaStatus(status: ComandaRecord['status']) {
  return status === 'OPEN' || status === 'IN_PREPARATION' || status === 'READY'
}
