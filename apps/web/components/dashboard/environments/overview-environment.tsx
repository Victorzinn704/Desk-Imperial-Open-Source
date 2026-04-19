'use client'

import {
  Activity,
  ArrowUpRight,
  ClipboardList,
  Newspaper,
  Radar,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { ApiError } from '@/lib/api'
import {
  LabMetric,
  LabPageHeader,
  LabPanel,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { MetricCard } from '@/components/dashboard/metric-card'
import { OverviewTopProducts } from '@/components/dashboard/overview-top-products'
import { OverviewRecentOrders } from '@/components/dashboard/overview-recent-orders'
import { formatCurrency } from '@/lib/currency'
import { SalesPerformanceCard } from '@/components/dashboard/sales-performance-card'

type OverviewVariant = 'principal' | 'layout' | 'meta' | 'operacional' | 'editorial'

type OverviewSnapshot = {
  companyName: string
  currentRevenue: number
  currentProfit: number
  completedOrders: number
  averageMargin: number
  averageTicket: number
  lowStockItems: number
  revenueGrowth: number
  profitGrowth: number
  displayCurrency: string
  topProductName: string | null
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Math.abs(value) < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function OverviewEnvironment({ variant = 'principal' }: Readonly<{ variant?: OverviewVariant }>) {
  const { sessionQuery, financeQuery, ordersQuery } = useDashboardQueries({
    section: 'overview',
  })

  const user = sessionQuery.data?.user
  const finance = financeQuery.data
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
  const ordersTotals = ordersQuery.data?.totals
  const financeTotals = finance?.totals
  const displayCurrency = finance?.displayCurrency ?? 'BRL'

  if (!user) {return null}

  const snapshot: OverviewSnapshot = {
    companyName: user.companyName ?? 'Desk Imperial',
    currentRevenue: financeTotals?.currentMonthRevenue ?? 0,
    currentProfit: financeTotals?.currentMonthProfit ?? 0,
    completedOrders: ordersTotals?.completedOrders ?? financeTotals?.completedOrders ?? 0,
    averageMargin: financeTotals?.averageMarginPercent ?? 0,
    averageTicket:
      (ordersTotals?.completedOrders ?? financeTotals?.completedOrders ?? 0) > 0
        ? (financeTotals?.currentMonthRevenue ?? 0) / Math.max(1, ordersTotals?.completedOrders ?? financeTotals?.completedOrders ?? 0)
        : 0,
    lowStockItems: financeTotals?.lowStockItems ?? 0,
    revenueGrowth: financeTotals?.revenueGrowthPercent ?? 0,
    profitGrowth: financeTotals?.profitGrowthPercent ?? 0,
    displayCurrency,
    topProductName: finance?.topProducts?.[0]?.name ?? null,
  }

  const commonProps = {
    finance,
    financeError,
    isLoading: financeQuery.isLoading,
    snapshot,
  }

  switch (variant) {
    case 'layout':
      return <OverviewLayoutView {...commonProps} />
    case 'meta':
      return <OverviewMetaView {...commonProps} />
    case 'operacional':
      return <OverviewOperationalView {...commonProps} />
    case 'editorial':
      return <OverviewEditorialView {...commonProps} />
    case 'principal':
    default:
      return <OverviewPrincipalView {...commonProps} />
  }
}

export function DesignLabOverviewEnvironment() {
  const { sessionQuery, financeQuery, ordersQuery } = useDashboardQueries({
    section: 'overview',
  })

  const user = sessionQuery.data?.user
  const finance = financeQuery.data
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
  const ordersTotals = ordersQuery.data?.totals
  const financeTotals = finance?.totals
  const displayCurrency = finance?.displayCurrency ?? 'BRL'

  if (!user) {return null}

  const snapshot: OverviewSnapshot = {
    companyName: user.companyName ?? 'Desk Imperial',
    currentRevenue: financeTotals?.currentMonthRevenue ?? 0,
    currentProfit: financeTotals?.currentMonthProfit ?? 0,
    completedOrders: ordersTotals?.completedOrders ?? financeTotals?.completedOrders ?? 0,
    averageMargin: financeTotals?.averageMarginPercent ?? 0,
    averageTicket:
      (ordersTotals?.completedOrders ?? financeTotals?.completedOrders ?? 0) > 0
        ? (financeTotals?.currentMonthRevenue ?? 0) / Math.max(1, ordersTotals?.completedOrders ?? financeTotals?.completedOrders ?? 0)
        : 0,
    lowStockItems: financeTotals?.lowStockItems ?? 0,
    revenueGrowth: financeTotals?.revenueGrowthPercent ?? 0,
    profitGrowth: financeTotals?.profitGrowthPercent ?? 0,
    displayCurrency,
    topProductName: finance?.topProducts?.[0]?.name ?? null,
  }

  const targetRevenue = Math.max(
    snapshot.currentRevenue * 1.14,
    snapshot.currentRevenue + Math.max(snapshot.averageTicket * 18, 1200),
  )
  const targetProgress = targetRevenue > 0 ? clamp((snapshot.currentRevenue / targetRevenue) * 100, 0, 100) : 0
  const dailyRevenueNeed = Math.max(targetRevenue - snapshot.currentRevenue, 0) / Math.max(1, daysLeftInMonth())
  const revenueTone: LabStatusTone = snapshot.revenueGrowth >= 0 ? 'success' : 'danger'
  const profitTone: LabStatusTone = snapshot.currentProfit >= 0 ? 'success' : 'danger'
  const stockTone: LabStatusTone = snapshot.lowStockItems > 0 ? 'warning' : 'success'

  return (
    <section className="space-y-6">
      <LabPageHeader
        eyebrow="visão geral da operação"
        title="Overview"
        description="Resumo executivo com leitura de receita, resultado, ritmo operacional e alertas comerciais sem o peso de widgets genéricos."
        meta={
          <div className="space-y-3">
            <LabMetaRow
              label="Empresa"
              tone="neutral"
              value={snapshot.companyName}
            />
            <LabMetaRow
              label="Receita vs mês anterior"
              tone={revenueTone}
              value={`${snapshot.revenueGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.revenueGrowth)}`}
            />
            <LabMetaRow
              label="Lucro do mês"
              tone={profitTone}
              value={formatCurrency(snapshot.currentProfit, snapshot.displayCurrency as 'BRL')}
            />
            <LabMetaRow
              label="Estoque crítico"
              tone={stockTone}
              value={snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens` : 'Sem alerta'}
            />
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          <LabStatusPill tone="info">ticket {formatCurrency(snapshot.averageTicket, snapshot.displayCurrency as 'BRL')}</LabStatusPill>
          <LabStatusPill tone={snapshot.averageMargin >= 30 ? 'success' : 'warning'}>
            margem {formatPercent(snapshot.averageMargin)}
          </LabStatusPill>
          <LabStatusPill tone={stockTone}>
            {snapshot.lowStockItems > 0 ? 'reposição no radar' : 'estoque estável'}
          </LabStatusPill>
          {snapshot.topProductName ? <LabStatusPill tone="neutral">destaque {snapshot.topProductName}</LabStatusPill> : null}
        </div>
      </LabPageHeader>

      <div className="grid gap-4 xl:grid-cols-4">
        <LabMetric
          className="xl:col-span-2"
          delta={`${snapshot.revenueGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.revenueGrowth)}`}
          deltaTone={revenueTone}
          hint={`Meta projetada ${formatCurrency(targetRevenue, snapshot.displayCurrency as 'BRL')}. ${targetProgress >= 100 ? 'A meta já foi coberta pelo ritmo atual.' : `Faltam ${formatCurrency(dailyRevenueNeed, snapshot.displayCurrency as 'BRL')} por dia útil para fechar o mês com folga.`}`}
          icon={Wallet}
          label="Receita do mês"
          progress={targetProgress}
          value={formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency as 'BRL')}
        />
        <LabMetric
          delta={`${snapshot.profitGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.profitGrowth)}`}
          deltaTone={snapshot.profitGrowth >= 0 ? 'success' : 'danger'}
          hint="Resultado líquido acumulado no recorte atual."
          icon={ArrowUpRight}
          label="Lucro do mês"
          value={formatCurrency(snapshot.currentProfit, snapshot.displayCurrency as 'BRL')}
        />
        <LabMetric
          delta={snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens` : 'Sem alerta'}
          deltaTone={stockTone}
          hint={snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos já converteram em caixa.` : 'Ainda sem fechamento no período.'}
          icon={Activity}
          label="Pedidos fechados"
          value={String(snapshot.completedOrders)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px] xl:items-start">
        <ChartOrError finance={finance} financeError={financeError} isLoading={financeQuery.isLoading} surface="lab" />
        <LabPanel
          title="Radar comercial"
          subtitle="Leitura rápida para decidir o próximo movimento do turno"
          padding="md"
        >
          <div className="space-y-4">
            <LabSignalRow
              label="Ticket médio"
              note="Valor médio por pedido fechado."
              tone="info"
              value={formatCurrency(snapshot.averageTicket, snapshot.displayCurrency as 'BRL')}
            />
            <LabSignalRow
              label="Margem média"
              note="Qualidade do mix vendido neste período."
              tone={snapshot.averageMargin >= 30 ? 'success' : 'warning'}
              value={formatPercent(snapshot.averageMargin)}
            />
            <LabSignalRow
              label="Produto líder"
              note="Item com maior tração comercial até agora."
              tone="neutral"
              value={snapshot.topProductName ?? 'Sem destaque claro'}
            />
            <LabSignalRow
              label="Próxima ação"
              note="Sinal operacional derivado do estado atual."
              tone={snapshot.lowStockItems > 0 ? 'warning' : 'success'}
              value={snapshot.lowStockItems > 0 ? 'Repor insumos do campeão de vendas' : 'Sustentar giro do item que lidera o caixa'}
            />
          </div>
        </LabPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <OverviewRecentOrders
          displayCurrency={snapshot.displayCurrency as 'BRL'}
          isLoading={financeQuery.isLoading}
          orders={finance?.recentOrders ?? []}
          summaryText={snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos` : null}
          surface="lab"
        />
        <OverviewTopProducts finance={finance} isLoading={financeQuery.isLoading} surface="lab" />
      </div>
    </section>
  )
}

function LabMetaRow({
  label,
  value,
  tone,
}: Readonly<{
  label: string
  value: string
  tone: LabStatusTone
}>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs uppercase text-[var(--lab-fg-muted)]">{label}</span>
      <span className={`max-w-[56%] text-right ${labToneClass(tone)}`}>{value}</span>
    </div>
  )
}

function LabSignalRow({
  label,
  note,
  value,
  tone,
}: Readonly<{
  label: string
  note: string
  value: string
  tone: LabStatusTone
}>) {
  return (
    <article className="rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase text-[var(--lab-fg-muted)]">{label}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--lab-fg-soft)]">{note}</p>
        </div>
        <span className={`max-w-[42%] text-right text-sm font-medium leading-6 ${labToneClass(tone)}`}>{value}</span>
      </div>
    </article>
  )
}

