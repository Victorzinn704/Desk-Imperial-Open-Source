'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { AIConsultantWorkspace } from '@/components/ai/ai-consultant-workspace'
import {
  LabFactPill,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'

export default function DesignLabIaPage() {
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user

  return (
    <section className="space-y-6">
      <LabPageHeader
        eyebrow="Inteligencia"
        title="Consultor IA"
        description="Consulta executiva e perguntas do app."
        actions={
          <LabStatusPill tone="info" icon={<Sparkles className="size-3" />}>
            escopo do app
          </LabStatusPill>
        }
      />

      {sessionQuery.isLoading ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir o consultor.</p>
        </LabPanel>
      ) : null}

      {!(sessionQuery.isLoading || user) ? <AiLockedState /> : null}

      {user ? <AIConsultantWorkspace embedded /> : null}
    </section>
  )
}

function AiLockedState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Prévia travada do consultor"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <LabFactPill label="foco" value="caixa, vendas e operação" />
            <LabFactPill label="resposta" value="executiva" />
            <LabFactPill label="escopo" value="Desk Imperial" />
          </div>

          <div className="space-y-0">
            <LabSignalRow
              label="consulta guiada"
              note="o login libera perguntas sobre caixa, vendas, estoque, equipe e agenda"
              tone="info"
              value="ao entrar"
            />
            <LabSignalRow
              label="análise"
              note="a resposta volta com resumo, riscos, oportunidades e próximos passos"
              tone="neutral"
              value="bloqueada"
            />
            <LabSignalRow
              label="foco ativo"
              note="a lateral passa a guiar leitura por margem, canais, risco e demanda"
              tone="success"
              value="pronta"
            />
          </div>

          <div className="pt-1">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              Entrar para liberar IA
            </Link>
          </div>
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">preview</LabStatusPill>}
        padding="md"
        title="O que abre no consultor"
      >
        <div className="space-y-0">
          <LabSignalRow
            label="resumo executivo"
            note="sintetiza o foco em uma leitura curta"
            tone="success"
            value="sim"
          />
          <LabSignalRow label="riscos" note="sinaliza exceções e pontos de atenção" tone="warning" value="sim" />
          <LabSignalRow label="oportunidades" note="aponta ganho comercial e operacional" tone="info" value="sim" />
          <LabSignalRow
            label="próximos passos"
            note="transforma análise em ação dentro do app"
            tone="neutral"
            value="sim"
          />
        </div>
      </LabPanel>
    </div>
  )
}
