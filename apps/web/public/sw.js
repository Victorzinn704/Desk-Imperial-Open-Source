/// <reference lib="webworker" />

const CACHE_NAME = 'desk-imperial-v1'
const STATIC_ASSETS = [
  '/app/staff',
  '/app/owner',
  '/manifest.json',
]

// Install — precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch — cache-first only for static assets.
// Requisições de API (ou cross-origin) nunca são cacheadas no SW para evitar
// dados operacionais sensíveis obsoletos entre sessões/usuários.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip WebSocket upgrade requests
  if (event.request.headers.get('upgrade') === 'websocket') return

  // API/cross-origin: bypass do SW cache
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      return cached || fetchPromise
    })
  )
})

// Background Sync — fila offline
// O SW NÃO faz chamadas HTTP (não tem acesso a cookies de sessão + CSRF).
// Ele apenas acorda a aba ativa e pede para ela drenar a fila do IndexedDB.
self.addEventListener('sync', (event) => {
  if (event.tag !== 'desk-imperial-drain') return

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: false }).then((clients) => {
      const focusedClient = clients.find((c) => c.focused) ?? clients[0]
      if (focusedClient) {
        focusedClient.postMessage({ type: 'DRAIN_QUEUE' })
      }
    })
  )
})
