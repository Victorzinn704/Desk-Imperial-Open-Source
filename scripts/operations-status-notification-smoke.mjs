import { io } from 'socket.io-client'

const API_BASE_URL = process.env.DESK_SMOKE_API_BASE_URL ?? 'https://api.deskimperial.online/api/v1'
const SOCKET_BASE_URL = process.env.DESK_SMOKE_SOCKET_BASE_URL ?? 'https://api.deskimperial.online'
const SOCKET_ORIGIN = process.env.DESK_SMOKE_SOCKET_ORIGIN ?? 'https://app.deskimperial.online'
const DEMO_STAFF_CODE = process.env.DESK_SMOKE_DEMO_STAFF_CODE ?? 'VD-001'
const EVENT_TIMEOUT_MS = Number.parseInt(process.env.DESK_SMOKE_EVENT_TIMEOUT_MS ?? '15000', 10)

const KITCHEN_STATUS_EVENT = 'operations.kitchen_item.status_changed'
const COMANDA_STATUS_EVENT = 'operations.comanda.status_changed'

class ApiSession {
  constructor(name) {
    this.name = name
    this.cookies = []
    this.csrfToken = ''
    this.sessionToken = ''
  }

  cookieHeader() {
    return this.cookies.join('; ')
  }

  captureCookies(response) {
    const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
    for (const setCookie of setCookies) {
      const keyValue = setCookie.split(';')[0]
      const separatorIndex = keyValue.indexOf('=')
      if (separatorIndex <= 0) {
        continue
      }

      const cookieName = keyValue.slice(0, separatorIndex)
      const cookieValue = keyValue.slice(separatorIndex + 1)
      this.cookies = this.cookies.filter((entry) => !entry.startsWith(`${cookieName}=`))
      this.cookies.push(keyValue)

      if (cookieName === '__Host-partner_session' || cookieName === 'partner_session') {
        this.sessionToken = cookieValue
      }
    }
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers ?? {})
    if (this.cookies.length > 0) {
      headers.set('cookie', this.cookieHeader())
    }
    if (options.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    if (options.method && options.method !== 'GET' && this.csrfToken) {
      headers.set('x-csrf-token', this.csrfToken)
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
    this.captureCookies(response)

    const contentType = response.headers.get('content-type') ?? ''
    const payload = contentType.includes('application/json') ? await response.json() : await response.text()
    if (
      payload &&
      typeof payload === 'object' &&
      payload !== null &&
      'csrfToken' in payload &&
      typeof payload.csrfToken === 'string'
    ) {
      this.csrfToken = payload.csrfToken
    }

    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && payload !== null && 'message' in payload
          ? JSON.stringify(payload.message)
          : JSON.stringify(payload)
      throw new Error(`${this.name} ${options.method ?? 'GET'} ${path} falhou (${response.status}): ${message}`)
    }

    return payload
  }

  async loginDemo(loginMode, employeeCode) {
    const payload = loginMode === 'STAFF' ? { loginMode, employeeCode } : { loginMode }
    return this.request('/auth/demo', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

function createRealtimeProbe(session, name) {
  const events = []
  const socket = io(`${SOCKET_BASE_URL}/operations`, {
    transports: ['websocket'],
    upgrade: false,
    timeout: 8_000,
    auth: {
      token: session.sessionToken,
    },
    extraHeaders: {
      Origin: SOCKET_ORIGIN,
    },
  })

  socket.onAny((eventName, envelope) => {
    events.push({ eventName, envelope, receivedAt: new Date().toISOString() })
  })

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect()
      reject(new Error(`Socket ${name} não conectou em ${EVENT_TIMEOUT_MS}ms.`))
    }, EVENT_TIMEOUT_MS)

    socket.on('connect', () => {
      clearTimeout(timeout)
      resolve({ socket, events, name })
    })

    socket.on('operations.error', (payload) => {
      clearTimeout(timeout)
      socket.disconnect()
      reject(new Error(`Socket ${name} recusado: ${JSON.stringify(payload)}`))
    })

    socket.on('connect_error', (error) => {
      clearTimeout(timeout)
      socket.disconnect()
      reject(new Error(`Socket ${name} falhou: ${error.message}`))
    })
  })
}

