'use client'

import { BrandMark } from '@/components/shared/brand-mark'

export function AuthShell({
  eyebrow,
  description,
  children,
}: Readonly<{
  eyebrow: string
  title?: string
  description: string
  children: React.ReactNode
}>) {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* ── LADO ESQUERDO ── */}
        <aside className="relative hidden lg:flex lg:flex-col justify-between px-16 py-12 bg-black">
          <div>
            <BrandMark />
          </div>

          <div className="max-w-sm">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
              {eyebrow}
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              Operação sob demanda.
            </h1>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white/40">
              Controle em tempo real.
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/50">
              {description}
            </p>
          </div>

          <div className="max-w-sm">
            <p className="text-3xl font-light text-white/20 leading-none mb-3">"</p>
            <p className="text-sm leading-7 text-white/50 italic">
              "A excelência operacional não é um diferencial competitivo,
              é a fundação para escalar modelos de negócio complexos."
            </p>
            <p className="mt-4 text-xs text-white/30">
              Desk Imperial <span className="mx-1.5">•</span> Enterprise Suite
            </p>
          </div>
        </aside>

        {/* ── LADO DIREITO ── */}
        <section className="flex items-center justify-center bg-black px-8 py-12 sm:px-12 lg:px-16">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
