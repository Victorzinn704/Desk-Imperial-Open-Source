'use client'

import { ShieldCheck } from 'lucide-react'

export function CompanySignatureCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-md">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.03),transparent_65%)]" />

      <div className="relative">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">Desk Imperial</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 tracking-wide">Plataforma SaaS</p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Operação comercial, visão executiva e controle empresarial construídos com base em uma arquitetura limpa e de alta performance.
        </p>

        <div className="mt-8 space-y-2 border-t border-border/50 pt-6">
          <p className="text-[11px] font-medium text-muted-foreground tracking-wider">app.deskimperial.online</p>
          <p className="text-[11px] font-medium text-muted-foreground tracking-wider">© 2026 Desk Imperial</p>
        </div>
      </div>
    </div>
  )
}
