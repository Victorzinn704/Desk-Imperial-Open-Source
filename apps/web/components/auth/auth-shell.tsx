'use client'

import type { ReactNode } from 'react'
import { BrandMark } from '@/components/shared/brand-mark'

const trustMetrics = [
  { label: 'Uptime', value: '99.9%' },
  { label: 'Encriptação', value: 'AES-256' },
  { label: 'Conformidade', value: 'LGPD' },
]

const leftPanelBackdropStyle = {
  background: [
    'linear-gradient(180deg, rgba(6,7,10,0.98) 0%, rgba(10,12,16,0.96) 52%, rgba(4,5,7,1) 100%)',
    'radial-gradient(circle at 18% 18%, rgba(195,164,111,0.1) 0%, transparent 30%)',
    'radial-gradient(circle at 76% 22%, rgba(255,255,255,0.035) 0%, transparent 20%)',
    'radial-gradient(circle at 70% 76%, rgba(195,164,111,0.05) 0%, transparent 28%)',
  ].join(', '),
} as const

const leftPanelTextureStyle = {
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.012) 18%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 68%, rgba(255,255,255,0.016) 100%)',
} as const

export function AuthShell({
  eyebrow,
  title = 'Operação sob demanda.',
  description,
  contentWidthClass = 'max-w-[420px]',
  children,
}: Readonly<{
  eyebrow: string
  title?: string
  description: string
  contentWidthClass?: string
  children: ReactNode
}>) {
  return (
    <main className="min-h-screen bg-[#020304] text-white lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-14">
          <div aria-hidden className="pointer-events-none absolute inset-0" style={leftPanelBackdropStyle} />
          <div aria-hidden className="pointer-events-none absolute inset-0" style={leftPanelTextureStyle} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.08)_20%,rgba(255,255,255,0.08)_80%,transparent_100%)]"
          />

          <div className="relative">
            <BrandMark />
          </div>

          <div className="relative max-w-sm space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/32">{eyebrow}</p>

            <div className="space-y-3">
              <h1 className="text-[2.65rem] font-semibold leading-tight tracking-tight text-white">{title}</h1>
              <p className="max-w-md text-[13px] leading-6 text-white/44">{description}</p>
            </div>

            <div
              className="h-px"
              style={{ background: 'linear-gradient(90deg, rgba(195,164,111,0.28), transparent)' }}
            />

            <blockquote className="space-y-2">
              <p className="text-[13px] leading-6 text-white/38 italic">
                &ldquo;A excelência operacional não é um diferencial competitivo, é a fundação para escalar modelos de
                negócio complexos.&rdquo;
              </p>
              <footer className="text-xs text-white/24">
                Desk Imperial <span className="mx-1.5 opacity-50">·</span> Enterprise Suite
              </footer>
            </blockquote>
          </div>

          <div className="relative">
            <div className="flex items-center gap-5">
              {trustMetrics.map((metric, index) => (
                <div key={metric.label} className="flex items-center gap-5">
                  {index > 0 ? <span className="inline-block h-5 w-px bg-white/10" /> : null}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/22">
                      {metric.label}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-white/58">{metric.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02)_0%,transparent_38%),#020304] px-6 py-8 sm:px-10 lg:px-12 xl:px-14">
          <div className={`w-full ${contentWidthClass}`}>{children}</div>
        </section>
      </div>
    </main>
  )
}