async function waitForEvent(probe, label, predicate, timeoutMs = EVENT_TIMEOUT_MS) {
  const existing = probe.events.find(predicate)
  if (existing) {
    return existing
  }

  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    await sleep(250)
    const match = probe.events.find(predicate)
    if (match) {
      return match
    }
  }

  throw new Error(`Evento esperado não chegou para ${probe.name}: ${label}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const owner = new ApiSession('owner')
  const staff = new ApiSession('staff')

  let createdComandaId = null
  let restoredPreferences = null
  let restoredUserPreferences = null

  const summary = {
    apiBaseUrl: API_BASE_URL,
    socketBaseUrl: SOCKET_BASE_URL,
    smokeStartedAt: new Date().toISOString(),
    preferenceRoundTrip: null,
    userPreferenceRoundTrip: null,
    realtime: {
      ownerEvents: [],
      staffEvents: [],
    },
  }

  let ownerProbe = null
  let staffProbe = null

  try {
    await owner.loginDemo('OWNER')
    await staff.loginDemo('STAFF', DEMO_STAFF_CODE)

    ownerProbe = await createRealtimeProbe(owner, 'owner')
    staffProbe = await createRealtimeProbe(staff, 'staff')

    const originalUserPreferences = await owner.request('/notifications/preferences/me')
    const userPreferences = originalUserPreferences.preferences ?? []
    const ownerWebToastPreference = userPreferences.find(
      (entry) => entry.channel === 'WEB_TOAST' && entry.eventType === COMANDA_STATUS_EVENT,
    )

    if (!ownerWebToastPreference) {
      throw new Error('Preferência esperada de WEB_TOAST não foi encontrada para o usuário owner.')
    }

    restoredUserPreferences = userPreferences.map(({ channel, eventType, enabled }) => ({
      channel,
      eventType,
      enabled,
    }))

    const toggledUserPreferences = userPreferences.map((entry) =>
      entry.channel === 'WEB_TOAST' && entry.eventType === COMANDA_STATUS_EVENT
        ? { channel: entry.channel, eventType: entry.eventType, enabled: !entry.enabled }
        : { channel: entry.channel, eventType: entry.eventType, enabled: entry.enabled },
    )

    const updatedUserPreferences = await owner.request('/notifications/preferences/me', {
      method: 'POST',
      body: JSON.stringify({ preferences: toggledUserPreferences }),
    })

    const restoredUser = await owner.request('/notifications/preferences/me', {
      method: 'POST',
      body: JSON.stringify({ preferences: restoredUserPreferences }),
    })

    summary.userPreferenceRoundTrip = {
      before: userPreferences,
      afterToggle: updatedUserPreferences.preferences,
      afterRestore: restoredUser.preferences,
    }

    const originalPreferences = await owner.request('/notifications/telegram/preferences')
    const preferences = originalPreferences.preferences ?? []
    const kitchenPreference = preferences.find((entry) => entry.eventType === KITCHEN_STATUS_EVENT)
    const comandaPreference = preferences.find((entry) => entry.eventType === COMANDA_STATUS_EVENT)

    if (!kitchenPreference || !comandaPreference) {
      throw new Error('Preferências esperadas de Telegram não foram encontradas no workspace.')
    }

    restoredPreferences = preferences.map(({ channel, eventType, enabled }) => ({ channel, eventType, enabled }))

    const toggledPreferences = preferences.map((entry) =>
      entry.eventType === KITCHEN_STATUS_EVENT
        ? { channel: entry.channel, eventType: entry.eventType, enabled: !entry.enabled }
        : { channel: entry.channel, eventType: entry.eventType, enabled: entry.enabled },
    )

    const updatedPreferences = await owner.request('/notifications/telegram/preferences', {
      method: 'POST',
      body: JSON.stringify({ preferences: toggledPreferences }),
    })

    const restored = await owner.request('/notifications/telegram/preferences', {
      method: 'POST',
      body: JSON.stringify({ preferences: restoredPreferences }),
    })

    summary.preferenceRoundTrip = {
      before: preferences,
      afterToggle: updatedPreferences.preferences,
      afterRestore: restored.preferences,
    }

    const mesas = await owner.request('/operations/mesas')
    const freeMesa = mesas.find((mesa) => mesa.status === 'livre')
    if (!freeMesa) {
      throw new Error('Nenhuma mesa livre disponível para o smoke do demo.')
    }

    const productsResponse = await owner.request('/products?includeInactive=true')
    const kitchenProduct = productsResponse.items.find(
      (product) => product.active && product.stock > 0 && product.requiresKitchen,
    )
    if (!kitchenProduct) {
      throw new Error('Nenhum produto de cozinha disponível para o smoke.')
    }

    const opened = await owner.request('/operations/comandas?includeSnapshot=false', {
      method: 'POST',
      body: JSON.stringify({
        tableLabel: freeMesa.label,
        mesaId: freeMesa.id,
        items: [
          {
            productId: kitchenProduct.id,
            quantity: 1,
          },
        ],
      }),
    })

    createdComandaId = opened.comanda.id
    const openedItemId = opened.comanda.items.find((item) => item.kitchenStatus === 'QUEUED')?.id

    await waitForEvent(
      ownerProbe,
      'comanda.opened owner',
      (entry) => entry.eventName === 'comanda.opened' && entry.envelope?.payload?.comandaId === createdComandaId,
    )
    await waitForEvent(
      staffProbe,
      'comanda.opened staff',
      (entry) => entry.eventName === 'comanda.opened' && entry.envelope?.payload?.comandaId === createdComandaId,
    )
    await waitForEvent(
      ownerProbe,
      'kitchen.item.queued owner',
      (entry) => entry.eventName === 'kitchen.item.queued' && entry.envelope?.payload?.comandaId === createdComandaId,
    )
    await waitForEvent(
      staffProbe,
      'kitchen.item.queued staff',
      (entry) => entry.eventName === 'kitchen.item.queued' && entry.envelope?.payload?.comandaId === createdComandaId,
    )

    const kitchenView = await owner.request('/operations/kitchen')
    const kitchenItem = kitchenView.items.find(
      (item) => item.comandaId === createdComandaId || item.itemId === openedItemId,
    )
    if (!kitchenItem) {
      throw new Error(`Item de cozinha não encontrado para a comanda ${createdComandaId}.`)
    }

    await staff.request(`/operations/kitchen-items/${kitchenItem.itemId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'IN_PREPARATION' }),
    })

    await waitForEvent(
      ownerProbe,
      'kitchen.item.updated owner -> IN_PREPARATION',
      (entry) =>
        entry.eventName === 'kitchen.item.updated' &&
        entry.envelope?.payload?.itemId === kitchenItem.itemId &&
        entry.envelope?.payload?.kitchenStatus === 'IN_PREPARATION',
    )
    await waitForEvent(
      staffProbe,
      'kitchen.item.updated staff -> IN_PREPARATION',
      (entry) =>
        entry.eventName === 'kitchen.item.updated' &&
        entry.envelope?.payload?.itemId === kitchenItem.itemId &&
        entry.envelope?.payload?.kitchenStatus === 'IN_PREPARATION',
    )
    await waitForEvent(
      ownerProbe,
      'comanda.updated owner -> IN_PREPARATION',
      (entry) =>
        entry.eventName === 'comanda.updated' &&
        entry.envelope?.payload?.comandaId === createdComandaId &&
        entry.envelope?.payload?.status === 'IN_PREPARATION',
    )
    await waitForEvent(
      staffProbe,
      'comanda.updated staff -> IN_PREPARATION',
      (entry) =>
        entry.eventName === 'comanda.updated' &&
        entry.envelope?.payload?.comandaId === createdComandaId &&
        entry.envelope?.payload?.status === 'IN_PREPARATION',
    )

    await staff.request(`/operations/kitchen-items/${kitchenItem.itemId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'READY' }),
    })

    await waitForEvent(
      ownerProbe,
      'kitchen.item.updated owner -> READY',
      (entry) =>
        entry.eventName === 'kitchen.item.updated' &&
        entry.envelope?.payload?.itemId === kitchenItem.itemId &&
        entry.envelope?.payload?.kitchenStatus === 'READY',
    )
    await waitForEvent(
      staffProbe,
      'kitchen.item.updated staff -> READY',
      (entry) =>
        entry.eventName === 'kitchen.item.updated' &&
        entry.envelope?.payload?.itemId === kitchenItem.itemId &&
        entry.envelope?.payload?.kitchenStatus === 'READY',
    )
    await waitForEvent(
      ownerProbe,
      'comanda.updated owner -> READY',
      (entry) =>
        entry.eventName === 'comanda.updated' &&
        entry.envelope?.payload?.comandaId === createdComandaId &&
        entry.envelope?.payload?.status === 'READY',
    )
    await waitForEvent(
      staffProbe,
      'comanda.updated staff -> READY',
      (entry) =>
        entry.eventName === 'comanda.updated' &&
        entry.envelope?.payload?.comandaId === createdComandaId &&
        entry.envelope?.payload?.status === 'READY',
    )

    await owner.request(`/operations/comandas/${createdComandaId}/close`, {
      method: 'POST',
      body: JSON.stringify({
        discountAmount: 0,
        serviceFeeAmount: 0,
        paymentMethod: 'PIX',
      }),
    })

    await waitForEvent(
      ownerProbe,
      'comanda.closed owner',
      (entry) => entry.eventName === 'comanda.closed' && entry.envelope?.payload?.comandaId === createdComandaId,
    )
    await waitForEvent(
      staffProbe,
      'comanda.closed staff',
      (entry) => entry.eventName === 'comanda.closed' && entry.envelope?.payload?.comandaId === createdComandaId,
    )
    createdComandaId = null

    summary.realtime.ownerEvents = ownerProbe.events.map((entry) => entry.eventName)
    summary.realtime.staffEvents = staffProbe.events.map((entry) => entry.eventName)
    summary.smokeFinishedAt = new Date().toISOString()

    console.log(JSON.stringify(summary, null, 2))
  } finally {
    if (createdComandaId) {
      try {
        await owner.request(`/operations/comandas/${createdComandaId}/close`, {
          method: 'POST',
          body: JSON.stringify({
            discountAmount: 0,
            serviceFeeAmount: 0,
            paymentMethod: 'PIX',
          }),
        })
      } catch (error) {
        console.error(
          `Falha no cleanup da comanda ${createdComandaId}:`,
          error instanceof Error ? error.message : error,
        )
      }
    }

    if (restoredPreferences) {
      try {
        await owner.request('/notifications/telegram/preferences', {
          method: 'POST',
          body: JSON.stringify({ preferences: restoredPreferences }),
        })
      } catch (error) {
        console.error('Falha ao restaurar preferências do workspace:', error instanceof Error ? error.message : error)
      }
    }

    if (restoredUserPreferences) {
      try {
        await owner.request('/notifications/preferences/me', {
          method: 'POST',
          body: JSON.stringify({ preferences: restoredUserPreferences }),
        })
      } catch (error) {
        console.error('Falha ao restaurar preferências do usuário:', error instanceof Error ? error.message : error)
      }
    }

    ownerProbe?.socket.disconnect()
    staffProbe?.socket.disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
