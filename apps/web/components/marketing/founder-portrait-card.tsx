'use client'

import Image from 'next/image'
import { useState } from 'react'
import { UserRound } from 'lucide-react'

export function FounderPortraitCard() {
  const [hasImage, setHasImage] = useState(true)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[-6rem] z-0 flex justify-end overflow-hidden lg:top-[-9rem]">
      <div className="relative w-full max-w-[560px] aspect-square lg:max-w-[620px]">
        {/* Subtle highlight behind the portrait */}
        <div className="absolute inset-x-6 top-20 h-56 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_68%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 mx-auto h-[500px] w-full max-w-[520px] overflow-hidden lg:h-[600px] lg:max-w-[580px]">
          {hasImage ? (
            <Image
              alt="Retrato profissional do fundador"
              className="block h-full w-full object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.4)] mix-blend-luminosity opacity-90 transition-opacity hover:opacity-100"
              src="/founder-portrait.png"
              fill
              sizes="(max-width: 1024px) 520px, 580px"
              onError={() => setHasImage(false)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/30 text-muted-foreground shadow-sm">
                <UserRound className="size-7" />
              </span>
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Founder Area</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Coloque <span className="font-medium text-foreground">founder-portrait.png</span> em public para preencher.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
