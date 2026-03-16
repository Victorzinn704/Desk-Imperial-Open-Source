'use client'

import { useState } from 'react'
import { UserRound } from 'lucide-react'

export function FounderPortraitCard() {
  const [hasImage, setHasImage] = useState(true)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center">
      <div className="relative h-[400px] w-full max-w-[520px]">
        <div className="absolute inset-x-10 top-6 h-48 rounded-full bg-[radial-gradient(circle,rgba(212,177,106,0.18),transparent_68%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 mx-auto h-[380px] w-full max-w-[460px] overflow-hidden">
          {hasImage ? (
            <img
              alt="Retrato profissional do fundador"
              className="block h-full w-full object-contain object-bottom drop-shadow-[0_30px_60px_rgba(0,0,0,0.44)]"
              src="/founder-portrait.png"
              onError={() => setHasImage(false)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex size-20 items-center justify-center rounded-[30px] border border-[var(--border-strong)] bg-[rgba(212,177,106,0.1)] text-[var(--accent)] shadow-[0_24px_56px_rgba(0,0,0,0.28)]">
                <UserRound className="size-9" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Espaco do fundador</p>
              <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--text-soft)]">
                Salve sua imagem em <span className="font-semibold text-[var(--text-primary)]">apps/web/public/founder-portrait.png</span> para ativar este destaque.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
