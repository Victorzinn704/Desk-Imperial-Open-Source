'use client'

import { BarChart2, Package, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
  {
    icon: BarChart2,
    label: 'Visão Global',
    tone: 'text-indigo-400',
    activeBorder: 'border-indigo-500/30 bg-indigo-500/10',
    description: 'Acompanhe rentabilidade mensal e identifique tendências num relance.',
    active: false,
  },
  {
    icon: Package,
    label: 'Governança',
    tone: 'text-foreground',
    activeBorder: 'border-border bg-muted/40 shadow-sm rounded-xl',
    description: 'Assegure-se de que cada produto tem preço e embalagem definidos perfeitamente.',
    active: true,
  },
  {
    icon: ShoppingCart,
    label: 'Ponto de Venda',
    tone: 'text-emerald-400',
    activeBorder: 'border-emerald-500/30 bg-emerald-500/10',
    description: 'Opere carrinho e emita registros rastreáveis associados à sua força de vendas.',
    active: false,
  },
]

export function InteractionFlowCard() {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm lg:p-10">
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Arquitetura Preditiva</p>
        <h3 className="mt-2 text-2xl font-semibold text-foreground tracking-tight">Um fluxo perfeitamente lógico</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-sm">
          Menos engarrafamentos operacionais. Da análise à venda, o Desk Imperial antecipa seus próximos 3 movimentos.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              className={cn(
                'flex flex-col gap-4 rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md',
                step.active
                  ? step.activeBorder
                  : 'border-border/60 bg-background/50'
              )}
              key={step.label}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg border',
                    step.active ? step.activeBorder : 'border-border bg-muted/40'
                  )}
                >
                  <step.icon className={cn('size-4', step.tone)} />
                </span>
                <p className={cn('text-[11px] font-bold uppercase tracking-widest', step.tone)}>{step.label}</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mt-1">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}
