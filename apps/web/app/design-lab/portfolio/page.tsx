'use client'

import Link from 'next/link'
import { PortfolioEnvironment } from '@/components/dashboard/environments/portfolio-environment'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'
import {
  LabFactPill,
  LabMetricStrip,
  LabMetricStripItem,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'

export default function DesignLabPortfolioPage() {
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user

  if (sessionQuery.isLoading) {
    return (
      <section className="space-y-6">
        <PortfolioShellHeader />

        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir o portfólio.</p>
        </LabPanel>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="space-y-6">
        <PortfolioShellHeader />
        <PortfolioLockedState />
      </section>
    )
  }

  return <PortfolioEnvironment />
}

function PortfolioShellHeader() {
  return (
    <LabPageHeader
      description="Estoque, margem e giro do catálogo."
      eyebrow="Estoque e margem"
      title="Portfolio de produtos"
    >
      <LabMetricStrip>
        <LabMetricStripItem description="prévia do catálogo" label="SKUs ativos" value="0" />
        <LabMetricStripItem description="capital depende da sessão" label="capital em estoque" value="R$ 0,00" />
        <LabMetricStripItem description="venda potencial bloqueada" label="venda potencial" value="R$ 0,00" />
        <LabMetricStripItem description="sem leitura real ainda" label="itens em alerta" value="0" />
      </LabMetricStrip>
    </LabPageHeader>
  )
}

function PortfolioLockedState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Prévia travada do portfólio"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <LabFactPill label="cadastro" value="produtos" />
            <LabFactPill label="venda" value="delivery · balcão · mesa" />
            <LabFactPill label="estoque" value="alerta e margem" />
            <LabFactPill label="tabela" value="ações reais" />
          </div>

          <div className="space-y-0">
            <LabSignalRow
              label="cadastrar produto"
              note="abre o formulário completo de produto, custo, preço, estoque, combo e cozinha"
              tone="success"
              value="bloqueado"
            />
            <LabSignalRow
              label="vender produto"
              note="mantém a venda por localização, modalidade delivery, balcão ou mesa"
              tone="info"
              value="ao entrar"
            />
            <LabSignalRow
              label="produtos cadastrados"
              note="a tabela real volta com editar, vender, arquivar, reativar e excluir"
              tone="neutral"
              value="sim"
            />
            <LabSignalRow
              label="radar comercial"
              note="categoria líder, margem e estoque aparecem quando houver leitura financeira"
              tone="warning"
              value="real"
            />
          </div>

          <div className="pt-1">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              Entrar para liberar portfólio
            </Link>
          </div>
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">preview</LabStatusPill>}
        padding="md"
        title="O que abre no portfólio"
      >
        <div className="space-y-0">
          <LabSignalRow label="estoque" note="saldo, embalagem, alerta baixo e custo" tone="success" value="sim" />
          <LabSignalRow label="preço" note="custo, venda, margem e lucro potencial" tone="info" value="sim" />
          <LabSignalRow label="operação" note="cozinha, combos e venda direta por canal" tone="warning" value="sim" />
          <LabSignalRow label="arquivo" note="arquivar sem perder histórico comercial" tone="neutral" value="sim" />
        </div>
      </LabPanel>
    </div>
  )
}
