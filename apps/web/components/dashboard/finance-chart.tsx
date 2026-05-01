'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { CurrencyCode, FinanceSummaryResponse, OrdersResponse } from '@contracts/contracts'
import { BarChart3, Building2, type LucideIcon, PieChartIcon, TrendingUp, UsersRound } from 'lucide-react'
import { Skeleton } from '@/components/shared/skeleton'
import { formatCompactCurrency } from '@/lib/currency'
import { formatBuyerType, maskBuyerDocument } from '@/lib/dashboard-format'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

type FinanceChartProps = {
  finance?: FinanceSummaryResponse
  ordersTotals?: OrdersResponse['totals']
  isLoading?: boolean
  error?: string | null
}

type ChartView = 'timeline' | 'channels' | 'customers' | 'categories' | 'growth'

type ChartViewOption = {
  id: ChartView
  label: string
  description: string
  icon: LucideIcon
}

const palette = ['#3b82f6', '#10b981', '#6366f1', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4', '#4f46e5']

const chartViews: ChartViewOption[] = [
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Compara a progressão real da operação no tempo.',
    icon: TrendingUp,
  },
  {
    id: 'growth',
    label: 'Crescimento',
    description: 'Análise de crescimento entre ticket médio e lucro geral.',
    icon: BarChart3,
  },
  {
    id: 'channels',
    label: 'Canais',
    description: 'Canais que lideram o volume de receita.',
    icon: Building2,
  },
  {
    id: 'customers',
    label: 'Clientes',
    description: 'Top clientes com maior impacto na receita.',
    icon: UsersRound,
  },
  {
    id: 'categories',
    label: 'Categorias',
    description: 'Peso no portfólio por categoria de produtos.',
    icon: PieChartIcon,
  },
]

export function FinanceChart({
  finance,
  ordersTotals: _ordersTotals,
  isLoading = false,
  error = null,
}: FinanceChartProps) {
  const [activeView, setActiveView] = useState<ChartView>('timeline')
  const { resolvedTheme } = useTheme()
  const displayCurrency = finance?.displayCurrency ?? 'BRL'
  const isDark = resolvedTheme === 'dark'

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

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm dark:shadow-none md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Analytics Profissional</p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Desempenho Comercial</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{activeViewOption.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {chartViews.map((view) => {
            const Icon = view.icon
            return (
              <button
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-200',
                  activeView === view.id
                    ? 'border-accent bg-accent/10 text-accent shadow-sm'
                    : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                )}
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
              >
                <Icon className="size-4" />
                {view.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="h-[400px]">
            {renderChart({
              activeView,
              categoryData,
              channelData,
              customerData,
              displayCurrency,
              error,
              isLoading,
              timelineData,
              isDark,
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

type TimelineItem = { label: string; revenue: number; profit: number; orders: number }
type ChannelItem = { channel: string; revenue: number }
type CustomerItem = { label: string; revenue: number }
type CategoryItem = { category: string; potentialProfit: number; color: string }

type ChartContext = {
  textColor: string
  gridColor: string
  isDark: boolean
  displayCurrency: CurrencyCode
  timelineData: TimelineItem[]
  channelData: ChannelItem[]
  customerData: CustomerItem[]
  categoryData: CategoryItem[]
}

function buildTimelineChart(ctx: ChartContext) {
  const options: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
    colors: ['#36f57c', '#3b82f6'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: {
      categories: ctx.timelineData.map((d) => d.label),
      labels: { style: { colors: ctx.textColor } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: ctx.textColor },
        formatter: (value) => formatCompactCurrency(value, ctx.displayCurrency),
      },
    },
    grid: { borderColor: ctx.gridColor, strokeDashArray: 4 },
    theme: { mode: ctx.isDark ? 'dark' : 'light' },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: ctx.textColor } },
  }
  const series = [
    { name: 'Receita', data: ctx.timelineData.map((d) => d.revenue) },
    { name: 'Lucro', data: ctx.timelineData.map((d) => d.profit) },
  ]
  return <ReactApexChart height="100%" options={options} series={series} type="area" />
}

function buildGrowthChart(ctx: ChartContext) {
  const options: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } },
    colors: ['#8b5cf6', '#10b981'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: ctx.timelineData.map((d) => d.label),
      labels: { style: { colors: ctx.textColor } },
    },
    yaxis: {
      labels: {
        style: { colors: ctx.textColor },
        formatter: (value) => formatCompactCurrency(value, ctx.displayCurrency),
      },
    },
    grid: { borderColor: ctx.gridColor, strokeDashArray: 4 },
    theme: { mode: ctx.isDark ? 'dark' : 'light' },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: ctx.textColor } },
  }
  const series = [
    { name: 'Ticket Médio', data: ctx.timelineData.map((d) => +(d.revenue / (d.orders || 1)).toFixed(2)) },
    { name: 'Lucro Total', data: ctx.timelineData.map((d) => d.profit) },
  ]
  return <ReactApexChart height="100%" options={options} series={series} type="bar" />
}

