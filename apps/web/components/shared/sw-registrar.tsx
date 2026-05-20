'use client'

import { useEffect } from 'react'

/**
 * Registra o Service Worker para PWA.
 * Chamado apenas no layout mobile /app.
 */
export function ServiceWorkerRegistrar({
  scriptUrl = '/sw.js',
  scope = '/app/',
}: Readonly<{ scriptUrl?: string; scope?: string }>) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(scriptUrl, { scope }).catch((err) => {
        console.warn('[SW] Falha ao registrar service worker:', err)
      })
    }
  }, [scope, scriptUrl])

  return null
}
