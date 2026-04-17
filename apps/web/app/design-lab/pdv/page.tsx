'use client'

import { Plus, Search, Filter } from 'lucide-react'

const COLUNAS = [
  {
    id: 'aberta',
    label: 'Aberta',
    color: '#636363',
    cards: [
      { id: '#1048', mesa: 'Mesa 3', cliente: 'Carlos M.', itens: 2, valor: 'R$ 58,00', tempo: '5min' },
      { id: '#1047', mesa: 'Delivery', cliente: 'Fernanda L.', itens: 4, valor: 'R$ 124,00', tempo: '12min' },
      { id: '#1046', mesa: 'Mesa 7', cliente: 'Ricardo B.', itens: 1, valor: 'R$ 32,50', tempo: '18min' },
    ],
  },
  {
    id: 'preparo',
    label: 'Em Preparo',
    color: '#f59e0b',
    cards: [
      { id: '#1045', mesa: 'Mesa 2', cliente: 'Ana P.', itens: 3, valor: 'R$ 97,00', tempo: '22min' },
      { id: '#1044', mesa: 'Mesa 9', cliente: 'Bruno S.', itens: 5, valor: 'R$ 186,50', tempo: '30min' },
    ],
  },
  {
    id: 'pronta',
    label: 'Pronta',
    color: '#008cff',
    cards: [
      { id: '#1043', mesa: 'Mesa 5', cliente: 'Juliana K.', itens: 4, valor: 'R$ 134,00', tempo: '38min' },
      { id: '#1042', mesa: 'Mesa 11', cliente: 'Marcos T.', itens: 2, valor: 'R$ 76,00', tempo: '41min' },
    ],
  },
  {
    id: 'fechada',
    label: 'Fechada',
    color: '#22c55e',
    cards: [
      { id: '#1041', mesa: 'Mesa 4', cliente: 'Camila R.', itens: 6, valor: 'R$ 228,00', tempo: '55min' },
      { id: '#1040', mesa: 'Retirada', cliente: 'Paulo N.', itens: 3, valor: 'R$ 89,50', tempo: '62min' },
      { id: '#1039', mesa: 'Mesa 1', cliente: 'Sandra F.', itens: 5, valor: 'R$ 176,50', tempo: '70min' },
    ],
  },
]

export default function PdvPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="lab-heading">PDV — Comandas</h1>
          <p className="lab-subheading">Kanban de pedidos em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--lab-surface)',
              border: '1px solid var(--lab-border)',
              borderRadius: 8,
              padding: '0 12px',
              height: 34,
            }}
          >
            <Search className="size-3.5" style={{ color: 'var(--lab-fg-muted)' }} />
            <input
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: 'var(--lab-fg)',
                width: 160,
              }}
              placeholder="Buscar comanda..."
              readOnly
            />
          </div>
          <button
            className="lab-icon-btn"
            type="button"
            style={{ border: '1px solid var(--lab-border)', width: 34, height: 34 }}
          >
            <Filter className="size-4" />
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
            Nova Comanda
          </button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Abertas', value: '3', color: '#636363' },
          { label: 'Em Preparo', value: '2', color: '#f59e0b' },
          { label: 'Prontas', value: '2', color: '#008cff' },
          { label: 'Fechadas hoje', value: '29', color: '#22c55e' },
        ].map((k) => (
          <div
            key={k.label}
            className="lab-card lab-card-p flex items-center gap-3"
            style={{ borderLeft: `3px solid ${k.color}` }}
          >
            <p style={{ fontSize: 26, fontWeight: 700, color: k.color, margin: 0 }}>{k.value}</p>
            <p style={{ fontSize: 12, color: 'var(--lab-fg-muted)', margin: 0 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="lab-kanban">
        {COLUNAS.map((col) => (
          <div key={col.id} className="lab-kanban-col">
            <div className="lab-kanban-col__header" style={{ borderTop: `3px solid ${col.color}` }}>
              <p className="lab-kanban-col__title" style={{ color: col.color }}>
                {col.label}
              </p>
              <span className="lab-kanban-col__count">{col.cards.length}</span>
            </div>
            <div className="lab-kanban-col__body">
              {col.cards.map((card) => (
                <div key={card.id} className="lab-kanban-card">
                  <div className="lab-kanban-card__title">
                    {card.mesa} · {card.id}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--lab-fg-muted)', marginBottom: 8 }}>
                    {card.cliente} · {card.itens} itens
                  </div>
                  <div className="lab-kanban-card__meta">
                    <span className="lab-kanban-card__value">{card.valor}</span>
                    <span style={{ fontSize: 11, color: 'var(--lab-fg-muted)' }}>⏱ {card.tempo}</span>
                  </div>
                </div>
              ))}
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  background: 'transparent',
                  border: '1px dashed var(--lab-border)',
                  borderRadius: 8,
                  color: 'var(--lab-fg-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <Plus className="size-3.5" />
                Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