function labToneClass(tone: LabStatusTone) {
  return {
    neutral: 'text-[var(--lab-fg)]',
    info: 'text-[var(--lab-blue)]',
    success: 'text-[var(--lab-success)]',
    warning: 'text-[var(--lab-warning)]',
    danger: 'text-[var(--lab-danger)]',
  }[tone]
}

function daysLeftInMonth() {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return Math.max(daysInMonth - today.getDate(), 1)
}

function OverviewPrincipalView({
  finance,
  financeError,
  isLoading,
  snapshot,
}: Readonly<OverviewViewProps>) {
  const principalLedger = [
    {
      label: 'pedidos fechados',
      value: String(snapshot.completedOrders),
      note: 'volume já convertido em caixa',
      tone: 'soft' as const,
    },
    {
      label: 'ticket médio',
      value: formatCurrency(snapshot.averageTicket, snapshot.displayCurrency as 'BRL'),
      note: 'quanto cada pedido entrega',
      tone: 'accent' as const,
    },
    {
      label: 'margem média',
      value: formatPercent(snapshot.averageMargin),
      note: 'qualidade do mix vendido',
      tone: snapshot.averageMargin >= 30 ? 'success' as const : 'warning' as const,
    },
    {
      label: 'lucro do mês',
      value: formatCurrency(snapshot.currentProfit, snapshot.displayCurrency as 'BRL'),
      note: 'resultado líquido atual',
      tone: snapshot.currentProfit >= 0 ? 'success' as const : 'danger' as const,
    },
    {
      label: 'estoque baixo',
      value: snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens` : 'sem alerta crítico',
      note: snapshot.lowStockItems > 0 ? 'reposições precisam entrar no radar' : 'sem ruptura crítica agora',
      tone: snapshot.lowStockItems > 0 ? 'warning' as const : 'soft' as const,
    },
    {
      label: 'produto líder',
      value: snapshot.topProductName ?? 'sem destaque claro',
      note: 'item que está puxando o caixa',
      tone: 'accent' as const,
    },
  ]

  return (
    <section className="space-y-5">
      <article className="imperial-card grid gap-5 p-5 xl:grid-cols-[minmax(0,1.45fr)_320px] xl:items-start">
        <div>
          <SectionEyebrow icon={Sparkles} label="principal desk imperial" />
          <h2 className="mt-2 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[2rem] font-semibold leading-tight text-[var(--text-primary)]">
            A leitura que abre o Desk Imperial sem peso de dashboard genérico
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-soft)]">
            Receita, lucro, ritmo de pedidos e sinais de atenção em uma composição mais editorial. O foco aqui é entender o negócio em segundos e só depois aprofundar.
          </p>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(260px,0.6fr)_minmax(0,1fr)] xl:items-stretch">
            <div className="border-b border-dashed border-[var(--border)] pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">receita do mês</p>
              <p className="mt-2 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[clamp(2.6rem,5vw,4rem)] leading-none text-[var(--text-primary)]">
                {formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency as 'BRL')}
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-soft)]">
                {snapshot.revenueGrowth >= 0
                  ? 'A receita caminha acima do período anterior e abre espaço para puxar margem sem perder giro.'
                  : 'O mês ainda pede recomposição de ritmo. Vale conferir conversão, mix e recorrência de comandas.'}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InlineStat
                  label="crescimento"
                  value={`${snapshot.revenueGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.revenueGrowth)}`}
                />
                <InlineStat
                  label="lucro"
                  value={formatCurrency(snapshot.currentProfit, snapshot.displayCurrency as 'BRL')}
                />
              </div>
            </div>
            <DataLedger columns={3} items={principalLedger} />
          </div>
        </div>

        <OverviewBriefPanel
          entries={[
            {
              label: 'crescimento de receita',
              value: `${snapshot.revenueGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.revenueGrowth)}`,
              tone: snapshot.revenueGrowth >= 0 ? 'success' : 'danger',
            },
            {
              label: 'crescimento de lucro',
              value: `${snapshot.profitGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.profitGrowth)}`,
              tone: snapshot.profitGrowth >= 0 ? 'success' : 'danger',
            },
            {
              label: 'estoque baixo',
              value: snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens` : 'sem alerta crítico',
              tone: snapshot.lowStockItems > 0 ? 'warning' : 'soft',
            },
            {
              label: 'produto que puxa caixa',
              value: snapshot.topProductName ?? 'sem vendas registradas',
              tone: 'accent',
            },
          ]}
          title="radar do turno"
        />
      </article>

      <StandardMetricGrid isLoading={isLoading} snapshot={snapshot} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewBriefPanel
          entries={[
            {
              label: 'empresa',
              value: snapshot.companyName,
              tone: 'soft',
            },
            {
              label: 'lucro do mês',
              value: formatCurrency(snapshot.currentProfit, snapshot.displayCurrency as 'BRL'),
              tone: snapshot.currentProfit >= 0 ? 'success' : 'danger',
            },
            {
              label: 'ritmo do caixa',
              value: snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos concluídos` : 'sem fechamento ainda',
              tone: 'accent',
            },
          ]}
          title="sinais rápidos"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <OverviewRecentOrders
          displayCurrency={snapshot.displayCurrency as 'BRL'}
          isLoading={isLoading}
          orders={finance?.recentOrders ?? []}
          summaryText={snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos` : null}
        />
        <OverviewTopProducts finance={finance} isLoading={isLoading} />
      </div>
    </section>
  )
}

