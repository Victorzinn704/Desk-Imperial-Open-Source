'use client'

import Link from 'next/link'
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  Menu,
  X,
  BadgeDollarSign,
  CalendarDays,
  ChartColumn,
  FileDown,
  Globe2,
  KeyRound,
  Landmark,
  Radar,
  Crown,
  Tags,
  Users,
  Waypoints,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LetterCard } from '@/components/marketing/letter-card'
import { FounderPortraitCard } from '@/components/marketing/founder-portrait-card'
import { HeroFloatingCard } from '@/components/marketing/hero-floating-card'
import { InteractionFlowCard } from '@/components/marketing/interaction-flow-card'
import { SpaceBackground } from '@/components/marketing/space-background'
import { CustomCursor } from '@/components/marketing/custom-cursor'
import { BrandMark } from '@/components/shared/brand-mark'

const metrics = [
  {
    label: 'Comandas ao vivo',
    value: 'Abra o pedido, mova conforme avança no atendimento e feche quando pagar. Todo mundo vê o mesmo, na hora.',
  },
  { label: 'Mapa de vendas', value: 'Veja no mapa de onde vêm seus pedidos. Bairro por bairro, cidade por cidade.' },
  {
    label: 'Fechamento do dia',
    value: 'No fim do dia, você vê quanto entrou, quanto saiu e quanto cada um da equipe vendeu. Tudo num lugar só.',
  },
]

const pillars = [
  {
    icon: ChartColumn,
    title: 'Tudo acontece ao vivo',
    description: 'Chegou pedido novo? Aparece na tela de todo mundo na mesma hora, sem precisar atualizar nada.',
  },
  {
    icon: Radar,
    title: 'Do pedido ao caixa',
    description: 'Do vendedor que anota o pedido até o dono que fecha o caixa — tudo no mesmo painel, sem papel.',
  },
]

const capabilityCards: Array<{
  icon: LucideIcon
  title: string
  description: string
  tags: string[]
  stars: number
}> = [
  {
    icon: BadgeDollarSign,
    title: 'Dinheiro do negócio',
    description: 'Veja quanto entrou, quanto saiu e o que mais vendeu. Sem precisar abrir planilha nenhuma.',
    tags: ['Financeiro', 'Resumo'],
    stars: 5,
  },
  {
    icon: Tags,
    title: 'Pedidos e atendimento',
    description: 'Anote pedidos com nome ou CPF do cliente, aplique desconto e acompanhe cada atendimento no painel.',
    tags: ['Pedidos', 'Vendas'],
    stars: 5,
  },
  {
    icon: CalendarDays,
    title: 'Calendário do negócio',
    description: 'Planeje promoções, jogos e datas importantes. Depois veja como as vendas foram naquele dia.',
    tags: ['Agenda', 'Eventos'],
    stars: 4,
  },
  {
    icon: Landmark,
    title: 'Folha de pagamento',
    description:
      'Calcula o salário fixo mais a comissão de cada funcionário com base nas vendas. Sem fazer conta na mão.',
    tags: ['Equipe', 'Comissão'],
    stars: 5,
  },
  {
    icon: Users,
    title: 'Sua equipe',
    description: 'Veja quem mais vendeu, o histórico de cada um e as metas. Tudo num painel só.',
    tags: ['Equipe', 'Metas'],
    stars: 4,
  },
  {
    icon: KeyRound,
    title: 'Acesso com senha',
    description:
      'Proteja ações importantes com uma senha de 4 números. Quem errar 3 vezes fica bloqueado por 5 minutos.',
    tags: ['Segurança', 'Senha'],
    stars: 5,
  },
  {
    icon: FileDown,
    title: 'Exportar relatório',
    description: 'Baixe seus pedidos em arquivo que abre direto no Excel ou no Google Planilhas.',
    tags: ['Relatório', 'Excel'],
    stars: 4,
  },
  {
    icon: Crown,
    title: 'Dados protegidos',
    description: 'Seus dados ficam separados dos outros. A plataforma segue a lei de proteção de dados (LGPD).',
    tags: ['LGPD', 'Segurança'],
    stars: 5,
  },
]

