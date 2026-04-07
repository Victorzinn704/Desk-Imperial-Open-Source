'use client'

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Armchair,
  Banknote,
  Bell,
  Boxes,
  CalendarRange,
  ChevronDown,
  Clock3,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Sun,
  Tags,
  UserCircle,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

type ThemeMode = 'dark' | 'light'
type LabThemeVars = CSSProperties & Record<`--lab-${string}`, string>

const blue = '#008CFF'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true, children: ['Visão geral'] },
  { label: 'Operação', icon: ShoppingCart, children: ['Pedidos', 'Caixa', 'Equipe'] },
  { label: 'PDV / Comandas', icon: Tags },
  { label: 'Salão', icon: Armchair },
  { label: 'Calendário', icon: CalendarRange },
  { label: 'Folha', icon: Wallet },
]

const otherItems = [
  { label: 'Portfólio', icon: Boxes },
  { label: 'Mapa', icon: MapPin },
  { label: 'Gráficos', icon: PieChart, children: ['Fluxo', 'Margem'] },
  { label: 'Configurações', icon: Settings },
  { label: 'Perfil', icon: UserCircle },
]

const metrics = [
  { label: 'Receita realizada', value: 'R$ 18.420', delta: '+11.0%', positive: true, progress: '79%', icon: Banknote },
  { label: 'Comandas abertas', value: '24', delta: '+6 agora', positive: true, progress: '64%', icon: ClipboardList },
  { label: 'Mesas ocupadas', value: '18/32', delta: '+4 mesas', positive: true, progress: '56%', icon: Armchair },
  {
    label: 'Estoque crítico',
    value: '7 itens',
    delta: 'atenção',
    positive: false,
    progress: '28%',
    icon: AlertTriangle,
  },
]

const stages = [
  { label: 'Mesas livres', value: 44, color: '#94A3B8' },
  { label: 'Mesas ocupadas', value: 56, color: blue },
  { label: 'Comandas em atenção', value: 18, color: '#F59E0B' },
  { label: 'Aguardando caixa', value: 34, color: '#23C55E' },
]

const attentionItems = [
  { title: 'Mesa 04', detail: 'Combo Imperial em preparo com 3 itens na cozinha', time: '08 min', status: 'Preparo' },
  {
    title: 'Caixa do turno',
    detail: 'Fechamento protegido: 2 comandas ainda abertas',
    time: 'agora',
    status: 'Financeiro',
  },
  { title: 'Portfólio', detail: 'Refrigerante 2L entrou em estoque crítico', time: '12 min', status: 'Estoque' },
  {
    title: 'Equipe',
    detail: 'Ana Martins lidera o turno com 8 vendas registradas',
    time: '21 min',
    status: 'Funcionário',
  },
]

const orders = [
  {
    id: '#1024',
    table: 'Mesa 04',
    owner: 'Ana M.',
    items: 'Combo Imperial · 3 itens',
    total: 'R$ 86,80',
    time: '08 min',
    status: 'Preparo',
  },
  {
    id: '#1025',
    table: 'Balcão',
    owner: 'João P.',
    items: 'Pedido rápido · 2 itens',
    total: 'R$ 34,00',
    time: '03 min',
    status: 'Aberto',
  },
  {
    id: '#1026',
    table: 'Mesa 11',
    owner: 'Ana M.',
    items: 'Porção + bebida · 4 itens',
    total: 'R$ 59,90',
    time: '01 min',
    status: 'Caixa',
  },
  {
    id: 'EST-07',
    table: 'Portfólio',
    owner: 'Sistema',
    items: 'Refrigerante 2L · estoque baixo',
    total: '8 und',
    time: '12 min',
    status: 'Crítico',
  },
]

const floorTables = [
  { label: 'M01', section: 'Salão', status: 'livre', x: '11%', y: '18%', total: 'Livre' },
  { label: 'M02', section: 'Salão', status: 'ocupada', x: '34%', y: '16%', total: 'R$ 74' },
  { label: 'M03', section: 'Varanda', status: 'livre', x: '62%', y: '18%', total: 'Livre' },
  { label: 'M04', section: 'Salão', status: 'preparo', x: '18%', y: '49%', total: 'R$ 86' },
  { label: 'M07', section: 'Varanda', status: 'atencao', x: '48%', y: '46%', total: '12 min' },
  { label: 'M11', section: 'Salão', status: 'caixa', x: '72%', y: '52%', total: 'R$ 59' },
  { label: 'B01', section: 'Balcão', status: 'retirada', x: '34%', y: '76%', total: 'R$ 34' },
  { label: 'D01', section: 'Delivery', status: 'delivery', x: '66%', y: '78%', total: '20 rotas' },
]

