'use client'

import Link from 'next/link'
import { EquipeEnvironment } from '@/components/dashboard/environments/equipe-environment'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import {
  LabFactPill,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'

export default function DesignLabEquipePage() {
  const { sessionQuery, employeesQuery, financeQuery } = useDashboardQueries({ section: 'equipe' })
  const user = sessionQuery.data?.user

  if (sessionQuery.isLoading) {
    return (
      <section className="space-y-6">
        <LabPageHeader
          eyebrow="Equipe ativa"
          title="Equipe e desempenho"
          description="Equipe, receita, folha e acesso."
        />

        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir a equipe.</p>
        </LabPanel>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="space-y-6">
        <LabPageHeader
          eyebrow="Equipe ativa"
          title="Equipe e desempenho"
          description="Equipe, receita, folha e acesso."
        />

        <EquipeLockedState />
      </section>
    )
  }

  return (
    <EquipeEnvironment
      activeTab="cards"
      employees={employeesQuery.data?.items ?? []}
      finance={financeQuery.data}
      surface="lab"
    />
  )
}

function EquipeLockedState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Prévia travada da equipe"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <LabFactPill label="ativos" value="4" />
            <LabFactPill label="acesso" value="3/4" />
            <LabFactPill label="folha" value="R$ 3.240,00" />
            <LabFactPill label="ticket" value="R$ 35,81" />
          </div>

          <div className="space-y-0">
            <LabSignalRow
              label="ranking da equipe"
              note="o login libera receita, pedidos, ticket e leitura por colaborador no mesmo painel"
              tone="info"
              value="ao entrar"
            />
            <LabSignalRow
              label="cobertura de acesso"
              note="a equipe volta a mostrar quem já entra no desktop e quem ainda está pendente"
              tone="warning"
              value="bloqueada"
            />
            <LabSignalRow
              label="folha integrada"
              note="salário, comissão e pagamento estimado reaparecem no mesmo subsistema"
              tone="success"
              value="pronta"
            />
          </div>

          <div className="pt-1">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              Entrar para liberar equipe
            </Link>
          </div>
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">preview</LabStatusPill>}
        padding="md"
        title="O que abre na equipe"
      >
        <div className="space-y-0">
          <LabSignalRow label="desempenho por pessoa" note="receita, lucro, pedidos e ticket por colaborador" tone="success" value="sim" />
          <LabSignalRow label="status de acesso" note="quem já entra no web e quem ainda depende de habilitação" tone="info" value="sim" />
          <LabSignalRow label="ponte com folha" note="a mesma base alimenta comissões e fechamento salarial" tone="neutral" value="sim" />
          <LabSignalRow label="diretório operacional" note="visão rápida para dono e gestão sem trocar de módulo" tone="warning" value="sim" />
        </div>
      </LabPanel>
    </div>
  )
}
