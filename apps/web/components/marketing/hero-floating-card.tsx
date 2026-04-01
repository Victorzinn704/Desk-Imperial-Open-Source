'use client'

import { LazyMotionDiv as MotionDiv } from '@/components/shared/lazy-components'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'

const signals = [
  { label: 'Receita do mês', value: '+18.4%', tone: 'text-[var(--success)]' },
  { label: 'Margem média', value: '32.8%', tone: 'text-[var(--accent-strong)]' },
  { label: 'Situação geral', value: 'Controlado', tone: 'text-[var(--info)]' },
]

export function HeroFloatingCard() {
  return (
    <MotionDiv
      animate={{ y: [0, -8, 0] }}
      className="imperial-card-soft p-4 backdrop-blur-xl"
      transition={{ duration: 6.5, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
    >
      <CardContent />
    </MotionDiv>
  )
}

function CardContent() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Ao vivo agora</p>
          <p className="mt-2 text-lg font-semibold text-white">Resumo do negócio</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(123,214,138,0.08)] text-[var(--success)]">
          <ShieldCheck className="size-4" />
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {signals.map((signal) => (
          <div className="imperial-card-stat px-4 py-3" key={signal.label}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-[var(--text-soft)]">{signal.label}</span>
              <span className={`text-sm font-semibold ${signal.tone}`}>{signal.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="imperial-card-stat mt-5 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Moedas</p>
          <ArrowUpRight className="size-4 text-[var(--accent)]" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          {['BRL', 'USD', 'EUR'].map((chip) => (
            <span
              className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]"
              key={chip}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
