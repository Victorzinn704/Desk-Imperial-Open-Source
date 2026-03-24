'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Circle, TrendingUp } from 'lucide-react'

const kanbanColumns = [
  {
    label: 'Aberto',
    count: 3,
    color: 'var(--info)',
    items: ['Mesa 4 — R$ 142', 'Mesa 7 — R$ 98'],
  },
  {
    label: 'Em preparo',
    count: 2,
    color: 'var(--accent)',
    items: ['Mesa 2 — R$ 280'],
  },
]

export function DashboardPreviewCard() {
  return (
    <div className="relative">
      {/* Glow behind card */}
      <div className="pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-[radial-gradient(circle_at_60%_40%,rgba(195,164,111,0.10),transparent_65%)]" />

      <div className="imperial-card-preview relative overflow-hidden rounded-[1.75rem] border border-[rgba(180,190,200,0.08)] bg-[rgba(9,11,15,0.97)]">
        {/* Simulated topbar */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Circle className="size-2.5 fill-[var(--accent)] text-[var(--accent)]" />
            <span className="text-xs font-semibold tracking-wide text-[var(--text-primary)]">Desk Imperial</span>
          </div>
          <span className="rounded-full border border-[rgba(195,164,111,0.28)] bg-[rgba(195,164,111,0.10)] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Ao vivo
          </span>
        </div>

        {/* Revenue KPI */}
        <div className="border-b border-[rgba(255,255,255,0.05)] px-5 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Receita do dia</p>
          <div className="mt-1.5 flex items-end justify-between">
            <span className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">R$ 42.800</span>
            <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-[var(--success)]">
              <TrendingUp className="size-3.5" />
              +12%
            </span>
          </div>
          {/* Sparkline bars */}
          <div className="mt-3 flex items-end gap-1">
            {[28, 42, 35, 56, 48, 62, 58, 71, 65, 80, 72, 88].map((h, i) => (
              <div
                className="flex-1 rounded-sm bg-[var(--accent)] opacity-[0.35]"
                key={i}
                style={{ height: `${h * 0.24}px` }}
              />
            ))}
            <div className="flex-1 rounded-sm bg-[var(--accent)]" style={{ height: `${88 * 0.24}px` }} />
          </div>
        </div>

        {/* Mini PDV Kanban */}
        <div className="grid grid-cols-2 gap-px bg-[rgba(255,255,255,0.04)] p-px">
          {kanbanColumns.map((col) => (
            <div className="bg-[rgba(9,11,15,0.97)] p-4" key={col.label}>
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em]" style={{ color: col.color }}>
                  {col.label}
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold"
                  style={{ background: `${col.color}18`, color: col.color }}
                >
                  {col.count}
                </span>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {col.items.map((item) => (
                  <div
                    className="rounded-lg border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-[0.7rem] text-[var(--text-soft)]"
                    key={item}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating chip — última venda */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        className="absolute -bottom-4 left-6 flex items-center gap-2.5 rounded-2xl border border-[rgba(195,164,111,0.22)] bg-[rgba(9,11,15,0.96)] px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.38)] backdrop-blur-sm"
        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
      >
        <ArrowUpRight className="size-4 text-[var(--success)]" />
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Última venda</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">R$ 280,00</p>
        </div>
      </motion.div>
    </div>
  )
}
