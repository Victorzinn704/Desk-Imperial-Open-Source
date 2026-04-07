'use client'

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
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
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Sun,
  Table2,
  Truck,
  UserCircle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type ThemeMode = 'dark' | 'light'
type LabThemeVars = CSSProperties & Record<`--lab-${string}`, string>

const blue = '#008CFF'

const navItems = [
  { label: 'Dashboard', icon: Grid3X3, active: true, children: ['Logística'] },
  { label: 'Vendas', icon: ShoppingCart },
  { label: 'Caixa', icon: CircleDollarSign },
  { label: 'Produtos', icon: Box },
  { label: 'Clientes', icon: Users },
  { label: 'Relatórios', icon: Table2 },
]

const otherItems = [
  { label: 'Gráficos', icon: PieChart, children: ['Fluxo', 'Canal'] },
  { label: 'Configurações', icon: Settings },
  { label: 'Perfil', icon: UserCircle },
]

const metrics = [
  { label: 'Pedidos hoje', value: '1.248', delta: '+12.5%', positive: true, progress: '72%', icon: ShoppingCart },
  { label: 'Em preparo', value: '86', delta: '+8.2%', positive: true, progress: '58%', icon: Package },
  { label: 'Em rota', value: '34', delta: '-2.1%', positive: false, progress: '44%', icon: Truck },
  { label: 'Receita ativa', value: 'R$ 18.420', delta: '+11.0%', positive: true, progress: '79%', icon: Banknote },
]

const stages = [
  { label: 'Pedido recebido', value: 84, color: blue },
  { label: 'Em preparo', value: 64, color: '#F59E0B' },
  { label: 'Saindo', value: 44, color: '#23C55E' },
  { label: 'Finalizado', value: 72, color: '#94A3B8' },
]

const tracking = [
  { title: 'Mesa 04', detail: 'Combo Imperial em preparo', time: '08 min', status: 'Preparo' },
  { title: 'Delivery Norte', detail: 'Kit família saiu para entrega', time: '14 min', status: 'Em rota' },
  { title: 'Balcão', detail: 'Pedido rápido aguardando retirada', time: '03 min', status: 'Retirada' },
  { title: 'Mesa 11', detail: 'Porção + bebida confirmada no caixa', time: '01 min', status: 'Caixa' },
]

const orders = [
  { id: '#1024', origin: 'Mesa 04', product: 'Combo Imperial', channel: 'Salão', value: 'R$ 86,80', status: 'Preparo' },
  { id: '#1025', origin: 'Balcão', product: 'Pedido rápido', channel: 'Retirada', value: 'R$ 34,00', status: 'Aberto' },
  { id: '#1026', origin: 'Mesa 11', product: 'Porção + bebida', channel: 'Salão', value: 'R$ 59,90', status: 'Caixa' },
  {
    id: '#1027',
    origin: 'Delivery',
    product: 'Kit família',
    channel: 'Entrega',
    value: 'R$ 129,00',
    status: 'Em rota',
  },
]

function themeVars(mode: ThemeMode): LabThemeVars {
  return mode === 'dark'
    ? {
        '--lab-page': '#05070B',
        '--lab-sidebar': '#05070B',
        '--lab-panel': '#0B1018',
        '--lab-elevated': '#101722',
        '--lab-control': '#0D1320',
        '--lab-border': 'rgba(255,255,255,0.08)',
        '--lab-border-soft': 'rgba(255,255,255,0.055)',
        '--lab-text': '#F8FAFC',
        '--lab-soft-text': '#D9E2F2',
        '--lab-muted': '#94A3B8',
        '--lab-faint': '#64748B',
        '--lab-blue': blue,
        '--lab-blue-soft': 'rgba(0,140,255,0.16)',
        '--lab-blue-strong': '#69C0FF',
        '--lab-shadow': 'none',
      }
    : {
        '--lab-page': '#FFFFFF',
        '--lab-sidebar': '#FFFFFF',
        '--lab-panel': '#FFFFFF',
        '--lab-elevated': '#FFFFFF',
        '--lab-control': '#FFFFFF',
        '--lab-border': '#E4E7EC',
        '--lab-border-soft': '#EEF2F6',
        '--lab-text': '#101828',
        '--lab-soft-text': '#475467',
        '--lab-muted': '#667085',
        '--lab-faint': '#98A2B3',
        '--lab-blue': blue,
        '--lab-blue-soft': 'rgba(0,140,255,0.10)',
        '--lab-blue-strong': '#0072D6',
        '--lab-shadow': '0 1px 2px rgba(16,24,40,0.04)',
      }
}