const areaSignals = [
  { label: 'Salão', value: '11 ocupadas', detail: '2 em atenção' },
  { label: 'Varanda', value: '4 ocupadas', detail: '1 reserva próxima' },
  { label: 'Balcão', value: '7 pedidos', detail: '3 em retirada' },
]

const cashCheckpoints = [
  { label: 'Caixa esperado', value: 'R$ 4.820,00' },
  { label: 'Aberto em comandas', value: 'R$ 1.260,40' },
  { label: 'Lucro projetado', value: 'R$ 2.140,00' },
]

const portfolioRisks = [
  { name: 'Refrigerante 2L', detail: '8 und · estoque crítico', tone: 'danger' },
  { name: 'Combo Imperial', detail: 'margem 42% · giro alto', tone: 'ok' },
  { name: 'Porção especial', detail: 'custo subiu 9%', tone: 'warn' },
]

const staffPulse = [
  { name: 'Ana M.', detail: '8 vendas · 5 mesas', value: 'R$ 640' },
  { name: 'João P.', detail: '4 vendas · balcão', value: 'R$ 210' },
  { name: 'Sem garçom', detail: '2 mesas pedem vínculo', value: 'atenção' },
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

function radialOptions(mode: ThemeMode): ApexOptions {
  const isDark = mode === 'dark'

  return {
    chart: {
      background: 'transparent',
      fontFamily: 'Outfit, sans-serif',
      parentHeightOffset: 0,
      sparkline: { enabled: true },
      type: 'radialBar',
    },
    colors: [blue],
    dataLabels: { enabled: false },
    labels: ['Meta batida'],
    legend: { show: false },
    plotOptions: {
      radialBar: {
        endAngle: 140,
        hollow: { margin: 0, size: '70%' },
        startAngle: -140,
        track: { background: isDark ? '#101722' : '#F2F4F7', strokeWidth: '100%' },
        dataLabels: {
          name: { color: isDark ? '#94A3B8' : '#667085', fontSize: '12px', fontWeight: 600, offsetY: 22 },
          value: {
            color: isDark ? '#F8FAFC' : '#101828',
            fontSize: '34px',
            fontWeight: 800,
            offsetY: -14,
            formatter: (value) => `${Math.round(value)}%`,
          },
        },
      },
    },
    stroke: { lineCap: 'round' },
    tooltip: { theme: mode },
  }
}

const lineSeries = [
  { name: 'Comandas abertas', data: [18, 31, 44, 57, 68, 82, 70, 52] },
  { name: 'Vendas finalizadas', data: [12, 24, 36, 45, 59, 74, 66, 47] },
]

const radialSeries = [78]

const salaoMesas = [
  { label: 'Mesa 04', status: 'Ocupada', garcom: 'Ana', tempo: '08m', value: 'R$ 86,80', tone: 'blue' },
  { label: 'Mesa 11', status: 'Caixa', garcom: 'Bruno', tempo: '01m', value: 'R$ 59,90', tone: 'strong' },
  { label: 'Mesa 02', status: 'Livre', garcom: '—', tempo: '0m', value: '4 lugares', tone: 'muted' },
  { label: 'Reserva 07', status: 'Reservada', garcom: 'Carla', tempo: '19h30', value: '6 lugares', tone: 'soft' },
]

export function DeskCommandCenterPrototype() {
  const [collapsed, setCollapsed] = useState(false)
  const [mode, setMode] = useState<ThemeMode>('dark')

  const vars = useMemo(() => themeVars(mode), [mode])
  const line = useMemo(() => lineOptions(mode), [mode])

  return (
    <main className="min-h-screen bg-[var(--lab-page)] text-[var(--lab-text)] transition-colors" style={vars}>
      <DesignSidebar collapsed={collapsed} />
      <section
        className={cn('min-h-screen transition-[padding] duration-300', collapsed ? 'lg:pl-[68px]' : 'lg:pl-[232px]')}
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
            <Panel className="col-span-12 h-full p-5 xl:col-span-8">
              <SalaoControlPanel />
            </Panel>
            <Panel className="col-span-12 p-5 xl:col-span-4">
              <CommercialHealthPanel />
            </Panel>
          </div>

          <div className="grid grid-cols-12 items-start gap-4">
            <Panel className="col-span-12 px-5 pt-5 xl:col-span-8">
              <PanelHeader
                subtitle="Abertura de comandas e fechamento de vendas por horário"
                title="Movimento do turno"
              />
              <div className="h-[318px] w-full">
                <Chart key={`line-${mode}`} height="100%" options={line} series={lineSeries} type="area" width="100%" />
              </div>
            </Panel>
            <Panel className="col-span-12 p-5 xl:col-span-4">
              <PanelHeader compact subtitle="Turno atual contra a meta esperada" title="Meta do turno" />
              <div className="mt-4 h-[220px] w-full">
                <Chart
                  key={`radial-${mode}`}
                  height="100%"
                  options={radialOptions(mode)}
                  series={radialSeries}
                  type="radialBar"
                  width="100%"
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--lab-border-soft)] pt-4">
                <MiniBadge label="Salão" value="18 mesas" />
                <MiniBadge label="Retirada" value="12 pedidos" />
                <MiniBadge label="Delivery" value="20 entregas" />
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-12 items-start gap-4">
            <Panel className="col-span-12 p-5 xl:col-span-4">
              <PanelHeader compact subtitle="Ocupação real e gargalos" title="Fluxo do salão" />
              <div className="mt-5 space-y-4">
                {stages.map((stage, index) => (
                  <RouteStage key={stage.label} index={index + 1} {...stage} />
                ))}
              </div>
            </Panel>
            <Panel className="col-span-12 p-5 xl:col-span-4">
              <PanelHeader compact subtitle="Mesas, garçom, tempo e valor" title="Mapa rápido do salão" />
              <SalaoPulsePanel />
            </Panel>
            <Panel className="col-span-12 p-5 xl:col-span-4">
              <PanelHeader compact subtitle="Caixa, salão, estoque e equipe" title="Fila de atenção" />
              <div className="mt-5 space-y-4">
                {attentionItems.map((item) => (
                  <AttentionStep key={item.title} {...item} />
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
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--lab-faint)]">
          Desk Imperial / Central do turno
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--lab-text)]">
          Operação comercial em tempo real
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--lab-muted)]">
          Caixa, salão, comandas, estoque e equipe em uma leitura única para o comerciante agir sem se perder.
        </p>
      </div>
      <TurnoFlow />
    </div>
  )
}

function DesignSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-[var(--lab-border)] bg-[var(--lab-sidebar)] px-4 text-[var(--lab-text)] transition-[width] duration-300 lg:flex',
        collapsed ? 'w-[68px] px-2.5' : 'w-[232px]',
      )}
    >
      <div
        className={cn('flex h-[58px] items-center border-b border-[var(--lab-border)]', collapsed && 'justify-center')}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--lab-blue)] text-sm font-black text-white">
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
    <header className="sticky top-0 z-40 flex h-[60px] w-full border-b border-[var(--lab-border)] bg-[var(--lab-page)]/95 backdrop-blur">
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
        <div className="min-w-0 flex-1 xl:flex-none">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Store className="size-4 shrink-0 text-[var(--lab-blue-strong)]" />
            <span className="hidden text-[var(--lab-muted)] sm:inline">Dashboard</span>
            <span className="hidden text-[var(--lab-faint)] sm:inline">/</span>
            <span className="truncate font-semibold text-[var(--lab-text)]">Turno comercial</span>
          </div>
        </div>
        <div className="relative hidden w-full max-w-[460px] flex-1 xl:block">
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
            className="hidden h-9 items-center gap-2 rounded-xl border border-[var(--lab-border)] bg-[var(--lab-control)] px-3 text-sm font-medium text-[var(--lab-soft-text)] lg:flex"
            type="button"
          >
            <Clock3 className="size-4" />
            Aberto · 18:42
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
            <span className="hidden text-sm font-medium text-[var(--lab-soft-text)] sm:inline">
              Bar do Pedrão · BRL
            </span>
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

