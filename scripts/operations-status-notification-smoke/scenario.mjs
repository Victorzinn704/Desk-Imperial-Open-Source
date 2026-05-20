import { REALTIME_EVENTS, SMOKE_CONFIG } from './config.mjs'
import { exercisePreferenceRoundTrips, restoreSmokePreferences } from './preferences.mjs'
import {
  createRealtimeProbe,
  matchesComandaEvent,
  matchesComandaStatus,
  matchesKitchenStatus,
  waitForBothProbes,
} from './realtime-probe.mjs'

const CLOSE_COMANDA_PAYLOAD = Object.freeze({
  discountAmount: 0,
  paymentMethod: 'PIX',
  serviceFeeAmount: 0,
})

const KITCHEN_STATUS_FLOW = ['IN_PREPARATION', 'READY']

export function createSmokeSummary() {
  return {
    apiBaseUrl: SMOKE_CONFIG.apiBaseUrl,
    preferenceRoundTrip: null,
    realtime: {
      ownerEvents: [],
      staffEvents: [],
    },
    smokeStartedAt: new Date().toISOString(),
    socketBaseUrl: SMOKE_CONFIG.socketBaseUrl,
    userPreferenceRoundTrip: null,
  }
}

export function createSmokeState() {
  return {
    createdComandaId: null,
    ownerProbe: null,
    restoredPreferences: null,
    restoredUserPreferences: null,
    staffProbe: null,
  }
}

export async function runSmokeScenario({ owner, staff, state, summary }) {
  await loginSmokeUsers(owner, staff)
  await connectSmokeProbes(owner, staff, state)
  await exercisePreferenceRoundTrips(owner, summary, state)

  const opened = await openKitchenComanda(owner)
  state.createdComandaId = opened.comandaId

  const probes = { owner: state.ownerProbe, staff: state.staffProbe }
  await waitForInitialRealtime(probes, opened.comandaId)
  await advanceKitchenFlow({ owner, opened, probes, staff })
  await closeComandaAndWait({ comandaId: opened.comandaId, owner, probes })

  state.createdComandaId = null
  recordRealtimeSummary(summary, state)
}

export async function cleanupSmoke(owner, state) {
  await closeCreatedComanda(owner, state)
  await restoreSmokePreferences(owner, state)
  state.ownerProbe?.socket.disconnect()
  state.staffProbe?.socket.disconnect()
}

async function loginSmokeUsers(owner, staff) {
  await owner.loginDemo('OWNER')
  await staff.loginDemo('STAFF', SMOKE_CONFIG.demoStaffCode)
}

async function connectSmokeProbes(owner, staff, state) {
  state.ownerProbe = await createRealtimeProbe(owner, 'owner')
  state.staffProbe = await createRealtimeProbe(staff, 'staff')
}

async function openKitchenComanda(owner) {
  const [freeMesa, kitchenProduct] = await Promise.all([findFreeMesa(owner), findKitchenProduct(owner)])
  const opened = await owner.request('/operations/comandas?includeSnapshot=false', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ productId: kitchenProduct.id, quantity: 1 }],
      mesaId: freeMesa.id,
      tableLabel: freeMesa.label,
    }),
  })

  return {
    comandaId: opened.comanda.id,
    openedItemId: opened.comanda.items.find((item) => item.kitchenStatus === 'QUEUED')?.id,
  }
}

async function findFreeMesa(owner) {
  const mesas = await owner.request('/operations/mesas')
  return requireEntity(
    mesas.find((mesa) => mesa.status === 'livre'),
    'Nenhuma mesa livre disponível para o smoke.',
  )
}

async function findKitchenProduct(owner) {
  const productsResponse = await owner.request('/products?includeInactive=true')
  return requireEntity(
    productsResponse.items.find(isSmokeKitchenProduct),
    'Nenhum produto de cozinha disponível para o smoke.',
  )
}

function isSmokeKitchenProduct(product) {
  return product.active && product.stock > 0 && product.requiresKitchen
}

async function waitForInitialRealtime(probes, comandaId) {
  await waitForBothProbes(
    probes,
    REALTIME_EVENTS.comandaOpened,
    matchesComandaEvent(REALTIME_EVENTS.comandaOpened, comandaId),
  )
  await waitForBothProbes(
    probes,
    REALTIME_EVENTS.kitchenItemQueued,
    matchesComandaEvent(REALTIME_EVENTS.kitchenItemQueued, comandaId),
  )
}

async function advanceKitchenFlow({ owner, opened, probes, staff }) {
  const kitchenItem = await resolveKitchenItem(owner, opened)
  for (const status of KITCHEN_STATUS_FLOW) {
    await updateKitchenStatusAndWait({ comandaId: opened.comandaId, itemId: kitchenItem.itemId, probes, staff, status })
  }
}

async function resolveKitchenItem(owner, opened) {
  const kitchenView = await owner.request('/operations/kitchen')
  return requireEntity(
    kitchenView.items.find((item) => item.comandaId === opened.comandaId || item.itemId === opened.openedItemId),
    `Item de cozinha não encontrado para a comanda ${opened.comandaId}.`,
  )
}

async function updateKitchenStatusAndWait({ comandaId, itemId, probes, staff, status }) {
  await staff.request(`/operations/kitchen-items/${itemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

  await waitForBothProbes(probes, `kitchen.item.updated -> ${status}`, matchesKitchenStatus(itemId, status))
  await waitForBothProbes(probes, `comanda.updated -> ${status}`, matchesComandaStatus(comandaId, status))
}

async function closeComandaAndWait({ comandaId, owner, probes }) {
  await requestCloseComanda(owner, comandaId)
  await waitForBothProbes(
    probes,
    REALTIME_EVENTS.comandaClosed,
    matchesComandaEvent(REALTIME_EVENTS.comandaClosed, comandaId),
  )
}

async function closeCreatedComanda(owner, state) {
  if (!state.createdComandaId) {
    return
  }

  try {
    await requestCloseComanda(owner, state.createdComandaId)
  } catch (error) {
    console.error(
      `Falha no cleanup da comanda ${state.createdComandaId}:`,
      error instanceof Error ? error.message : error,
    )
  }
}

async function requestCloseComanda(owner, comandaId) {
  return owner.request(`/operations/comandas/${comandaId}/close`, {
    method: 'POST',
    body: JSON.stringify(CLOSE_COMANDA_PAYLOAD),
  })
}

function recordRealtimeSummary(summary, state) {
  summary.realtime.ownerEvents = state.ownerProbe.events.map((entry) => entry.eventName)
  summary.realtime.staffEvents = state.staffProbe.events.map((entry) => entry.eventName)
  summary.smokeFinishedAt = new Date().toISOString()
}

function requireEntity(entity, message) {
  if (!entity) {
    throw new Error(message)
  }
  return entity
}
