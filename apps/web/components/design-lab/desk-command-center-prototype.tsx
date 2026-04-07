'use client'

import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Bell,
  Box,
  ChevronDown,
  CircleDollarSign,
  Grid3X3,
  Menu,
  MoreHorizontal,
  Package,
  PieChart,
  Search,
  Settings,
  ShoppingCart,
  Table2,
  UserCircle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

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
  colors: ['#465fff'],
  chart: {
    fontFamily: 'Outfit, sans-serif',
    toolbar: { show: false },
    type: 'bar',
    height: 240,
    background: 'transparent',
  },
  plotOptions: {
    bar: {
      borderRadius: 5,
      borderRadiusApplication: 'end',
      columnWidth: '42%',
    },
  },
  dataLabels: { enabled: false },
  stroke: {
    show: true,
    width: 4,
    colors: ['transparent'],
  },
  grid: {
    borderColor: '#1f2937',
    yaxis: { lines: { show: true } },
  },
  xaxis: {
    categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#98a2b3' } },
  },
  yaxis: {
    labels: { style: { colors: '#98a2b3' } },
  },
  legend: { show: false },
  fill: { opacity: 1 },
  tooltip: {
    theme: 'dark',
    y: { formatter: (value) => `R$ ${value} mil` },
  },
}

const salesSeries = [{ name: 'Vendas', data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 312] }]

const revenueOptions: ApexOptions = {
  colors: ['#465fff', '#22c55e'],
  chart: {
    fontFamily: 'Outfit, sans-serif',
    toolbar: { show: false },
    type: 'area',
    height: 310,
    background: 'transparent',
  },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: {
      opacityFrom: 0.55,
      opacityTo: 0.04,
    },
  },
  dataLabels: { enabled: false },
  grid: {
    borderColor: '#1f2937',
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  },
  xaxis: {
    categories: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#98a2b3' } },
  },
  yaxis: {
    labels: { style: { colors: '#98a2b3' } },
  },
  legend: {
    show: true,
    labels: { colors: '#d0d5dd' },
  },
  tooltip: { theme: 'dark' },
}

const revenueSeries = [
  { name: 'Receita', data: [31, 42, 38, 51, 64, 71, 68] },
  { name: 'Lucro', data: [18, 24, 21, 29, 35, 41, 39] },
]

const orders = [
  { id: '#1024', customer: 'Mesa 04', product: 'Combo Imperial', value: 'R$ 86,80', status: 'Pago' },
  { id: '#1025', customer: 'Balcão', product: 'Pedido rápido', value: 'R$ 34,00', status: 'Aberto' },
  { id: '#1026', customer: 'Mesa 11', product: 'Porção + bebida', value: 'R$ 59,90', status: 'Preparo' },
  { id: '#1027', customer: 'Delivery', product: 'Kit família', value: 'R$ 129,00', status: 'Retirada' },
]