const heroLines = ['Sistema de Gestão', 'para Comerciantes', 'Brasileiros —', 'Sem fins lucrativos.']

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

async function fireConfetti(x: number, y: number) {
  const confetti = (await import('canvas-confetti')).default
  const origin = { x: x / window.innerWidth, y: y / window.innerHeight }
  confetti({
    particleCount: 90,
    spread: 80,
    startVelocity: 28,
    decay: 0.88,
    origin,
    colors: ['#c3a46f', '#d4b86a', '#ffffff', '#ffe066', '#9b8460', '#f0d080'],
    scalar: 1.1,
    ticks: 180,
    gravity: 0.7,
  })
  confetti({
    particleCount: 30,
    spread: 120,
    startVelocity: 14,
    decay: 0.82,
    origin,
    colors: ['#5a8cf5', '#8fffb9', '#ffffff'],
    scalar: 0.7,
    ticks: 120,
    gravity: 0.5,
  })
}

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)

  // Cursor none class on body while on landing page
  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const syncCursorMode = () => {
      const shouldHideNativeCursor = !coarsePointer.matches && !reducedMotion.matches
      document.body.classList.toggle('cursor-none', shouldHideNativeCursor)
    }

    syncCursorMode()
    coarsePointer.addEventListener('change', syncCursorMode)
    reducedMotion.addEventListener('change', syncCursorMode)

    return () => {
      coarsePointer.removeEventListener('change', syncCursorMode)
      reducedMotion.removeEventListener('change', syncCursorMode)
      document.body.classList.remove('cursor-none')
    }
  }, [])

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

  const handlePageClick = (e: ReactMouseEvent<HTMLElement>) => {
    void fireConfetti(e.clientX, e.clientY)
  }

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text-primary)]"
      onClick={handlePageClick}
    >
      <CustomCursor />
      <SpaceBackground />

      {/* ── Topbar fixa full-width ────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.90)] backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-6">
            <BrandMark />
            <nav className="hidden items-center gap-1 md:flex">
              {[
                { label: 'O que faz', href: '#fundacao' },
                { label: 'Como usar', href: '#entregas' },
                { label: 'Páginas', href: '#rodape' },
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
              className="hidden rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent)] hover:shadow-[0_0_14px_rgba(155,132,96,0.18)] sm:block"
              href="/login"
            >
              Entrar
            </Link>
            <Link
              className="hidden rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[rgba(255,255,255,0.05)] sm:block"
              href="/dashboard"
            >
              Abrir painel
            </Link>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex size-10 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] transition-colors active:bg-[rgba(255,255,255,0.1)] sm:hidden"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.95)] px-6 pb-6 pt-4 sm:hidden"
            >
              <nav className="mb-5 flex flex-col gap-1">
                {[
                  { label: 'O que faz', href: '#fundacao' },
                  { label: 'Como usar', href: '#entregas' },
                  { label: 'Páginas', href: '#rodape' },
                ].map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-soft)] transition-colors active:bg-[rgba(255,255,255,0.06)] active:text-[var(--text-primary)]"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl border border-[var(--border-strong)] py-3 text-center text-sm font-semibold text-[var(--text-primary)] transition-all active:border-[var(--accent)]"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rainbow-hover hero-entry-button w-full justify-center"
                >
                  <span className="sp">Cadastrar-se</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 pt-24 lg:px-12">
        <div className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
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
                    hidden: { opacity: 0, filter: 'blur(28px)', scale: 0.82 },
                    visible: {
                      opacity: 1,
                      filter: 'blur(0px)',
                      scale: 1,
                      transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                >
                  <span className="text-flag-brazil">{line}</span>
                </motion.span>
              ))}
            </motion.div>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-soft)]">
              Anote o pedido, veja quanto entrou, pague sua equipe certo e descubra de onde vêm seus clientes. Tudo no
              mesmo sistema, sem precisar de planilha.
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
                <div className="glass-card p-5" key={metric.label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-base leading-7 text-[var(--text-primary)]">{metric.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="relative space-y-4 pt-8 sm:space-y-5 sm:pt-12 lg:space-y-6 lg:pt-[18rem]"
            initial={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          >
            <FounderPortraitCard />

            <div className="glass-card relative z-10 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-soft)]">Status</span>
                <span className="rounded-full border border-[rgba(201,168,76,0.28)] bg-[rgba(201,168,76,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A84C]">
                  Versão Beta
                </span>
              </div>

              <div className="mt-8 grid gap-4">
                {pillars.map((pillar, index) => (
                  <article className={index % 2 === 0 ? 'glass-card p-5' : 'glass-card p-5'} key={pillar.title}>
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
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-12">
          {/* Section header — texto emerge da galáxia */}
          <div className="mb-16 flex flex-col items-center gap-2 text-center">
            <motion.p
              className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]"
              initial={{ opacity: 0, scale: 0.6, filter: 'blur(18px)' }}
              viewport={{ once: false, amount: 0.3 }}
              whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              O que você vai usar
            </motion.p>
            <motion.h2
              className="mt-1 max-w-2xl text-center text-4xl font-semibold leading-tight text-white sm:text-5xl"
              initial={{ opacity: 0, scale: 0.72, filter: 'blur(28px)', y: 10 }}
              viewport={{ once: false, amount: 0.3 }}
              whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            >
              Tudo que está aqui existe de verdade e já funciona.
            </motion.h2>
          </div>

          {/* 8 cards — stack sobrepostos centralizados */}
          <div className="stackrow" style={{ perspective: '1000px' }}>
            {capabilityCards.map((item) => (
              <div className="stackcard" key={item.title}>
                <div className="stackcard__title">
                  <item.icon className="size-4 inline-block mr-2 opacity-70" />
                  {item.title}
                </div>
                <div className="stackcard__content">{item.description}</div>
                <div className="stackcard__bar">
                  <div className="stackcard__emptybar" />
                  <div className="stackcard__filledbar" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── S-pattern full-width feature cards ───────────────────────────── */}
        {[
          {
            side: 'left' as const,
            tag: 'Pedidos & Atendimento',
            title: 'Anote o pedido, arraste e feche quando pagar.',
            body: 'Você abre uma comanda com o nome ou CPF do cliente, arrasta ela pelas etapas do atendimento e fecha quando o pagamento acontecer. Todo mundo na equipe vê na hora, sem papel, sem precisar falar nada.',
            stat: { label: 'Etapas no painel', value: '4' },
            icon: Tags,
          },
          {
            side: 'right' as const,
            tag: 'Financeiro & Equipe',
            title: 'Saiba quanto entrou, quanto saiu e o que pagar para cada um.',
            body: 'O sistema mostra o financeiro do dia, da semana e do mês. E calcula sozinho o salário fixo mais a comissão de cada funcionário, com base no que vendeu. Você não precisa fazer conta nenhuma.',
            stat: { label: 'Cálculo automático', value: '100%' },
            icon: Landmark,
          },
          {
            side: 'left' as const,
            tag: 'Calendário & Eventos',
            title: 'Planeje seus eventos e veja como afetaram as vendas.',
            body: 'Anote no calendário as promoções, jogos e datas especiais. Depois o sistema mostra como as vendas foram naquele período. Você começa a entender o que funciona no seu negócio.',
            stat: { label: 'Visão completa', value: '360°' },
            icon: CalendarDays,
          },
          {
            side: 'right' as const,
            tag: 'Mapa de vendas',
            title: 'Veja no mapa de onde estão vindo seus pedidos.',
            body: 'O sistema coloca seus pedidos no mapa e mostra onde estão concentrados — por bairro e por região. Você descobre rápido onde seu negócio está chegando e onde ainda pode crescer.',
            stat: { label: 'Atualizado', value: 'Ao vivo' },
            icon: Globe2,
          },
        ].map(({ side, tag, title, body, stat, icon: Icon }, i) => (
          <motion.div
            key={tag}
            className="s-feature-card"
            data-side={side}
            initial={{ scaleX: 0, opacity: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            style={{ transformOrigin: side === 'left' ? 'left center' : 'right center' }}
            transition={{ duration: 1.35, ease: [0.16, 1, 0.3, 1], delay: i * 0.2 }}
          >
            <div className={`s-feature-card__inner ${side === 'right' ? 's-feature-card__inner--right' : ''}`}>
              <div className="s-feature-card__text">
                <span className="s-feature-card__tag">
                  <Icon className="size-3.5" />
                  {tag}
                </span>
                <h3 className="s-feature-card__title">{title}</h3>
                <p className="s-feature-card__body">{body}</p>
              </div>
              <div className="s-feature-card__stat">
                <span className="s-feature-card__stat-value">{stat.value}</span>
                <span className="s-feature-card__stat-label">{stat.label}</span>
              </div>
            </div>
            <div className="s-feature-card__bar" />
          </motion.div>
        ))}
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:max-w-none" id="entregas">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(24px)', scale: 0.88 }}
            whileInView={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            viewport={{ once: false, amount: 0.12 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="glass-card p-8 lg:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Como começar</p>
                  <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                    Você entra, cadastra e já começa a usar.
                  </h2>
                  <p className="mt-4 text-base leading-7 text-[var(--text-soft)]">
                    Crie sua conta, entre no painel e veja tudo funcionando de imediato. Não tem tutorial obrigatório
                    nem configuração complicada.
                  </p>
                </div>

                <div className="glass-card px-5 py-4 text-sm leading-7 text-[var(--text-soft)] lg:max-w-md">
                  O painel já mostra o que está acontecendo no seu negócio assim que você entra.
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <Waypoints className="size-5 text-[var(--info)]" />
                    <p className="text-sm font-semibold text-white">Comandas ao vivo</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                    Veja os pedidos abertos, em andamento e prontos para fechar. A equipe toda enxerga o mesmo, na mesma
                    hora.
                  </p>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <Crown className="size-5 text-[var(--accent)]" />
                    <p className="text-sm font-semibold text-white">Mapa de vendas</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                    Veja no mapa de onde vêm seus pedidos. Ajuda a entender onde seu negócio está chegando.
                  </p>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <Globe2 className="size-5 text-[var(--info)]" />
                    <p className="text-sm font-semibold text-white">Fechamento do dia</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                    No fechamento, tudo já está calculado: quanto entrou, quem vendeu mais e o arquivo para baixar se
                    precisar.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, filter: 'blur(24px)', scale: 0.88 }}
            whileInView={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            viewport={{ once: false, amount: 0.12 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
          >
            <InteractionFlowCard />
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10" id="rodape">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-12">
          {/* ── 3 cards flutuantes centralizados ── */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {footerColumns.map((group, gi) => (
              <div className="fcard-wrap" key={group.title}>
                <div className="fcard-obj">
                  <div className="fcard-spin" />
                  <div className="fcard-face" style={{ animationDelay: `${gi * 0.5}s` }}>
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
                </div>
              </div>
            ))}
          </div>

          {/* ── Carta ocupando largura total ── */}
          <div className="w-full mt-20">
            <LetterCard />
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-[rgba(255,255,255,0.06)] pt-6 text-sm text-[var(--text-soft)] md:flex-row md:items-center md:justify-between">
            <p>DESK IMPERIAL © 2026. Feito para o pequeno comerciante brasileiro que quer mais controle do negócio.</p>
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
