'use client'

/**
 * use-offline-queue — IndexedDB + Background Sync
 *
 * Persistência profissional para uma PWA:
 * - IndexedDB: async, transacional, sem limite rígido, acessível pelo SW
 * - Background Sync: o browser garante a entrega mesmo que a aba feche
 *
 * Fluxo completo:
 *   enqueue() → IDB write + SW sync.register('desk-imperial-drain')
 *   SW sync event → postMessage DRAIN_QUEUE → staff-mobile-shell drena
 *   drainQueue() → IDB read all → executa → IDB delete por sucesso
 */

import { useCallback } from 'react'

const DB_NAME = 'desk-imperial-v1'
const STORE_NAME = 'offline-actions'
const SYNC_TAG = 'desk-imperial-drain'
const TTL_MS = 10 * 60 * 1000 // 10 minutos

export type OfflineAction = {
  id: string
  type: string
  payload: unknown
  enqueuedAt: number
}

type Executor = (action: OfflineAction) => Promise<void>

// ─── IndexedDB helpers (sem deps externas) ──────────────────────────────────

// Connection pool: IDB connections são caras de abrir.
// Cacheamos a promise — todas as operações reutilizam a mesma conexão.
let _dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('by_enqueuedAt', 'enqueuedAt')
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        _dbPromise = null // reset para que próxima chamada tente novamente
        reject(req.error)
      }
    })
  }
  return _dbPromise
}

async function idbPut(action: OfflineAction): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(action)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGetAll(): Promise<OfflineAction[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).index('by_enqueuedAt').getAll()
    req.onsuccess = () => resolve(req.result as OfflineAction[])
    req.onerror = () => reject(req.error)
  })
}

async function idbDelete(id: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ─── Background Sync registration ───────────────────────────────────────────

async function registerSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    // A Background Sync API pode não estar disponível em todos os browsers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const syncManager = (reg as any).sync as { register: (tag: string) => Promise<void> } | undefined
    if (syncManager) {
      await syncManager.register(SYNC_TAG)
    }
  } catch {
    // Fallback silencioso — a aba ainda drena via realtimeStatus === 'connected'
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useOfflineQueue() {
  const enqueue = useCallback(async (action: Omit<OfflineAction, 'id' | 'enqueuedAt'>) => {
    const entry: OfflineAction = {
      ...action,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      enqueuedAt: Date.now(),
    }
    await idbPut(entry)
    // Dispara Background Sync — browser vai garantir execução mesmo offline
    await registerSync()
    return entry.id
  }, [])

  const drainQueue = useCallback(async (executor: Executor) => {
    let all: OfflineAction[]
    try {
      all = await idbGetAll()
    } catch {
      return // IDB indisponível (SSR / ambiente de teste)
    }

    const now = Date.now()
    // Descarta ações expiradas atomicamente
    const expired = all.filter((a) => now - a.enqueuedAt >= TTL_MS)
    const valid = all.filter((a) => now - a.enqueuedAt < TTL_MS)

    await Promise.all(expired.map((a) => idbDelete(a.id)))

    for (const action of valid) {
      try {
        await executor(action)
        await idbDelete(action.id) // Remove somente após sucesso
      } catch {
        // Mantém na fila para próxima tentativa — não re-throw
      }
    }
  }, [])

  return { enqueue, drainQueue }
}
