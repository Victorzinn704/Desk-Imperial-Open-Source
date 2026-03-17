'use client'

import Link from 'next/link'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { BadgeDollarSign, ChartColumn, Landmark, Radar, Scale } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FounderPortraitCard } from '@/components/marketing/founder-portrait-card'
import { HeroFloatingCard } from '@/components/marketing/hero-floating-card'
import { BrandMark } from '@/components/shared/brand-mark'

const metrics = [
  { label: 'Operacao', value: 'Web e API integradas em um unico ambiente' },
  { label: 'Sessao segura', value: 'Cookie HttpOnly com controle de consentimento' },
  { label: 'Auditoria', value: 'Eventos essenciais registrados no sistema' },
]

const pillars = [
  {
    icon: ChartColumn,
    title: 'Operacao orientada a negocio',
    description: 'O ambiente centraliza vendas, produtos, financeiro e leitura operacional em uma unica experiencia.',
  },
  {
    icon: Radar,
    title: 'UX/UI premium',
    description: 'Linguagem visual escura, executiva e consistente para desktop e mobile.',
  },
]

const capabilityCards: Array<{
  icon: LucideIcon
  title: string
  description: string
}> = [
  {
    icon: BadgeDollarSign,
    title: 'Fluxo financeiro',
    description: 'Receita, custo, lucro e margem aparecem com leitura clara para a operacao diaria.',
  },
  {
    icon: Landmark,
    title: 'Gestao comercial',
    description: 'Produtos, pedidos, vendedores e estoque trabalham juntos em uma unica camada.',
  },
  {
    icon: ChartColumn,
    title: 'Leitura estatistica',
    description: 'Graficos, ranking e totais ajudam a identificar desempenho, volume e tendencia.',
  },
  {
    icon: Scale,
    title: 'Conformidade e controle',
    description: 'Sessao segura, consentimento, cookies e rastreabilidade ficam integrados ao portal.',
  },
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
              Plataforma empresarial
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
              Um portal pensado para operar vendas, cadastro, autenticacao, conformidade e leitura executiva em um
              fluxo continuo e seguro.
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
                  className="imperial-card-stat p-5"
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

            <div className="imperial-card relative z-10 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-soft)]">Status atual</span>
                <span className="rounded-full border border-[rgba(123,214,138,0.28)] bg-[rgba(123,214,138,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--success)]">
                  Em progresso
                </span>
              </div>

              <div className="mt-8 grid gap-4">
                {pillars.map((pillar) => (
                  <article className="imperial-card-soft p-5" key={pillar.title}>
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
              Estrutura central para uma rotina comercial organizada.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-soft)]">
              O ambiente combina autenticacao, controle operacional, produtos, pedidos e governanca em uma mesma
              camada de uso.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {capabilityCards.map((item) => (
              <div className="imperial-card-soft p-5 text-sm leading-7 text-[var(--text-soft)]" key={item.title}>
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-soft)] text-[var(--accent)]">
                  <item.icon className="size-4" />
                </div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-3">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-12" id="entregas">
        <div className="imperial-card p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Acesso principal</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Acesso rapido para cadastro, login e entrada no painel.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--text-soft)]">
                Os principais fluxos do portal ficam disponiveis logo na abertura da pagina para acelerar a entrada no
                sistema.
              </p>
            </div>

            <div className="imperial-card-soft px-5 py-4 text-sm leading-7 text-[var(--text-soft)] lg:max-w-md">
              Entre no portal ou crie sua conta sem precisar rolar a home inteira. O acesso principal fica no topo da
              experiencia.
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
