'use client'

import Link from 'next/link'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  BadgeDollarSign,
  CalendarDays,
  ChartColumn,
  FileDown,
  Globe2,
  KeyRound,
  Landmark,
  Radar,
  ShieldCheck,
  Tags,
  Users,
  Waypoints,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CompanySignatureCard } from '@/components/marketing/company-signature-card'
import { FounderPortraitCard } from '@/components/marketing/founder-portrait-card'
import { HeroFloatingCard } from '@/components/marketing/hero-floating-card'
import { InteractionFlowCard } from '@/components/marketing/interaction-flow-card'
import { BrandMark } from '@/components/shared/brand-mark'

const metrics = [
  { label: 'PDV em tempo real', value: 'Comandas abertas, em preparo e fechadas num kanban visual' },
  { label: 'Folha de pagamento', value: 'Salário base + comissão calculados automaticamente' },
  { label: 'Calendário comercial', value: 'Eventos, promoções e jogos com impacto em vendas' },
]

const pillars = [
  {
    icon: ChartColumn,
    title: 'Sem complicação',
    description: 'Você abre, vende, confere e fecha o dia — tudo aqui dentro.',
  },
  {
    icon: Radar,
    title: 'Com identidade',
    description: 'Seu comércio tem nome, história e números que provam valor.',
  },
]

const capabilityCards: Array<{
  icon: LucideIcon
  title: string
  description: string
}> = [
  {
    icon: BadgeDollarSign,
    title: 'Financeiro executivo',
    description: 'Receita, custo, lucro e margem. Sparklines de tendência em cada KPI.',
  },
  {
    icon: Tags,
    title: 'PDV / Comandas',
    description: 'Kanban drag-and-drop com CPF/CNPJ, desconto e acréscimo por comanda.',
  },
  {
    icon: CalendarDays,
    title: 'Calendário comercial',
    description: 'Arraste eventos, planeje promoções e correlacione com as vendas do dia.',
  },
  {
    icon: Landmark,
    title: 'Folha de pagamento',
    description: 'Salário base + comissão sobre vendas calculados por colaborador.',
  },
  {
    icon: Users,
    title: 'Gestão de equipe',
    description: 'Ranking de vendedores, histórico e metas em um único painel.',
  },
  {
    icon: KeyRound,
    title: 'Admin PIN',
    description: 'Proteja ações sensíveis com PIN de 4 dígitos e bloqueio anti brute-force.',
  },
  {
    icon: FileDown,
    title: 'Export CSV',
    description: 'Exporte pedidos com encoding UTF-8 compatível com Excel e Planilhas.',
  },
  {
    icon: ShieldCheck,
    title: 'Conformidade',
    description: 'LGPD, consentimento de cookies e governança de dados visível.',
  },
]

const heroLines = [
  'Não adianta ter o poder da caneta,',
  'se você não sabe a mesa certa onde se sentar.',
  'Isso não é sobre mesas...',
  '— Desk Imperial.',
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
    title: 'Módulos',
    links: [
      { label: 'PDV / Comandas', href: '#fundacao' },
      { label: 'Calendário Comercial', href: '#fundacao' },
      { label: 'Folha de Pagamento', href: '#fundacao' },
      { label: 'Portfólio de Produtos', href: '#fundacao' },
    ],
  },
  {
    title: 'Ambientes',
    links: [
      { label: 'app.deskimperial.online', href: 'https://app.deskimperial.online' },
      { label: 'api.deskimperial.online', href: 'https://api.deskimperial.online/api/health' },
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

      {/* ── Topbar fixa full-width ────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.85)] px-6 py-4 backdrop-blur-xl lg:px-12">
        <div className="flex items-center gap-6">
          <BrandMark />
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { label: 'Fundação', href: '#fundacao' },
              { label: 'Entregas', href: '#entregas' },
              { label: 'Estrutura', href: '#rodape' },
            ].map(({ label, href }) => (
              <Link
                key={label}
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-soft)] transition-all hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
                href={href}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent)] hover:shadow-[0_0_14px_rgba(155,132,96,0.18)]"
            href="/login"
          >
            Entrar
          </Link>
          <Link
            className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[rgba(255,255,255,0.05)]"
            href="/dashboard"
          >
            Abrir painel
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 pt-24 lg:px-12">
        <div className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
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
                  style={{ x: lineShifts[index] ?? lineShifts[lineShifts.length - 1] }}
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
              PDV com kanban, folha de pagamento, calendário comercial, portfólio e financeiro em tempo real —
              tudo em um único portal seguro para o seu negócio.
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
                <span className="text-sm font-medium text-[var(--text-soft)]">Status</span>
                <span className="rounded-full border border-[rgba(201,168,76,0.28)] bg-[rgba(201,168,76,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">
                  Early Access
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

      <section className="relative z-10" id="fundacao">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Módulos</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Oito módulos integrados para operar o seu negócio inteiro.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-soft)]">
              Do PDV ao financeiro, da folha de pagamento ao calendário de eventos — tudo construído sobre
              dados reais da sua operação, sem mock e sem dependências ocultas.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:max-w-none" id="entregas">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <div className="imperial-card p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Acesso principal</p>
                <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                  Acesso rápido para cadastro, login e entrada no painel.
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
                  <p className="text-sm font-semibold text-white">Fluxo contínuo</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  Da autenticação ate a venda registrada, o caminho fica organizado em poucas etapas.
                </p>
              </div>

              <div className="imperial-card-tilt-alt p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-5 text-[var(--accent)]" />
                  <p className="text-sm font-semibold text-white">Governança visível</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  Sessão, consentimento e rastreabilidade aparecem sem ficar escondidos no produto.
                </p>
              </div>

              <div className="imperial-card-soft p-5">
                <div className="flex items-center gap-3">
                  <Globe2 className="size-5 text-[#8fffb9]" />
                  <p className="text-sm font-semibold text-white">Domínio próprio</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  O ambiente ja responde em domínio próprio, pronto para evoluir como produto de verdade.
                </p>
              </div>
            </div>
          </div>

          <InteractionFlowCard />
        </div>
      </section>

      <footer className="relative z-10" id="rodape">
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
