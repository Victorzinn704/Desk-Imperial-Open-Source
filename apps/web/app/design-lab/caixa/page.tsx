'use client'

import Link from 'next/link'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'
import { CaixaSummaryPanels } from '@/components/design-lab/sections/caixa-summary-panels'
import { CaixaPanel } from '@/components/dashboard/caixa-panel'
import { ApiError, fetchOperationsLive } from '@/lib/api'
import { buildOperationsExecutiveKpis, OPERATIONS_LIVE_COMPACT_QUERY_KEY } from '@/lib/operations'

export default function DesignLabCaixaPage() {
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user
  const operationsQuery = useQuery({
    queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })
  const errorMessage = operationsQuery.error instanceof ApiError ? operationsQuery.error.message : null
  const operations = operationsQuery.data
  const kpis = buildOperationsExecutiveKpis(operations)
  const isInitialLoading = !errorMessage && operationsQuery.isLoading && !operations
  const showSummaryPanels =
    !operationsQuery.isLoading &&
    !errorMessage &&
    Boolean(
      kpis.openSessionsCount > 0 ||
        kpis.openComandasCount > 0 ||
        kpis.receitaRealizada > 0 ||
        kpis.faturamentoAberto > 0 ||
        kpis.projecaoTotal > 0,
    )

  return (
    <section className="space-y-5">
      <LabPageHeader
        description="Abertura, fechamento e conferência."
        eyebrow="Operação de caixa"
        title="Caixa"
      />

      {sessionQuery.isLoading ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir o caixa.</p>
        </LabPanel>
      ) : null}

      {!sessionQuery.isLoading && !user ? <CaixaLockedState /> : null}

      {user && isInitialLoading ? (
        <LabPanel
          action={<LabStatusPill tone="info">sincronizando</LabStatusPill>}
          padding="md"
          title="Caixa do dia"
        >
          <div className="space-y-0">
            <LabSignalRow label="receita" note="lendo fechamentos já consolidados" tone="neutral" value="aguarde" />
            <LabSignalRow label="caixa esperado" note="buscando referência do fechamento atual" tone="info" value="carregando" />
            <LabSignalRow label="comandas abertas" note="checando pendências antes do encerramento" tone="neutral" value="aguarde" />
          </div>
        </LabPanel>
      ) : null}

      {user && !errorMessage && !operationsQuery.isLoading ? <CaixaPanel operations={operations} /> : null}

      {user && showSummaryPanels ? <CaixaSummaryPanels operations={operations} /> : null}

      {errorMessage ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        </LabPanel>
      ) : null}
    </section>
  )
}

function CaixaLockedState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Prévia travada do caixa"
      >
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: 'receita', value: 'R$ 5.730,00', note: 'fechamentos do turno' },
            { label: 'lucro', value: 'R$ 1.993,70', note: 'resultado líquido' },
            { label: 'comandas', value: '12', note: 'ainda abertas' },
            { label: 'status', value: 'pendente', note: 'aguardando login' },
          ].map((item) => (
            <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4" key={item.label}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{item.label}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--lab-fg)]">{item.value}</p>
              <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-0">
          <LabSignalRow label="abrir caixa" note="o login libera a abertura real do turno" tone="info" value="ao entrar" />
          <LabSignalRow label="fechamento" note="conferência e diferença só aparecem com sessão ativa" tone="neutral" value="bloqueado" />
          <LabSignalRow label="próxima ação" note="o painel volta a mostrar caixa esperado, lucro e pendências" tone="warning" value="autenticar" />
        </div>

        <div className="pt-5">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
            href="/login"
          >
            Entrar para liberar caixa
          </Link>
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">preview</LabStatusPill>}
        padding="md"
        title="O que abre no caixa"
      >
        <div className="space-y-0">
          <LabSignalRow label="abertura" note="define valor inicial e observações do turno" tone="neutral" value="sim" />
          <LabSignalRow label="fechamento" note="confere contado, diferença e bloqueios por comanda" tone="success" value="sim" />
          <LabSignalRow label="radar do turno" note="receita, lucro esperado e próxima ação" tone="info" value="sim" />
          <LabSignalRow label="controle real" note="o CTA operacional deixa de ser só visual" tone="neutral" value="sim" />
        </div>
      </LabPanel>
    </div>
  )
}
