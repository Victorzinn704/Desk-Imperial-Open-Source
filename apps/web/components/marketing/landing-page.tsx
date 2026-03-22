'use client'

import Link from 'next/link'
import type { MouseEvent as ReactMouseEvent } from 'react'
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import {
  BadgeDollarSign,
  ChartColumn,
  Globe2,
  Landmark,
  Radar,
  Scale,
  ShieldCheck,
  Waypoints,
  ArrowRight
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CompanySignatureCard } from '@/components/marketing/company-signature-card'
import { FounderPortraitCard } from '@/components/marketing/founder-portrait-card'
import { HeroFloatingCard } from '@/components/marketing/hero-floating-card'
import { InteractionFlowCard } from '@/components/marketing/interaction-flow-card'
import { BrandMark } from '@/components/shared/brand-mark'

const metrics = [
  { label: 'Seus números', value: 'Métricas de vendas, lucro e desempenho em um único lugar.' },
  { label: 'Seu controle', value: 'Produtos, pedidos, vendedores e estoque meticulosamente organizados.' },
  { label: 'Sua clareza', value: 'Relatórios avançados e insights de alto impacto gerencial.' },
]

const pillars = [
  {
    icon: ChartColumn,
    title: 'Engenharia Operacional',
    description: 'Venda, gerencie fluxo de caixa e supervisione o dia de forma incrivelmente rápida.',
  },
  {
    icon: Radar,
    title: 'Governança Visível',
    description: 'Sua empresa ganha métricas auditáveis que atestam valor perante o mercado.',
  },
]

const capabilityCards: Array<{
  icon: LucideIcon
  title: string
  description: string
}> = [
  {
    icon: BadgeDollarSign,
    title: 'Gestão Financeira Ativa',
    description: 'Receita, custos, margem de contribuição. Um painel impecável com a saúde real do negócio.',
  },
  {
    icon: Landmark,
    title: 'Controle de Times & Ativos',
    description: 'Organização estruturada de portfólio, metas por equipe e controle sistêmico de todas as pontas.',
  },
  {
    icon: ChartColumn,
    title: 'Monitoramento & Insights',
    description: 'Gráficos elegantes. Rankings automatizados. Detecção de tendências antes de virarem gargalos.',
  },
  {
    icon: Scale,
    title: 'Arquitetura de Segurança',
    description: 'Histórico criptografado, dados rigorosamente auditados e compliance por design.',
  },
]

const heroLines = [
  'Comande sua operação',
  'com o rigor, clareza e autoridade',
  'de um verdadeiro líder.',
]

const footerColumns = [
  {
    title: 'Plataforma',
    links: [
      { label: 'Cadastro Institucional', href: '/cadastro' },
      { label: 'Portal de Acesso', href: '/login' },
    ],
  },
  {
    title: 'Engenharia',
    links: [
      { label: 'Status do Sistema', href: 'https://api.deskimperial.online/api/health' },
      { label: 'Arquitetura', href: '#fundacao' },
    ],
  },
  {
    title: 'Soluções',
    links: [
      { label: 'Gestão de Múltiplos Itens', href: '#fundacao' },
      { label: 'Governança de Portfólio', href: '#fundacao' },
      { label: 'Controle Estratégico', href: '#entregas' },
    ],
  },
]