export function DeskCommandCenterPrototype() {
  return (
    <main className="min-h-screen bg-white text-gray-800 dark:bg-gray-950 dark:text-white">
      <DesignSidebar />

      <section className="min-h-screen lg:pl-[290px]">
        <DesignTopbar />

        <div className="space-y-6 p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Dashboard / Ecommerce</p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">Visão geral</h1>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricBox key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4">
            <section className="col-span-12 rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-8">
              <PanelHeader title="Receita e lucro" subtitle="Últimos 7 dias" />
              <div className="max-w-full overflow-x-auto">
                <div className="min-w-[720px]">
                  <Chart options={revenueOptions} series={revenueSeries} type="area" height={310} />
                </div>
              </div>
            </section>

            <section className="col-span-12 rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-4">
              <PanelHeader title="Vendas mensais" subtitle="Volume por mês" />
              <div className="max-w-full overflow-x-auto">
                <div className="-ml-5 min-w-[520px] pl-2 xl:min-w-full">
                  <Chart options={salesOptions} series={salesSeries} type="bar" height={240} />
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <section className="col-span-12 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-8">
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <PanelHeader title="Pedidos recentes" subtitle="Acompanhamento operacional" compact />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3 font-medium">Pedido</th>
                      <th className="px-5 py-3 font-medium">Origem</th>
                      <th className="px-5 py-3 font-medium">Produto</th>
                      <th className="px-5 py-3 font-medium">Valor</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {orders.map((order) => (
                      <tr key={order.id} className="text-gray-700 dark:text-gray-300">
                        <td className="px-5 py-4 font-medium text-gray-900 dark:text-white/90">{order.id}</td>
                        <td className="px-5 py-4">{order.customer}</td>
                        <td className="px-5 py-4">{order.product}</td>
                        <td className="px-5 py-4 font-medium">{order.value}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-[#465fff]/10 px-2 py-1 text-xs font-medium text-[#465fff]">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="col-span-12 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-4">
              <PanelHeader title="Meta mensal" subtitle="Progresso de faturamento" compact />
              <div className="mt-6 flex items-center justify-center">
                <div className="relative flex size-48 items-center justify-center rounded-full border-[18px] border-gray-100 dark:border-gray-800">
                  <div className="absolute inset-[-18px] rounded-full border-[18px] border-[#465fff] [clip-path:polygon(50%_0,100%_0,100%_72%,50%_50%)]" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">78%</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">R$ 42k / R$ 54k</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}

function DesignSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[290px] flex-col border-r border-gray-200 bg-white px-5 text-gray-900 dark:border-gray-800 dark:bg-gray-900 lg:flex">
      <div className="flex h-20 items-center">
        <div>
          <p className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Desk Imperial</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Admin comercial</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-8 overflow-y-auto pb-6">
        <MenuGroup label="Menu" items={navItems} />
        <MenuGroup label="Outros" items={otherItems} />
      </nav>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Operação saudável</p>
        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
          API online, caixa aberto e pedidos sincronizados.
        </p>
      </div>
    </aside>
  )
}

function MenuGroup({
  label,
  items,
}: {
  label: string
  items: Array<{ label: string; icon: LucideIcon; active?: boolean; children?: string[] }>
}) {
  return (
    <div>
      <p className="mb-4 text-xs uppercase leading-5 text-gray-400">{label}</p>
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.label}>
            <button
              className={cn(
                'group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                item.active
                  ? 'bg-[#465fff]/10 text-[#465fff] dark:bg-[#465fff]/15'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200',
              )}
              type="button"
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
              {item.children ? <ChevronDown className="ml-auto size-4" /> : null}
            </button>
            {item.children && item.active ? (
              <ul className="ml-9 mt-2 space-y-1">
                {item.children.map((child) => (
                  <li key={child}>
                    <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#465fff]" type="button">
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

function DesignTopbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex w-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 lg:hidden">
            <Menu className="size-5" />
          </button>
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
            <input
              className="h-11 w-[430px] rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#465fff]/70 focus:ring-3 focus:ring-[#465fff]/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
              placeholder="Search or type command..."
              type="text"
            />
            <span className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
              ⌘ K
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex size-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <Bell className="size-5" />
          </button>
          <button className="flex items-center gap-3 rounded-full border border-gray-200 py-1 pl-1 pr-3 dark:border-gray-800">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#465fff] text-sm font-semibold text-white">
              JV
            </span>
            <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 sm:inline">Victor</span>
            <ChevronDown className="size-4 text-gray-400" />
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
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none md:p-6">
      <div className="flex size-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
        <Icon className="size-6 text-gray-800 dark:text-white/90" />
      </div>
      <div className="mt-5 flex items-end justify-between">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <h4 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white/90">{value}</h4>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
            positive ? 'bg-green-50 text-green-600 dark:bg-green-500/10' : 'bg-red-50 text-red-600 dark:bg-red-500/10',
          )}
        >
          {delta}
        </span>
      </div>
    </article>
  )
}

function PanelHeader({ title, subtitle, compact = false }: { title: string; subtitle: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-4', compact ? '' : 'mb-4')}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">{title}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      <button className="flex size-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.04] dark:hover:text-gray-200">
        <MoreHorizontal className="size-5" />
      </button>
    </div>
  )
}
