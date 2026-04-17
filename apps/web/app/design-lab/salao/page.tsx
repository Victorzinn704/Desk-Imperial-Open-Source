'use client'

import { useState } from 'react'
import { Grid3X3, List, Plus, Users } from 'lucide-react'

type MesaStatus = 'livre' | 'ocupada' | 'reservada' | 'aguardando'

interface Mesa {
  id: string
  label: string
  capacity: number
  status: MesaStatus
  section: string
  garcom?: string
  cliente?: string
  tempo?: string
  valor?: string
  comanda?: string
}

const MESAS: Mesa[] = [
  {
    id: '1',
    label: 'Mesa 1',
    capacity: 4,
    status: 'ocupada',
    section: 'Salão',
    garcom: 'João',
    cliente: 'Carlos M.',
    tempo: '38min',
    valor: 'R$ 134,00',
    comanda: '#1042',
  },
  { id: '2', label: 'Mesa 2', capacity: 2, status: 'livre', section: 'Salão' },
  {
    id: '3',
    label: 'Mesa 3',
    capacity: 4,
    status: 'reservada',
    section: 'Salão',
    cliente: 'Fernanda L.',
    tempo: '19:00',
  },
  {
    id: '4',
    label: 'Mesa 4',
    capacity: 6,
    status: 'ocupada',
    section: 'Salão',
    garcom: 'Ana',
    cliente: 'Bruno S.',
    tempo: '52min',
    valor: 'R$ 218,50',
    comanda: '#1041',
  },
  { id: '5', label: 'Mesa 5', capacity: 4, status: 'aguardando', section: 'Salão', garcom: 'Pedro', comanda: '#1040' },
  { id: '6', label: 'Mesa 6', capacity: 8, status: 'livre', section: 'Salão' },
  {
    id: '7',
    label: 'Mesa 7',
    capacity: 2,
    status: 'ocupada',
    section: 'Varanda',
    garcom: 'João',
    cliente: 'Ana P.',
    tempo: '21min',
    valor: 'R$ 67,00',
    comanda: '#1039',
  },
  { id: '8', label: 'Mesa 8', capacity: 4, status: 'livre', section: 'Varanda' },
  {
    id: '9',
    label: 'Mesa 9',
    capacity: 4,
    status: 'ocupada',
    section: 'Varanda',
    garcom: 'Ana',
    cliente: 'Marcos T.',
    tempo: '15min',
    valor: 'R$ 43,50',
    comanda: '#1038',
  },
  {
    id: '10',
    label: 'Mesa 10',
    capacity: 6,
    status: 'reservada',
    section: 'Varanda',
    cliente: 'Grupo Empresa',
    tempo: '20:30',
  },
  { id: '11', label: 'Mesa 11', capacity: 4, status: 'livre', section: 'Varanda' },
  {
    id: '12',
    label: 'Mesa 12',
    capacity: 2,
    status: 'ocupada',
    section: 'Bar',
    garcom: 'Pedro',
    cliente: 'Juliana K.',
    tempo: '44min',
    valor: 'R$ 89,00',
    comanda: '#1037',
  },
  {
    id: '13',
    label: 'Balcão 1',
    capacity: 1,
    status: 'ocupada',
    section: 'Bar',
    garcom: 'Pedro',
    tempo: '8min',
    valor: 'R$ 18,00',
    comanda: '#1036',
  },
  { id: '14', label: 'Balcão 2', capacity: 1, status: 'livre', section: 'Bar' },
]