function lineOptions(mode: ThemeMode): ApexOptions {
  const isDark = mode === 'dark'
  const label = isDark ? '#94A3B8' : '#667085'
  const grid = isDark ? 'rgba(148,163,184,0.16)' : 'rgba(16,24,40,0.10)'

  return {
    colors: [blue, '#23C55E'],
    chart: {
      background: 'transparent',
      fontFamily: 'Outfit, sans-serif',
      foreColor: label,
      parentHeightOffset: 0,
      redrawOnParentResize: true,
      toolbar: { show: false },
      type: 'area',
    },
    dataLabels: { enabled: false },
    fill: { gradient: { opacityFrom: isDark ? 0.38 : 0.22, opacityTo: 0.02 }, type: 'gradient' },
    grid: { borderColor: grid, padding: { bottom: 0, left: 4, right: 12, top: 2 }, strokeDashArray: 4 },
    legend: { fontSize: '12px', labels: { colors: isDark ? '#D9E2F2' : '#475467' }, position: 'top' },
    stroke: { curve: 'smooth', lineCap: 'round', width: 2.5 },
    tooltip: { theme: mode },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      categories: ['08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'],
      labels: { style: { colors: label, fontSize: '12px' } },
      tooltip: { enabled: false },
    },
    yaxis: { labels: { style: { colors: label, fontSize: '12px' } } },
  }
}

function barOptions(mode: ThemeMode): ApexOptions {
  const isDark = mode === 'dark'
  const label = isDark ? '#94A3B8' : '#667085'

  return {
    colors: [blue],
    chart: {
      background: 'transparent',
      fontFamily: 'Outfit, sans-serif',
      parentHeightOffset: 0,
      toolbar: { show: false },
      type: 'bar',
    },
    dataLabels: { enabled: false },
    grid: { borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(16,24,40,0.10)', strokeDashArray: 4 },
    legend: { show: false },
    plotOptions: { bar: { barHeight: '56%', borderRadius: 6, borderRadiusApplication: 'end', horizontal: true } },
    tooltip: { theme: mode },
    xaxis: {
      categories: ['Salão', 'Balcão', 'Delivery', 'Retirada'],
      labels: { style: { colors: label, fontSize: '12px' } },
    },
    yaxis: { labels: { style: { colors: label, fontSize: '12px' } } },
  }
}

function donutOptions(mode: ThemeMode): ApexOptions {
  const isDark = mode === 'dark'

  return {
    chart: {
      background: 'transparent',
      fontFamily: 'Outfit, sans-serif',
      parentHeightOffset: 0,
      sparkline: { enabled: true },
      type: 'donut',
    },
    colors: [blue, '#23C55E', '#F59E0B'],
    dataLabels: { enabled: false },
    labels: ['Salão', 'Balcão', 'Delivery'],
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            name: { color: isDark ? '#94A3B8' : '#667085', fontSize: '12px', offsetY: 18 },
            total: {
              color: isDark ? '#F8FAFC' : '#101828',
              fontSize: '24px',
              fontWeight: 700,
              label: 'Canais',
              show: true,
            },
            value: { color: isDark ? '#F8FAFC' : '#101828', fontSize: '22px', fontWeight: 700, offsetY: -8 },
          },
          size: '72%',
        },
      },
    },
    stroke: { colors: [isDark ? '#0B1018' : '#FFFFFF'], width: 4 },
    tooltip: { theme: mode },
  }
}

const lineSeries = [
  { name: 'Pedidos criados', data: [24, 38, 42, 57, 71, 82, 68, 49] },
  { name: 'Pedidos finalizados', data: [18, 29, 37, 48, 62, 73, 64, 43] },
]

const barSeries = [{ name: 'Pedidos', data: [64, 42, 34, 28] }]
const donutSeries = [54, 26, 20]

