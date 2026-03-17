'use client'

import { MousePointer2 } from 'lucide-react'

export function InteractionFlowCard() {
  return (
    <article className="imperial-cursor-panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Fluxo guiado
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">Entrada rapida na operacao</h3>
        </div>
        <p className="max-w-[12rem] text-right text-sm leading-7 text-[var(--text-soft)]">
          Cadastro, leitura e acao em uma experiencia sequencial.
        </p>
      </div>

      <div className="imperial-cursor-stage mt-5">
        <div className="imperial-cursor-target">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--info)]">Dashboard</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Indicadores, financeiro e ranking em tempo real.
          </p>
        </div>

        <div className="imperial-cursor-target imperial-cursor-target--secondary imperial-cursor-highlight">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Portfolio</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Produtos, caixas, unidades e margem organizados.
          </p>
        </div>

        <div className="imperial-cursor-target imperial-cursor-target--footer">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">Operacao</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
            Pedido multi-item, vendedor vinculado e mapa da venda.
          </p>
        </div>

        <div className="imperial-cursor-pointer">
          <MousePointer2 />
        </div>
      </div>
    </article>
  )
}
