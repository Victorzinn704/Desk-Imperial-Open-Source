'use client'

import { useState } from 'react'
import { UserRound } from 'lucide-react'

export function FounderPortraitCard() {
  const [hasImage, setHasImage] = useState(true)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[-4rem] z-0 flex justify-end overflow-hidden lg:top-[-7rem]">
      <div className="relative w-full max-w-[580px] aspect-[3/4] lg:max-w-[660px]">
        <div className="absolute inset-x-6 top-20 h-64 rounded-full bg-[radial-gradient(circle,rgba(212,177,106,0.18),transparent_60%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 mx-auto h-[540px] w-full max-w-[560px] overflow-hidden lg:h-[680px] lg:max-w-[640px]">
          {hasImage ? (
            <img
              alt="Identidade visual Desk Imperial — caneta executiva com branding dourado"
              className="block h-full w-full object-cover object-[center_20%] drop-shadow-[0_40px_100px_rgba(0,0,0,0.62)]"
              src="/hero-brand.png"
              onError={() => setHasImage(false)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="flex size-20 items-center justify-center rounded-[30px] border border-[var(--border-strong)] bg-[rgba(212,177,106,0.1)] text-[var(--accent)] shadow-[0_24px_56px_rgba(0,0,0,0.28)]">
                <UserRound className="size-9" />
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
