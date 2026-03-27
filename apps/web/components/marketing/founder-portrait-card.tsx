'use client'

import { useState } from 'react'
import { UserRound } from 'lucide-react'

export function FounderPortraitCard() {
  const [hasImage, setHasImage] = useState(true)

  return (
    <div className="pointer-events-none relative z-0 mx-auto flex w-full max-w-[320px] lg:absolute lg:inset-x-0 lg:top-[-9rem] lg:max-w-none lg:justify-end lg:overflow-hidden px-4 lg:px-0 mb-8 lg:mb-0">
      <div className="relative w-full aspect-[4/5] lg:max-w-[620px] lg:aspect-square">
        <div className="absolute inset-x-4 top-10 h-32 rounded-full bg-[radial-gradient(circle,rgba(155,132,96,0.3),transparent_68%)] blur-2xl lg:inset-x-6 lg:top-20 lg:h-56 lg:blur-3xl" />
        <div className="relative mx-auto h-full w-full overflow-visible lg:absolute lg:inset-x-0 lg:top-0 lg:h-[600px] lg:max-w-[580px] lg:overflow-hidden">
          {hasImage ? (
            <img
              alt="Retrato profissional do fundador"
              className="block h-full w-full object-contain object-bottom drop-shadow-[0_24px_40px_rgba(0,0,0,0.5)] lg:drop-shadow-[0_40px_90px_rgba(0,0,0,0.52)]"
              src="/founder-portrait.png"
              onError={() => setHasImage(false)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <span className="flex size-16 lg:size-20 items-center justify-center rounded-[24px] lg:rounded-[30px] border border-[var(--border-strong)] bg-[rgba(155,132,96,0.1)] text-[var(--accent)] shadow-[0_16px_32px_rgba(0,0,0,0.2)] lg:shadow-[0_24px_56px_rgba(0,0,0,0.28)]">
                <UserRound className="size-8 lg:size-9" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Espaço do fundador</p>
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
