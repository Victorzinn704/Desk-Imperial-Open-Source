'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Bell,
  Box,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Grid3X3,
  Menu,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Table2,
  UserCircle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const primaryBlue = '#008CFF'
const chartGrid = 'rgba(148, 163, 184, 0.16)'
const chartLabel = '#94A3B8'

const navItems = [
  { label: 'Dashboard', icon: Grid3X3, active: true, children: ['Ecommerce'] },
  { label: 'Vendas', icon: ShoppingCart },
  { label: 'Caixa', icon: CircleDollarSign },
  { label: 'Produtos', icon: Box },
  { label: 'Clientes', icon: Users },
  { label: 'Relatórios', icon: Table2 },
]

const otherItems = [
  { label: 'Gráficos', icon: PieChart, children: ['Linha', 'Barra'] },
  { label: 'Configurações', icon: Settings },
  { label: 'Perfil', icon: UserCircle },
]

const metrics = [
  { label: 'Receita', value: 'R$ 18.420', delta: '+12.5%', positive: true, icon: Banknote },
  { label: 'Pedidos', value: '5.359', delta: '+8.2%', positive: true, icon: ShoppingCart },
  { label: 'Produtos ativos', value: '284', delta: '-2.1%', positive: false, icon: Package },
  { label: 'Clientes', value: '3.782', delta: '+11.0%', positive: true, icon: Users },
]

const salesOptions: ApexOptions = {
  colors: [primaryBlue],
  chart: {
    background: 'transparent',
    fontFamily: 'Outfit, sans-serif',
    foreColor: chartLabel,
    parentHeightOffset: 0,
    redrawOnParentResize: true,
    toolbar: { show: false },
    type: 'bar',
  },
  dataLabels: { enabled: false },
  fill: { opacity: 1 },
  grid: {
    borderColor: chartGrid,
    padding: { bottom: 0, left: 4, right: 10, top: 4 },
    strokeDashArray: 4,
    yaxis: { lines: { show: true } },
  },
  legend: { show: false },
  plotOptions: {
    bar: {
      borderRadius: 7,
      borderRadiusApplication: 'end',
      columnWidth: '44%',
    },
  },
  responsive: [
    {
      breakpoint: 768,
      options: {
        plotOptions: { bar: { columnWidth: '58%' } },
      },
    },
  ],
  stroke: {
    colors: ['transparent'],
    show: true,
    width: 3,
  },
  tooltip: {
    theme: 'dark',
    y: { formatter: (value) => `R$ ${value} mil` },
  },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false },
    categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    labels: { style: { colors: chartLabel, fontSize: '12px' } },
    tooltip: { enabled: false },
  },
  yaxis: {
    labels: { style: { colors: chartLabel, fontSize: '12px' } },
  },
}

const salesSeries = [{ name: 'Vendas', data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 312] }]

const revenueOptions: ApexOptions = {
  colors: [primaryBlue, '#23C55E'],
  chart: {
    background: 'transparent',
    fontFamily: 'Outfit, sans-serif',
    foreColor: chartLabel,
    parentHeightOffset: 0,
    redrawOnParentResize: true,
    toolbar: { show: false },
    type: 'area',
  },
  dataLabels: { enabled: false },
  fill: {
    gradient: {
      opacityFrom: 0.42,
      opacityTo: 0.02,
      stops: [0, 90, 100],
    },
    type: 'gradient',
  },
  grid: {
    borderColor: chartGrid,
    padding: { bottom: 0, left: 4, right: 14, top: 4 },
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  },
  legend: {
    fontSize: '12px',
    labels: { colors: '#D9E2F2' },
    markers: { size: 6 },
    position: 'top',
  },
  stroke: { curve: 'smooth', lineCap: 'round', width: 2.5 },
  tooltip: { theme: 'dark' },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false },
    categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    labels: { style: { colors: chartLabel, fontSize: '12px' } },
    tooltip: { enabled: false },
  },
  yaxis: {
    labels: { style: { colors: chartLabel, fontSize: '12px' } },
  },
}

const revenueSeries = [
  { name: 'Receita', data: [31, 42, 38, 51, 64, 71, 68] },
  { name: 'Lucro', data: [18, 24, 21, 29, 35, 41, 39] },
]

const goalOptions: ApexOptions = {
  chart: {
    background: 'transparent',
    fontFamily: 'Outfit, sans-serif',
    foreColor: '#E5EDF8',
    parentHeightOffset: 0,
    sparkline: { enabled: true },
    toolbar: { show: false },
    type: 'radialBar',
  },
  colors: [primaryBlue],
  fill: {
    gradient: {
      gradientToColors: ['#31C7FF'],
      opacityFrom: 1,
      opacityTo: 0.92,
      shade: 'dark',
      type: 'vertical',
    },
    type: 'gradient',
  },
  plotOptions: {
    radialBar: {
      endAngle: 360,
      hollow: {
        background: '#0D1320',
        margin: 0,
        size: '69%',
      },
      startAngle: 0,
      track: {
        background: '#151E2D',
        margin: 0,
        strokeWidth: '100%',
      },
      dataLabels: {
        name: { show: false },
        value: {
          color: '#F8FAFC',
          fontSize: '30px',
          fontWeight: 700,
          offsetY: 10,
          formatter: (value) => `${Math.round(Number(value))}%`,
        },
      },
    },
  },
  stroke: { lineCap: 'round' },
}

