'use client'

import { useState } from 'react'
import { Plus, Search, Package, TrendingUp, AlertTriangle } from 'lucide-react'

interface Product {
  id: string
  name: string
  category: string
  unit: string
  price: number
  cost: number
  stock: number
  minStock: number
  sold: number
}

const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'X-Burguer Especial',
    category: 'Lanches',
    unit: 'un',
    price: 32.9,
    cost: 14.5,
    stock: 0,
    minStock: 0,
    sold: 42,
  },
  {
    id: '2',
    name: 'Batata Frita G',
    category: 'Acompanhamentos',
    unit: 'un',
    price: 18.9,
    cost: 5.2,
    stock: 0,
    minStock: 0,
    sold: 31,
  },
  {
    id: '3',
    name: 'Refrigerante 600ml',
    category: 'Bebidas',
    unit: 'un',
    price: 8.0,
    cost: 3.5,
    stock: 48,
    minStock: 20,
    sold: 78,
  },
  {
    id: '4',
    name: 'Suco de Laranja',
    category: 'Bebidas',
    unit: 'un',
    price: 12.9,
    cost: 4.8,
    stock: 22,
    minStock: 10,
    sold: 24,
  },
  {
    id: '5',
    name: 'Água Mineral 500ml',
    category: 'Bebidas',
    unit: 'un',
    price: 4.5,
    cost: 1.2,
    stock: 84,
    minStock: 30,
    sold: 56,
  },
  {
    id: '6',
    name: 'Sobremesa do Dia',
    category: 'Sobremesas',
    unit: 'un',
    price: 16.9,
    cost: 7.0,
    stock: 8,
    minStock: 10,
    sold: 18,
  },
  {
    id: '7',
    name: 'Frango Grelhado',
    category: 'Pratos',
    unit: 'un',
    price: 42.9,
    cost: 18.0,
    stock: 0,
    minStock: 0,
    sold: 15,
  },
  {
    id: '8',
    name: 'Salada Caesar',
    category: 'Entradas',
    unit: 'un',
    price: 24.9,
    cost: 9.5,
    stock: 0,
    minStock: 0,
    sold: 12,
  },
  {
    id: '9',
    name: 'Cerveja Long Neck',
    category: 'Bebidas',
    unit: 'un',
    price: 12.0,
    cost: 5.8,
    stock: 60,
    minStock: 24,
    sold: 94,
  },
  {
    id: '10',
    name: 'Pizza Margherita',
    category: 'Pizzas',
    unit: 'un',
    price: 54.9,
    cost: 22.0,
    stock: 0,
    minStock: 0,
    sold: 8,
  },
  {
    id: '11',
    name: 'Café Espresso',
    category: 'Bebidas',
    unit: 'un',
    price: 6.9,
    cost: 1.8,
    stock: 120,
    minStock: 50,
    sold: 67,
  },
  {
    id: '12',
    name: 'Brigadeiro',
    category: 'Sobremesas',
    unit: 'un',
    price: 6.9,
    cost: 2.1,
    stock: 24,
    minStock: 30,
    sold: 38,
  },
]

const CATEGORIES = ['Todos', 'Lanches', 'Pratos', 'Pizzas', 'Acompanhamentos', 'Entradas', 'Bebidas', 'Sobremesas']

function margin(price: number, cost: number) {
  return (((price - cost) / price) * 100).toFixed(1)
}

export default function PortfolioPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')

  const filtered = PRODUCTS.filter((p) => {
    if (category !== 'Todos' && p.category !== category) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const lowStock = PRODUCTS.filter((p) => p.minStock > 0 && p.stock <= p.minStock).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="lab-heading">Portfólio</h1>
          <p className="lab-subheading">{PRODUCTS.length} produtos cadastrados</p>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: 'var(--lab-fg)',
                width: 160,
              }}
              placeholder="Buscar produto..."
            />
          </div>
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
            Novo Produto
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Produtos', value: `${PRODUCTS.length}`, icon: Package, color: '#008cff' },
          { label: 'Mais Vendido', value: 'Cerveja LN', icon: TrendingUp, color: '#22c55e' },
          { label: 'Estoque Baixo', value: `${lowStock} itens`, icon: AlertTriangle, color: '#f59e0b' },
          { label: 'Margem Média', value: '62,4%', icon: TrendingUp, color: '#a78bfa' },
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

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--lab-border)',
              background: category === c ? 'var(--lab-blue)' : 'transparent',
              color: category === c ? 'white' : 'var(--lab-fg-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Products table */}
      <div className="lab-card" style={{ overflowX: 'auto' }}>
        <table className="lab-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Un.</th>
              <th>Preço</th>
              <th>Custo</th>
              <th>Margem</th>
              <th>Estoque</th>
              <th>Vendidos</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const mg = parseFloat(margin(p.price, p.cost))
              const lowSt = p.minStock > 0 && p.stock <= p.minStock
              return (
                <tr key={p.id}>
                  <td className="lab-td-main">{p.name}</td>
                  <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{p.category}</td>
                  <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{p.unit}</td>
                  <td className="lab-td-main">R$ {p.price.toFixed(2).replace('.', ',')}</td>
                  <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>
                    R$ {p.cost.toFixed(2).replace('.', ',')}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: mg >= 60 ? '#22c55e' : mg >= 40 ? '#f59e0b' : '#f87171',
                        background:
                          mg >= 60
                            ? 'rgba(34,197,94,0.1)'
                            : mg >= 40
                              ? 'rgba(245,158,11,0.1)'
                              : 'rgba(248,113,113,0.1)',
                        borderRadius: 4,
                        padding: '2px 7px',
                      }}
                    >
                      {mg}%
                    </span>
                  </td>
                  <td>
                    {p.minStock === 0 ? (
                      <span style={{ fontSize: 11, color: 'var(--lab-fg-muted)' }}>—</span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: lowSt ? '#f59e0b' : '#22c55e',
                          background: lowSt ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                          borderRadius: 4,
                          padding: '2px 7px',
                        }}
                      >
                        {p.stock} {lowSt ? '⚠' : ''}
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--lab-fg-muted)', fontSize: 12 }}>{p.sold}×</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