export function LandingPage() {
  const shouldReduceMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)

  const rotateX = useSpring(useTransform(pointerY, [-1, 1], [2, -2]), {
    stiffness: 120,
    damping: 20,
    mass: 0.6,
  })
  const rotateY = useSpring(useTransform(pointerX, [-1, 1], [-3, 3]), {
    stiffness: 120,
    damping: 20,
    mass: 0.6,
  })

  const primaryShift = useSpring(useTransform(pointerX, [-1, 1], [-8, 8]), {
    stiffness: 90,
    damping: 16,
    mass: 0.8,
  })
  const secondaryShift = useSpring(useTransform(pointerX, [-1, 1], [-5, 5]), {
    stiffness: 90,
    damping: 16,
    mass: 0.8,
  })
  const tertiaryShift = useSpring(useTransform(pointerX, [-1, 1], [-3, 3]), {
    stiffness: 90,
    damping: 16,
    mass: 0.8,
  })
  const heroPanelX = useSpring(useTransform(pointerX, [-1, 1], [-8, 8]), {
    stiffness: 70,
    damping: 14,
    mass: 0.8,
  })
  const heroPanelY = useSpring(useTransform(pointerY, [-1, 1], [-6, 6]), {
    stiffness: 70,
    damping: 14,
    mass: 0.8,
  })
  const cursorGlowX = useSpring(cursorX, { stiffness: 110, damping: 22, mass: 0.7 })
  const cursorGlowY = useSpring(cursorY, { stiffness: 110, damping: 22, mass: 0.7 })
  
  // Sleek subtle glow, replacing the aggressive radial shapes
  const cursorGridGlow = useMotionTemplate`radial-gradient(400px circle at ${cursorGlowX}px ${cursorGlowY}px, rgba(255,255,255,0.03), transparent 80%)`

  const lineShifts = [primaryShift, secondaryShift, tertiaryShift]

  const handlePagePointerMove = (event: ReactMouseEvent<HTMLElement>) => {
    if (shouldReduceMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    cursorX.set(event.clientX - rect.left)
    cursorY.set(event.clientY - rect.top)
  }

  const handleHeroPointerMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return
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
    <main
      className="relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary/30"
      onMouseMove={handlePagePointerMove}
    >
      <div className="absolute inset-0 z-0 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        {!shouldReduceMotion ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden md:block"
            style={{ backgroundImage: cursorGridGlow }}
          />
        ) : null}
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-12">
        <header className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden ring-1 ring-white/10">
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between px-6">
            <div className="flex items-center gap-6">
              <BrandMark />
              <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary lg:inline-flex">
                <Globe2 className="size-3" />
                SaaS Edition
              </div>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <Link className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground" href="#fundacao">
                Plataforma
              </Link>
              <Link className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground" href="#entregas">
                Arquitetura
              </Link>
            </nav>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground px-4 py-2"
                href="/login"
              >
                Entrar
              </Link>
              <Link
                className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
                href="/cadastro"
              >
                Solicitar Acesso
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground shadow-sm">
              <span className="size-1.5 rounded-full bg-primary" />
              Desk Imperial
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
                  transition: { staggerChildren: 0.15, delayChildren: 0.1 },
                },
              }}
            >
              {heroLines.map((line, index) => (
                <motion.span
                  className="block origin-left text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-[4.5rem] lg:leading-[1.1]"
                  key={line}
                  style={{ x: lineShifts[index] }}
                  variants={{
                    hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
                    visible: {
                      opacity: 1,
                      y: 0,
                      filter: 'blur(0px)',
                      transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                >
                  <span className={index === heroLines.length - 1 ? "text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/50" : ""}>
                    {line}
                  </span>
                </motion.span>
              ))}
            </motion.div>

            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              O sistema operacional corporativo para gestão de alta performance. 
              Substitua dezenas de ferramentas amadoras por um único portal de governança incrivelmente rápido e elegante.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-8 py-4 text-sm font-semibold text-background transition-all hover:bg-foreground/90 hover:scale-[1.02]"
                href="/cadastro"
              >
                Iniciar Implantação Gratuita
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"
                href="/login"
              >
                Acessar Operação
              </Link>
            </div>

            <div className="mt-16 grid gap-4 sm:grid-cols-3">
              {metrics.map((metric, index) => (
                <div
                  className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80 hover:shadow-md"
                  key={metric.label}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{metric.label}</p>
                  <p className="mt-3 text-sm leading-relaxed text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="relative space-y-4 pt-[10rem] sm:space-y-6 sm:pt-[12rem] lg:pt-[14rem]"
            initial={{ opacity: 0, x: 40 }}
            style={
              shouldReduceMotion
                ? undefined
                : {
                    x: heroPanelX,
                    y: heroPanelY,
                  }
            }
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <FounderPortraitCard />

            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6 shadow-2xl relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Governança</span>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Premium
                </span>
              </div>

              <div className="mt-8 grid gap-4">
                {pillars.map((pillar) => (
                  <article className="rounded-xl border border-border/50 bg-background/50 p-5 transition-colors hover:bg-muted/30" key={pillar.title}>
                    <div>
                      <h2 className="text-base font-semibold text-foreground tracking-tight">{pillar.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <HeroFloatingCard />
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 border-y border-border bg-muted/10" id="fundacao">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-32">
          <div>
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 mb-6">
              <Scale className="size-5 text-primary" />
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Arquitetura corporativa impenetrável.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Projetado detalhadamente para suportar operações de alto volume. Sem travamentos. Sem perda de dados.
              Cada clique é intencional e instantâneo.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {capabilityCards.map((item) => (
              <motion.div
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -4,
                        transition: { duration: 0.2 },
                      }
                }
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                key={item.title}
              >
                <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <item.icon className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-32" id="entregas">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm lg:p-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-secondary mb-6 text-foreground">
                  <Radar className="size-5" />
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Experiência meticulosa de ponta a ponta.
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                  Diferente de sistemas genéricos de mercado, o Desk Imperial entrega uma experiência visual inspirada
                  nos melhores softwares do mundo. A gestão deve ser um prazer visual e tático.
                </p>
              </div>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border/50 bg-background/50 p-6">
                <div className="flex items-center gap-3">
                  <Waypoints className="size-5 text-sky-400" />
                  <p className="text-sm font-semibold text-foreground">Fluxo Minimalista</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Tudo a 2 cliques de distância. Menos páginas, mais potência operacional.
                </p>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/50 p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-5 text-emerald-400" />
                  <p className="text-sm font-semibold text-foreground">Auditabilidade Total</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Você enxerga rastros transacionais e sessões em vez de relatórios mortos.
                </p>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/50 p-6 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3">
                  <Globe2 className="size-5 text-indigo-400" />
                  <p className="text-sm font-semibold text-foreground">SaaS Premium</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Branding corporativo impecável e velocidade absurda impulsionada pela borda.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
           <InteractionFlowCard />
        </div>
      </section>

      <footer className="relative z-10 border-t border-border bg-card/50 backdrop-blur-md" id="rodape">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-12">
          <div className="grid gap-12 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <CompanySignatureCard />

            {footerColumns.map((group) => (
              <div className="flex flex-col" key={group.title}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground">
                  {group.title}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  {group.links.map((link) => (
                    <Link
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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

          <div className="mt-16 flex flex-col gap-4 border-t border-border/50 pt-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>Desk Imperial © 2026. A nova engenharia da governança.</p>
            <div className="flex flex-wrap gap-6 font-medium">
              <Link className="transition hover:text-foreground" href="https://app.deskimperial.online">
                Aplicativo Comercial
              </Link>
              <Link className="transition hover:text-foreground" href="https://api.deskimperial.online/api/health">
                APIs do Ecossistema
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
