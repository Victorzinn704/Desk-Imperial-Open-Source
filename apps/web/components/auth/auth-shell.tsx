'use client'

import { motion } from 'framer-motion'
import {
  CalendarDays,
  Lock,
  ShieldCheck,
  Tags,
  TrendingUp,
  Users,
} from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'

const features = [
  { icon: TrendingUp, label: 'Financeiro em tempo real', description: 'Receita, lucro e margem num único painel.' },
  { icon: Tags, label: 'PDV / Comandas Kanban', description: 'Gerencie pedidos com drag-and-drop.' },
  { icon: CalendarDays, label: 'Calendário Comercial', description: 'Planeje eventos, promoções e jogos.' },
  { icon: Users, label: 'Folha de Pagamento', description: 'Salário base + comissão por funcionário.' },
  { icon: ShieldCheck, label: 'Admin PIN + Segurança', description: 'Proteja ações sensíveis com PIN de 4 dígitos.' },
]

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: Readonly<{
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}>) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.aside
          animate={{ opacity: 1, x: 0 }}
          className="imperial-card relative hidden p-6 lg:flex lg:flex-col"
          initial={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgb(143_183_255/0.14),transparent_55%)]" />
          <div className="relative z-10 flex h-full flex-col">
            <BrandMark />

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>

            <div className="mt-6 space-y-2">
              {features.map((f) => (
                <div
                  className="flex items-center gap-2 rounded-[12px] border border-white/5 bg-white/[0.02] px-3 py-2"
                  key={f.label}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                    <f.icon className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4">
              <div className="imperial-card-soft flex items-center gap-2 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-accent/10">
                  <Lock className="size-3.5 text-accent" />
                </span>
                <p className="text-xs text-muted-foreground">
                  Sessão protegida com cookie HttpOnly + CSRF Guard.
                </p>
              </div>
            </div>
          </div>
        </motion.aside>

        <motion.section
          animate={{ opacity: 1, x: 0 }}
          className="imperial-card flex items-center justify-center p-4 lg:p-6"
          initial={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 }}
        >
          <div className="imperial-card-soft w-full max-w-lg p-5 sm:p-6">
            {children}
          </div>
        </motion.section>
      </div>
    </main>
  )
}
