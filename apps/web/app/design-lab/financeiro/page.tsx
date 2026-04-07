'use client'

import { DollarSign, TrendingUp, TrendingDown, MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const KPIS = [
  { label: 'Receita do Mês', value: 'R$ 94.200', delta: '+12,3%', up: true, color: '#008cff', icon: DollarSign },
  { label: 'Despesas do Mês', value: 'R$ 61.400', delta: '+4,1%', up: false, color: '#f87171', icon: TrendingDown },
  { label: 'Lucro Líquido', value: 'R$ 32.800', delta: '+22,7%', up: true, color: '#22c55e', icon: TrendingUp },
  { label: 'Ticket Médio', value: 'R$ 68,50', delta: '-4,2%', up: false, color: '#f59e0b', icon: DollarSign },
]

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const BAR_OPTIONS: ApexOptions = {
  chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
  colors: ['#008cff', '#22c55e'],
  plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
  dataLabels: { enabled: false },
  xaxis: {
    categories: MONTHS,
    labels: { style: { colors: '#636363', fontSize: '11px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: '#636363', fontSize: '11px' },
      formatter: (v) => `${(v / 1000).toFixed(0)}k`,
    },
  },
  grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 },
  legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#a0a0a0' }, fontSize: '12px' },
  theme: { mode: 'dark' },
  tooltip: { theme: 'dark', y: { formatter: (v) => `R$ ${v.toLocaleString('pt-BR')}` } },
}

const BAR_SERIES = [
  { name: 'Receita', data: [52000, 61000, 74000, 68000, 83000, 79000, 91000, 88000, 77000, 94200, 0, 0] },
  { name: 'Despesas', data: [38000, 44000, 51000, 47000, 58000, 54000, 62000, 60000, 53000, 61400, 0, 0] },
]

const DONUT_OPTIONS: ApexOptions = {
  chart: { type: 'donut', background: 'transparent' },
  colors: ['#008cff', '#22c55e', '#f59e0b', '#a78bfa', '#f87171'],
  labels: ['Alimentação', 'Bebidas', 'Delivery', 'Eventos', 'Outros'],
  dataLabels: { enabled: false },
  plotOptions: { pie: { donut: { size: '70%' } } },
  legend: { position: 'bottom', labels: { colors: '#a0a0a0' }, fontSize: '12px' },
  theme: { mode: 'dark' },
  tooltip: { theme: 'dark' },
}

const DONUT_SERIES = [38, 24, 18, 12, 8]

const CATEGORIES = [
  { name: 'Alimentação', revenue: 'R$ 35.796', pct: 38, color: '#008cff' },
  { name: 'Bebidas', revenue: 'R$ 22.608', pct: 24, color: '#22c55e' },
  { name: 'Delivery', revenue: 'R$ 16.956', pct: 18, color: '#f59e0b' },
  { name: 'Eventos', revenue: 'R$ 11.304', pct: 12, color: '#a78bfa' },
  { name: 'Outros', revenue: 'R$ 7.536', pct: 8, color: '#f87171' },
]

const TRANSACTIONS = [
  { id: '#T-0089', desc: 'Fornecedor — Bebidas', tipo: 'saída', valor: 'R$ 3.200,00', data: '07/04', status: 'pago' },
  {
    id: '#T-0088',
    desc: 'Vendas — Dia 06/04',
    tipo: 'entrada',
    valor: 'R$ 4.820,00',
    data: '06/04',
    status: 'confirmado',
  },
  {
    id: '#T-0087',
    desc: 'Folha de Pagamento — Março',
    tipo: 'saída',
    valor: 'R$ 12.400,00',
    data: '05/04',
    status: 'pago',
  },
  {
    id: '#T-0086',
    desc: 'Vendas — Dia 05/04',
    tipo: 'entrada',
    valor: 'R$ 3.910,00',
    data: '05/04',
    status: 'confirmado',
  },
  { id: '#T-0085', desc: 'Manutenção Equipamentos', tipo: 'saída', valor: 'R$ 680,00', data: '04/04', status: 'pago' },
  {
    id: '#T-0084',
    desc: 'Vendas — Dia 04/04',
    tipo: 'entrada',
    valor: 'R$ 5.240,00',
    data: '04/04',
    status: 'confirmado',
  },
]

export default function FinanceiroPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="lab-heading">Financeiro</h1>
        <p className="lab-subheading">Visão financeira — Abril 2026</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="lab-metric">
              <div className="lab-metric__header">
                <div className="lab-metric__icon" style={{ background: `${k.color}18`, color: k.color }}>
                  <Icon className="size-4" />
                </div>
                <span className={`lab-metric__badge ${k.up ? 'lab-metric__badge--up' : 'lab-metric__badge--down'}`}>
                  {k.up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                  {k.delta}
                </span>
              </div>
              <div>
                <p className="lab-metric__label">{k.label}</p>
                <p className="lab-metric__value">{k.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bar chart + donut */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="lab-card">
          <div className="lab-card-header">
            <div>
              <h2 className="lab-card-title">Receita vs Despesas</h2>
              <p className="lab-card-subtitle">Janeiro — Outubro 2026</p>
            </div>
            <button className="lab-icon-btn" type="button">
              <MoreHorizontal className="size-4" />
            </button>
          </div>
          <div className="p-4">
            <Chart options={BAR_OPTIONS} series={BAR_SERIES} type="bar" height={260} width="100%" />
          </div>
        </div>

        <div className="lab-card">
          <div className="lab-card-header">
            <div>
              <h2 className="lab-card-title">Receita por Categoria</h2>
              <p className="lab-card-subtitle">Distribuição — Abril</p>
            </div>
          </div>
          <div className="p-4">
            <Chart options={DONUT_OPTIONS} series={DONUT_SERIES} type="donut" height={200} width="100%" />
          </div>
          <div className="lab-card-p flex flex-col gap-2" style={{ paddingTop: 0 }}>
            {CATEGORIES.map((c) => (
              <div key={c.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--lab-fg)' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--lab-fg-muted)' }}>
                    {c.revenue} · {c.pct}%
                  </span>
                </div>
                <div className="lab-progress-track">
                  <div className="lab-progress-fill" style={{ width: `${c.pct}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="lab-card">
        <div className="lab-card-header">
          <div>
            <h2 className="lab-card-title">Transações Recentes</h2>
            <p className="lab-card-subtitle">Últimas movimentações</p>
          </div>
          <span className="lab-pill lab-pill--blue">Abril 2026</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="lab-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map((t) => (
                <tr key={t.id}>
                  <td className="lab-td-main">{t.id}</td>
                  <td>{t.desc}</td>
                  <td>
                    <span className={`lab-pill ${t.tipo === 'entrada' ? 'lab-pill--green' : 'lab-pill--red'}`}>
                      {t.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                    </span>
                  </td>
                  <td className="lab-td-main" style={{ color: t.tipo === 'entrada' ? '#22c55e' : '#f87171' }}>
                    {t.tipo === 'saída' ? '-' : '+'}
                    {t.valor}
                  </td>
                  <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{t.data}</td>
                  <td>
                    <span className="lab-pill lab-pill--green">{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary bottom row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Meta do mês', value: 'R$ 100.000', current: 94, color: '#008cff' },
          { label: 'Margem de lucro', value: '34,8%', current: 69, color: '#22c55e' },
          { label: 'Inadimplência', value: 'R$ 1.240', current: 12, color: '#f87171' },
        ].map((s) => (
          <div key={s.label} className="lab-card lab-card-p flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--lab-fg)' }}>{s.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
            <div className="lab-progress-track" style={{ height: 6 }}>
              <div className="lab-progress-fill" style={{ width: `${s.current}%`, background: s.color }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--lab-fg-muted)' }}>{s.current}% do objetivo</p>
          </div>
        ))}
      </div>
    </div>
  )
}
