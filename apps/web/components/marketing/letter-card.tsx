'use client'

import { useState } from 'react'
import { Crown } from 'lucide-react'

export function LetterCard() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex w-full items-center justify-center py-4">
      <div
        aria-label={isOpen ? 'Fechar carta' : 'Abrir carta'}
        className={`group relative mx-auto flex w-full max-w-[900px] cursor-pointer items-center justify-center overflow-visible transition-all duration-700 ${isOpen ? 'aspect-[16/5]' : 'aspect-[16/8]'}`}
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {setIsOpen((v) => !v)}
        }}
      >
        {/* ── Carta interna (abre ao hover/click) ─────────────────────── */}
        <div
          className={`absolute inset-0 flex w-full flex-col items-center justify-center rounded-sm border border-[rgba(195,164,111,0.18)] bg-[#1a1d24] px-8 py-8 transition-all sm:px-16 sm:py-12 ${
            isOpen
              ? '-translate-y-[6rem] duration-700 sm:-translate-y-[8rem]'
              : 'translate-y-0 duration-300 group-hover:-translate-y-[6rem] group-hover:duration-1000 sm:group-hover:-translate-y-[8rem]'
          }`}
        >
          <p className="font-serif text-lg font-semibold tracking-[0.08em] text-[var(--accent)]">
            Obrigado por chegar até aqui.
          </p>
          <p className="mt-4 max-w-lg text-center text-sm leading-7 text-[var(--text-soft)]">
            A Desk Imperial foi feita para o comerciante brasileiro que trabalha muito e merece um sistema que facilite
            a vida.
          </p>
          <p className="mt-2 max-w-lg text-center text-sm leading-7 text-[var(--text-soft)]">
            Que você nunca perca uma venda, nunca fique sem saber o que está acontecendo, e que seu negócio cresça com
            tranquilidade.
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-[var(--accent)] opacity-60">
            — Desk Imperial
          </p>
        </div>

        {/* ── Selo central ──────────────────────────────────────────────── */}
        <div
          className={`seal z-40 flex aspect-square w-10 items-center justify-center rounded-full border-2 border-[rgba(195,164,111,0.5)] bg-gradient-to-br from-[rgba(195,164,111,0.9)] to-[rgba(155,132,96,0.8)] shadow-[0_0_16px_rgba(195,164,111,0.4)] [clip-path:polygon(50%_0%,_80%_10%,_100%_35%,_100%_70%,_80%_90%,_50%_100%,_20%_90%,_0%_70%,_0%_35%,_20%_10%)] transition-all duration-1000 ${
            isOpen
              ? 'scale-0 rotate-180 opacity-0'
              : 'scale-100 rotate-0 opacity-100 group-hover:scale-0 group-hover:rotate-180 group-hover:opacity-0'
          }`}
        >
          <Crown className="size-4 text-[#0d0e12]" />
        </div>

        {/* ── Faces do envelope ─────────────────────────────────── */}
        {/* Tampa (topo triangular — abre ao hover/click) */}
        <div
          className={`tp absolute h-full w-full bg-[#0e1018] transition-all duration-1000 ${
            isOpen
              ? '[clip-path:polygon(50%_0%,_100%_0,_0_0)]'
              : '[clip-path:polygon(50%_50%,_100%_0,_0_0)] group-hover:[clip-path:polygon(50%_0%,_100%_0,_0_0)] group-hover:duration-100'
          }`}
        />
        {/* Lateral esquerda */}
        <div className="lft absolute h-full w-full bg-[#090b10] [clip-path:polygon(50%_50%,_0_0,_0_100%)] transition-all duration-700" />
        {/* Lateral direita */}
        <div className="rgt absolute h-full w-full bg-[#0e1018] [clip-path:polygon(50%_50%,_100%_0,_100%_100%)] transition-all duration-700" />
        {/* Base */}
        <div className="btm absolute h-full w-full bg-[#090b10] [clip-path:polygon(50%_50%,_100%_100%,_0_100%)] transition-all duration-700" />

        {/* Borda dourada sutil no envelope */}
        <div className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-[rgba(195,164,111,0.12)]" />

        {/* Hint mobile — some on small screens */}
        {!isOpen && (
          <span className="absolute bottom-2 right-3 text-[9px] uppercase tracking-[0.2em] text-[rgba(195,164,111,0.35)] sm:hidden">
            toque para abrir
          </span>
        )}
      </div>
    </div>
  )
}
