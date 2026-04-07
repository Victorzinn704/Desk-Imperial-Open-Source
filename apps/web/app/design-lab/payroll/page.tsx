'use client'

import { DollarSign, Users, TrendingUp, FileText } from 'lucide-react'

interface PayrollEntry {
  id: string
  name: string
  role: string
  avatar: string
  baseSalary: number
  salesPct: number
  salesBase: number
  bonus: number
  deductions: number
  status: 'processado' | 'pendente' | 'revisao'
}

const PAYROLL: PayrollEntry[] = [
  {
    id: '1',
    name: 'João Silva',
    role: 'Garçom',
    avatar: 'JS',
    baseSalary: 1800,
    salesPct: 2.5,
    salesBase: 12480,
    bonus: 200,
    deductions: 144,
    status: 'processado',
  },
  {
    id: '2',
    name: 'Ana Costa',
    role: 'Garçom',
    avatar: 'AC',
    baseSalary: 1800,
    salesPct: 2.5,
    salesBase: 10920,
    bonus: 0,
    deductions: 144,
    status: 'processado',
  },
  {
    id: '3',
    name: 'Pedro Alves',
    role: 'Garçom',
    avatar: 'PA',
    baseSalary: 1600,
    salesPct: 2.0,
    salesBase: 9840,
    bonus: 0,
    deductions: 128,
    status: 'pendente',
  },
  {
    id: '4',
    name: 'Camila Reis',
    role: 'Caixa',
    avatar: 'CR',
    baseSalary: 2000,
    salesPct: 1.5,
    salesBase: 8640,
    bonus: 150,
    deductions: 160,
    status: 'processado',
  },
  {
    id: '5',
    name: 'Bruno Lima',
    role: 'Garçom',
    avatar: 'BL',
    baseSalary: 1600,
    salesPct: 2.0,
    salesBase: 7200,
    bonus: 0,
    deductions: 128,
    status: 'pendente',
  },
  {
    id: '6',
    name: 'Fernanda Gomes',
    role: 'Gerente',
    avatar: 'FG',
    baseSalary: 4500,
    salesPct: 0,
    salesBase: 0,
    bonus: 500,
    deductions: 360,
    status: 'processado',
  },
  {
    id: '7',
    name: 'Ricardo Barros',
    role: 'Cozinheiro',
    avatar: 'RB',
    baseSalary: 2200,
    salesPct: 0,
    salesBase: 0,
    bonus: 0,
    deductions: 176,
    status: 'revisao',
  },
  {
    id: '8',
    name: 'Sandra Freitas',
    role: 'Cozinheiro',
    avatar: 'SF',
    baseSalary: 2200,
    salesPct: 0,
    salesBase: 0,
    bonus: 0,
    deductions: 176,
    status: 'processado',
  },
]

function calcTotal(e: PayrollEntry): number {
  const commission = e.salesBase * (e.salesPct / 100)
  return e.baseSalary + commission + e.bonus - e.deductions
}

const STATUS_CONFIG = {
  processado: { label: 'Processado', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  pendente: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  revisao: { label: 'Em Revisão', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
}

export default function PayrollPage() {
  const totalPayroll = PAYROLL.reduce((acc, e) => acc + calcTotal(e), 0)
  const totalBase = PAYROLL.reduce((acc, e) => acc + e.baseSalary, 0)
  const totalComm = PAYROLL.reduce((acc, e) => acc + e.salesBase * (e.salesPct / 100), 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="lab-heading">Folha de Pagamento</h1>
        <p className="lab-subheading">Abril 2026 — {PAYROLL.length} funcionários</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Total Folha',
            value: `R$ ${totalPayroll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            color: '#008cff',
            icon: DollarSign,
          },
          { label: 'Salários Base', value: `R$ ${totalBase.toLocaleString('pt-BR')}`, color: '#22c55e', icon: Users },
          {
            label: 'Comissões',
            value: `R$ ${totalComm.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            color: '#f59e0b',
            icon: TrendingUp,
          },
          { label: 'Funcionários', value: `${PAYROLL.length}`, color: '#a78bfa', icon: FileText },
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
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--lab-fg)', margin: '2px 0 0' }}>{k.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PAYROLL.filter((e) => e.salesPct > 0)
          .slice(0, 3)
          .map((emp) => {
            const commission = emp.salesBase * (emp.salesPct / 100)
            const total = calcTotal(emp)
            return (
              <div key={emp.id} className="lab-card lab-card-p">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--lab-blue-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--lab-blue)',
                      flexShrink: 0,
                    }}
                  >
                    {emp.avatar}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--lab-fg)', margin: 0 }}>{emp.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--lab-fg-muted)', margin: 0 }}>{emp.role}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    {
                      label: 'Salário base',
                      value: `R$ ${emp.baseSalary.toLocaleString('pt-BR')}`,
                      color: 'var(--lab-fg)',
                    },
                    {
                      label: `Comissão (${emp.salesPct}%)`,
                      value: `R$ ${commission.toFixed(2).replace('.', ',')}`,
                      color: '#22c55e',
                    },
                    { label: 'Bônus', value: `R$ ${emp.bonus.toFixed(2).replace('.', ',')}`, color: '#f59e0b' },
                    {
                      label: 'Descontos',
                      value: `- R$ ${emp.deductions.toFixed(2).replace('.', ',')}`,
                      color: '#f87171',
                    },
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--lab-fg-muted)' }}>{row.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 4,
                      paddingTop: 8,
                      borderTop: '1px solid var(--lab-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--lab-fg)' }}>Total líquido</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#008cff' }}>
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
      </div>

      {/* Full payroll table */}
      <div className="lab-card" style={{ overflowX: 'auto' }}>
        <div className="lab-card-header">
          <div>
            <h2 className="lab-card-title">Detalhamento — Abril 2026</h2>
            <p className="lab-card-subtitle">Salário + Comissão + Bônus − Descontos</p>
          </div>
          <button
            type="button"
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              background: 'var(--lab-blue)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Exportar PDF
          </button>
        </div>
        <table className="lab-table">
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Cargo</th>
              <th>Salário Base</th>
              <th>Comissão</th>
              <th>Bônus</th>
              <th>Descontos</th>
              <th>Total Líquido</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {PAYROLL.map((emp) => {
              const commission = emp.salesBase * (emp.salesPct / 100)
              const total = calcTotal(emp)
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
                  <td style={{ fontSize: 12 }}>R$ {emp.baseSalary.toLocaleString('pt-BR')}</td>
                  <td style={{ fontSize: 12, color: commission > 0 ? '#22c55e' : 'var(--lab-fg-muted)' }}>
                    {commission > 0 ? `R$ ${commission.toFixed(0)}` : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: emp.bonus > 0 ? '#f59e0b' : 'var(--lab-fg-muted)' }}>
                    {emp.bonus > 0 ? `R$ ${emp.bonus}` : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: '#f87171' }}>- R$ {emp.deductions}</td>
                  <td className="lab-td-main" style={{ color: '#008cff' }}>
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
