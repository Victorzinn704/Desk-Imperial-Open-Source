'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'

const signals = [
  { label: 'Receita projetada', value: '+18.4%', tone: 'text-emerald-500 font-semibold' },
  { label: 'Margem média', value: '32.8%', tone: 'text-indigo-400 font-semibold' },
  { label: 'Risco sistêmico', value: 'Baixo', tone: 'text-sky-400 font-semibold' },
]

export function HeroFloatingCard() {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-5 shadow-2xl"
      transition={{ duration: 7, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }}
    >
      <CardContent />
    </motion.div>
  )
}

function CardContent() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Leitura em Tempo Real
          </p>
          <p className="mt-1.5 text-base font-semibold text-foreground tracking-tight">Painel Executivo</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-background/50 text-foreground">
          <ShieldCheck className="size-4" />
        </span>
      </div>

      <div className="mt-6 space-y-2">
        {signals.map((signal) => (
          <div
            className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-background/30 px-4 py-3"
            key={signal.label}
          >
            <span className="text-xs font-medium text-muted-foreground">{signal.label}</span>
            <span className={`text-[13px] ${signal.tone}`}>{signal.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border/40 bg-background/30 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Opções de Câmbio</p>
          <ArrowUpRight className="size-4 text-muted-foreground" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          {['BRL', 'USD', 'EUR'].map((chip) => (
            <span
              className="rounded-md border border-border/50 bg-background/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
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