function OverviewLayoutView({
  finance,
  financeError,
  isLoading,
  snapshot,
}: Readonly<OverviewViewProps>) {
  return (
    <section className="space-y-5">
      <StandardMetricGrid isLoading={isLoading} snapshot={snapshot} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewTopProducts finance={finance} isLoading={isLoading} />
      </div>

      <OverviewRecentOrders
        displayCurrency={snapshot.displayCurrency as 'BRL'}
        isLoading={isLoading}
        orders={finance?.recentOrders ?? []}
        summaryText={snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos` : null}
      />
    </section>
  )
}

function OverviewMetaView({
  finance,
  financeError,
  isLoading,
  snapshot,
}: Readonly<OverviewViewProps>) {
  const targetRevenue = Math.max(snapshot.currentRevenue * 1.18, snapshot.currentRevenue + Math.max(snapshot.averageTicket * 20, 1000))
  const targetProgress = targetRevenue > 0 ? clamp((snapshot.currentRevenue / targetRevenue) * 100, 0, 100) : 0
  const today = new Date()
  const elapsedDays = Math.max(today.getDate(), 1)
  const monthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const remainingDays = Math.max(monthDays - elapsedDays, 1)
  const revenueGap = Math.max(targetRevenue - snapshot.currentRevenue, 0)
  const ordersNeeded = snapshot.averageTicket > 0 ? Math.ceil(revenueGap / snapshot.averageTicket) : 0
  const dailyNeed = revenueGap > 0 ? revenueGap / remainingDays : 0
  const projectedClose = elapsedDays > 0 ? (snapshot.currentRevenue / elapsedDays) * monthDays : snapshot.currentRevenue
  const metaLedger = [
    {
      label: 'meta projetada',
      value: formatCurrency(targetRevenue, snapshot.displayCurrency as 'BRL'),
      note: 'patamar comercial esperado para o mês',
      tone: 'soft' as const,
    },
    {
      label: 'falta para bater',
      value: revenueGap > 0 ? formatCurrency(revenueGap, snapshot.displayCurrency as 'BRL') : 'meta superada',
      note: revenueGap > 0 ? 'gap restante até o alvo' : 'já está acima do objetivo',
      tone: revenueGap > 0 ? 'warning' as const : 'success' as const,
    },
    {
      label: 'média por dia',
      value: revenueGap > 0 ? formatCurrency(dailyNeed, snapshot.displayCurrency as 'BRL') : 'folga diária',
      note: `${remainingDays} dias restantes para fechar o mês`,
      tone: revenueGap > 0 ? 'accent' as const : 'success' as const,
    },
    {
      label: 'pedidos necessários',
      value: revenueGap > 0 ? `${ordersNeeded}` : '0',
      note: 'mantendo o ticket médio atual',
      tone: revenueGap > 0 ? 'soft' as const : 'success' as const,
    },
    {
      label: 'projeção de fechamento',
      value: formatCurrency(projectedClose, snapshot.displayCurrency as 'BRL'),
      note: projectedClose >= targetRevenue ? 'o ritmo atual entrega a meta' : 'o ritmo atual ainda fica abaixo do alvo',
      tone: projectedClose >= targetRevenue ? 'success' as const : 'warning' as const,
    },
    {
      label: 'alavanca principal',
      value: snapshot.topProductName ?? 'mix da casa',
      note: 'produto com maior chance de puxar a receita',
      tone: 'accent' as const,
    },
  ]

  return (
    <section className="space-y-5">
      <article className="imperial-card grid gap-5 p-5 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)_320px] xl:items-start">
        <div className="border-b border-dashed border-[var(--border)] pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5">
          <SectionEyebrow icon={Target} label="kpi hero com meta" />
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">meta comercial do mês</p>
          <p className="mt-2 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[clamp(3rem,5.6vw,4.8rem)] leading-none text-[var(--text-primary)]">
            {formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency as 'BRL')}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
            Aqui a leitura favorece um único número dominante, progresso visível e contexto curto para orientar a rotina comercial antes de mergulhar no resto do painel.
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 text-[12px] text-[var(--text-soft)]">
              <span>meta projetada</span>
              <span>{formatCurrency(targetRevenue, snapshot.displayCurrency as 'BRL')}</span>
            </div>
            <ProgressBar value={targetProgress} />
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <span>{formatPercent(targetProgress)} atingido</span>
              <span>{snapshot.revenueGrowth >= 0 ? 'crescimento saudável' : 'atenção na conversão'}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">desdobramento da meta</p>
          <div className="mt-3">
            <DataLedger columns={2} items={metaLedger} />
          </div>
        </div>

        <OverviewBriefPanel
          entries={[
            {
              label: 'ticket médio',
              value: formatCurrency(snapshot.averageTicket, snapshot.displayCurrency as 'BRL'),
              tone: 'accent',
            },
            {
              label: 'lucro do mês',
              value: formatCurrency(snapshot.currentProfit, snapshot.displayCurrency as 'BRL'),
              tone: snapshot.currentProfit >= 0 ? 'success' : 'danger',
            },
            {
              label: 'margem média',
              value: formatPercent(snapshot.averageMargin),
              tone: 'soft',
            },
          ]}
          title="contexto da meta"
        />
      </article>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          delta={snapshot.revenueGrowth}
          deltaPositive={snapshot.revenueGrowth >= 0}
          hint="ritmo da receita"
          icon={TrendingUp}
          label="crescimento"
          loading={isLoading}
          value={`${snapshot.revenueGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.revenueGrowth)}`}
        />
        <MetricCard
          hint="estoque baixo em leitura comercial"
          icon={ClipboardList}
          label="estoque crítico"
          loading={isLoading}
          value={snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens` : 'controlado'}
        />
        <MetricCard
          hint="produto com maior venda potencial"
          icon={Sparkles}
          label="produto destaque"
          loading={isLoading}
          value={snapshot.topProductName ?? 'sem registro'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewTopProducts finance={finance} isLoading={isLoading} />
      </div>

      <OverviewRecentOrders
        displayCurrency={snapshot.displayCurrency as 'BRL'}
        isLoading={isLoading}
        orders={finance?.recentOrders ?? []}
        summaryText={`meta ${formatPercent(targetProgress)}`}
      />
    </section>
  )
}

