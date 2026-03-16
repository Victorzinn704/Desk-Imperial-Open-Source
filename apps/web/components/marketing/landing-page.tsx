'use client'

import Link from 'next/link'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ChartColumn, Radar, ScrollText } from 'lucide-react'
import { FounderPortraitCard } from '@/components/marketing/founder-portrait-card'
import { HeroFloatingCard } from '@/components/marketing/hero-floating-card'
import { BrandMark } from '@/components/shared/brand-mark'

const metrics = [
  { label: 'Tempo de base', value: 'Monorepo pronto para web e API' },
  { label: 'Sessao segura', value: 'Cookie HttpOnly com consentimento versionado' },
  { label: 'Observabilidade', value: 'Auditoria e logs pensados desde o inicio' },
]

const pillars = [
  {
    icon: ChartColumn,
    title: 'Produto orientado a negocio',
    description: 'A arquitetura ja nasce preparada para dashboard, produtos, financeiro e operacao do cliente.',
  },
  {
    icon: Radar,
    title: 'UX/UI premium',
    description: 'Linha visual dark neutral premium para fugir de template generico e posicionar melhor o portfolio.',
  },
]

const deliverables = [
  'Home institucional com linguagem de SaaS premium',
  'Login e cadastro conectados a uma API segura',
  'Dashboard inicial com sessao e preferencias de consentimento',
  'Base pronta para produtos, financeiro, mapa e pendencias',
]

const heroLines = [
  'Portal empresarial moderno',
  'para operar com seguranca,',
  'controle e identidade forte.',
]

export function LandingPage() {
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)

  const rotateX = useSpring(useTransform(pointerY, [-1, 1], [3, -3]), {
    stiffness: 120,
    damping: 20,
    mass: 0.6,
  })
  const rotateY = useSpring(useTransform(pointerX, [-1, 1], [-5, 5]), {
    stiffness: 120,
    damping: 20,
    mass: 0.6,
  })

  const primaryShift = useSpring(useTransform(pointerX, [-1, 1], [-16, 16]), {
    stiffness: 90,
    damping: 16,
    mass: 0.8,
  })
  const secondaryShift = useSpring(useTransform(pointerX, [-1, 1], [-10, 10]), {
    stiffness: 90,
    damping: 16,
    mass: 0.8,
  })
  const tertiaryShift = useSpring(useTransform(pointerX, [-1, 1], [-6, 6]), {
    stiffness: 90,
    damping: 16,
    mass: 0.8,
  })

  const lineShifts = [primaryShift, secondaryShift, tertiaryShift]

  const handleHeroPointerMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1

    pointerX.set(x)
    pointerY.set(y)
  }

  const handleHeroPointerLeave = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.22]"
          style={{ backgroundImage: "url('/founder-portrait.jpg')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,12,0.92),rgba(11,13,16,0.78)_28%,rgba(11,13,16,0.88)_58%,rgba(11,13,16,0.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,177,106,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(143,183,255,0.12),transparent_20%)]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-12">
        <header className="flex items-center justify-between gap-4 rounded-full border border-[var(--border)] bg-[rgba(18,22,27,0.78)] px-5 py-3 backdrop-blur">
          <BrandMark />
          <nav className="hidden items-center gap-3 md:flex">
            <Link className="text-sm text-[var(--text-soft)] transition hover:text-[var(--text-primary)]" href="#fundacao">
              Fundacao
            </Link>
            <Link className="text-sm text-[var(--text-soft)] transition hover:text-[var(--text-primary)]" href="#entregas">
              Entregas
            </Link>
            <Link className="text-sm text-[var(--text-soft)] transition hover:text-[var(--text-primary)]" href="/dashboard">
              Dashboard
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <span className="inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium text-[var(--text-muted)]">
              Projeto em fase de Testes
            </span>

            <motion.div
              animate="visible"
              className="mt-8 space-y-1 sm:space-y-2"
              initial="hidden"
              style={{ rotateX, rotateY, transformPerspective: 1200 }}
              onMouseLeave={handleHeroPointerLeave}
              onMouseMove={handleHeroPointerMove}
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.26,
                    delayChildren: 0.26,
                  },
                },
              }}
            >
              {heroLines.map((line, index) => (
                <motion.span
                  className="block origin-left text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl"
                  key={line}
                  style={{ x: lineShifts[index] }}
                  whileHover={{
                    scale: 1.015,
                    x: index === 0 ? 10 : index === 1 ? 8 : 6,
                    filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.22))',
                  }}
                  variants={{
                    hidden: { opacity: 0, y: -52, filter: 'blur(16px)' },
                    visible: {
                      opacity: 1,
                      y: 0,
                      filter: 'blur(0px)',
                      transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                >
                  <span className="text-flag-brazil">{line}</span>
                </motion.span>
              ))}
            </motion.div>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-soft)]">
              A base atual do sistema ja une monorepo, Next.js, NestJS, autenticacao segura, consentimento LGPD,
              logs de auditoria e uma linguagem visual dark neutral premium pronta para crescer.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link className="rainbow-hover hero-entry-button w-full sm:w-auto" href="/cadastro">
                <span className="sp">Cadastrar-se</span>
              </Link>
              <Link className="rainbow-hover hero-entry-button w-full sm:w-auto" href="/login">
                <span className="sp">Login</span>
              </Link>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]"
                  key={metric.label}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">{metric.label}</p>
                  <p className="mt-3 text-base leading-7 text-[var(--text-primary)]">{metric.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="relative space-y-4 pt-[17rem] sm:space-y-5 sm:pt-[18.5rem] lg:space-y-6 lg:pt-[22.5rem]"
              initial={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            >
            <FounderPortraitCard />
            <HeroFloatingCard />

            <div className="relative z-10 rounded-[36px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(18,22,27,0.95),rgba(11,13,16,0.95))] p-6 shadow-[var(--shadow-panel-strong)]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-soft)]">Status atual</span>
                <span className="rounded-full border border-[rgba(123,214,138,0.28)] bg-[rgba(123,214,138,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--success)]">
                  Em progresso
                </span>
              </div>

              <div className="mt-8 grid gap-4">
                {pillars.map((pillar) => (
                  <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5" key={pillar.title}>
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{pillar.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{pillar.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 border-y border-[var(--border)] bg-[rgba(18,22,27,0.74)]" id="fundacao">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Fundacao</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              O sistema ja tem uma base melhor que muito CRUD de portfolio.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-soft)]">
              A arquitetura ja contempla sessao segura por cookie, consentimento versionado, auditoria, Prisma,
              monorepo e separacao clara entre front e API.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {deliverables.map((item) => (
              <div
                className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-7 text-[var(--text-soft)] shadow-[var(--shadow-panel)]"
                key={item}
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-soft)] text-[var(--accent)]">
                  <ScrollText className="size-4" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-12" id="entregas">
        <div className="rounded-[36px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(18,22,27,0.96),rgba(14,17,22,0.96))] p-8 shadow-[var(--shadow-panel-strong)] lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Proximo marco</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Testes estao sendo utilizados para melhorar o sistema de implementacao do projeto.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--text-soft)]">
                Cada ajuste desta fase busca deixar a experiencia mais estavel, intuitiva e preparada para a proxima
                rodada de recursos do portal.
              </p>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-5 py-4 text-sm leading-7 text-[var(--text-soft)] lg:max-w-md">
              Os acessos principais ja ficam no topo da pagina inicial para facilitar testes de cadastro e login sem
              precisar rolar ate o fim do site.
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
