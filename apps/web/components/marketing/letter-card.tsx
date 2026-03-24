'use client'

import { Crown } from 'lucide-react'

export function LetterCard() {
  return (
    <div className="flex items-center justify-center w-full h-full py-4">
      <div className="relative w-full max-w-[380px] group transition-all duration-700 aspect-video flex items-center justify-center mx-auto">

        {/* ── Carta interna (abre ao hover) ─────────────────────── */}
        <div className="transition-all flex flex-col items-center py-6 justify-start duration-300 group-hover:duration-1000 bg-[#1a1d24] border border-[rgba(195,164,111,0.18)] w-full h-full absolute group-hover:-translate-y-[4.5rem] rounded-sm">
          <p className="text-base font-semibold tracking-[0.08em] text-[var(--accent)] font-serif">
            Obrigado
          </p>
          <p className="px-8 mt-2 text-[11px] leading-5 text-center text-[var(--text-soft)]">
            É muito especial que você tenha dedicado seu tempo para conhecer a Desk Imperial.
          </p>
          <p className="px-8 mt-1 text-[11px] leading-5 text-center text-[var(--text-soft)]">
            Que sua operação cresça cada vez mais — com clareza, controle e identidade.
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[var(--accent)] opacity-60">
            — Desk Imperial
          </p>
        </div>

        {/* ── Selo central ──────────────────────────────────────── */}
        <div className="seal z-40 flex items-center justify-center w-10 aspect-square rounded-full bg-gradient-to-br from-[rgba(195,164,111,0.9)] to-[rgba(155,132,96,0.8)] border-2 border-[rgba(195,164,111,0.5)] shadow-[0_0_16px_rgba(195,164,111,0.4)] [clip-path:polygon(50%_0%,_80%_10%,_100%_35%,_100%_70%,_80%_90%,_50%_100%,_20%_90%,_0%_70%,_0%_35%,_20%_10%)] group-hover:opacity-0 transition-all duration-1000 group-hover:scale-0 group-hover:rotate-180">
          <Crown className="size-4 text-[#0d0e12]" />
        </div>

        {/* ── Faces do envelope ─────────────────────────────────── */}
        {/* Tampa (topo triangular — abre ao hover) */}
        <div className="tp transition-all duration-1000 group-hover:duration-100 bg-[#1e222c] absolute group-hover:[clip-path:polygon(50%_0%,_100%_0,_0_0)] w-full h-full [clip-path:polygon(50%_50%,_100%_0,_0_0)]" />
        {/* Lateral esquerda */}
        <div className="lft transition-all duration-700 absolute w-full h-full bg-[#181b24] [clip-path:polygon(50%_50%,_0_0,_0_100%)]" />
        {/* Lateral direita */}
        <div className="rgt transition-all duration-700 absolute w-full h-full bg-[#1e222c] [clip-path:polygon(50%_50%,_100%_0,_100%_100%)]" />
        {/* Base */}
        <div className="btm transition-all duration-700 absolute w-full h-full bg-[#181b24] [clip-path:polygon(50%_50%,_100%_100%,_0_100%)]" />

        {/* Borda dourada sutil no envelope */}
        <div className="absolute inset-0 rounded-sm ring-1 ring-[rgba(195,164,111,0.12)] pointer-events-none" />
      </div>
    </div>
  )
}