function OverviewOperationalView({
  finance,
  financeError,
  isLoading,
  snapshot,
}: Readonly<OverviewViewProps>) {
  return (
    <section className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-4">
        <CompactTile
          label="volume atual"
          value={`${snapshot.completedOrders}`}
          note="pedidos concluídos"
          tone="accent"
        />
        <CompactTile
          label="ticket médio"
          value={formatCurrency(snapshot.averageTicket, snapshot.displayCurrency as 'BRL')}
          note="caixa por pedido"
          tone="soft"
        />
        <CompactTile
          label="margem"
          value={formatPercent(snapshot.averageMargin)}
          note="qualidade do mix"
          tone="success"
        />
        <CompactTile
          label="estoque baixo"
          value={snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems}` : '0'}
          note="alertas críticos"
          tone={snapshot.lowStockItems > 0 ? 'warning' : 'soft'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_320px] xl:items-start">
        <OverviewRecentOrders
          displayCurrency={snapshot.displayCurrency as 'BRL'}
          isLoading={isLoading}
          orders={finance?.recentOrders ?? []}
          summaryText={snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos` : null}
        />
        <OverviewBriefPanel
          entries={[
            {
              label: 'receita do mês',
              value: formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency as 'BRL'),
              tone: 'accent',
            },
            {
              label: 'lucro do mês',
              value: formatCurrency(snapshot.currentProfit, snapshot.displayCurrency as 'BRL'),
              tone: snapshot.currentProfit >= 0 ? 'success' : 'danger',
            },
            {
              label: 'produto líder',
              value: snapshot.topProductName ?? 'sem registro',
              tone: 'soft',
            },
            {
              label: 'crescimento',
              value: `${snapshot.revenueGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.revenueGrowth)}`,
              tone: snapshot.revenueGrowth >= 0 ? 'success' : 'danger',
            },
          ]}
          title="sinais vivos"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewTopProducts finance={finance} isLoading={isLoading} />
      </div>
    </section>
  )
}

