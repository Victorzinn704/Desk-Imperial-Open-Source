'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { Plus, ShoppingBag, TrendingUp } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { Comanda, ComandaItem, ComandaStatus } from './pdv-types'
import { KANBAN_COLUMNS, calcTotal } from './pdv-types'
import { PdvColumn } from './pdv-column'
import { PdvComandaModal } from './pdv-comanda-modal'
import { formatCurrency } from '@/lib/currency'

type SimpleProduct = {
  id: string
  name: string
  category: string
  unitPrice: number
  currency: string
}

type PdvBoardProps = {
  products: SimpleProduct[]
}

function buildInitialComandas(): Comanda[] {
  return [
    {
      id: nanoid(),
      status: 'aberta',
      mesa: '3',
      clienteNome: 'João Silva',
      itens: [{ produtoId: 'demo1', nome: 'Hamburguer', quantidade: 2, precoUnitario: 2500 }],
      desconto: 0,
      acrescimo: 10,
      abertaEm: new Date(Date.now() - 15 * 60000),
    },
    {
      id: nanoid(),
      status: 'em_preparo',
      mesa: '7',
      itens: [
        { produtoId: 'demo2', nome: 'Pizza Grande', quantidade: 1, precoUnitario: 4500 },
        { produtoId: 'demo3', nome: 'Refrigerante', quantidade: 2, precoUnitario: 800 },
      ],
      desconto: 5,
      acrescimo: 0,
      abertaEm: new Date(Date.now() - 35 * 60000),
    },
    {
      id: nanoid(),
      status: 'pronta',
      mesa: '1',
      clienteNome: 'Maria Fernanda',
      itens: [{ produtoId: 'demo4', nome: 'Sushi Combo', quantidade: 1, precoUnitario: 6800 }],
      desconto: 0,
      acrescimo: 0,
      abertaEm: new Date(Date.now() - 50 * 60000),
    },
  ]
}

export function PdvBoard({ products }: Readonly<PdvBoardProps>) {
  const [comandas, setComandas] = useState<Comanda[]>(buildInitialComandas)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingComanda, setEditingComanda] = useState<Comanda | null>(null)

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination || source.droppableId === destination.droppableId) return

    const newStatus = destination.droppableId as ComandaStatus

    setComandas((prev) =>
      prev.map((c) => (c.id === draggableId ? { ...c, status: newStatus } : c)),
    )
  }, [])

  function handleNewComanda(data: {
    mesa: string
    clienteNome: string
    clienteDocumento: string
    itens: ComandaItem[]
    desconto: number
    acrescimo: number
  }) {
    const nova: Comanda = {
      id: nanoid(),
      status: 'aberta',
      mesa: data.mesa || undefined,
      clienteNome: data.clienteNome || undefined,
      clienteDocumento: data.clienteDocumento || undefined,
      itens: data.itens,
      desconto: data.desconto,
      acrescimo: data.acrescimo,
      abertaEm: new Date(),
    }
    setComandas((prev) => [nova, ...prev])
    setShowNewModal(false)
  }

  function handleEditComanda(data: {
    mesa: string
    clienteNome: string
    clienteDocumento: string
    itens: ComandaItem[]
    desconto: number
    acrescimo: number
  }) {
    if (!editingComanda) return
    setComandas((prev) =>
      prev.map((c) =>
        c.id === editingComanda.id
          ? {
              ...c,
              mesa: data.mesa || undefined,
              clienteNome: data.clienteNome || undefined,
              clienteDocumento: data.clienteDocumento || undefined,
              itens: data.itens,
              desconto: data.desconto,
              acrescimo: data.acrescimo,
            }
          : c,
      ),
    )
    setEditingComanda(null)
  }

  function handleStatusChange(comanda: Comanda, newStatus: ComandaStatus) {
    setComandas((prev) =>
      prev.map((c) => (c.id === comanda.id ? { ...c, status: newStatus } : c)),
    )
  }

  // Stats
  const abertas = comandas.filter((c) => c.status !== 'fechada')
  const totalEmAberto = abertas.reduce((sum, c) => sum + calcTotal(c), 0)
  const totalFechado = comandas
    .filter((c) => c.status === 'fechada')
    .reduce((sum, c) => sum + calcTotal(c), 0)

  const boardProducts =
    products.length > 0
      ? products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          unitPrice: p.unitPrice,
          currency: p.currency,
        }))
      : [
          { id: 'demo1', name: 'Hamburguer', category: 'Lanches', unitPrice: 2500, currency: 'BRL' },
          { id: 'demo2', name: 'Pizza Grande', category: 'Pizzas', unitPrice: 4500, currency: 'BRL' },
          { id: 'demo3', name: 'Refrigerante', category: 'Bebidas', unitPrice: 800, currency: 'BRL' },
          { id: 'demo4', name: 'Sushi Combo', category: 'Japonesa', unitPrice: 6800, currency: 'BRL' },
          { id: 'demo5', name: 'Batata Frita', category: 'Acompanhamentos', unitPrice: 1200, currency: 'BRL' },
          { id: 'demo6', name: 'Cerveja 600ml', category: 'Bebidas', unitPrice: 1500, currency: 'BRL' },
        ]

  return (
    <div className="space-y-6">
      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="imperial-card-soft flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-[18px] bg-[rgba(96,165,250,0.12)] text-[#60a5fa]">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Comandas abertas
            </p>
            <p className="mt-1 text-2xl font-bold text-white">{abertas.length}</p>
          </div>
        </div>

        <div className="imperial-card-soft flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-[18px] bg-[rgba(52,242,127,0.12)] text-[#36f57c]">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Em aberto
            </p>
            <p className="mt-1 text-2xl font-bold text-[#36f57c]">
              {formatCurrency(totalEmAberto, 'BRL')}
            </p>
          </div>
        </div>

        <div className="imperial-card-soft flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-[18px] bg-[rgba(122,136,150,0.12)] text-[var(--text-soft)]">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
              Fechado hoje
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatCurrency(totalFechado, 'BRL')}
            </p>
          </div>
        </div>
      </div>

      {/* Board header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">
          Arraste as comandas entre colunas para atualizar o status
        </p>
        <button
          className="flex items-center gap-2 rounded-[14px] border border-[rgba(52,242,127,0.4)] bg-[rgba(52,242,127,0.1)] px-4 py-2.5 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.18)]"
          type="button"
          onClick={() => setShowNewModal(true)}
        >
          <Plus className="size-4" />
          Nova Comanda
        </button>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((column) => (
            <PdvColumn
              key={column.id}
              column={column}
              comandas={comandas.filter((c) => c.status === column.id)}
              onCardClick={(c) => setEditingComanda(c)}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Modals */}
      {showNewModal && (
        <PdvComandaModal
          products={boardProducts}
          onClose={() => setShowNewModal(false)}
          onSave={handleNewComanda}
        />
      )}

      {editingComanda && (
        <PdvComandaModal
          comanda={editingComanda}
          products={boardProducts}
          onClose={() => setEditingComanda(null)}
          onSave={handleEditComanda}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
