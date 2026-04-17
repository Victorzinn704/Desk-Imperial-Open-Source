'use client'

import { Users, TrendingUp, Award, Clock } from 'lucide-react'

interface Employee {
  id: string
  name: string
  role: string
  avatar: string
  status: 'ativo' | 'folga' | 'ferias'
  sales: number
  target: number
  comandas: number
  avgTicket: number
  hours: string
  rank: number
}

const EMPLOYEES: Employee[] = [
  {
    id: '1',
    name: 'João Silva',
    role: 'Garçom',
    avatar: 'JS',
    status: 'ativo',
    sales: 12480,
    target: 15000,
    comandas: 182,
    avgTicket: 68.6,
    hours: '40h',
    rank: 1,
  },
  {
    id: '2',
    name: 'Ana Costa',
    role: 'Garçom',
    avatar: 'AC',
    status: 'ativo',
    sales: 10920,
    target: 15000,
    comandas: 164,
    avgTicket: 66.6,
    hours: '40h',
    rank: 2,
  },
  {
    id: '3',
    name: 'Pedro Alves',
    role: 'Garçom',
    avatar: 'PA',
    status: 'ativo',
    sales: 9840,
    target: 12000,
    comandas: 148,
    avgTicket: 66.5,
    hours: '36h',
    rank: 3,
  },
  {
    id: '4',
    name: 'Camila Reis',
    role: 'Caixa',
    avatar: 'CR',
    status: 'ativo',
    sales: 8640,
    target: 10000,
    comandas: 132,
    avgTicket: 65.5,
    hours: '40h',
    rank: 4,
  },
  {
    id: '5',
    name: 'Bruno Lima',
    role: 'Garçom',
    avatar: 'BL',
    status: 'folga',
    sales: 7200,
    target: 12000,
    comandas: 110,
    avgTicket: 65.5,
    hours: '32h',
    rank: 5,
  },
  {
    id: '6',
    name: 'Fernanda Gomes',
    role: 'Gerente',
    avatar: 'FG',
    status: 'ativo',
    sales: 0,
    target: 0,
    comandas: 0,
    avgTicket: 0,
    hours: '44h',
    rank: 0,
  },
  {
    id: '7',
    name: 'Ricardo Barros',
    role: 'Cozinheiro',
    avatar: 'RB',
    status: 'ativo',
    sales: 0,
    target: 0,
    comandas: 0,
    avgTicket: 0,
    hours: '40h',
    rank: 0,
  },
  {
    id: '8',
    name: 'Sandra Freitas',
    role: 'Cozinheiro',
    avatar: 'SF',
    status: 'ferias',
    sales: 0,
    target: 0,
    comandas: 0,
    avgTicket: 0,
    hours: '40h',
    rank: 0,
  },
]

const STATUS_CONFIG = {
  ativo: { label: 'Ativo', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  folga: { label: 'Folga', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ferias: { label: 'Férias', color: '#008cff', bg: 'rgba(0,140,255,0.1)' },
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#a16207']

export default function EquipePage() {
  const ativos = EMPLOYEES.filter((e) => e.status === 'ativo').length
  const sellers = EMPLOYEES.filter((e) => e.rank > 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="lab-heading">Equipe</h1>
        <p className="lab-subheading">
          {EMPLOYEES.length} funcionários · {ativos} ativos hoje
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Equipe', value: `${EMPLOYEES.length}`, color: '#008cff', icon: Users },
          { label: 'Ativos Hoje', value: `${ativos}`, color: '#22c55e', icon: Users },
          { label: 'Melhor Vendedor', value: 'João S.', color: '#f59e0b', icon: Award },
          { label: 'Horas Totais', value: '312h', color: '#a78bfa', icon: Clock },
        ].map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="lab-card lab-card-p flex items-center gap-3">
              <div
                className="lab-metric__icon"
                style={{
                  background: `${k.color}18`,
                  color: k.color,
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  flexShrink: 0,
                }}
              >
                <Icon className="size-4" />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--lab-fg-muted)', margin: 0 }}>{k.label}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--lab-fg)', margin: '2px 0 0' }}>{k.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Ranking de Vendedores */}
      <div className="lab-card">
        <div className="lab-card-header">
          <div>
            <h2 className="lab-card-title">Ranking de Vendas</h2>
            <p className="lab-card-subtitle">Mês atual — Abril 2026</p>
          </div>
          <TrendingUp className="size-4" style={{ color: 'var(--lab-fg-muted)' }} />
        </div>
        <div className="lab-card-p flex flex-col gap-3">
          {sellers.map((emp) => {
            const pct = Math.round((emp.sales / emp.target) * 100)
            const rankColor = RANK_COLORS[emp.rank - 1] ?? 'var(--lab-fg-muted)'
            return (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Rank */}
                <span style={{ fontSize: 13, fontWeight: 700, color: rankColor, width: 20, textAlign: 'center' }}>
                  {emp.rank === 1 ? '🥇' : emp.rank === 2 ? '🥈' : emp.rank === 3 ? '🥉' : `${emp.rank}°`}
                </span>
                {/* Avatar */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: `${rankColor}22`,
                    border: `2px solid ${rankColor}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: rankColor,
                    flexShrink: 0,
                  }}
                >
                  {emp.avatar}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lab-fg)' }}>{emp.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--lab-fg-muted)', marginLeft: 6 }}>{emp.role}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--lab-fg)' }}>
                        R$ {emp.sales.toLocaleString('pt-BR')}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--lab-fg-muted)', display: 'block' }}>
                        {pct}% da meta
                      </span>
                    </div>
                  </div>
                  <div className="lab-progress-track">
                    <div
                      className="lab-progress-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: pct >= 100 ? '#22c55e' : pct >= 70 ? '#008cff' : '#f59e0b',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* All employees table */}
      <div className="lab-card" style={{ overflowX: 'auto' }}>
        <div className="lab-card-header">
          <div>
            <h2 className="lab-card-title">Todos os Funcionários</h2>
            <p className="lab-card-subtitle">Situação atual</p>
          </div>
        </div>
        <table className="lab-table">
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Cargo</th>
              <th>Status</th>
              <th>Vendas</th>
              <th>Comandas</th>
              <th>Ticket Médio</th>
              <th>Horas</th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYEES.map((emp) => {
              const scfg = STATUS_CONFIG[emp.status]
              return (
                <tr key={emp.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'var(--lab-blue-soft)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--lab-blue)',
                          flexShrink: 0,
                        }}
                      >
                        {emp.avatar}
                      </div>
                      <span className="lab-td-main">{emp.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{emp.role}</td>
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: scfg.color,
                        background: scfg.bg,
                        borderRadius: 4,
                        padding: '2px 8px',
                      }}
                    >
                      {scfg.label}
                    </span>
                  </td>
                  <td className="lab-td-main">{emp.sales > 0 ? `R$ ${emp.sales.toLocaleString('pt-BR')}` : '—'}</td>
                  <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>
                    {emp.comandas > 0 ? `${emp.comandas}` : '—'}
                  </td>
                  <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>
                    {emp.avgTicket > 0 ? `R$ ${emp.avgTicket.toFixed(2).replace('.', ',')}` : '—'}
                  </td>
                  <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{emp.hours}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