function OverviewEditorialView({
  finance,
  financeError,
  isLoading,
  snapshot,
}: Readonly<OverviewViewProps>) {
  const narrative = snapshot.completedOrders > 0
    ? `${snapshot.companyName} abriu o período com ${snapshot.completedOrders} pedidos fechados e ticket médio de ${formatCurrency(snapshot.averageTicket, snapshot.displayCurrency as 'BRL')}.`
    : `${snapshot.companyName} ainda não tem pedidos fechados no período, então a leitura editorial fica voltada a meta, margem e preparação.`
  const editorialLedger = [
    {
      label: 'leitura do caixa',
      value: formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency as 'BRL'),
      note: 'receita acumulada até agora',
      tone: 'accent' as const,
    },
    {
      label: 'ritmo do turno',
      value: snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos` : 'sem giro fechado',
      note: 'volume que já passou pelo salão',
      tone: 'soft' as const,
    },
    {
      label: 'ponto de atenção',
      value: snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens no radar` : 'sem ruptura crítica',
      note: snapshot.lowStockItems > 0 ? 'estoque merece ação curta ainda hoje' : 'estoque não bloqueia a operação',
      tone: snapshot.lowStockItems > 0 ? 'warning' as const : 'success' as const,
    },
    {
      label: 'tom do dia',
      value: snapshot.revenueGrowth >= 0 ? 'crescimento com tração' : 'dia pede correção',
      note: snapshot.revenueGrowth >= 0 ? 'receita acompanha uma narrativa positiva' : 'vale revisar conversão e mix',
      tone: snapshot.revenueGrowth >= 0 ? 'success' as const : 'danger' as const,
    },
    {
      label: 'produto em foco',
      value: snapshot.topProductName ?? 'giro disperso',
      note: 'item que concentra a história comercial do painel',
      tone: 'accent' as const,
    },
    {
      label: 'próxima ação',
      value: snapshot.lowStockItems > 0 ? 'repor insumos de maior saída' : 'empurrar o campeão do dia',
      note: snapshot.lowStockItems > 0 ? 'reduz risco de perda de venda' : 'aproveita o item que já converte bem',
      tone: 'soft' as const,
    },
  ]

  return (
    <section className="space-y-5">
      <article className="imperial-card grid gap-5 p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)_300px] xl:items-start">
        <div>
          <SectionEyebrow icon={Newspaper} label="editorial diário" />
          <h2 className="mt-3 max-w-4xl font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[clamp(2rem,4.2vw,3.2rem)] font-semibold leading-tight text-[var(--text-primary)]">
            Hoje o produto principal é {snapshot.topProductName ?? 'o giro da casa'}, e o painel precisa contar isso com clareza.
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--text-soft)]">{narrative}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <EditorialChip label={`receita ${formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency as 'BRL')}`} />
            <EditorialChip label={`lucro ${formatCurrency(snapshot.currentProfit, snapshot.displayCurrency as 'BRL')}`} />
            <EditorialChip label={`margem ${formatPercent(snapshot.averageMargin)}`} />
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">caderno do dia</p>
          <div className="mt-3">
            <DataLedger columns={2} items={editorialLedger} />
          </div>
        </div>

        <OverviewBriefPanel
          entries={[
            {
              label: 'narrativa do caixa',
              value: snapshot.revenueGrowth >= 0 ? 'o mês acelera com consistência' : 'o mês pede correção de rota',
              tone: snapshot.revenueGrowth >= 0 ? 'success' : 'danger',
            },
            {
              label: 'produto em evidência',
              value: snapshot.topProductName ?? 'sem campeão claro',
              tone: 'accent',
            },
            {
              label: 'estoque',
              value: snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens exigem atenção` : 'estoque sob controle',
              tone: snapshot.lowStockItems > 0 ? 'warning' : 'soft',
            },
          ]}
          title="recortes do dia"
        />
      </article>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <ChartOrError finance={finance} financeError={financeError} isLoading={isLoading} />
        <OverviewRecentOrders
          displayCurrency={snapshot.displayCurrency as 'BRL'}
          isLoading={isLoading}
          orders={finance?.recentOrders ?? []}
          summaryText={snapshot.topProductName ? `destaque · ${snapshot.topProductName}` : null}
        />
      </div>

      <OverviewTopProducts finance={finance} isLoading={isLoading} />
    </section>
  )
}

type OverviewViewProps = {
  finance?: Parameters<typeof OverviewTopProducts>[0]['finance']
  financeError: string | null
  isLoading: boolean
  snapshot: OverviewSnapshot
}

function StandardMetricGrid({
  isLoading,
  snapshot,
}: Readonly<{
  isLoading: boolean
  snapshot: OverviewSnapshot
}>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        delta={snapshot.revenueGrowth}
        deltaPositive={snapshot.revenueGrowth >= 0}
        hint="vs período anterior"
        icon={Wallet}
        label="receita do mês"
        loading={isLoading}
        value={formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency as 'BRL')}
      />
      <MetricCard
        delta={snapshot.profitGrowth}
        deltaPositive={snapshot.profitGrowth >= 0}
        hint="resultado líquido"
        icon={ArrowUpRight}
        label="lucro do mês"
        loading={isLoading}
        value={formatCurrency(snapshot.currentProfit, snapshot.displayCurrency as 'BRL')}
      />
      <MetricCard
        hint="pedidos concluídos"
        icon={Activity}
        label="volume fechado"
        loading={isLoading}
        value={String(snapshot.completedOrders)}
      />
      <MetricCard
        hint={snapshot.lowStockItems > 0 ? `${snapshot.lowStockItems} itens com atenção` : 'sem alerta crítico'}
        icon={Radar}
        label="margem média"
        loading={isLoading}
        value={formatPercent(snapshot.averageMargin)}
      />
    </div>
  )
}

function ChartOrError({
  finance,
  financeError,
  isLoading,
  surface = 'default',
}: Readonly<{
  finance?: Parameters<typeof SalesPerformanceCard>[0]['finance']
  financeError: string | null
  isLoading: boolean
  surface?: 'default' | 'lab'
}>) {
  if (financeError) {
    if (surface === 'lab') {
      return (
        <LabPanel
          title="Receita e lucro"
          subtitle="Não foi possível carregar a série histórica deste recorte."
          padding="md"
        >
          <p className="text-sm leading-6 text-[var(--lab-danger)]">{financeError}</p>
        </LabPanel>
      )
    }

    return (
      <div className="imperial-card p-8">
        <p className="text-sm text-[var(--danger)]">{financeError}</p>
      </div>
    )
  }

  return <SalesPerformanceCard finance={finance} isLoading={isLoading} />
}

function SectionEyebrow({
  icon: Icon,
  label,
}: Readonly<{
  icon: typeof Sparkles
  label: string
}>) {
  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
      <Icon className="size-3.5" />
      <span>{label}</span>
    </div>
  )
}

function InlineStat({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function DataLedger({
  columns = 2,
  items,
}: Readonly<{
  columns?: 2 | 3
  items: Array<{
    label: string
    value: string
    note: string
    tone: 'accent' | 'success' | 'danger' | 'warning' | 'soft'
  }>
}>) {
  const gridClass = columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'

  return (
    <div className={`overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-soft)] ${gridClass} grid`}>
      {items.map((item, index) => {
        const isLastItem = index === items.length - 1
        const isLastColumn = columns === 3 ? index % 3 === 2 : index % 2 === 1
        const isLastRow = index >= items.length - columns

        return (
          <div
            className={`border-b border-dashed border-[var(--border)] p-4 ${
              isLastItem ? 'border-b-0' : ''
            } ${!isLastColumn ? 'lg:border-r' : ''} ${isLastRow ? 'lg:border-b-0' : ''}`}
            key={item.label}
          >
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{item.label}</p>
          <p className={`mt-2 text-[1.05rem] font-semibold leading-snug ${briefToneClass(item.tone).replace('text-right ', '')}`}>
            {item.value}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">{item.note}</p>
          </div>
        )
      })}
    </div>
  )
}

function OverviewBriefPanel({
  entries,
  title,
}: Readonly<{
  entries: Array<{
    label: string
    value: string
    tone: 'accent' | 'success' | 'danger' | 'warning' | 'soft'
  }>
  title: string
}>) {
  return (
    <article className="imperial-card p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
      <div className="mt-4 space-y-3">
        {entries.map((entry) => (
          <div className="flex items-start justify-between gap-4 border-b border-dashed border-[var(--border)] pb-3 last:border-b-0 last:pb-0" key={entry.label}>
            <span className="max-w-[46%] text-[12px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{entry.label}</span>
            <span className={briefToneClass(entry.tone)}>{entry.value}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

function CompactTile({
  label,
  note,
  tone,
  value,
}: Readonly<{
  label: string
  note: string
  tone: 'accent' | 'success' | 'warning' | 'soft'
  value: string
}>) {
  return (
    <article className="imperial-card p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.6rem] leading-none ${compactToneClass(tone)}`}>{value}</p>
      <p className="mt-2 text-xs text-[var(--text-soft)]">{note}</p>
    </article>
  )
}

function EditorialChip({ label }: Readonly<{ label: string }>) {
  return (
    <span className="inline-flex rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-3 py-1.5 text-xs text-[var(--text-primary)]">
      {label}
    </span>
  )
}

function ProgressBar({ value }: Readonly<{ value: number }>) {
  return (
    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
        style={{ width: `${clamp(value, 0, 100)}%` }}
      />
    </div>
  )
}

function briefToneClass(tone: 'accent' | 'success' | 'danger' | 'warning' | 'soft') {
  return {
    accent: 'text-right text-sm font-semibold text-[var(--accent-strong)]',
    success: 'text-right text-sm font-semibold text-[var(--success)]',
    danger: 'text-right text-sm font-semibold text-[var(--danger)]',
    warning: 'text-right text-sm font-semibold text-[var(--warning)]',
    soft: 'text-right text-sm font-semibold text-[var(--text-primary)]',
  }[tone]
}

function compactToneClass(tone: 'accent' | 'success' | 'warning' | 'soft') {
  return {
    accent: 'text-[var(--accent-strong)]',
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    soft: 'text-[var(--text-primary)]',
  }[tone]
}
