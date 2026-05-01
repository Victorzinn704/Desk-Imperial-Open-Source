/// <reference lib="webworker" />

const CACHE_NAME = 'desk-imperial-v3'
const STATIC_ASSETS = [
  '/app/staff',
  '/app/owner',
  '/app/owner/cadastro-rapido',
  '/manifest.json',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install — precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)))
  self.skipWaiting()
})

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

// Fetch — API sempre bypass; navegação usa network-first para evitar app móvel velho preso no cache.
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

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, '/app/owner'))
    return
  }

  // Static assets: cache-first. Assets hashed do Next podem ficar estáveis;
  // navegação HTML fica fora desse caminho para receber releases novos.
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
    }),
  )
})

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME)

  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match(fallbackUrl)) || Response.error()
  }
}

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
    }),
  )
})
