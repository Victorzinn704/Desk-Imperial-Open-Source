'use client'

import { useState } from 'react'
import type { CurrencyCode, FinanceSummaryResponse, OrdersResponse } from '@contracts/contracts'
import {
  BarChart3,
  Boxes,
  Building2,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompactCurrency, formatCurrency } from '@/lib/currency'
import { formatBuyerType, maskBuyerDocument } from '@/lib/dashboard-format'
import { cn } from '@/lib/utils'

type FinanceChartProps = {
  finance?: FinanceSummaryResponse
  ordersTotals?: OrdersResponse['totals']
  isLoading?: boolean
  error?: string | null
}

type ChartView = 'timeline' | 'channels' | 'customers' | 'categories'

type ChartViewOption = {
  id: ChartView
  label: string
  description: string
  icon: LucideIcon
}

const palette = ['#d4b16a', '#8fb7ff', '#7bd68a', '#f58484', '#7df9d8', '#8c7dff']

const chartViews: ChartViewOption[] = [
  {
    id: 'timeline',
    label: 'Linha do tempo',
    description: 'Compara receita, lucro e volume recente para mostrar a progressao real da operacao.',
    icon: TrendingUp,
  },
  {
    id: 'channels',
    label: 'Canais',
    description: 'Mostra quais canais estao trazendo mais volume, receita e resultado.',
    icon: Building2,
  },
  {
    id: 'customers',
    label: 'Clientes',
    description: 'Evidencia compradores com mais impacto financeiro para orientar relacao comercial.',
    icon: UsersRound,
  },
  {
    id: 'categories',
    label: 'Categorias',
    description: 'Apresenta o peso do portfolio e o lucro potencial por categoria.',
    icon: Boxes,
  },
]

