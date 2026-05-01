'use client'

import Link from 'next/link'
import { ChefHat, Radio } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  LAB_NUMERIC_SECTION_CLASS,
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabFactPill,
  LabMiniStat,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { ApiError, fetchOperationsLive } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { buildOperationsViewModel, OPERATIONS_LIVE_COMPACT_QUERY_KEY } from '@/lib/operations'
import type { OperationTimelineItem } from '@/lib/operations/operations-types'
import { formatMoney, formatShortTime } from '@/lib/operations/operations-visuals'
import { CaixaPanel } from '@/components/dashboard/caixa-panel'
import { PdvBoard } from '@/components/pdv/pdv-board'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import { calcTotal } from '@/components/pdv/pdv-types'

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
  const sessionError = sessionQuery.error instanceof ApiError ? sessionQuery.error : null

  const boardProducts = products
    .filter((product) => product.active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand ?? null,
      category: p.category,
      barcode: p.barcode ?? null,
      packagingClass: p.packagingClass,
      quantityLabel: p.quantityLabel ?? null,
      unitPrice: p.unitPrice,
      currency: String(p.currency),
      stock: p.stock,
      isLowStock: p.isLowStock,
      imageUrl: p.imageUrl ?? null,
      catalogSource: p.catalogSource ?? null,
      isCombo: p.isCombo ?? false,
      comboDescription: p.comboDescription ?? null,
      comboItems: p.comboItems ?? [],
    }))
  const operationsView = buildOperationsViewModel(operations)
  const comandas = buildPdvComandas(operations)
  const mesas = buildPdvMesas(operations)
  const abertas = comandas.filter((comanda) => comanda.status !== 'fechada')
  const openComandasCount = abertas.length
  const totalEmAberto = abertas.reduce((sum, comanda) => sum + calcTotal(comanda), 0)
  const kitchenItemsCount = operationsView.timelineItems.length
  const activeProductsCount = boardProducts.length
  const lowStockProductsCount = boardProducts.filter((product) => product.isLowStock).length
  const occupiedTables = mesas.filter((mesa) => mesa.status === 'ocupada').length
  const freeTables = mesas.filter((mesa) => mesa.status === 'livre').length
  const readyKitchenItems = operationsView.timelineItems.filter((item) => item.status === 'ready').length
  const inPreparationItems = operationsView.timelineItems.filter((item) => item.status === 'in_preparation').length
  const showExecutiveOperations = user?.role === 'OWNER'
  const heading = {
    grid: {
      eyebrow: 'Grid de produtos',
      title: 'PDV - Nova comanda',
      description: 'Produtos, comandas e cozinha.',
    },
    comandas: {
      eyebrow: 'Comandas abertas',
      title: 'Trilho de comandas',
      description: 'Mesas abertas e cobrança.',
    },
    kds: {
      eyebrow: 'KDS para cozinha',
      title: 'Fila de preparo',
      description: 'Fila e status de preparo.',
    },
    cobranca: {
      eyebrow: 'Cobranca focada',
      title: 'Fechamento e caixa',
      description: 'Fechamento, caixa e pendências.',
    },
  }[variant]

  if (sessionQuery.isLoading) {
    return (
      <LabPanel padding="md">
        <p className="text-sm text-[var(--text-soft)]">Carregando a sessão do PDV...</p>
      </LabPanel>
    )
  }

  if (!user) {
    return <PdvLockedState error={sessionError} heading={heading} />
  }

  const metrics = buildPdvOperationalMetrics({
    activeProductsCount,
    freeTables,
    inPreparationItems,
    kitchenItemsCount,
    lowStockProductsCount,
    occupiedTables,
    openComandasCount,
    readyKitchenItems,
    totalEmAberto,
    variant,
  })

  return (
    <section className="space-y-6">
      <PdvOperationalHeader
        dataUpdatedAt={operationsQuery.dataUpdatedAt}
        description={heading.description}
        eyebrow={heading.eyebrow}
        isFetching={operationsQuery.isFetching}
        metrics={metrics}
        title={heading.title}
      />

      {operationsError ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">
            Não foi possível carregar a operação viva agora. {operationsError}
          </p>
        </LabPanel>
      ) : null}

      {variant === 'kds' ? (
        <PdvKitchenQueuePanel items={operationsView.timelineItems} loading={operationsQuery.isLoading} />
      ) : null}

      {variant === 'cobranca' ? (
        <div className="space-y-6">
          {showExecutiveOperations ? <CaixaPanel operations={operations} /> : null}
          <PdvBoard
            mesaIntent={mesaIntent}
            operations={operations}
            products={boardProducts}
            variant="cobranca"
            onConsumeMesaIntent={onConsumeMesaIntent}
          />
        </div>
      ) : null}

      {variant === 'comandas' ? (
        <PdvBoard
          mesaIntent={mesaIntent}
          operations={operations}
          products={boardProducts}
          variant="comandas"
          onConsumeMesaIntent={onConsumeMesaIntent}
        />
      ) : null}

      {variant === 'grid' ? (
        <PdvBoard
          mesaIntent={mesaIntent}
          operations={operations}
          products={boardProducts}
          variant="grid"
          onConsumeMesaIntent={onConsumeMesaIntent}
        />
      ) : null}
    </section>
  )
}

