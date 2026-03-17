'use client'

import { motion } from 'framer-motion'
import { FileCheck2, LockKeyhole, Logs, ShieldCheck } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Sessao segura',
    description: 'Autenticacao baseada em cookie HttpOnly, sem token sensivel salvo no navegador.',
  },
  {
    icon: FileCheck2,
    title: 'LGPD e consentimento',
    description: 'Aceite versionado de documentos legais e gestao de preferencias de cookies.',
  },
  {
    icon: Logs,
    title: 'Trilha de auditoria',
    description: 'Eventos importantes sao pensados desde a base para rastreabilidade e governanca.',
  },
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
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)] lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.aside
          animate={{ opacity: 1, x: 0 }}
          className="imperial-card relative p-8"
          initial={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(143,183,255,0.14),transparent_55%)]" />
          <div className="relative z-10 flex h-full flex-col">
            <BrandMark />

            <div className="mt-16 max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{eyebrow}</p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
              <p className="mt-5 text-base leading-8 text-[var(--text-soft)]">{description}</p>
            </div>

            <div className="mt-12 grid gap-5">
              {highlights.map((item) => (
                <article className="imperial-card-soft p-5" key={item.title}>
                  <div className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(212,177,106,0.08)] text-[var(--accent)]">
                      <item.icon className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{item.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="imperial-card-soft mt-8 p-5 lg:mt-auto lg:pt-6">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
                  <LockKeyhole className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Acesso protegido</p>
                  <p className="text-sm text-[var(--text-soft)]">Area autenticada com foco em seguranca, controle e continuidade de sessao.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>

        <motion.section
          animate={{ opacity: 1, x: 0 }}
          className="imperial-card flex items-center justify-center p-5 lg:p-8"
          initial={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 }}
        >
          <div className="imperial-card-soft w-full max-w-xl p-6 sm:p-8">
            {children}
          </div>
        </motion.section>
      </div>
    </main>
  )
}
