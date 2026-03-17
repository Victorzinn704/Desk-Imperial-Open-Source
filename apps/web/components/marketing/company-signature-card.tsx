'use client'

import { ShieldCheck } from 'lucide-react'

export function CompanySignatureCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_28px_60px_rgba(0,0,0,0.36)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(155,132,96,0.07),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,40,55,0.5),transparent_60%)]" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(155,132,96,0.28)] bg-[rgba(155,132,96,0.09)] text-[var(--accent)]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Desk Imperial</p>
            <p className="text-[11px] text-[var(--text-soft)]">Portal empresarial</p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-7 text-[var(--text-soft)]">
          Operação comercial, visão executiva e controle empresarial em uma camada única e segura.
        </p>

        <div className="mt-6 space-y-2 border-t border-[var(--border)] pt-5">
          <p className="text-xs text-[var(--text-muted)]">app.deskimperial.online</p>
          <p className="text-xs text-[var(--text-muted)]">© 2026 Desk Imperial</p>
        </div>
      </div>
    </div>
  )
}
