'use client'

import { useState } from 'react'
import type { FinanceSummaryResponse, OrdersResponse } from '@contracts/contracts'
import {
  BarChart3,
  Boxes,
  ChartColumnIncreasing,
  TrendingUp,
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

type FinanceChartProps = {
  finance?: FinanceSummaryResponse
  ordersTotals?: OrdersResponse['totals']
  isLoading?: boolean
  error?: string | null
}

type ChartView = 'orders' | 'categories' | 'comparison'

type ChartViewOption = {
  id: ChartView
  label: string
  description: string
  icon: LucideIcon
}

const palette = ['#d4b16a', '#8fb7ff', '#7bd68a', '#f58484', '#99a3b1']

const chartViews: ChartViewOption[] = [
  {
    id: 'orders',
    label: 'Receita x lucro',
    description: 'Leitura dos pedidos mais recentes para enxergar o quanto da venda virou resultado.',
    icon: TrendingUp,
  },
  {
    id: 'categories',
    label: 'Categorias',
    description: 'Compara o lucro potencial por carteira para evidenciar onde estao as melhores oportunidades.',
    icon: Boxes,
  },
  {
    id: 'comparison',
    label: 'Comparativo mensal',
    description: 'Mostra a virada de receita e lucro entre o mes atual e o periodo anterior.',
    icon: ChartColumnIncreasing,
  },
]

export function FinanceChart({
  finance,
  ordersTotals,
  isLoading = false,
  error = null,
}: FinanceChartProps) {
  const [activeView, setActiveView] = useState<ChartView>('orders')

  const recentOrdersData =
    finance?.recentOrders
      .slice(0, 6)
      .reverse()
      .map((order) => ({
        id: order.id,
        label: order.customerName?.split(' ')[0] ?? `#${order.id.slice(-4)}`,
        fullLabel: order.customerName?.trim() || `Pedido ${order.id.slice(-6)}`,
        dateLabel: formatShortDate(order.createdAt),
        revenue: order.totalRevenue,
        profit: order.totalProfit,
        items: order.totalItems,
      })) ?? []

  const categoryData =
    finance?.categoryBreakdown
      .slice()
      .sort((left, right) => right.potentialProfit - left.potentialProfit)
      .map((category, index) => ({
        label: category.category,
        products: category.products,
        units: category.units,
        potentialProfit: category.potentialProfit,
        inventoryCostValue: category.inventoryCostValue,
        color: palette[index % palette.length],
      })) ?? []

  const comparisonData = finance
    ? [
        {
          label: 'Mes anterior',
          revenue: finance.totals.previousMonthRevenue,
          profit: finance.totals.previousMonthProfit,
        },
        {
          label: 'Mes atual',
          revenue: finance.totals.currentMonthRevenue,
          profit: finance.totals.currentMonthProfit,
        },
      ]
    : []

  const leadingCategory = categoryData[0]
  const bestRecentOrder = recentOrdersData
    .slice()
    .sort((left, right) => right.revenue - left.revenue)[0]

  const insightCards =
    activeView === 'orders'
      ? [
          {
            label: 'Pedidos concluidos',
            value: String(ordersTotals?.completedOrders ?? finance?.totals.completedOrders ?? 0),
            helper: 'pedidos que ja entram no financeiro',
          },
          {
            label: 'Maior pedido recente',
            value: bestRecentOrder ? formatCurrency(bestRecentOrder.revenue) : formatCurrency(0),
            helper: bestRecentOrder
              ? `${bestRecentOrder.fullLabel} em ${bestRecentOrder.dateLabel}`
              : 'sem pedidos recentes ainda',
          },
          {
            label: 'Margem media',
            value: formatPercent(finance?.totals.averageMarginPercent ?? 0),
            helper: 'media atual do portfolio e das vendas',
          },
        ]
      : activeView === 'categories'
        ? [
            {
              label: 'Categoria lider',
              value: leadingCategory?.label ?? 'Sem dados',
              helper: leadingCategory
                ? `${formatCurrency(leadingCategory.potentialProfit)} de lucro potencial`
                : 'cadastre produtos para abrir esta visao',
            },
            {
              label: 'Valor em estoque',
              value: formatCurrency(finance?.totals.inventoryCostValue ?? 0),
              helper: 'capital imobilizado em produtos ativos',
            },
            {
              label: 'Itens com baixo estoque',
              value: String(finance?.totals.lowStockItems ?? 0),
              helper: 'prioridade para reposicao e operacao',
            },
          ]
        : [
            {
              label: 'Receita do mes',
              value: formatCurrency(finance?.totals.currentMonthRevenue ?? 0),
              helper: 'resultado bruto do periodo atual',
            },
            {
              label: 'Lucro do mes',
              value: formatCurrency(finance?.totals.currentMonthProfit ?? 0),
              helper: 'resultado liquido dos pedidos atuais',
            },
            {
              label: 'Crescimento',
              value: formatPercent(finance?.totals.revenueGrowthPercent ?? 0),
              helper: 'variacao de receita vs mes anterior',
            },
          ]

  const activeViewOption = chartViews.find((view) => view.id === activeView) ?? chartViews[0]

  return (
    <section className="rounded-[36px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Analytics interativo
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            O financeiro agora tem leitura visual da operacao.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
            {activeViewOption.description}
          </p>
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
          <div className="h-[360px]">
            {renderChart({
              activeView,
              comparisonData,
              error,
              isLoading,
              recentOrdersData,
              categoryData,
            })}
          </div>
        </div>

        <div className="grid gap-4 content-start">
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
              {activeView === 'orders'
                ? 'Esta visao ajuda a entender se o volume vendido esta realmente convertendo em margem.'
                : activeView === 'categories'
                  ? 'Use esta leitura para identificar onde vale ampliar estoque, promocao e foco comercial.'
                  : 'Esse comparativo evidencia a saude financeira recente e evita decidir so por percepcao.'}
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
  comparisonData: Array<{
    label: string
    revenue: number
    profit: number
  }>
  categoryData: Array<{
    label: string
    products: number
    units: number
    potentialProfit: number
    inventoryCostValue: number
    color: string
  }>
  error: string | null
  isLoading: boolean
  recentOrdersData: Array<{
    id: string
    label: string
    fullLabel: string
    dateLabel: string
    revenue: number
    profit: number
    items: number
  }>
}

function renderChart({
  activeView,
  comparisonData,
  categoryData,
  error,
  isLoading,
  recentOrdersData,
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--danger)]">Falha na leitura</p>
          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{error}</p>
        </div>
      </div>
    )
  }

  if (activeView === 'orders' && !recentOrdersData.length) {
    return <EmptyChartState message="Registre pedidos para destravar a curva de receita e lucro." />
  }

  if (activeView === 'categories' && !categoryData.length) {
    return <EmptyChartState message="Cadastre produtos ativos para comparar categorias e potencial de lucro." />
  }

  if (activeView === 'comparison' && !comparisonData.length) {
    return <EmptyChartState message="A comparacao mensal aparecera assim que o financeiro estiver carregado." />
  }

  if (activeView === 'orders') {
    return (
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={recentOrdersData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#8fb7ff" stopOpacity={0.34} />
              <stop offset="95%" stopColor="#8fb7ff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#d4b16a" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#d4b16a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#20262f" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: '#99a3b1', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: '#99a3b1', fontSize: 12 }}
            tickFormatter={formatCompactCurrency}
            tickLine={false}
            width={80}
          />
          <Tooltip content={<DashboardChartTooltip valueFormatter={formatCurrency} />} />
          <Legend wrapperStyle={{ color: '#f3f4f6', paddingTop: '12px' }} />
          <Area
            dataKey="revenue"
            fill="url(#revenueGradient)"
            name="Receita"
            stroke="#8fb7ff"
            strokeWidth={3}
            type="monotone"
          />
          <Area
            dataKey="profit"
            fill="url(#profitGradient)"
            name="Lucro"
            stroke="#d4b16a"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (activeView === 'categories') {
    return (
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={categoryData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#20262f" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: '#99a3b1', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: '#99a3b1', fontSize: 12 }}
            tickFormatter={formatCompactCurrency}
            tickLine={false}
            width={80}
          />
          <Tooltip content={<DashboardChartTooltip valueFormatter={formatCurrency} />} />
          <Bar dataKey="potentialProfit" name="Lucro potencial" radius={[14, 14, 0, 0]}>
            {categoryData.map((entry) => (
              <Cell fill={entry.color} key={entry.label} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer height="100%" width="100%">
      <BarChart data={comparisonData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#20262f" strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          tick={{ fill: '#99a3b1', fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tick={{ fill: '#99a3b1', fontSize: 12 }}
          tickFormatter={formatCompactCurrency}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<DashboardChartTooltip valueFormatter={formatCurrency} />} />
        <Legend wrapperStyle={{ color: '#f3f4f6', paddingTop: '12px' }} />
        <Bar dataKey="revenue" fill="#8fb7ff" name="Receita" radius={[14, 14, 0, 0]} />
        <Bar dataKey="profit" fill="#d4b16a" name="Lucro" radius={[14, 14, 0, 0]} />
      </BarChart>
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
    typeof rowPayload.fullLabel === 'string' ? rowPayload.fullLabel : label,
    typeof rowPayload.dateLabel === 'string' ? rowPayload.dateLabel : null,
  ]
    .filter(Boolean)
    .join(' - ')

  return (
    <div className="min-w-[220px] rounded-[20px] border border-[var(--border-strong)] bg-[rgba(12,15,19,0.96)] p-4 shadow-[var(--shadow-panel)]">
      <p className="text-sm font-semibold text-white">{description || label}</p>

      <div className="mt-3 space-y-2">
        {payload.map((item) => (
          <div className="flex items-center justify-between gap-4 text-sm" key={item.dataKey ?? item.name}>
            <span className="flex items-center gap-2 text-[var(--text-soft)]">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.color ?? '#8fb7ff' }}
              />
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}
