'use client'

import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'

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

            <div className="mt-auto">
              <div className="imperial-card-soft flex items-center gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[rgba(201,168,76,0.08)]">
                  <Lock className="size-4 text-[var(--accent)]" />
                </span>
                <div className="text-sm text-[var(--text-soft)]">
                  Seu acesso é protegido com segurança em camadas.
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