export function FinanceChart({
  finance,
  ordersTotals,
  isLoading = false,
  error = null,
}: FinanceChartProps) {
  const [activeView, setActiveView] = useState<ChartView>('timeline')
  const displayCurrency = finance?.displayCurrency ?? 'BRL'

  const timelineData = finance?.revenueTimeline ?? []
  const channelData = finance?.salesByChannel ?? []
  const customerData =
    finance?.topCustomers.map((customer) => ({
      ...customer,
      label: customer.customerName.length > 18 ? `${customer.customerName.slice(0, 18)}...` : customer.customerName,
      documentLabel: maskBuyerDocument(customer.buyerDocument),
      buyerTypeLabel: formatBuyerType(customer.buyerType),
    })) ?? []
  const categoryData =
    finance?.categoryBreakdown.map((category, index) => ({
      ...category,
      color: palette[index % palette.length],
    })) ?? []

  const activeViewOption = chartViews.find((view) => view.id === activeView) ?? chartViews[0]
  const highlightedChannel = channelData[0]
  const highlightedCustomer = customerData[0]
  const highlightedCategory = categoryData[0]

  const insightCards =
    activeView === 'timeline'
      ? [
          {
            label: 'Receita do mes',
            value: formatCurrency(finance?.totals.currentMonthRevenue ?? 0, displayCurrency),
            helper: 'bruto consolidado do periodo atual',
          },
          {
            label: 'Lucro do mes',
            value: formatCurrency(finance?.totals.currentMonthProfit ?? 0, displayCurrency),
            helper: 'resultado efetivo depois do custo',
          },
          {
            label: 'Pedidos concluidos',
            value: String(ordersTotals?.completedOrders ?? finance?.totals.completedOrders ?? 0),
            helper: 'pedidos que ja impactam o caixa',
          },
        ]
      : activeView === 'channels'
        ? [
            {
              label: 'Canal lider',
              value: highlightedChannel?.channel ?? 'Sem dados',
              helper: highlightedChannel
                ? `${formatCurrency(highlightedChannel.revenue, displayCurrency)} em receita`
                : 'registre pedidos com canal para abrir esta visao',
            },
            {
              label: 'Receita realizada',
              value: formatCurrency(finance?.totals.realizedRevenue ?? 0, displayCurrency),
              helper: 'somatorio das vendas concluidas',
            },
            {
              label: 'Lucro realizado',
              value: formatCurrency(finance?.totals.realizedProfit ?? 0, displayCurrency),
              helper: 'resultado liquido dos pedidos concluidos',
            },
          ]
        : activeView === 'customers'
          ? [
              {
                label: 'Cliente lider',
                value: highlightedCustomer?.customerName ?? 'Sem dados',
                helper: highlightedCustomer
                  ? `${highlightedCustomer.buyerTypeLabel} • ${highlightedCustomer.documentLabel}`
                  : 'registre compradores para abrir esta visao',
              },
            {
              label: 'Maior receita',
              value: highlightedCustomer
                ? formatCurrency(highlightedCustomer.revenue, displayCurrency)
                : formatCurrency(0, displayCurrency),
              helper: highlightedCustomer
                ? `${highlightedCustomer.orders} pedido(s) registrados`
                : 'sem compradores suficientes ainda',
              },
              {
                label: 'Margem media',
                value: formatPercent(finance?.totals.averageMarginPercent ?? 0),
                helper: 'media geral do portfolio e das vendas',
              },
            ]
          : [
              {
              label: 'Categoria lider',
              value: highlightedCategory?.category ?? 'Sem dados',
              helper: highlightedCategory
                  ? `${formatCurrency(highlightedCategory.potentialProfit, displayCurrency)} de lucro potencial`
                  : 'cadastre produtos para destravar a leitura',
              },
              {
                label: 'Valor em estoque',
                value: formatCurrency(finance?.totals.inventoryCostValue ?? 0, displayCurrency),
                helper: 'capital imobilizado no portfolio',
              },
              {
                label: 'Itens com baixo estoque',
                value: String(finance?.totals.lowStockItems ?? 0),
                helper: 'pontos de reposicao imediata',
              },
            ]

  return (
    <section className="rounded-[36px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Analytics profissional
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            Leitura executiva do desempenho comercial e financeiro.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
            {activeViewOption.description}
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]">
            exibindo valores em {displayCurrency}
            {finance?.ratesUpdatedAt
              ? ` • cotacao de ${new Date(finance.ratesUpdatedAt).toLocaleString('pt-BR')}`
              : ''}
            {finance?.ratesSource === 'stale-cache' ? ' • cache de contingencia' : ''}
            {finance?.ratesSource === 'fallback' ? ' • estimativa temporaria' : ''}
          </p>
          {finance?.ratesNotice ? (
            <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{finance.ratesNotice}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {chartViews.map((view) => {
            const Icon = view.icon

            return (
              <button
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200',
                  activeView === view.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[0_12px_30px_rgba(212,177,106,0.12)]'
                    : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                )}
                key={view.id}
                onClick={() => setActiveView(view.id)}
                type="button"
              >
                <Icon className="size-4" />
                {view.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(16,20,26,0.95),rgba(11,13,16,0.98))] p-4 shadow-[var(--shadow-panel)]">
          <div className="h-[380px]">
            {renderChart({
              activeView,
              categoryData,
              channelData,
              customerData,
              displayCurrency,
              error,
              isLoading,
              timelineData,
            })}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
                <BarChart3 className="size-5" />
              </span>
              <div>
                <p className="text-sm text-[var(--text-soft)]">Leitura rapida</p>
                <h3 className="text-lg font-semibold text-white">{activeViewOption.label}</h3>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
              {activeView === 'timeline'
                ? 'A curva temporal ajuda a separar um pico ocasional de uma operacao realmente saudavel.'
                : activeView === 'channels'
                  ? 'Use a comparacao por canal para decidir onde investir energia comercial e reposicao.'
                  : activeView === 'customers'
                    ? 'Essa visao mostra quem esta puxando o caixa e ajuda a orientar relacionamento e oferta.'
                    : 'O mix por categoria evita decisoes no escuro e mostra onde existe margem para crescer.'}
            </p>
          </div>

          {insightCards.map((insight) => (
            <div
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5"
              key={insight.label}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                {insight.label}
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">{insight.value}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{insight.helper}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

type RenderChartProps = {
  activeView: ChartView
  categoryData: Array<{
    category: string
    products: number
    units: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    color: string
  }>
  channelData: Array<{
    channel: string
    orders: number
    revenue: number
    profit: number
  }>
  customerData: Array<{
    customerName: string
    label: string
    buyerType: 'PERSON' | 'COMPANY' | null
    buyerTypeLabel: string
    buyerDocument: string | null
    documentLabel: string
    orders: number
    revenue: number
    profit: number
  }>
  displayCurrency: CurrencyCode
  error: string | null
  isLoading: boolean
  timelineData: Array<{
    label: string
    revenue: number
    profit: number
    orders: number
  }>
}

function renderChart({
  activeView,
  categoryData,
  channelData,
  customerData,
  displayCurrency,
  error,
  isLoading,
  timelineData,
}: RenderChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)]">
        <p className="text-sm text-[var(--text-soft)]">Carregando indicadores visuais...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[rgba(245,132,132,0.3)] bg-[rgba(245,132,132,0.06)] px-6 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--danger)]">
            Falha na leitura
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{error}</p>
        </div>
      </div>
    )
  }

  if (activeView === 'timeline' && !timelineData.length) {
    return <EmptyChartState message="Registre pedidos ao longo do tempo para destravar a linha executiva." />
  }

  if (activeView === 'channels' && !channelData.length) {
    return <EmptyChartState message="Preencha o canal das vendas para comparar origem, receita e lucro." />
  }

  if (activeView === 'customers' && !customerData.length) {
    return <EmptyChartState message="Identifique compradores nas vendas para liberar o ranking de clientes." />
  }

  if (activeView === 'categories' && !categoryData.length) {
    return <EmptyChartState message="Cadastre produtos ativos para visualizar o mix de categorias." />
  }

  if (activeView === 'timeline') {
    return (
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={timelineData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="timelineRevenue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#8fb7ff" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#8fb7ff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="timelineProfit" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#d4b16a" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#d4b16a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#20262f" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tick={{ fill: '#99a3b1', fontSize: 12 }} tickLine={false} />
          <YAxis
            axisLine={false}
            tick={{ fill: '#99a3b1', fontSize: 12 }}
            tickFormatter={(value: number) => formatCompactCurrency(value, displayCurrency)}
            tickLine={false}
            width={80}
          />
          <Tooltip
            content={
              <DashboardChartTooltip
                valueFormatter={(value) => formatCurrency(value, displayCurrency)}
              />
            }
          />
          <Legend wrapperStyle={{ color: '#f3f4f6', paddingTop: '12px' }} />
          <Area dataKey="revenue" fill="url(#timelineRevenue)" name="Receita" stroke="#8fb7ff" strokeWidth={3} type="monotone" />
          <Area dataKey="profit" fill="url(#timelineProfit)" name="Lucro" stroke="#d4b16a" strokeWidth={3} type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (activeView === 'channels') {
    return (
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={channelData} layout="vertical" margin={{ top: 12, right: 12, left: 18, bottom: 0 }}>
          <CartesianGrid stroke="#20262f" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            axisLine={false}
            tick={{ fill: '#99a3b1', fontSize: 12 }}
            tickFormatter={(value: number) => formatCompactCurrency(value, displayCurrency)}
            tickLine={false}
            type="number"
          />
          <YAxis axisLine={false} dataKey="channel" tick={{ fill: '#99a3b1', fontSize: 12 }} tickLine={false} type="category" width={110} />
          <Tooltip
            content={
              <DashboardChartTooltip
                valueFormatter={(value) => formatCurrency(value, displayCurrency)}
              />
            }
          />
          <Legend wrapperStyle={{ color: '#f3f4f6', paddingTop: '12px' }} />
          <Bar dataKey="revenue" fill="#8fb7ff" name="Receita" radius={[0, 14, 14, 0]} />
          <Bar dataKey="profit" fill="#d4b16a" name="Lucro" radius={[0, 14, 14, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (activeView === 'customers') {
    return (
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={customerData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#20262f" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tick={{ fill: '#99a3b1', fontSize: 12 }} tickLine={false} />
          <YAxis
            axisLine={false}
            tick={{ fill: '#99a3b1', fontSize: 12 }}
            tickFormatter={(value: number) => formatCompactCurrency(value, displayCurrency)}
            tickLine={false}
            width={80}
          />
          <Tooltip
            content={
              <DashboardChartTooltip
                valueFormatter={(value) => formatCurrency(value, displayCurrency)}
              />
            }
          />
          <Bar dataKey="revenue" fill="#7df9d8" name="Receita" radius={[14, 14, 0, 0]}>
            {customerData.map((entry, index) => (
              <Cell fill={palette[index % palette.length]} key={`${entry.customerName}-${entry.documentLabel}`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer height="100%" width="100%">
      <PieChart>
        <Tooltip
          content={
            <DashboardChartTooltip
              valueFormatter={(value) => formatCurrency(value, displayCurrency)}
            />
          }
        />
        <Legend wrapperStyle={{ color: '#f3f4f6' }} />
        <Pie
          cx="50%"
          cy="50%"
          data={categoryData}
          dataKey="potentialProfit"
          innerRadius={78}
          nameKey="category"
          outerRadius={124}
          paddingAngle={3}
        >
          {categoryData.map((entry) => (
            <Cell fill={entry.color} key={entry.category} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Dados insuficientes
        </p>
        <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{message}</p>
      </div>
    </div>
  )
}

type DashboardChartTooltipProps = {
  active?: boolean
  label?: string
  payload?: Array<{
    color?: string
    dataKey?: string
    name?: string
    payload?: Record<string, unknown>
    value?: number | string
  }>
  valueFormatter: (value: number) => string
}

function DashboardChartTooltip({
  active,
  label,
  payload,
  valueFormatter,
}: DashboardChartTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const rowPayload = payload[0]?.payload ?? {}
  const description = [
    typeof rowPayload.customerName === 'string' ? rowPayload.customerName : null,
    typeof rowPayload.documentLabel === 'string' ? rowPayload.documentLabel : null,
    typeof rowPayload.buyerTypeLabel === 'string' ? rowPayload.buyerTypeLabel : null,
  ]
    .filter(Boolean)
    .join(' • ')

  return (
    <div className="min-w-[220px] rounded-[20px] border border-[var(--border-strong)] bg-[rgba(12,15,19,0.96)] p-4 shadow-[var(--shadow-panel)]">
      <p className="text-sm font-semibold text-white">{description || label}</p>

      <div className="mt-3 space-y-2">
        {payload.map((item) => (
          <div className="flex items-center justify-between gap-4 text-sm" key={item.dataKey ?? item.name}>
            <span className="flex items-center gap-2 text-[var(--text-soft)]">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color ?? '#8fb7ff' }} />
              {item.name ?? item.dataKey}
            </span>
            <span className="font-semibold text-white">
              {valueFormatter(typeof item.value === 'number' ? item.value : Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}