const goalSeries = [78]

const orders = [
  { id: '#1024', customer: 'Mesa 04', product: 'Combo Imperial', value: 'R$ 86,80', status: 'Pago' },
  { id: '#1025', customer: 'Balcão', product: 'Pedido rápido', value: 'R$ 34,00', status: 'Aberto' },
  { id: '#1026', customer: 'Mesa 11', product: 'Porção + bebida', value: 'R$ 59,90', status: 'Preparo' },
  { id: '#1027', customer: 'Delivery', product: 'Kit família', value: 'R$ 129,00', status: 'Retirada' },
]

export function DeskCommandCenterPrototype() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <main className="min-h-screen bg-[#070A10] text-slate-100">
      <DesignSidebar collapsed={sidebarCollapsed} />

      <section
        className={cn(
          'min-h-screen transition-[padding] duration-300 ease-out',
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]',
        )}
      >
        <DesignTopbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
        />

        <div className="space-y-5 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Dashboard / Ecommerce</p>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">Visão geral</h1>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricBox key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4">
            <section className="col-span-12 rounded-2xl border border-white/[0.08] bg-[#0D1320] px-5 pt-5 xl:col-span-8">
              <PanelHeader title="Receita e lucro" subtitle="Últimos 7 dias" />
              <div className="h-[318px] w-full">
                <Chart options={revenueOptions} series={revenueSeries} type="area" height="100%" width="100%" />
              </div>
            </section>

            <section className="col-span-12 rounded-2xl border border-white/[0.08] bg-[#0D1320] px-5 pt-5 xl:col-span-4">
              <PanelHeader title="Vendas mensais" subtitle="Volume por mês" />
              <div className="h-[250px] w-full">
                <Chart options={salesOptions} series={salesSeries} type="bar" height="100%" width="100%" />
              </div>
            </section>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <section className="col-span-12 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D1320] xl:col-span-8">
              <div className="border-b border-white/[0.08] px-5 py-4">
                <PanelHeader title="Pedidos recentes" subtitle="Acompanhamento operacional" compact />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-white/[0.08] text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Pedido</th>
                      <th className="px-5 py-3 font-medium">Origem</th>
                      <th className="px-5 py-3 font-medium">Produto</th>
                      <th className="px-5 py-3 font-medium">Valor</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {orders.map((order) => (
                      <tr key={order.id} className="text-slate-300">
                        <td className="px-5 py-4 font-medium text-white">{order.id}</td>
                        <td className="px-5 py-4">{order.customer}</td>
                        <td className="px-5 py-4">{order.product}</td>
                        <td className="px-5 py-4 font-medium text-slate-100">{order.value}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-[#008CFF]/15 px-2.5 py-1 text-xs font-semibold text-[#59B8FF]">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="col-span-12 rounded-2xl border border-white/[0.08] bg-[#0D1320] p-5 xl:col-span-4">
              <PanelHeader title="Meta mensal" subtitle="Progresso de faturamento" compact />
              <div className="mt-4 h-[224px] w-full">
                <Chart options={goalOptions} series={goalSeries} type="radialBar" height="100%" width="100%" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-4">
                <SmallStat label="Realizado" value="R$ 42k" />
                <SmallStat label="Meta" value="R$ 54k" />
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}

function DesignSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-white/[0.08] bg-[#070A10] text-slate-100 transition-[width] duration-300 ease-out lg:flex',
        collapsed ? 'w-[76px] px-3' : 'w-[248px] px-4',
      )}
    >
      <div className={cn('flex h-[58px] items-center border-b border-white/[0.08]', collapsed ? 'justify-center' : '')}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#008CFF] text-sm font-black tracking-[-0.04em] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset]">
            DI
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.02em] text-white">Desk Imperial</p>
              <p className="truncate text-[11px] text-slate-500">Admin comercial</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-7 overflow-y-auto py-5">
        <MenuGroup collapsed={collapsed} label="Menu" items={navItems} />
        <MenuGroup collapsed={collapsed} label="Outros" items={otherItems} />
      </nav>

      <div
        className={cn(
          'mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.035]',
          collapsed ? 'flex justify-center p-3' : 'p-4',
        )}
      >
        <span className="relative flex size-2.5 shrink-0 rounded-full bg-emerald-400">
          <span className="absolute inset-0 rounded-full bg-emerald-400/40 blur-sm" />
        </span>
        {!collapsed ? (
          <div className="mt-3">
            <p className="text-sm font-semibold text-white">Operação saudável</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">API online, caixa aberto e pedidos sincronizados.</p>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function MenuGroup({
  collapsed,
  label,
  items,
}: {
  collapsed: boolean
  label: string
  items: Array<{ label: string; icon: LucideIcon; active?: boolean; children?: string[] }>
}) {
  return (
    <div>
      {!collapsed ? (
        <p className="mb-3 px-3 text-[11px] uppercase leading-5 tracking-[0.16em] text-slate-600">{label}</p>
      ) : null}
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.label}>
            <button
              className={cn(
                'group flex h-10 w-full cursor-pointer items-center rounded-xl text-sm font-medium transition',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                item.active
                  ? 'bg-[#008CFF]/15 text-[#69C0FF] shadow-[0_0_0_1px_rgba(0,140,255,0.12)_inset]'
                  : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-200',
              )}
              title={collapsed ? item.label : undefined}
              type="button"
            >
              <item.icon className="size-5 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
              {item.children && !collapsed ? <ChevronDown className="ml-auto size-4 text-slate-600" /> : null}
            </button>
            {item.children && item.active && !collapsed ? (
              <ul className="ml-8 mt-2 space-y-1">
                {item.children.map((child) => (
                  <li key={child}>
                    <button
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#59B8FF]"
                      type="button"
                    >
                      {child}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DesignTopbar({
  onToggleSidebar,
  sidebarCollapsed,
}: {
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[58px] w-full border-b border-white/[0.08] bg-[#070A10]/95 backdrop-blur">
      <div className="flex w-full items-center gap-3 px-4 sm:px-6">
        <button
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          className="hidden size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] text-slate-400 transition hover:border-[#008CFF]/50 hover:bg-[#008CFF]/10 hover:text-[#69C0FF] lg:flex"
          onClick={onToggleSidebar}
          type="button"
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </button>

        <button
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] text-slate-400 lg:hidden"
          type="button"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600 sm:block">
            Central de operação
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <Store className="size-4 shrink-0 text-[#59B8FF]" />
            <p className="truncate text-sm font-semibold text-white sm:text-[15px]">Visão do comércio</p>
          </div>
        </div>

        <div className="relative hidden w-full max-w-[420px] xl:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-600" />
          <input
            className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-10 pr-12 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-[#008CFF]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#008CFF]/10"
            placeholder="Buscar pedido, produto ou cliente"
            type="text"
          />
          <span className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center rounded-lg border border-white/[0.08] bg-[#070A10] px-2 py-1 text-[11px] text-slate-500">
            ⌘ K
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="hidden h-9 items-center gap-2 rounded-xl border border-white/[0.1] px-3 text-sm font-medium text-slate-300 transition hover:border-[#008CFF]/50 hover:bg-[#008CFF]/10 hover:text-[#69C0FF] md:flex"
            type="button"
          >
            <Clock3 className="size-4" />
            Turno aberto
          </button>
          <button
            className="flex size-9 items-center justify-center rounded-xl border border-white/[0.1] text-slate-400 transition hover:border-[#008CFF]/50 hover:bg-[#008CFF]/10 hover:text-[#69C0FF]"
            type="button"
          >
            <Bell className="size-4" />
          </button>
          <button
            className="flex items-center gap-2 rounded-xl border border-white/[0.1] py-1 pl-1 pr-3 transition hover:border-[#008CFF]/50 hover:bg-white/[0.04]"
            type="button"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#008CFF] text-xs font-bold text-white">
              JV
            </span>
            <span className="hidden text-sm font-medium text-slate-200 sm:inline">Victor</span>
            <ChevronDown className="size-4 text-slate-600" />
          </button>
        </div>
      </div>
    </header>
  )
}

function MetricBox({
  icon: Icon,
  label,
  value,
  delta,
  positive,
}: {
  icon: LucideIcon
  label: string
  value: string
  delta: string
  positive: boolean
}) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#0D1320] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-white/[0.055]">
          <Icon className="size-5 text-[#69C0FF]" />
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
            positive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300',
          )}
        >
          {delta}
        </span>
      </div>
      <div className="mt-5">
        <span className="text-sm text-slate-500">{label}</span>
        <h4 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</h4>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full w-2/3 rounded-full bg-[#008CFF]" />
      </div>
    </article>
  )
}

function PanelHeader({ title, subtitle, compact = false }: { title: string; subtitle: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-4', compact ? '' : 'mb-4')}>
      <div>
        <h3 className="text-base font-semibold tracking-[-0.02em] text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <button
        className="flex size-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white/[0.06] hover:text-slate-200"
        type="button"
      >
        <MoreHorizontal className="size-5" />
      </button>
    </div>
  )
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">{value}</p>
    </div>
  )
}
