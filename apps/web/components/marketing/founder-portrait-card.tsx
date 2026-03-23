'use client'

import Image from 'next/image'
import { useState } from 'react'
import { UserRound } from 'lucide-react'

export function FounderPortraitCard() {
  const [hasImage, setHasImage] = useState(true)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[-6rem] z-0 flex justify-end overflow-hidden lg:top-[-9rem]">
      <div className="relative w-full max-w-[560px] aspect-square lg:max-w-[620px]">
        <div className="absolute inset-x-6 top-20 h-56 rounded-full bg-[radial-gradient(circle,rgba(212,177,106,0.22),transparent_68%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 mx-auto h-[500px] w-full max-w-[520px] overflow-hidden lg:h-[600px] lg:max-w-[580px]">
          {hasImage ? (
            <Image
              alt="Retrato profissional do fundador"
              className="block h-full w-full object-contain object-bottom drop-shadow-[0_40px_90px_rgba(0,0,0,0.52)]"
              src="/founder-portrait.png"
              fill
              sizes="(max-width: 1024px) 520px, 580px"
              onError={() => setHasImage(false)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
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
