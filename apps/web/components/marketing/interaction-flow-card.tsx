'use client'

import { BarChart2, Package, ShoppingCart } from 'lucide-react'

const steps = [
  {
    icon: BarChart2,
    label: 'Painel',
    tone: 'text-[var(--info)]',
    activeBorder: 'border-[rgba(90,149,196,0.22)] bg-[rgba(90,149,196,0.05)]',
    description: 'Quanto entrou, quem vendeu mais e de onde vieram os pedidos — tudo em uma tela.',
    active: false,
  },
  {
    icon: Package,
    label: 'Produtos',
    tone: 'text-[var(--accent)]',
    activeBorder: 'border-[rgba(155,132,96,0.30)] bg-[rgba(155,132,96,0.08)]',
    description: 'Seu cardápio com preço, descrição e combos. É daqui que saem os itens do pedido.',
    active: true,
  },
  {
    icon: ShoppingCart,
    label: 'Pedidos',
    tone: 'text-[var(--success)]',
    activeBorder: 'border-[rgba(99,147,113,0.22)] bg-[rgba(99,147,113,0.05)]',
    description: 'Abra o pedido com vários itens, vincule o vendedor e registre o CPF se quiser. Simples assim.',
    active: false,
  },
]

export function InteractionFlowCard() {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(90,149,196,0.05),transparent_60%)]" />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Como funciona</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Tudo junto, do começo ao fim.</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">
          Você vê os números, organiza os produtos e atende os clientes — no mesmo lugar.
        </p>

        <div className="mt-6 space-y-3">
          {steps.map((step, _i) => (
            <div
              className={`flex items-start gap-4 rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.28)] ${
                step.active
                  ? `${step.activeBorder} shadow-[0_0_20px_rgba(155,132,96,0.07)]`
                  : 'border-[var(--border)] bg-[var(--surface-muted)]'
              }`}
              key={step.label}
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${step.activeBorder}`}
              >
                <step.icon className={`size-4 ${step.tone}`} />
              </span>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${step.tone}`}>{step.label}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}