function SalaoControlPanel() {
  return (
    <div className="grid h-full gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="flex min-h-0 flex-col">
        <PanelHeader compact subtitle="Mapa sintético inspirado no módulo Salão" title="Planta operacional do turno" />
        <div className="relative mt-5 min-h-[352px] flex-1 overflow-hidden rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-control)]">
          <div className="absolute inset-x-5 top-5 flex items-center justify-between border-b border-dashed border-[var(--lab-border)] pb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--lab-faint)]">
            <span>Salão principal</span>
            <span>Balcão / delivery</span>
          </div>
          <div className="absolute inset-x-5 bottom-5 h-12 rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-panel)] px-4 py-3 text-xs text-[var(--lab-muted)]">
            Caixa físico · 2 comandas ainda precisam fechar antes do encerramento
          </div>
          {floorTables.map((table) => (
            <MesaDot key={table.label} {...table} />
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {areaSignals.map((area) => (
            <AreaSignal key={area.label} {...area} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--lab-faint)]">Leitura rápida</p>
        <DeskStatus label="Mesas ocupadas" value="18 de 32" />
        <DeskStatus label="Ticket aberto" value="R$ 70,02" />
        <DeskStatus label="Sem garçom" value="2 mesas" alert />
        <DeskStatus label="Tempo crítico" value="12 min" alert />
      </div>
    </div>
  )
}

function AreaSignal({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-control)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lab-faint)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--lab-text)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--lab-muted)]">{detail}</p>
    </div>
  )
}

function MesaDot({
  label,
  section,
  status,
  total,
  x,
  y,
}: {
  label: string
  section: string
  status: string
  total: string
  x: string
  y: string
}) {
  const tone =
    status === 'livre'
      ? 'border-[var(--lab-border)] bg-[var(--lab-panel)] text-[var(--lab-muted)]'
      : status === 'atencao'
        ? 'border-amber-400/40 bg-amber-400/10 text-amber-500'
        : status === 'caixa'
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-500'
          : 'border-[rgba(0,140,255,0.45)] bg-[var(--lab-blue-soft)] text-[var(--lab-blue-strong)]'

  return (
    <button
      className={cn(
        'absolute flex w-[92px] -translate-x-1/2 -translate-y-1/2 flex-col items-start rounded-2xl border px-3 py-2 text-left transition hover:scale-[1.03]',
        tone,
      )}
      style={{ left: x, top: y }}
      type="button"
    >
      <span className="text-sm font-bold">{label}</span>
      <span className="mt-0.5 text-[10px] uppercase tracking-[0.12em] opacity-75">{section}</span>
      <span className="mt-1 text-xs font-semibold">{total}</span>
    </button>
  )
}

function DeskStatus({ alert = false, label, value }: { alert?: boolean; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-control)] px-4 py-3">
      <p className="text-xs text-[var(--lab-muted)]">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold', alert ? 'text-amber-500' : 'text-[var(--lab-text)]')}>{value}</p>
    </div>
  )
}

function CommercialHealthPanel() {
  return (
    <div>
      <PanelHeader compact subtitle="Caixa, estoque e funcionários" title="Painel de decisão" />
      <div className="mt-5 space-y-5">
        <DecisionGroup title="Caixa do turno">
          {cashCheckpoints.map((item) => (
            <DecisionRow key={item.label} label={item.label} value={item.value} />
          ))}
        </DecisionGroup>

        <DecisionGroup title="Portfólio em atenção">
          {portfolioRisks.map((item) => (
            <DecisionRow key={item.name} label={item.name} tone={item.tone} value={item.detail} />
          ))}
        </DecisionGroup>

        <DecisionGroup title="Equipe em giro">
          {staffPulse.map((item) => (
            <DecisionRow key={item.name} label={item.name} value={`${item.detail} · ${item.value}`} />
          ))}
        </DecisionGroup>
      </div>
    </div>
  )
}

function DecisionGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--lab-faint)]">{title}</p>
      <div className="overflow-hidden rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-control)]">
        {children}
      </div>
    </div>
  )
}