export function DeskCommandCenterPrototype() {
  const [collapsed, setCollapsed] = useState(false)
  const [mode, setMode] = useState<ThemeMode>('dark')

  const vars = useMemo(() => themeVars(mode), [mode])
  const line = useMemo(() => lineOptions(mode), [mode])
  const bar = useMemo(() => barOptions(mode), [mode])
  const donut = useMemo(() => donutOptions(mode), [mode])

  return (
    <main className="min-h-screen bg-[var(--lab-page)] text-[var(--lab-text)] transition-colors" style={vars}>
      <DesignSidebar collapsed={collapsed} />
      <section
        className={cn('min-h-screen transition-[padding] duration-300', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]')}
      >
        <Topbar
          collapsed={collapsed}
          mode={mode}
          onToggleSidebar={() => setCollapsed((current) => !current)}
          onToggleTheme={() => setMode((current) => (current === 'dark' ? 'light' : 'dark'))}
        />
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <HeaderSection />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricBox key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4">
            <Panel className="col-span-12 px-5 pt-5 xl:col-span-8">
              <PanelHeader subtitle="Criação e finalização por horário" title="Fluxo de pedidos" />
              <div className="h-[318px] w-full">
                <Chart key={`line-${mode}`} height="100%" options={line} series={lineSeries} type="area" width="100%" />
              </div>
            </Panel>
            <Panel className="col-span-12 p-5 xl:col-span-4">
              <PanelHeader compact subtitle="Salão, balcão e delivery" title="Canais do turno" />
              <div className="mt-4 h-[220px] w-full">
                <Chart
                  key={`donut-${mode}`}
                  height="100%"
                  options={donut}
                  series={donutSeries}
                  type="donut"
                  width="100%"
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--lab-border-soft)] pt-4">
                <MiniBadge label="Salão" value="18 mesas" />
                <MiniBadge label="Balcão" value="12 retiradas" />
                <MiniBadge label="Delivery" value="34 rotas" />
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <Panel className="col-span-12 p-5 xl:col-span-4">
              <PanelHeader compact subtitle="Leitura no estilo logistics" title="Etapas em movimento" />
              <div className="mt-5 space-y-4">
                {stages.map((stage, index) => (
                  <RouteStage key={stage.label} index={index + 1} {...stage} />
                ))}
              </div>
            </Panel>
            <Panel className="col-span-12 px-5 pt-5 xl:col-span-4">
              <PanelHeader subtitle="Distribuição operacional" title="Pedidos por canal" />
              <div className="h-[250px] w-full">
                <Chart key={`bar-${mode}`} height="100%" options={bar} series={barSeries} type="bar" width="100%" />
              </div>
            </Panel>
            <Panel className="col-span-12 p-5 xl:col-span-4">
              <PanelHeader compact subtitle="Pedidos que pedem atenção" title="Tracking operacional" />
              <div className="mt-5 space-y-4">
                {tracking.map((item) => (
                  <TrackingStep key={item.title} {...item} />
                ))}
              </div>
            </Panel>
          </div>

          <ActivityTable />
        </div>
      </section>
    </main>
  )
}

function HeaderSection() {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--lab-faint)]">Dashboard / Logistics</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--lab-text)]">
          Visão operacional do comércio
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--lab-muted)]">
          Acompanhamento de pedidos, preparo, retirada e delivery com leitura de logística aplicada ao Desk Imperial.
        </p>
      </div>
      <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-panel)] shadow-[var(--lab-shadow)] sm:min-w-[420px]">
        <SmallStat className="border-r border-[var(--lab-border-soft)] p-4" label="SLA médio" value="11m" />
        <SmallStat className="border-r border-[var(--lab-border-soft)] p-4" label="Caixa" value="Aberto" />
        <SmallStat className="p-4" label="Sincronia" value="Online" />
      </div>
    </div>
  )
}

function DesignSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-[var(--lab-border)] bg-[var(--lab-sidebar)] px-4 text-[var(--lab-text)] transition-[width] duration-300 lg:flex',
        collapsed ? 'w-[76px] px-3' : 'w-[248px]',
      )}
    >
      <div
        className={cn('flex h-[58px] items-center border-b border-[var(--lab-border)]', collapsed && 'justify-center')}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lab-blue)] text-sm font-black text-white">
          DI
        </span>
        {!collapsed && (
          <div className="ml-3 min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--lab-text)]">Desk Imperial</p>
            <p className="truncate text-[11px] text-[var(--lab-muted)]">Admin comercial</p>
          </div>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-7 overflow-y-auto py-5">
        <MenuGroup collapsed={collapsed} items={navItems} label="Menu" />
        <MenuGroup collapsed={collapsed} items={otherItems} label="Outros" />
      </nav>
      <div
        className={cn(
          'mb-5 rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-elevated)]',
          collapsed ? 'flex justify-center p-3' : 'p-4',
        )}
      >
        <span className="relative flex size-2.5 shrink-0 rounded-full bg-emerald-400" />
        {!collapsed && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-[var(--lab-text)]">Operação saudável</p>
            <p className="mt-1 text-xs leading-5 text-[var(--lab-muted)]">
              API online, caixa aberto e pedidos sincronizados.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

function MenuGroup({
  collapsed,
  items,
  label,
}: {
  collapsed: boolean
  items: Array<{ label: string; icon: LucideIcon; active?: boolean; children?: string[] }>
  label: string
}) {
  return (
    <div>
      {!collapsed && (
        <p className="mb-3 px-3 text-[11px] uppercase tracking-[0.16em] text-[var(--lab-faint)]">{label}</p>
      )}
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.label}>
            <button
              className={cn(
                'flex h-10 w-full items-center rounded-xl text-sm font-medium transition',
                collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                item.active
                  ? 'bg-[var(--lab-blue-soft)] text-[var(--lab-blue-strong)]'
                  : 'text-[var(--lab-muted)] hover:bg-[var(--lab-elevated)] hover:text-[var(--lab-text)]',
              )}
              title={collapsed ? item.label : undefined}
              type="button"
            >
              <item.icon className="size-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {item.children && !collapsed && <ChevronDown className="ml-auto size-4 text-[var(--lab-faint)]" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Topbar({
  collapsed,
  mode,
  onToggleSidebar,
  onToggleTheme,
}: {
  collapsed: boolean
  mode: ThemeMode
  onToggleSidebar: () => void
  onToggleTheme: () => void
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[58px] w-full border-b border-[var(--lab-border)] bg-[var(--lab-page)]/95 backdrop-blur">
      <div className="flex w-full items-center gap-3 px-4 sm:px-6">
        <button
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          className="hidden size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-control)] text-[var(--lab-muted)] transition hover:border-[var(--lab-blue)] hover:bg-[var(--lab-blue-soft)] hover:text-[var(--lab-blue-strong)] lg:flex"
          onClick={onToggleSidebar}
          type="button"
        >
          {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </button>
        <button
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-control)] text-[var(--lab-muted)] lg:hidden"
          type="button"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--lab-faint)] sm:block">
            Central de operação
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <Store className="size-4 shrink-0 text-[var(--lab-blue-strong)]" />
            <p className="truncate text-sm font-semibold text-[var(--lab-text)] sm:text-[15px]">Visão do comércio</p>
          </div>
        </div>
        <div className="relative hidden w-full max-w-[420px] xl:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--lab-faint)]" />
          <input
            className="h-10 w-full rounded-xl border border-[var(--lab-border)] bg-[var(--lab-control)] py-2 pl-10 pr-12 text-sm text-[var(--lab-text)] outline-none transition placeholder:text-[var(--lab-faint)] focus:border-[var(--lab-blue)] focus:ring-4 focus:ring-[rgba(0,140,255,0.12)]"
            placeholder="Buscar pedido, produto ou cliente"
            type="text"
          />
          <span className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center rounded-lg border border-[var(--lab-border)] bg-[var(--lab-elevated)] px-2 py-1 text-[11px] text-[var(--lab-muted)]">
            ⌘ K
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="hidden h-9 items-center gap-2 rounded-xl border border-[var(--lab-border)] bg-[var(--lab-control)] px-3 text-sm font-medium text-[var(--lab-soft-text)] md:flex"
            type="button"
          >
            <Clock3 className="size-4" />
            Turno aberto
          </button>
          <button
            className="flex h-9 items-center gap-2 rounded-xl border border-[var(--lab-border)] bg-[var(--lab-control)] px-3 text-sm font-medium text-[var(--lab-soft-text)]"
            onClick={onToggleTheme}
            type="button"
          >
            {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span className="hidden sm:inline">{mode === 'dark' ? 'Claro' : 'Escuro'}</span>
          </button>
          <button
            className="flex size-9 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-control)] text-[var(--lab-muted)]"
            type="button"
          >
            <Bell className="size-4" />
          </button>
          <button
            className="flex items-center gap-2 rounded-xl border border-[var(--lab-border)] bg-[var(--lab-control)] py-1 pl-1 pr-3"
            type="button"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--lab-blue)] text-xs font-bold text-white">
              JV
            </span>
            <span className="hidden text-sm font-medium text-[var(--lab-soft-text)] sm:inline">Victor</span>
            <ChevronDown className="size-4 text-[var(--lab-faint)]" />
          </button>
        </div>
      </div>
    </header>
  )
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-panel)] shadow-[var(--lab-shadow)]',
        className,
      )}
    >
      {children}
    </section>
  )
}

