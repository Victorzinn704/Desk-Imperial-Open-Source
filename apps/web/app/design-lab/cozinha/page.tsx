'use client'

import Link from 'next/link'
import { ChefHat } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  LabEmptyState,
  LabFactPill,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import {
  buildKitchenSummary,
  CozinhaSummaryPanels,
} from '@/components/design-lab/sections/cozinha-summary-panels'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'
import { KitchenOrdersView } from '@/components/staff-mobile/kitchen-orders-view'
import { ApiError, fetchOperationsKitchen } from '@/lib/api'
import { OPERATIONS_KITCHEN_QUERY_KEY } from '@/lib/operations'

export default function DesignLabCozinhaPage() {
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user
  const kitchenQuery = useQuery({
    queryKey: OPERATIONS_KITCHEN_QUERY_KEY,
    queryFn: () => fetchOperationsKitchen(),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
  const errorMessage = kitchenQuery.error instanceof ApiError ? kitchenQuery.error.message : null
  const data = kitchenQuery.data
  const summary = buildKitchenSummary(data)
  const hasItems = summary.total > 0
  const isInitialLoading = !errorMessage && kitchenQuery.isLoading && !data

  return (
    <section className="space-y-5">
      <LabPageHeader
        description="Fila, preparo e pratos prontos."
        eyebrow="Operação da cozinha"
        title="Cozinha / KDS"
      />

      {sessionQuery.isLoading ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir a cozinha.</p>
        </LabPanel>
      ) : null}

      {!sessionQuery.isLoading && !user ? <KitchenLockedState /> : null}

      {errorMessage ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        </LabPanel>
      ) : null}

      {user && isInitialLoading ? (
        <LabPanel
          action={<LabStatusPill tone="info">sincronizando</LabStatusPill>}
          padding="md"
          title="Fila da cozinha"
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="h-12 animate-pulse rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)]" key={index} />
              ))}
            </div>

            <div className="space-y-0">
              <LabSignalRow label="fila" note="buscando pendências e tickets vivos" tone="info" value="carregando" />
              <LabSignalRow label="preparo" note="lendo itens em execução" tone="neutral" value="aguarde" />
              <LabSignalRow label="prontos" note="checando saída da cozinha" tone="neutral" value="aguarde" />
            </div>
          </div>
        </LabPanel>
      ) : null}

      {user && !errorMessage && !kitchenQuery.isLoading && hasItems ? (
        <LabPanel
          action={<LabStatusPill tone={summary.pressureTone}>{summary.total} itens</LabStatusPill>}
          padding="none"
          title="Fila viva da cozinha"
        >
          <KitchenOrdersView
            data={data}
            errorMessage={errorMessage}
            isLoading={kitchenQuery.isLoading}
            queryKey={OPERATIONS_KITCHEN_QUERY_KEY}
          />
        </LabPanel>
      ) : null}

      {user && !errorMessage && !kitchenQuery.isLoading && !hasItems ? <KitchenIdleState /> : null}

      {user && !errorMessage && hasItems ? <CozinhaSummaryPanels summary={summary} /> : null}
    </section>
  )
}

function KitchenLockedState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="warning">sessão necessária</LabStatusPill>}
        padding="md"
        title="Prévia travada da cozinha"
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: 'na fila', value: '4', note: 'aguardando início' },
              { label: 'em preparo', value: '2', note: 'já assumidos' },
              { label: 'prontos', value: '1', note: 'saída pendente' },
            ].map((item) => (
              <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4" key={item.label}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-[var(--lab-fg)]">{item.value}</p>
                <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{item.note}</p>
              </div>
            ))}
          </div>

          <div className="space-y-0">
            <LabSignalRow label="fila viva" note="o login libera tickets reais por mesa e produto" tone="warning" value="bloqueada" />
            <LabSignalRow label="próxima ação" note="a cozinha volta a mostrar avanço de status ao autenticar" tone="info" value="ao entrar" />
            <LabSignalRow label="item do topo" note="produto, observação e tempo de espera entram na mesma leitura" tone="neutral" value="ao entrar" />
          </div>

          <div className="pt-1">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/login"
            >
              Entrar para liberar cozinha
            </Link>
          </div>
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">preview</LabStatusPill>}
        padding="md"
        title="O que abre no KDS"
      >
        <div className="space-y-0">
          <LabSignalRow label="mesa do topo" note="define qual ticket pede atenção primeiro" tone="neutral" value="sim" />
          <LabSignalRow label="tempo de fila" note="mostra pressão do turno com leitura rápida" tone="info" value="sim" />
          <LabSignalRow label="avanço de status" note="na fila, preparo e pronto no mesmo fluxo" tone="success" value="sim" />
          <LabSignalRow label="saída da cozinha" note="entrega limpa o ticket do quadro" tone="neutral" value="sim" />
        </div>
      </LabPanel>
    </div>
  )
}

function KitchenIdleState() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="success">cozinha livre</LabStatusPill>}
        padding="md"
        title="Nenhum ticket ativo na cozinha"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
          <div className="space-y-5">
            <LabEmptyState
              compact
              description="Assim que um item exigir preparo, ele entra aqui com fila, responsável e próxima ação."
              icon={ChefHat}
              title="A fila está limpa neste momento"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <LabFactPill label="fila" value="0" />
              <LabFactPill label="preparo" value="0" />
              <LabFactPill label="prontos" value="0" />
            </div>
          </div>

          <div className="space-y-0 rounded-[18px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3">
            <LabSignalRow label="status" note="nenhum pedido aguardando execução agora" tone="success" value="livre" />
            <LabSignalRow label="próxima ação" note="manter monitoramento até o próximo ticket" tone="neutral" value="aguardar entrada" />
            <LabSignalRow label="turno" note="a leitura volta a ficar viva quando houver item de cozinha" tone="info" value="sem pressão" />
          </div>
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">checklist</LabStatusPill>}
        padding="md"
        title="Quando a fila volta"
      >
        <div className="space-y-0">
          <LabSignalRow label="na fila" note="novo item entrou e ainda não iniciou preparo" tone="warning" value="0 agora" />
          <LabSignalRow label="em preparo" note="ticket assumido por alguém da cozinha" tone="info" value="0 agora" />
          <LabSignalRow label="prontos" note="itens liberados para sair da cozinha" tone="success" value="0 agora" />
          <LabSignalRow label="operação" note="o KDS assume o topo da leitura assim que a fila reaparecer" tone="neutral" value="em espera" />
        </div>
      </LabPanel>
    </div>
  )
}
