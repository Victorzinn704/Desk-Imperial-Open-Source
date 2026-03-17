'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'

const signals = [
  { label: 'Receita prevista', value: '+18.4%', tone: 'text-[var(--success)]' },
  { label: 'Margem media', value: '32.8%', tone: 'text-[var(--accent-strong)]' },
  { label: 'Risco operacional', value: 'Controlado', tone: 'text-[var(--info)]' },
]

export function HeroFloatingCard() {
  return (
    <>
      <motion.aside
        animate={{ x: [0, -34, -10, -26, 0], y: [0, -10, 0], rotate: [0, -0.65, 0.35, 0] }}
        className="imperial-card-soft pointer-events-none absolute top-[2.35rem] z-10 hidden w-[248px] p-4 backdrop-blur-xl lg:block xl:top-[2rem] xl:w-[264px]"
        style={{ right: 'calc((100vw - min(100vw, 80rem)) / -2 - 4.1rem)' }}
        transition={{ duration: 10.2, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
      >
        <CardContent compact={false} />
      </motion.aside>

      <div className="lg:hidden">
        <div className="imperial-card-soft p-3.5 backdrop-blur-xl">
          <CardContent compact />
        </div>
      </div>
    </>
  )
}

function CardContent({ compact }: Readonly<{ compact: boolean }>) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            Leitura ao vivo
          </p>
          <p className={`mt-2 font-semibold text-white ${compact ? 'text-base' : 'text-lg'}`}>Pulso executivo</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(123,214,138,0.08)] text-[var(--success)]">
          <ShieldCheck className="size-4" />
        </span>
      </div>

      <div className={`space-y-3 ${compact ? 'mt-4' : 'mt-5'}`}>
        {signals.map((signal, index) => (
          <motion.div
            animate={{ opacity: [0.72, 1, 0.72], x: [0, 3, 0] }}
            className="imperial-card-stat px-4 py-3"
            key={signal.label}
            transition={{
              duration: 4.2,
              delay: index * 0.45,
              ease: 'easeInOut',
              repeat: Number.POSITIVE_INFINITY,
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-[var(--text-soft)]">{signal.label}</span>
              <span className={`text-sm font-semibold ${signal.tone}`}>{signal.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={`imperial-card-stat px-4 py-4 ${compact ? 'mt-4' : 'mt-5'}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Moedas</p>
          <ArrowUpRight className="size-4 text-[var(--accent)]" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          {['BRL', 'USD', 'EUR'].map((chip, index) => (
            <motion.span
              animate={{ y: [0, -2, 0] }}
              className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]"
              key={chip}
              transition={{
                duration: 2.8,
                delay: index * 0.18,
                ease: 'easeInOut',
                repeat: Number.POSITIVE_INFINITY,
              }}
            >
              {chip}
            </motion.span>
          ))}
        </div>
      </div>
    </>
  )
}