function buildChannelsChart(ctx: ChartContext) {
  const options: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '50%' } },
    colors: ['#06b6d4'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: ctx.channelData.map((d) => d.channel),
      labels: {
        style: { colors: ctx.textColor },
        formatter: (value) => formatCompactCurrency(Number(value), ctx.displayCurrency),
      },
    },
    yaxis: { labels: { style: { colors: ctx.textColor } } },
    grid: { borderColor: ctx.gridColor, strokeDashArray: 4 },
    theme: { mode: ctx.isDark ? 'dark' : 'light' },
  }
  const series = [{ name: 'Receita', data: ctx.channelData.map((d) => d.revenue) }]
  return <ReactApexChart height="100%" options={options} series={series} type="bar" />
}

function buildCustomersChart(ctx: ChartContext) {
  const options: ApexCharts.ApexOptions = {
    chart: { type: 'radar', toolbar: { show: false }, background: 'transparent' },
    labels: ctx.customerData.map((d) => d.label),
    stroke: { width: 2, colors: ['#f43f5e'] },
    fill: { opacity: 0.2, colors: ['#f43f5e'] },
    markers: { size: 4, colors: ['#fff'], strokeColors: '#f43f5e', strokeWidth: 2 },
    yaxis: { show: false },
    theme: { mode: ctx.isDark ? 'dark' : 'light' },
    plotOptions: {
      radar: {
        polygons: { strokeColors: ctx.gridColor, connectorColors: ctx.gridColor },
      },
    },
  }
  const series = [{ name: 'Receita', data: ctx.customerData.map((d) => d.revenue) }]
  return <ReactApexChart height="100%" options={options} series={series} type="radar" />
}

function buildCategoriesChart(ctx: ChartContext) {
  const options: ApexCharts.ApexOptions = {
    chart: { type: 'donut', background: 'transparent' },
    labels: ctx.categoryData.map((d) => d.category),
    colors: palette,
    stroke: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: { color: ctx.textColor },
            value: {
              color: ctx.textColor,
              formatter: (val) => formatCompactCurrency(Number(val), ctx.displayCurrency),
            },
          },
        },
      },
    },
    theme: { mode: ctx.isDark ? 'dark' : 'light' },
    legend: { position: 'right', labels: { colors: ctx.textColor } },
  }
  const series = ctx.categoryData.map((d) => d.potentialProfit)
  return <ReactApexChart height="100%" options={options} series={series} type="donut" />
}

const chartBuilders: Record<ChartView, (ctx: ChartContext) => React.ReactNode> = {
  timeline: buildTimelineChart,
  growth: buildGrowthChart,
  channels: buildChannelsChart,
  customers: buildCustomersChart,
  categories: buildCategoriesChart,
}

function renderChart({
  activeView,
  categoryData,
  channelData,
  customerData,
  timelineData,
  isLoading,
  error,
  displayCurrency,
  isDark,
}: {
  activeView: ChartView
  categoryData: CategoryItem[]
  channelData: ChannelItem[]
  customerData: CustomerItem[]
  timelineData: TimelineItem[]
  isLoading: boolean
  error: string | null
  displayCurrency: CurrencyCode
  isDark: boolean
}) {
  if (isLoading) {
    return <Skeleton className="h-full w-full rounded-xl" />
  }
  if (error) {
    return <div className="text-red-500 p-6">{error}</div>
  }

  const ctx: ChartContext = {
    textColor: isDark ? '#9ca3af' : '#6b7280',
    gridColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    isDark,
    displayCurrency,
    timelineData,
    channelData,
    customerData,
    categoryData,
  }

  const builder = chartBuilders[activeView]
  return builder ? builder(ctx) : null
}
