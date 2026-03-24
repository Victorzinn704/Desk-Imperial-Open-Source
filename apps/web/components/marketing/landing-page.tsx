'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CompanySignatureCard } from '@/components/marketing/company-signature-card'
import { OrderTicket } from '@/components/marketing/order-ticket'
import { PayrollRecord } from '@/components/marketing/payroll-record'
import { BrandMark } from '@/components/shared/brand-mark'

/* ─── Data ───────────────────────────────────────────────────────────────────── */

const heroLines = [
  { text: 'A gestão', bold: false },
  { text: 'que fecha', bold: false },
  { text: 'o dia com', bold: false },
  { text: 'clareza.', bold: true },
]

const manifestoLines = [
  'Desk Imperial não é uma planilha melhorada.',
  'É o painel de controle de quem leva o negócio a sério.',
  'Do PDV à folha de pagamento, tudo em um único lugar.',
]

const proofLines = [
  {
    number: '8',
    label: 'Módulos integrados',
    description:
      'PDV, financeiro, folha de pagamento, calendário, portfólio, equipe, exportação e conformidade.',
  },
  {
    number: '1',
    label: 'Portal seguro',
    description:
      'Autenticação, PIN admin, rastreabilidade e conformidade LGPD em um único ambiente.',
  },
  {
    number: '0',
    label: 'Dependências externas',
    description:
      'Sem mock, sem planilha auxiliar, sem integração frágil. Tudo roda dentro do portal.',
  },
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
      { label: 'PDV / Comandas', href: '#produto' },
      { label: 'Calendário Comercial', href: '#produto' },
      { label: 'Folha de Pagamento', href: '#produto' },
      { label: 'Portfólio de Produtos', href: '#produto' },
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

/* ─── Framer Motion variants ─────────────────────────────────────────────────── */

const ease = [0.22, 1, 0.36, 1] as const

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
}

const heroLine = {
  hidden: { opacity: 0, y: -28 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease } },
}

const scrollReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
}

const manifestoContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.22 } },
}

const manifestoLine = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
}

const proofContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const proofItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">

      {/* ── Section 1: Hero ──────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 lg:px-12">

        {/* Topbar */}
        <header className="imperial-topbar">
          <div className="imperial-card-soft imperial-topbar__shell flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <BrandMark />
            <nav className="hidden items-center gap-6 md:flex">
              <Link className="section-index hover:text-[var(--accent)] transition-colors" href="#manifesto">
                Plataforma
              </Link>
              <Link className="section-index hover:text-[var(--accent)] transition-colors" href="#produto">
                Produto
              </Link>
              <Link className="section-index hover:text-[var(--accent)] transition-colors" href="#acesso">
                Acesso
              </Link>
            </nav>
            <Link className="editorial-link--muted self-start md:self-auto" href="/login">
              Entrar
            </Link>
          </div>
        </header>

        {/* Hero grid */}
        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-28">

          {/* Left: editorial headline */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 24 }}
            transition={{ duration: 1.0, ease }}
          >
            <span className="section-index">01 — Gestão comercial</span>

            <motion.div
              animate="visible"
              className="mt-8"
              initial="hidden"
              variants={heroContainer}
            >
              {heroLines.map(({ text, bold }) => (
                <motion.span
                  className="block"
                  key={text}
                  style={{
                    fontSize: 'clamp(3.5rem, 7vw, 7rem)',
                    lineHeight: bold ? 1.0 : 0.92,
                    letterSpacing: '-0.025em',
                    fontWeight: bold ? 800 : 300,
                    color: bold ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                  variants={heroLine}
                >
                  {text}
                </motion.span>
              ))}
            </motion.div>

            <hr className="imperial-rule--left mt-10" />

            <p className="mt-6 max-w-md text-base leading-7 text-[var(--text-soft)]">
              PDV com comanda real, folha de pagamento calculada por pedido,
              calendário de eventos e visão executiva — sem planilha, sem mock.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link className="editorial-link" href="/cadastro">
                Acessar a plataforma <ArrowRight size={15} />
              </Link>
              <Link className="editorial-link--muted" href="/login">
                ou entrar
              </Link>
            </div>
          </motion.div>

          {/* Right: real order ticket */}
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-3"
            initial={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.9, ease, delay: 0.2 }}
          >
            <span className="section-index hidden lg:block">Comanda em tempo real</span>
            <OrderTicket animate />
            <p className="text-xs text-[var(--text-soft)] opacity-60">
              Mesa 12 · João Pedro · 14h32 — operação ativa
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: Manifesto ─────────────────────────────────────────────── */}
      <section
        className="relative z-10 border-y border-[var(--border)] py-24 lg:py-32"
        id="manifesto"
      >
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-0">
          <span className="section-index">02 — Por que Desk Imperial</span>

          <hr className="imperial-rule mx-auto mt-6 mb-10 max-w-xs" />

          <motion.div
            initial="hidden"
            variants={manifestoContainer}
            viewport={{ once: true, margin: '-100px' }}
            whileInView="visible"
          >
            {manifestoLines.map((line) => (
              <motion.p
                className="mt-3 text-xl font-light leading-9 text-[var(--text-primary)] first:mt-0 lg:text-2xl"
                key={line}
                variants={manifestoLine}
              >
                {line}
              </motion.p>
            ))}
          </motion.div>

          <hr className="imperial-rule mx-auto mt-10 mb-14 max-w-xs" />

          <motion.div
            className="mx-auto max-w-2xl text-left"
            initial="hidden"
            variants={proofContainer}
            viewport={{ once: true, margin: '-80px' }}
            whileInView="visible"
          >
            {proofLines.map((item) => (
              <motion.div className="proof-line" key={item.number} variants={proofItem}>
                <span className="proof-line__number">{item.number}</span>
                <div>
                  <span className="proof-line__label">{item.label}</span>
                  <span className="proof-line__desc">{item.description}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Section 3: Produto real ───────────────────────────────────────────── */}
      <section
        className="relative z-10 border-b border-[var(--border)] bg-[var(--surface)] py-24 lg:py-32"
        id="produto"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <span className="section-index">03 — Produto real</span>

          <div className="mt-12 grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">

            {/* Copy */}
            <motion.div
              initial="hidden"
              variants={scrollReveal}
              viewport={{ once: true, margin: '-80px' }}
              whileInView="visible"
            >
              <span className="section-index">Folha de pagamento</span>
              <h2
                className="mt-4 text-[var(--text-primary)]"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300, lineHeight: 1.15 }}
              >
                Cada real,{' '}
                <strong className="font-extrabold" style={{ color: 'var(--accent)' }}>
                  calculado.
                </strong>
              </h2>

              <hr className="imperial-rule--left mt-6 w-24" />

              <p className="mt-6 max-w-xs text-sm leading-7 text-[var(--text-soft)]">
                Salário base, comissão calculada por pedidos reais e total líquido. Sem planilha,
                sem fórmula manual. A folha fecha com o movimento do mês.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  'Comissão baseada em pedidos registrados no PDV',
                  'Aprovação manual com PIN de administrador',
                  'Exportação CSV compatível com contabilidade',
                ].map((point) => (
                  <p
                    className="border-l border-[rgba(195,164,111,0.3)] pl-4 text-sm leading-6 text-[var(--text-soft)]"
                    key={point}
                  >
                    {point}
                  </p>
                ))}
              </div>
            </motion.div>

            {/* Payroll record */}
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.9, ease, delay: 0.2 }}
              viewport={{ once: true, margin: '-80px' }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <span className="section-index hidden lg:block">Competência: março 2026</span>
              <PayrollRecord animate />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Section 4: CTA final ──────────────────────────────────────────────── */}
      <section
        className="relative z-10 py-24 text-center lg:py-32"
        id="acesso"
      >
        <motion.div
          className="mx-auto max-w-2xl px-6"
          initial="hidden"
          variants={scrollReveal}
          viewport={{ once: true, margin: '-60px' }}
          whileInView="visible"
        >
          <div className="flex justify-center">
            <BrandMark />
          </div>

          <hr className="imperial-rule mx-auto mt-8 mb-10 max-w-xs" />

          <p
            className="text-[var(--text-primary)]"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 300, lineHeight: 1.3 }}
          >
            Seu portal comercial está pronto.
          </p>

          <div className="mt-8 flex items-center justify-center gap-8">
            <Link className="editorial-link" href="/cadastro">
              Criar conta <ArrowRight size={14} />
            </Link>
            <Link className="editorial-link--muted" href="/login">
              Acessar
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 border-t border-[var(--border)] bg-[rgba(5,11,20,0.9)]"
        id="rodape"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-12">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr_0.85fr_0.85fr]">
            <CompanySignatureCard />

            {footerColumns.map((group) => (
              <div className="p-6" key={group.title}>
                <p className="section-index">{group.title}</p>
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
            <p>DESK IMPERIAL © 2026. Plataforma comercial com leitura executiva, portfólio e conformidade.</p>
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
