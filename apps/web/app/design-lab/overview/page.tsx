'use client'

import { TrendingUp, DollarSign, ShoppingCart, Users, Package, ArrowUp, ArrowDown, MoreHorizontal } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const METRICS = [
  {
    label: 'Receita do Dia',
    value: 'R$ 4.820',
    delta: '+18,4%',
    up: true,
    hint: 'vs. ontem',
    icon: DollarSign,
    color: '#008cff',
  },
  {
    label: 'Comandas Abertas',
    value: '12',
    delta: '+3',
    up: true,
    hint: 'em andamento',
    icon: ShoppingCart,
    color: '#22c55e',
  },
  {
    label: 'Ticket Médio',
    value: 'R$ 68,50',
    delta: '-4,2%',
    up: false,
    hint: 'vs. semana passada',
    icon: TrendingUp,
    color: '#f59e0b',
  },
  {
    label: 'Clientes Hoje',
    value: '71',
    delta: '+12',
    up: true,
    hint: 'vs. mesma hora ontem',
    icon: Users,
    color: '#a78bfa',
  },
]

const TIMELINE: ApexOptions = {
  chart: {
    type: 'area',
    toolbar: { show: false },
    background: 'transparent',
    sparkline: { enabled: false },
  },
  colors: ['#008cff', '#22c55e'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 100] },
  },
  xaxis: {
    categories: ['08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h'],
    labels: { style: { colors: '#636363', fontSize: '12px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: '#636363', fontSize: '12px' },
      formatter: (v) => `R$ ${v}`,
    },
  },
  grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 },
  legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#a0a0a0' } },
  theme: { mode: 'dark' },
  tooltip: {
    theme: 'dark',
    y: { formatter: (v) => `R$ ${v.toFixed(2)}` },
  },
}

const TIMELINE_SERIES = [
  { name: 'Receita', data: [320, 480, 590, 820, 1240, 980, 760, 1100, 890, 1350, 1020] },
  { name: 'Lucro', data: [180, 260, 310, 440, 680, 530, 410, 600, 480, 740, 550] },
]

const PEDIDOS = [
  { id: '#1042', cliente: 'Mesa 5', itens: 4, valor: 'R$ 134,00', status: 'Pronta', garcom: 'João' },
  { id: '#1041', cliente: 'Mesa 2', itens: 2, valor: 'R$ 67,50', status: 'Em Preparo', garcom: 'Ana' },
  { id: '#1040', cliente: 'Mesa 8', itens: 6, valor: 'R$ 218,00', status: 'Aberta', garcom: 'Pedro' },
  { id: '#1039', cliente: 'Delivery', itens: 3, valor: 'R$ 89,00', status: 'Fechada', garcom: 'Ana' },
  { id: '#1038', cliente: 'Mesa 1', itens: 5, valor: 'R$ 176,50', status: 'Fechada', garcom: 'João' },
]

const STATUS_PILL: Record<string, string> = {
  Aberta: 'lab-pill lab-pill--gray',
  'Em Preparo': 'lab-pill lab-pill--yellow',
  Pronta: 'lab-pill lab-pill--blue',
  Fechada: 'lab-pill lab-pill--green',
}

