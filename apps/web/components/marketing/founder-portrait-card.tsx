'use client'

import { useState } from 'react'
import { ShieldCheck, UserRound } from 'lucide-react'

export function FounderPortraitCard() {
  const [hasImage, setHasImage] = useState(true)

  return (
    <div className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(18,22,27,0.96),rgba(11,13,16,0.92))] p-4 shadow-[var(--shadow-panel)]">
      <div className="relative overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[radial-gradient(circle_at_top,rgba(143,183,255,0.12),transparent_45%),linear-gradient(180deg,rgba(23,28,34,0.96),rgba(15,18,24,0.98))]">
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(212,177,106,0.2),transparent_62%)]" />

        {hasImage ? (
          <img
            alt="Retrato profissional do fundador"
            className="relative z-10 block h-[360px] w-full object-contain object-bottom"
            src="/founder-portrait.png"
            onError={() => setHasImage(false)}
          />
        ) : (
          <div className="relative z-10 flex h-[360px] flex-col items-center justify-center px-8 text-center">
            <span className="flex size-18 items-center justify-center rounded-[28px] border border-[var(--border-strong)] bg-[rgba(212,177,106,0.08)] text-[var(--accent)]">
              <UserRound className="size-8" />
            </span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Espaço do fundador
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Seu retrato profissional entra aqui.</h3>
            <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--text-soft)]">
              Para ativar, salve sua imagem em <span className="font-semibold text-[var(--text-primary)]">apps/web/public/founder-portrait.png</span>.
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-5 bottom-5 z-20 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(11,13,16,0.76)] p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(212,177,106,0.08)] text-[var(--accent)]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Liderança do projeto</p>
              <p className="mt-1 text-sm font-semibold text-white">DESK IMPERIAL</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
