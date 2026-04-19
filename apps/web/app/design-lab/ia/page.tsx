'use client'

import { BrainCircuit, Sparkles } from 'lucide-react'
import { AIConsultantWorkspace } from '@/components/ai/ai-consultant-workspace'
import { LabPageHeader, LabStatusPill } from '@/components/design-lab/lab-primitives'

export default function DesignLabIaPage() {
  return (
    <section className="space-y-6">
      <LabPageHeader
        eyebrow="Inteligencia"
        title="Consultor IA"
        description="Superficie propria para leitura executiva e perguntas do app, sem competir com as telas operacionais do Desk Imperial."
        meta={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">
                Boundary da IA
              </span>
              <LabStatusPill
                tone="info"
                icon={<Sparkles className="size-3" />}
              >
                escopo do app
              </LabStatusPill>
            </div>
            <div className="space-y-2 text-sm text-[var(--lab-fg-soft)]">
              <div className="flex items-center gap-2">
                <BrainCircuit className="size-4 text-[var(--lab-blue)]" />
                Consulta separada do operacional, mas ligada aos dados reais.
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--lab-success)]" />
                Perguntas guiadas, foco ativo e resposta executiva em uma leitura unica.
              </div>
            </div>
          </div>
        }
      />

      <AIConsultantWorkspace embedded />
    </section>
  )
}