const TOP_PRODUCTS = [
  { name: 'X-Burguer Especial', qty: 42, revenue: 'R$ 1.260', pct: 82 },
  { name: 'Refrigerante 600ml', qty: 78, revenue: 'R$ 546', pct: 70 },
  { name: 'Batata Frita G', qty: 31, revenue: 'R$ 465', pct: 58 },
  { name: 'Suco de Laranja', qty: 24, revenue: 'R$ 312', pct: 40 },
  { name: 'Sobremesa do Dia', qty: 18, revenue: 'R$ 270', pct: 30 },
]

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Heading */}
      <div>
        <h1 className="lab-heading">Overview</h1>
        <p className="lab-subheading">Visão geral da operação — hoje, 07 de Abril de 2026</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((m) => {
          const Icon = m.icon
          return (
            <div key={m.label} className="lab-metric">
              <div className="lab-metric__header">
                <div
                  className="lab-metric__icon"
                  style={{
                    background: `${m.color}18`,
                    color: m.color,
                  }}
                >
                  <Icon className="size-4" />
                </div>
                <span className={`lab-metric__badge ${m.up ? 'lab-metric__badge--up' : 'lab-metric__badge--down'}`}>
                  {m.up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                  {m.delta}
                </span>
              </div>
              <div>
                <p className="lab-metric__label">{m.label}</p>
                <p className="lab-metric__value">{m.value}</p>
                <p className="lab-metric__hint">{m.hint}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart + Top produtos */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        {/* Area chart */}
        <div className="lab-card">
          <div className="lab-card-header">
            <div>
              <h2 className="lab-card-title">Receita & Lucro — Hoje</h2>
              <p className="lab-card-subtitle">Por hora, das 08h às 18h</p>
            </div>
            <button className="lab-icon-btn" type="button">
              <MoreHorizontal className="size-4" />
            </button>
          </div>
          <div className="p-4">
            <Chart options={TIMELINE} series={TIMELINE_SERIES} type="area" height={280} width="100%" />
          </div>
        </div>

        {/* Top produtos */}
        <div className="lab-card">
          <div className="lab-card-header">
            <div>
              <h2 className="lab-card-title">Top Produtos</h2>
              <p className="lab-card-subtitle">Mais vendidos hoje</p>
            </div>
            <Package className="size-4" style={{ color: 'var(--lab-fg-muted)' }} />
          </div>
          <div className="lab-card-p flex flex-col gap-4">
            {TOP_PRODUCTS.map((p) => (
              <div key={p.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--lab-fg)' }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--lab-fg-muted)', whiteSpace: 'nowrap' }}>
                    {p.qty}× · {p.revenue}
                  </span>
                </div>
                <div className="lab-progress-track">
                  <div className="lab-progress-fill" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pedidos recentes */}
      <div className="lab-card">
        <div className="lab-card-header">
          <div>
            <h2 className="lab-card-title">Pedidos Recentes</h2>
            <p className="lab-card-subtitle">Últimas 5 comandas</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="lab-pill lab-pill--blue">12 abertas</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="lab-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Valor</th>
                <th>Garçom</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {PEDIDOS.map((p) => (
                <tr key={p.id}>
                  <td className="lab-td-main">{p.id}</td>
                  <td>{p.cliente}</td>
                  <td>{p.itens} itens</td>
                  <td className="lab-td-main">{p.valor}</td>
                  <td>{p.garcom}</td>
                  <td>
                    <span className={STATUS_PILL[p.status] ?? 'lab-pill lab-pill--gray'}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Mesas ocupadas', value: '8 / 14', icon: '🪑' },
          { label: 'Tempo médio por mesa', value: '38 min', icon: '⏱' },
          { label: 'Taxa de cancelamento', value: '2,1%', icon: '❌' },
          { label: 'NPS do turno', value: '74', icon: '⭐' },
        ].map((k) => (
          <div key={k.label} className="lab-card lab-card-p flex flex-col gap-2">
            <span style={{ fontSize: 22 }}>{k.icon}</span>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--lab-fg)', margin: 0 }}>{k.value}</p>
            <p style={{ fontSize: 12, color: 'var(--lab-fg-muted)', margin: 0 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Trend cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Semana vs anterior',
            value: '+12,3%',
            icon: TrendingUp,
            color: '#22c55e',
            desc: 'R$ 28.400 esta semana',
          },
          {
            label: 'Mês acumulado',
            value: 'R$ 94.200',
            icon: DollarSign,
            color: '#008cff',
            desc: '68% da meta atingida',
          },
          { label: 'Funcionários ativos', value: '6 / 8', icon: Users, color: '#a78bfa', desc: '2 de folga hoje' },
        ].map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="lab-card lab-card-p flex items-center gap-4">
              <div
                className="lab-metric__icon"
                style={{ background: `${k.color}18`, color: k.color, width: 44, height: 44, borderRadius: 10 }}
              >
                <Icon className="size-5" />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--lab-fg-muted)', margin: 0 }}>{k.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--lab-fg)', margin: '2px 0' }}>{k.value}</p>
                <p style={{ fontSize: 12, color: 'var(--lab-fg-soft)', margin: 0 }}>{k.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
