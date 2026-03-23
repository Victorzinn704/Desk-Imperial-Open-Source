'use client'

import { BrandMark } from '@/components/shared/brand-mark'

const trustMetrics = [
  { label: 'Uptime', value: '99.9%' },
  { label: 'Encriptação', value: 'AES-256' },
  { label: 'Conformidade', value: 'LGPD' },
]

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

        {/* ── LEFT PANEL ── */}
        <aside className="relative hidden lg:flex lg:flex-col lg:justify-between overflow-hidden px-16 py-12 bg-[#050810]">

          {/* Radial gradient orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: [
                'radial-gradient(circle at 20% 20%, rgba(195,164,111,0.12) 0%, transparent 45%)',
                'radial-gradient(circle at 80% 80%, rgba(90,149,196,0.10) 0%, transparent 45%)',
                'radial-gradient(circle at 50% 50%, rgba(8,11,20,0.96) 0%, transparent 80%)',
              ].join(', '),
            }}
          />

          {/* Subtle grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage: [
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
                'linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              ].join(', '),
              backgroundSize: '64px 64px',
            }}
          />

          {/* Top: brand */}
          <div className="relative">
            <BrandMark />
          </div>

          {/* Center: hero copy */}
          <div className="relative max-w-sm space-y-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
              {eyebrow}
            </p>

            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
                Operação sob demanda.
              </h1>
              <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white/35">
                Controle em tempo real.
              </h2>
            </div>

            <p className="text-sm leading-7 text-white/45">
              {description}
            </p>

            {/* Divider */}
            <div
              className="h-px"
              style={{ background: 'linear-gradient(90deg, rgba(195,164,111,0.35), transparent)' }}
            />

            {/* Quote */}
            <blockquote className="space-y-2">
              <p className="text-sm leading-7 text-white/40 italic">
                "A excelência operacional não é um diferencial competitivo,
                é a fundação para escalar modelos de negócio complexos."
              </p>
              <footer className="text-xs text-white/25">
                Desk Imperial <span className="mx-1.5 opacity-50">·</span> Enterprise Suite
              </footer>
            </blockquote>
          </div>

          {/* Bottom: trust metrics */}
          <div className="relative">
            <div className="flex items-center gap-6">
              {trustMetrics.map((metric, i) => (
                <div key={metric.label}>
                  {i > 0 && (
                    <span className="mr-6 inline-block h-5 w-px bg-white/10" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white/25 uppercase tracking-[0.18em]">{metric.label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-white/60">{metric.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <section className="flex items-center justify-center bg-black px-8 py-12 sm:px-12 lg:px-16">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
