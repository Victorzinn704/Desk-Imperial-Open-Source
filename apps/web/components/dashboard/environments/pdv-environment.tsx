'use client'

import { ChefHat, ClipboardList, Tags } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { LabPageHeader, LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { ApiError, fetchOperationsLive } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { buildOperationsViewModel, OPERATIONS_LIVE_COMPACT_QUERY_KEY } from '@/lib/operations'
import type { OperationGridRow, OperationTimelineItem } from '@/lib/operations/operations-types'
import { formatMoney, formatShortTime } from '@/lib/operations/operations-visuals'
import { CaixaPanel } from '@/components/dashboard/caixa-panel'
import { PdvBoard } from '@/components/pdv/pdv-board'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'

type PdvEnvironmentProps = {
  mesaIntent?: PdvMesaIntent | null
  onConsumeMesaIntent?: () => void
  variant?: 'grid' | 'comandas' | 'kds' | 'cobranca'
}

export function PdvEnvironment({
  mesaIntent = null,
  onConsumeMesaIntent,
  variant = 'grid',
}: Readonly<PdvEnvironmentProps>) {
  const { productsQuery, sessionQuery } = useDashboardQueries({ section: 'pdv' })

  const user = sessionQuery.data?.user
  const operationsQuery = useQuery({
    queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    enabled: Boolean(user?.userId),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })

  const products = productsQuery.data?.items ?? []
  const operations = operationsQuery.data
  const operationsError = operationsQuery.error instanceof ApiError ? operationsQuery.error.message : null

  const boardProducts = products
    .filter((product) => product.active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unitPrice: p.unitPrice,
      currency: String(p.currency),
      stock: p.stock,
      isLowStock: p.isLowStock,
      isCombo: p.isCombo ?? false,
      comboDescription: p.comboDescription ?? null,
      comboItems: p.comboItems ?? [],
    }))
  const operationsView = buildOperationsViewModel(operations)
  const showExecutiveOperations = user?.role === 'OWNER'
  const heading = {
    grid: {
      eyebrow: 'Grid de produtos',
      title: 'PDV - Nova comanda',
      description: 'Venda por produto com comanda lateral e leitura curta do que esta vivo agora.',
    },
    comandas: {
      eyebrow: 'Comandas abertas',
      title: 'Trilho de comandas',
      description: 'As comandas sobem para a frente e o grid de venda fica como apoio, nao como protagonista.',
    },
    kds: {
      eyebrow: 'KDS para cozinha',
      title: 'Fila de preparo',
      description: 'Priorize a cozinha, acompanhe o fluxo por etapa e deixe o PDV como apoio do preparo.',
    },
    cobranca: {
      eyebrow: 'Cobranca focada',
      title: 'Fechamento e caixa',
      description: 'Caixa, fechamento e divergencias primeiro; a venda continua disponivel sem brigar com a tela.',
    },
  }[variant]

  if (!user) {return null}

  return (
    <section className="space-y-6">
      <LabPageHeader
        description={heading.description}
        eyebrow={heading.eyebrow}
        meta={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">comandas abertas</span>
              <LabStatusPill tone="neutral">{operationsView.rows.reduce((sum, row) => sum + row.employee.activeTables.length, 0)}</LabStatusPill>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--lab-fg-soft)]">
              <Tags className="size-4 text-[var(--accent)]" />
              leitura operacional do PDV
            </div>
          </div>
        }
        title={heading.title}
      />

      {variant === 'kds' ? (
        <div className="space-y-6">
          {operationsError ? (
            <LabPanel padding="md">
              Nao foi possivel carregar a operacao viva agora. {operationsError}
            </LabPanel>
          ) : null}
          <PdvKitchenQueuePanel items={operationsView.timelineItems} loading={operationsQuery.isLoading} />
          <PdvBoard
            mesaIntent={mesaIntent}
            onConsumeMesaIntent={onConsumeMesaIntent}
            operations={operations}
            products={boardProducts}
          />
        </div>
      ) : null}

      {variant === 'cobranca' ? (
        <div className="space-y-6">
          {showExecutiveOperations ? <CaixaPanel operations={operations} /> : null}
          <PdvBoard
            mesaIntent={mesaIntent}
            onConsumeMesaIntent={onConsumeMesaIntent}
            operations={operations}
            products={boardProducts}
          />
        </div>
      ) : null}

      {variant === 'comandas' ? (
        <div className="space-y-6">
          {showExecutiveOperations ? (
            <PdvOperationsSummaryPanel loading={operationsQuery.isLoading} rows={operationsView.rows} />
          ) : null}
          <PdvBoard
            mesaIntent={mesaIntent}
            onConsumeMesaIntent={onConsumeMesaIntent}
            operations={operations}
            products={boardProducts}
          />
          <PdvKitchenQueuePanel items={operationsView.timelineItems} loading={operationsQuery.isLoading} />
        </div>
      ) : null}

      {variant === 'grid' ? (
        <>
          <PdvBoard
            mesaIntent={mesaIntent}
            onConsumeMesaIntent={onConsumeMesaIntent}
            operations={operations}
            products={boardProducts}
          />
          {showExecutiveOperations ? (
            <div className="space-y-6">
              <CaixaPanel operations={operations} />
              {operationsError ? (
                <LabPanel padding="md">
                  Nao foi possivel carregar a operacao viva agora. {operationsError}
                </LabPanel>
              ) : null}
              <PdvOperationsSummaryPanel loading={operationsQuery.isLoading} rows={operationsView.rows} />
              <PdvKitchenQueuePanel items={operationsView.timelineItems} loading={operationsQuery.isLoading} />
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function OperationsPanelSkeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
      {Array.from({ length: lines }).map((_, index) => (
        <div className="h-10 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--surface-muted)_46%,transparent)]" key={index} />
      ))}
    </div>
  )
}

function PdvOperationsSummaryPanel({
  rows,
  loading,
}: Readonly<{
  rows: OperationGridRow[]
  loading: boolean
}>) {
  return (
    <LabPanel
      action={<ClipboardList className="size-4 text-[var(--accent)]" />}
      padding="md"
      subtitle="Um quadro curto para saber quem esta com mesa aberta e como o caixa esta caminhando."
      title="Mesas, caixa e atendimento"
    >
      {loading ? (
        <OperationsPanelSkeleton lines={4} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-dashed border-[var(--border-strong)] text-left text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                <th className="px-0 py-3 font-semibold">Equipe</th>
                <th className="px-0 py-3 font-semibold">Mesas abertas</th>
                <th className="px-0 py-3 font-semibold text-right">Receita</th>
                <th className="px-0 py-3 font-semibold text-right">Lucro</th>
                <th className="px-0 py-3 font-semibold text-right">Caixa</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr className="border-b border-dashed border-[var(--border)]" key={row.employee.employeeId}>
                    <td className="px-0 py-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{row.employee.employeeName}</p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">{row.employee.employeeCode}</p>
                    </td>
                    <td className="px-0 py-3 text-[var(--text-soft)]">{row.employee.activeTables.join(', ') || 'sem mesa aberta'}</td>
                    <td className="px-0 py-3 text-right text-[var(--text-primary)]">{formatMoney(row.employee.salesRevenue)}</td>
                    <td className="px-0 py-3 text-right text-[var(--text-soft)]">{formatMoney(row.employee.salesProfit)}</td>
                    <td className="px-0 py-3 text-right text-[var(--text-soft)]">{formatMoney(row.employee.cashCurrentAmount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-0 py-8 text-sm text-[var(--text-soft)]" colSpan={5}>
                    Nenhuma leitura operacional disponivel agora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </LabPanel>
  )
}

function PdvKitchenQueuePanel({
  items,
  loading,
}: Readonly<{
  items: OperationTimelineItem[]
  loading: boolean
}>) {
  const sortedItems = [...items].sort((left, right) => new Date(right.start).getTime() - new Date(left.start).getTime())

  return (
    <LabPanel
      action={<ChefHat className="size-4 text-[var(--accent)]" />}
      padding="md"
      subtitle="Sequencia viva da cozinha e do atendimento, sem o visual escuro dos componentes antigos."
      title="Fila de preparo"
    >
      {loading ? (
        <OperationsPanelSkeleton lines={5} />
      ) : (
        <div className="space-y-3">
          {sortedItems.length > 0 ? (
            sortedItems.map((item) => (
              <div className="grid gap-3 rounded-[8px] border border-[var(--border)] px-4 py-3 md:grid-cols-[120px_minmax(0,1fr)_140px_auto]" key={item.id}>
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{formatShortTime(item.start)}</div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    Mesa {item.tableLabel} · {item.employeeName}
                  </p>
                </div>
                <div className="text-sm text-[var(--text-soft)]">{formatMoney(item.amount)}</div>
                <PdvStatusPill status={item.status} />
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--text-soft)]">Sem itens de cozinha no momento.</p>
          )}
        </div>
      )}
    </LabPanel>
  )
}

function PdvStatusPill({ status }: Readonly<{ status: OperationTimelineItem['status'] }>) {
  const copy = {
    open: { label: 'Aberta', tone: 'neutral' as const },
    in_preparation: { label: 'Preparo', tone: 'warning' as const },
    ready: { label: 'Pronta', tone: 'success' as const },
    closed: { label: 'Fechada', tone: 'info' as const },
  }[status]

  return <LabStatusPill tone={copy.tone}>{copy.label}</LabStatusPill>
}
