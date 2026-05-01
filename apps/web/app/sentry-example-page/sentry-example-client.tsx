'use client'

import * as Sentry from '@sentry/nextjs'
import { useState } from 'react'

export function SentryExampleClient() {
  const [browserStatus, setBrowserStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [apiStatus, setApiStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  async function handleBrowserError() {
    setBrowserStatus('sending')

    try {
      Sentry.captureException(new Error('Desk Imperial Next.js browser test error'))
      await Sentry.flush(2_000)
      setBrowserStatus('sent')
    } catch {
      setBrowserStatus('failed')
    }
  }

  async function handleApiError() {
    setApiStatus('sending')

    try {
      const response = await fetch('/api/sentry-example-api', {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        setApiStatus('sent')
        return
      }

      setApiStatus('failed')
    } catch {
      setApiStatus('failed')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16 text-[var(--text)]">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--text-soft)]">Sentry</p>
        <h1 className="text-3xl font-semibold">Validacao local do SDK Next.js</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
          Esta pagina existe so para smoke local. Em producao ela devolve 404.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Erro do navegador</h2>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Envia um erro de browser via tunnel do Sentry e confirma no estado local.
          </p>
          <button
            className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
            onClick={handleBrowserError}
          >
            Enviar erro do navegador
          </button>
          <p className="mt-3 text-sm" data-testid="sentry-browser-status">
            Status: {browserStatus}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Erro do servidor</h2>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Chama uma route handler local que captura um erro no runtime Node do Next.
          </p>
          <button
            className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
            onClick={handleApiError}
          >
            Enviar erro do servidor
          </button>
          <p className="mt-3 text-sm" data-testid="sentry-api-status">
            Status: {apiStatus}
          </p>
        </article>
      </section>
    </main>
  )
}