function MetricBox({
  icon: Icon,
  label,
  value,
  delta,
  positive,
  progress,
}: {
  icon: LucideIcon
  label: string
  value: string
  delta: string
  positive: boolean
  progress: string
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--lab-elevated)]">
          <Icon className="size-5 text-[var(--lab-blue-strong)]" />
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500',
          )}
        >
          {delta}
        </span>
      </div>
      <div className="mt-5">
        <span className="text-sm text-[var(--lab-muted)]">{label}</span>
        <h4 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--lab-text)]">{value}</h4>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--lab-elevated)]">
        <div className="h-full rounded-full bg-[var(--lab-blue)]" style={{ width: progress }} />
      </div>
    </Panel>
  )
}

function RouteStage({ color, index, label, value }: { color: string; index: number; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {index}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--lab-text)]">{label}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--lab-elevated)]">
          <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${value}%` }} />
        </div>
      </div>
      <p className="text-sm font-semibold tabular-nums text-[var(--lab-soft-text)]">{value}</p>
    </div>
  )
}

function TrackingStep({
  detail,
  status,
  time,
  title,
}: {
  detail: string
  status: string
  time: string
  title: string
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--lab-blue-soft)] text-[var(--lab-blue-strong)]">
        <MapPin className="size-4" />
      </span>
      <div className="min-w-0 flex-1 border-b border-[var(--lab-border-soft)] pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--lab-text)]">{title}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--lab-muted)]">{detail}</p>
          </div>
          <span className="rounded-full bg-[var(--lab-blue-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--lab-blue-strong)]">
            {time}
          </span>
        </div>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lab-faint)]">{status}</p>
      </div>
    </div>
  )
}

function ActivityTable() {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--lab-border)] px-5 py-4">
        <PanelHeader compact subtitle="Tabela no padrão admin/logistics" title="Atividades recentes" />
        <button
          className="hidden rounded-xl border border-[var(--lab-border)] bg-[var(--lab-control)] px-3 py-2 text-sm font-medium text-[var(--lab-soft-text)] sm:inline-flex"
          type="button"
        >
          Ver tudo
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[var(--lab-border)] text-xs uppercase text-[var(--lab-faint)]">
            <tr>
              {['Pedido', 'Origem', 'Produto', 'Canal', 'Valor', 'Status'].map((title) => (
                <th key={title} className="px-5 py-3 font-medium">
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--lab-border-soft)]">
            {orders.map((order) => (
              <tr key={order.id} className="text-[var(--lab-muted)]">
                <td className="px-5 py-4 font-semibold text-[var(--lab-text)]">{order.id}</td>
                <td className="px-5 py-4">{order.origin}</td>
                <td className="px-5 py-4">{order.product}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[var(--lab-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--lab-soft-text)]">
                    {order.channel}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium text-[var(--lab-soft-text)]">{order.value}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[var(--lab-blue-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--lab-blue-strong)]">
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function PanelHeader({ compact = false, subtitle, title }: { compact?: boolean; subtitle: string; title: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4', compact ? '' : 'mb-4')}>
      <div>
        <h3 className="text-base font-semibold tracking-[-0.02em] text-[var(--lab-text)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--lab-muted)]">{subtitle}</p>
      </div>
      <button
        className="flex size-8 items-center justify-center rounded-xl text-[var(--lab-faint)] transition hover:bg-[var(--lab-elevated)] hover:text-[var(--lab-text)]"
        type="button"
      >
        <MoreHorizontal className="size-5" />
      </button>
    </div>
  )
}

function MiniBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="inline-flex rounded-full bg-[var(--lab-blue-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--lab-blue-strong)]">
        {label}
      </span>
      <p className="mt-2 truncate text-xs font-medium text-[var(--lab-muted)]">{value}</p>
    </div>
  )
}

function SmallStat({ className, label, value }: { className?: string; label: string; value: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--lab-faint)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--lab-text)]">{value}</p>
    </div>
  )
}
