'use client'

import Link from 'next/link'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  BadgeDollarSign,
  ChartColumn,
  Globe2,
  Landmark,
  Radar,
  Scale,
  ShieldCheck,
  Waypoints,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CompanySignatureCard } from '@/components/marketing/company-signature-card'
import { FounderPortraitCard } from '@/components/marketing/founder-portrait-card'
import { HeroFloatingCard } from '@/components/marketing/hero-floating-card'
import { InteractionFlowCard } from '@/components/marketing/interaction-flow-card'
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

const footerColumns = [
  {
    title: 'Plataforma',
    links: [
      { label: 'Cadastro', href: '/cadastro' },
      { label: 'Login', href: '/login' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Ambientes',
    links: [
      { label: 'app.deskimperial.online', href: 'https://app.deskimperial.online' },
      { label: 'api.deskimperial.online', href: 'https://api.deskimperial.online/api/health' },
    ],
  },
  {
    title: 'Capacidades',
    links: [
      { label: 'Pedidos multi-item', href: '#fundacao' },
      { label: 'Portfolio inteligente', href: '#fundacao' },
      { label: 'Controle operacional', href: '#entregas' },
    ],
  },
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
          className="absolute inset-0 bg-cover bg-center opacity-[0.16]"
          style={{ backgroundImage: "url('/founder-portrait.jpg')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,14,0.94),rgba(7,13,24,0.84)_28%,rgba(7,13,24,0.9)_58%,rgba(4,8,14,0.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(31,91,160,0.2),transparent_24%),radial-gradient(circle_at_top_right,rgba(212,177,106,0.08),transparent_20%)]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-12">
        <header className="imperial-topbar">
          <div className="imperial-card-soft imperial-topbar__shell flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <BrandMark />
              <div className="hidden items-center gap-2 rounded-full border border-[rgba(119,201,255,0.16)] bg-[rgba(119,201,255,0.08)] px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--info)] lg:inline-flex">
                <Globe2 className="size-3.5" />
                app.deskimperial.online
              </div>
            </div>

            <nav className="hidden items-center gap-3 md:flex">
              <Link className="text-sm text-[var(--text-soft)] transition hover:text-[var(--text-primary)]" href="#fundacao">
                Fundacao
              </Link>
              <Link className="text-sm text-[var(--text-soft)] transition hover:text-[var(--text-primary)]" href="#entregas">
                Entregas
              </Link>
              <Link className="text-sm text-[var(--text-soft)] transition hover:text-[var(--text-primary)]" href="#rodape">
                Estrutura
              </Link>
            </nav>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--accent)] hover:scale-[1.04] hover:shadow-[0_0_14px_rgba(155,132,96,0.22)] active:scale-95"
                href="/login"
              >
                Entrar
              </Link>
              <Link
                className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-5 py-4 text-center text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[rgba(255,255,255,0.05)]"
                href="/dashboard"
              >
                Abrir painel
              </Link>
            </div>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <span className="inline-flex rounded-full border border-[var(--border-strong)] bg-[rgba(14,28,45,0.78)] px-4 py-2 text-sm font-medium text-[var(--text-muted)]">
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
              {metrics.map((metric, index) => (
                <div
                  className={
                    index === 1
                      ? 'imperial-card-tilt-alt p-5'
                      : index === 2
                        ? 'imperial-card-tilt p-5'
                        : 'imperial-card-stat p-5'
                  }
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

            <div className="imperial-card relative z-10 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-soft)]">Status atual</span>
                <span className="rounded-full border border-[rgba(123,214,138,0.28)] bg-[rgba(123,214,138,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--success)]">
                  Em progresso
                </span>
              </div>

              <div className="mt-8 grid gap-4">
                {pillars.map((pillar, index) => (
                  <article className={index % 2 === 0 ? 'imperial-card-soft p-5' : 'imperial-card-tilt p-5'} key={pillar.title}>
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{pillar.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{pillar.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <HeroFloatingCard />
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 border-y border-[var(--border)] bg-[rgba(8,15,26,0.88)]" id="fundacao">
        <div className="absolute inset-0 overflow-hidden">
          <img
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-[0.045]"
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=60&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,11,14,0.6),rgba(8,11,14,0.2)_40%,rgba(8,11,14,0.7))]" />
        </div>
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
            {capabilityCards.map((item, index) => (
              <div
                className={`${index % 2 === 0 ? 'imperial-card-tilt' : 'imperial-card-tilt-alt'} p-5 text-sm leading-7 text-[var(--text-soft)]`}
                key={item.title}
              >
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
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-[1.75rem]">
            <img
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.04]"
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=60&auto=format&fit=crop"
            />
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

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="imperial-card-tilt p-5">
                <div className="flex items-center gap-3">
                  <Waypoints className="size-5 text-[var(--info)]" />
                  <p className="text-sm font-semibold text-white">Fluxo continuo</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  Da autenticacao ate a venda registrada, o caminho fica organizado em poucas etapas.
                </p>
              </div>

              <div className="imperial-card-tilt-alt p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-5 text-[var(--accent)]" />
                  <p className="text-sm font-semibold text-white">Governanca visivel</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  Sessao, consentimento e rastreabilidade aparecem sem ficar escondidos no produto.
                </p>
              </div>

              <div className="imperial-card-soft p-5">
                <div className="flex items-center gap-3">
                  <Globe2 className="size-5 text-[#8fffb9]" />
                  <p className="text-sm font-semibold text-white">Dominio proprio</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  O ambiente ja responde em dominio proprio, pronto para evoluir como produto de verdade.
                </p>
              </div>
            </div>
          </div>
          </div>

          <InteractionFlowCard />
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--border)] bg-[rgba(5,11,20,0.9)]" id="rodape">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-12">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr_0.85fr_0.85fr]">
            <CompanySignatureCard />

            {footerColumns.map((group) => (
              <div className="imperial-card-soft p-6" key={group.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  {group.title}
                </p>
                <div className="mt-5 space-y-3">
                  {group.links.map((link) => (
                    <Link
                      className="block text-sm leading-7 text-[var(--text-soft)] transition hover:text-white"
                      href={link.href}
                      key={link.label}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-[rgba(255,255,255,0.06)] pt-6 text-sm text-[var(--text-soft)] md:flex-row md:items-center md:justify-between">
            <p>DESK IMPERIAL © 2026. Plataforma comercial com leitura executiva, portfolio e conformidade.</p>
            <div className="flex flex-wrap gap-4">
              <Link className="transition hover:text-white" href="https://app.deskimperial.online">
                app.deskimperial.online
              </Link>
              <Link className="transition hover:text-white" href="https://api.deskimperial.online/api/health">
                api.deskimperial.online
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