function PdvLockedState({
  error,
  heading,
}: Readonly<{
  error: ApiError | null
  heading: {
    eyebrow: string
    title: string
    description: string
  }
}>) {
  const accessMessage = resolvePdvAccessMessage(error)

  return (
    <section className="space-y-6">
      <LabPageHeader
        description={heading.description}
        eyebrow={heading.eyebrow}
        meta={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">sessão</span>
              <LabStatusPill tone="warning">entrar</LabStatusPill>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">modo</span>
              <LabStatusPill tone="info">pdv</LabStatusPill>
            </div>
            <p className="text-xs leading-5 text-[var(--lab-fg-soft)]">{accessMessage}</p>
          </div>
        }
        title={heading.title}
      >
        <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          <LabMiniStat label="comandas abertas" value="0" />
          <LabMiniStat label="em aberto" value="R$ 0,00" />
          <LabMiniStat label="mesas ocupadas" value="0" />
          <LabMiniStat label="produtos ativos" value="0" />
        </div>
      </LabPageHeader>

      <LabPanel
        action={
          <Link
            className="inline-flex h-9 items-center rounded-[8px] border border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] px-3 text-sm font-medium text-[var(--lab-blue)] transition hover:bg-[var(--lab-surface-hover)]"
            href="/login"
          >
            Entrar
          </Link>
        }
        padding="md"
        title="PDV indisponível sem sessão"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-0">
            <LabSignalRow
              label="abrir comanda"
              note="libera mesa, cliente e inclusão de itens"
              tone="neutral"
              value="bloqueado"
            />
            <LabSignalRow label="cobrança" note="fechamento e repasse para caixa" tone="neutral" value="bloqueada" />
            <LabSignalRow label="cozinha" note="fila só aparece com operação viva" tone="neutral" value="bloqueada" />
            <LabSignalRow
              label="estoque"
              note="queda e alerta só entram com produto real"
              tone="neutral"
              value="bloqueado"
            />
          </div>

          <div className="flex flex-wrap gap-2 xl:content-start">
            <LabFactPill label="próximo passo" value="autenticar" />
            <LabFactPill label="superfície" value="pdv / comandas" />
            <LabFactPill label="origem" value="operação viva" />
          </div>
        </div>
      </LabPanel>
    </section>
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
    <LabPanel action={<ChefHat className="size-4 text-[var(--accent)]" />} padding="md" title="Fila de preparo">
      {loading ? (
        <div className="space-y-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="h-10 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--surface-muted)_46%,transparent)]"
              key={index}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.length > 0 ? (
            sortedItems.map((item) => (
              <div
                className="grid gap-3 rounded-[8px] border border-[var(--border)] px-4 py-3 md:grid-cols-[120px_minmax(0,1fr)_140px_auto]"
                key={item.id}
              >
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {formatShortTime(item.start)}
                </div>
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

type PdvOperationalMetric = {
  label: string
  value: string
  caption: string
  muted?: boolean
}

function PdvOperationalHeader({
  dataUpdatedAt,
  description,
  eyebrow,
  isFetching,
  metrics,
  title,
}: Readonly<{
  dataUpdatedAt: number
  description: string
  eyebrow: string
  isFetching: boolean
  metrics: PdvOperationalMetric[]
  title: string
}>) {
  return (
    <header className="space-y-5 border-b border-[var(--lab-border)] pb-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] tracking-[0.08em] text-[var(--lab-fg-muted)]">{eyebrow}</p>
          <h1 className="text-[32px] font-normal tracking-[-0.03em] text-[var(--lab-fg)] sm:text-[40px]">{title}</h1>
          <p className="max-w-2xl text-sm text-[var(--lab-fg-soft)]">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <LabStatusPill icon={<Radio className="size-3" />} tone={isFetching ? 'info' : 'success'}>
            {isFetching ? 'Sincronizando' : 'Ao vivo'}
          </LabStatusPill>
          <p className="text-xs text-[var(--lab-fg-muted)]">
            Última atualização {formatOperationalClock(dataUpdatedAt)}
          </p>
        </div>
      </div>

      <div className={`grid gap-4 xl:gap-0 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
        {metrics.map((metric, index) => (
          <div
            className={`min-w-0 py-1 xl:px-6 ${index > 0 ? 'xl:border-l xl:border-[var(--lab-border)]' : ''}`}
            key={metric.label}
          >
            <p className="text-[11px] tracking-[0.08em] text-[var(--lab-fg-muted)]">{metric.label}</p>
            <p
              className={`mt-2 ${LAB_NUMERIC_SECTION_CLASS} ${metric.muted ? 'text-[var(--lab-fg-muted)]' : 'text-[var(--lab-fg)]'}`}
            >
              {metric.value}
            </p>
            <p className="mt-2 text-xs text-[var(--lab-fg-soft)]">{metric.caption}</p>
          </div>
        ))}
      </div>
    </header>
  )
}

function buildPdvOperationalMetrics({
  activeProductsCount,
  freeTables,
  inPreparationItems,
  kitchenItemsCount,
  lowStockProductsCount,
  occupiedTables,
  openComandasCount,
  readyKitchenItems,
  totalEmAberto,
  variant,
}: Readonly<{
  activeProductsCount: number
  freeTables: number
  inPreparationItems: number
  kitchenItemsCount: number
  lowStockProductsCount: number
  occupiedTables: number
  openComandasCount: number
  readyKitchenItems: number
  totalEmAberto: number
  variant: NonNullable<PdvEnvironmentProps['variant']>
}>): PdvOperationalMetric[] {
  if (variant === 'kds') {
    return [
      {
        label: 'tickets na fila',
        value: String(kitchenItemsCount),
        caption: 'pedidos aguardando cozinha',
        muted: kitchenItemsCount === 0,
      },
      {
        label: 'em preparo',
        value: String(inPreparationItems),
        caption: 'itens já em execução',
        muted: inPreparationItems === 0,
      },
      {
        label: 'prontos',
        value: String(readyKitchenItems),
        caption: 'aguardando retirada',
        muted: readyKitchenItems === 0,
      },
      {
        label: 'comandas abertas',
        value: String(openComandasCount),
        caption: 'base ativa da operação',
        muted: openComandasCount === 0,
      },
    ]
  }

  if (variant === 'cobranca') {
    return [
      {
        label: 'comandas abertas',
        value: String(openComandasCount),
        caption: 'contas ainda em andamento',
        muted: openComandasCount === 0,
      },
      {
        label: 'em aberto',
        value: formatCurrency(totalEmAberto, 'BRL'),
        caption: 'valor ainda não liquidado',
        muted: totalEmAberto === 0,
      },
      {
        label: 'mesas ocupadas',
        value: String(occupiedTables),
        caption: `${freeTables} livres agora`,
        muted: occupiedTables === 0,
      },
      {
        label: 'fila cozinha',
        value: String(kitchenItemsCount),
        caption: 'acompanhe atrasos antes de cobrar',
        muted: kitchenItemsCount === 0,
      },
    ]
  }

  return [
    {
      label: 'comandas abertas',
      value: String(openComandasCount),
      caption: 'pedidos em serviço neste momento',
      muted: openComandasCount === 0,
    },
    {
      label: 'em aberto',
      value: formatCurrency(totalEmAberto, 'BRL'),
      caption: 'valor vivo da operação',
      muted: totalEmAberto === 0,
    },
    {
      label: 'mesas ocupadas',
      value: String(occupiedTables),
      caption: `${freeTables} livres agora`,
      muted: occupiedTables === 0,
    },
    {
      label: variant === 'grid' ? 'produtos ativos' : 'fila cozinha',
      value: variant === 'grid' ? String(activeProductsCount) : String(kitchenItemsCount),
      caption: variant === 'grid' ? `${lowStockProductsCount} com estoque baixo` : 'tickets aguardando preparo',
      muted: variant === 'grid' ? activeProductsCount === 0 : kitchenItemsCount === 0,
    },
  ]
}

function formatOperationalClock(timestamp: number) {
  if (!timestamp) {
    return 'agora'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function resolvePdvAccessMessage(error: ApiError | null) {
  if (!error) {
    return 'Faça login para abrir o PDV.'
  }

  if (error.status === 0) {
    return 'O PDV não carregou porque a API local não respondeu. Verifique se o backend está ativo em http://localhost:4000.'
  }

  if (error.status === 401) {
    return 'Sua sessão expirou. Entre novamente para abrir o PDV.'
  }

  return `Não foi possível abrir o PDV agora. ${error.message}`
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