function DecisionRow({ label, tone, value }: { label: string; tone?: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--lab-border-soft)] px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--lab-text)]">{label}</p>
        <p
          className={cn(
            'mt-0.5 truncate text-xs',
            tone === 'danger' ? 'text-rose-500' : tone === 'warn' ? 'text-amber-500' : 'text-[var(--lab-muted)]',
          )}
        >
          {value}
        </p>
      </div>
    </div>
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

function AttentionStep({
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
        <PanelHeader
          compact
          subtitle="Eventos recentes do caixa, salão e portfólio"
          title="Linha do tempo operacional"
        />
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
              {['Comanda', 'Mesa/Origem', 'Responsável', 'Itens', 'Tempo', 'Status'].map((title) => (
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
                <td className="px-5 py-4">{order.table}</td>
                <td className="px-5 py-4">{order.owner}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[var(--lab-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--lab-soft-text)]">
                    {order.items}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium text-[var(--lab-soft-text)]">{order.time}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[var(--lab-blue-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--lab-blue-strong)]">
                    {order.status} · {order.total}
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

function SalaoPulsePanel() {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {salaoMesas.map((mesa) => (
          <MesaPulseCell key={mesa.label} {...mesa} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-[var(--lab-border-soft)] pt-4">
        <MiniBadge label="Livres" value="14 mesas" />
        <MiniBadge label="Ocupadas" value="18 mesas" />
        <MiniBadge label="Garçons" value="5 ativos" />
      </div>
    </div>
  )
}

function MesaPulseCell({
  garcom,
  label,
  status,
  tempo,
  tone,
  value,
}: {
  garcom: string
  label: string
  status: string
  tempo: string
  tone: string
  value: string
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-[rgba(0,140,255,0.28)] bg-[rgba(0,140,255,0.10)]'
      : tone === 'strong'
        ? 'border-[rgba(0,140,255,0.45)] bg-[rgba(0,140,255,0.16)]'
        : tone === 'soft'
          ? 'border-[var(--lab-border)] bg-[var(--lab-control)]'
          : 'border-[var(--lab-border-soft)] bg-[var(--lab-page)]'

  return (
    <div className={cn('rounded-xl border p-3 transition hover:border-[var(--lab-blue)]', toneClass)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--lab-text)]">{label}</p>
          <p className="mt-1 text-[11px] text-[var(--lab-muted)]">{status}</p>
        </div>
        <span className="size-2 rounded-full bg-[var(--lab-blue)]" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-[0.12em] text-[var(--lab-faint)]">{garcom}</p>
          <p className="mt-1 truncate text-sm font-semibold text-[var(--lab-soft-text)]">{value}</p>
        </div>
        <span className="rounded-lg bg-[var(--lab-elevated)] px-2 py-1 text-[11px] font-semibold text-[var(--lab-muted)]">
          {tempo}
        </span>
      </div>
    </div>
  )
}

function TurnoFlow() {
  return (
    <div className="w-full rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-panel)] p-4 shadow-[var(--lab-shadow)] xl:max-w-[520px]">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--lab-faint)]">Turno aberto</p>
          <p className="mt-1 text-sm font-semibold text-[var(--lab-text)]">
            Caixa ativo, salão em movimento e portfólio monitorado
          </p>
        </div>
        <div className="shrink-0 rounded-full border border-[var(--lab-border)] bg-[var(--lab-blue-soft)] px-3 py-1 text-xs font-semibold text-[var(--lab-blue-strong)]">
          Caixa OK
        </div>
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[var(--lab-control)]">
        <span className="w-[48%] bg-[var(--lab-blue)]" />
        <span className="w-[30%] bg-[rgba(0,140,255,0.48)]" />
        <span className="w-[22%] bg-[var(--lab-border)]" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <TurnoFlowItem label="Salão" value="18/32 mesas" />
        <TurnoFlowItem label="Comandas" value="24 abertas" />
        <TurnoFlowItem label="Estoque" value="7 críticos" />
      </div>
    </div>
  )
}

function TurnoFlowItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-[var(--lab-text)]">{label}</p>
      <p className="mt-0.5 truncate text-[var(--lab-muted)]">{value}</p>
    </div>
  )
}
