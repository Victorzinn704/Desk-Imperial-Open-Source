'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg)] px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <span className="text-2xl">⚠</span>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Erro no painel</h1>
        <p className="max-w-sm text-sm leading-6 text-[var(--text-soft)]">
          O painel encontrou um problema. Clique em &ldquo;Tentar novamente&rdquo; para recarregar o estado, ou volte para o login.
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--text-soft)] opacity-50">Código: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent-strong)]"
        >
          Tentar novamente
        </button>
        <Link
          href="/login"
          className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
        >
          Voltar ao login
        </Link>
      </div>
    </main>
  )
}
