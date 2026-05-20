import { io } from 'socket.io-client'
import { REALTIME_EVENTS, SMOKE_CONFIG } from './config.mjs'

export function createRealtimeProbe(session, name) {
  const events = []
  const socket = io(`${SMOKE_CONFIG.socketBaseUrl}/operations`, {
    auth: {
      token: session.sessionToken,
    },
    extraHeaders: {
      Origin: SMOKE_CONFIG.socketOrigin,
    },
    timeout: 8_000,
    transports: ['websocket'],
    upgrade: false,
  })

  socket.onAny((eventName, envelope) => {
    events.push({ envelope, eventName, receivedAt: new Date().toISOString() })
  })

  return waitForSocketConnection({ events, name, socket })
}

export async function waitForEvent(probe, label, predicate, timeoutMs = SMOKE_CONFIG.eventTimeoutMs) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const match = probe.events.find(predicate)
    if (match) {
      return match
    }
    await sleep(250)
  }

  throw new Error(`Evento esperado não chegou para ${probe.name}: ${label}`)
}

export async function waitForBothProbes(probes, label, predicate) {
  await Promise.all([
    waitForEvent(probes.owner, `${label} owner`, predicate),
    waitForEvent(probes.staff, `${label} staff`, predicate),
  ])
}

export function matchesComandaEvent(eventName, comandaId) {
  return (entry) => entry.eventName === eventName && payloadOf(entry).comandaId === comandaId
}

export function matchesComandaStatus(comandaId, status) {
  return (entry) =>
    matchesComandaEvent(REALTIME_EVENTS.comandaUpdated, comandaId)(entry) && payloadOf(entry).status === status
}

export function matchesKitchenStatus(itemId, status) {
  return (entry) =>
    entry.eventName === REALTIME_EVENTS.kitchenItemUpdated &&
    payloadOf(entry).itemId === itemId &&
    payloadOf(entry).kitchenStatus === status
}

function waitForSocketConnection({ events, name, socket }) {
  return new Promise((resolve, reject) => {
    const failConnection = createConnectionFailureHandler({ name, reject, socket })
    const timeout = setTimeout(
      () => failConnection(`Socket ${name} não conectou em ${SMOKE_CONFIG.eventTimeoutMs}ms.`),
      SMOKE_CONFIG.eventTimeoutMs,
    )

    socket.on('connect', () => {
      clearTimeout(timeout)
      resolve({ events, name, socket })
    })
    socket.on('operations.error', (payload) => failConnection(`Socket ${name} recusado: ${JSON.stringify(payload)}`))
    socket.on('connect_error', (error) => failConnection(`Socket ${name} falhou: ${error.message}`))
  })
}

function createConnectionFailureHandler({ name: _name, reject, socket }) {
  return (message) => {
    socket.disconnect()
    reject(new Error(message))
  }
}

function payloadOf(entry) {
  return entry.envelope?.payload ?? {}
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