const STATUS_CONFIG: Record<MesaStatus, { label: string; color: string; bg: string; border: string }> = {
  livre: { label: 'Livre', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
  ocupada: { label: 'Ocupada', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
  reservada: { label: 'Reservada', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  aguardando: { label: 'Aguardando', color: '#008cff', bg: 'rgba(0,140,255,0.08)', border: 'rgba(0,140,255,0.25)' },
}

const SECTIONS = ['Todos', 'Salão', 'Varanda', 'Bar']

export default function SalaoPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [section, setSection] = useState('Todos')
  const [filterStatus, setFilterStatus] = useState<MesaStatus | 'all'>('all')

  const filtered = MESAS.filter((m) => {
    if (section !== 'Todos' && m.section !== section) return false
    if (filterStatus !== 'all' && m.status !== filterStatus) return false
    return true
  })

  const counts = {
    livre: MESAS.filter((m) => m.status === 'livre').length,
    ocupada: MESAS.filter((m) => m.status === 'ocupada').length,
    reservada: MESAS.filter((m) => m.status === 'reservada').length,
    aguardando: MESAS.filter((m) => m.status === 'aguardando').length,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="lab-heading">Salão</h1>
          <p className="lab-subheading">Mapa de mesas em tempo real — {MESAS.length} mesas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`lab-icon-btn${view === 'grid' ? ' lab-icon-btn--active' : ''}`}
            onClick={() => setView('grid')}
            style={{ border: '1px solid var(--lab-border)', width: 34, height: 34 }}
          >
            <Grid3X3 className="size-4" />
          </button>
          <button
            type="button"
            className={`lab-icon-btn${view === 'list' ? ' lab-icon-btn--active' : ''}`}
            onClick={() => setView('list')}
            style={{ border: '1px solid var(--lab-border)', width: 34, height: 34 }}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              height: 34,
              background: 'var(--lab-blue)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus className="size-4" />
            Nova Mesa
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.entries(counts) as [MesaStatus, number][]).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status]
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
              className="lab-card lab-card-p flex items-center gap-3 text-left"
              style={{
                borderLeft: `3px solid ${cfg.color}`,
                background: filterStatus === status ? cfg.bg : undefined,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <p style={{ fontSize: 26, fontWeight: 700, color: cfg.color, margin: 0 }}>{count}</p>
              <p style={{ fontSize: 12, color: 'var(--lab-fg-muted)', margin: 0 }}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--lab-border)',
              background: section === s ? 'var(--lab-blue)' : 'transparent',
              color: section === s ? 'white' : 'var(--lab-fg-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((mesa) => {
            const cfg = STATUS_CONFIG[mesa.status]
            return (
              <div
                key={mesa.id}
                className="lab-card"
                style={{
                  padding: 14,
                  border: `1px solid ${cfg.border}`,
                  background: cfg.bg,
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--lab-fg)' }}>{mesa.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: cfg.color,
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 4,
                      padding: '2px 6px',
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <Users style={{ width: 11, height: 11, color: 'var(--lab-fg-muted)' }} />
                  <span style={{ fontSize: 11, color: 'var(--lab-fg-muted)' }}>{mesa.capacity} lugares</span>
                  <span style={{ fontSize: 10, color: 'var(--lab-fg-muted)', marginLeft: 'auto' }}>{mesa.section}</span>
                </div>

                {mesa.status === 'ocupada' && (
                  <>
                    {mesa.garcom && (
                      <p style={{ fontSize: 11, color: 'var(--lab-fg-soft)', margin: '2px 0' }}>
                        Garçom: {mesa.garcom}
                      </p>
                    )}
                    {mesa.valor && (
                      <p style={{ fontSize: 13, fontWeight: 700, color: cfg.color, margin: '4px 0 0' }}>{mesa.valor}</p>
                    )}
                    {mesa.tempo && (
                      <p style={{ fontSize: 11, color: 'var(--lab-fg-muted)', margin: '2px 0 0' }}>⏱ {mesa.tempo}</p>
                    )}
                  </>
                )}

                {mesa.status === 'reservada' && mesa.tempo && (
                  <p style={{ fontSize: 11, color: cfg.color, margin: '4px 0 0', fontWeight: 500 }}>
                    Reserva: {mesa.tempo}
                  </p>
                )}

                {mesa.status === 'aguardando' && mesa.comanda && (
                  <p style={{ fontSize: 11, color: cfg.color, margin: '4px 0 0', fontWeight: 500 }}>
                    Comanda {mesa.comanda}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="lab-card" style={{ overflowX: 'auto' }}>
          <table className="lab-table">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Seção</th>
                <th>Capacidade</th>
                <th>Status</th>
                <th>Garçom</th>
                <th>Cliente</th>
                <th>Tempo</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mesa) => {
                const cfg = STATUS_CONFIG[mesa.status]
                return (
                  <tr key={mesa.id}>
                    <td className="lab-td-main">{mesa.label}</td>
                    <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{mesa.section}</td>
                    <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{mesa.capacity} lug.</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: cfg.color,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          borderRadius: 4,
                          padding: '2px 8px',
                        }}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{mesa.garcom ?? '—'}</td>
                    <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{mesa.cliente ?? '—'}</td>
                    <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{mesa.tempo ?? '—'}</td>
                    <td className="lab-td-main">{mesa.valor ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
