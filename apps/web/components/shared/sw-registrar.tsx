'use client'

import { useEffect } from 'react'

/**
 * Registra o Service Worker para PWA.
 * Chamado apenas no layout mobile /app.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/app/' })
        .catch((err) => {
          console.warn('[SW] Falha ao registrar service worker:', err)
        })
    }
  }, [])

  return null
}
