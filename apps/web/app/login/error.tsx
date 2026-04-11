'use client'

import { useEffect } from 'react'

export default function LoginError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[LoginError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
      <p className="text-sm font-semibold text-white/60">Erro ao carregar o login</p>
      <button
        className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/[0.06]"
        onClick={reset}
      >
        Tentar novamente
      </button>
    </div>
  )
}
