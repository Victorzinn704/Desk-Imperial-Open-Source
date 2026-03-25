'use client'

import { useState, useCallback } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { ShoppingBag, TrendingUp, LayoutGrid } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { Comanda, ComandaItem, ComandaStatus, Mesa, MesaStatus, Garcom } from './pdv-types'
import { KANBAN_COLUMNS, calcTotal } from './pdv-types'
import { PdvColumn } from './pdv-column'
import { PdvComandaModal } from './pdv-comanda-modal'
import { PdvMesaModal } from './pdv-mesa-modal'
import { SalaoUnificado } from './pdv-salao-unified'
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

type ActiveTab = 'comandas' | 'salao'

function buildInitialComandas(): Comanda[] {
  return [
    {
      id: nanoid(),
      status: 'aberta',
      mesa: '3',
      clienteNome: 'João Silva',
      itens: [{ produtoId: 'demo1', nome: 'Hamburguer', quantidade: 2, precoUnitario: 25.00 }],
      desconto: 0,
      acrescimo: 10,
      abertaEm: new Date(Date.now() - 15 * 60000),
    },
    {
      id: nanoid(),
      status: 'em_preparo',
      mesa: '7',
      itens: [
        { produtoId: 'demo2', nome: 'Pizza Grande', quantidade: 1, precoUnitario: 45.00 },
        { produtoId: 'demo3', nome: 'Refrigerante', quantidade: 2, precoUnitario: 8.00 },
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
      itens: [{ produtoId: 'demo4', nome: 'Sushi Combo', quantidade: 1, precoUnitario: 68.00 }],
      desconto: 0,
      acrescimo: 0,
      abertaEm: new Date(Date.now() - 50 * 60000),
    },
  ]
}

function buildInitialMesas(comandas: Comanda[]): Mesa[] {
  return [
    { id: nanoid(), numero: '1', capacidade: 4, status: 'ocupada', comandaId: comandas[2]?.id },
    { id: nanoid(), numero: '2', capacidade: 2, status: 'livre' },
    { id: nanoid(), numero: '3', capacidade: 6, status: 'ocupada', comandaId: comandas[0]?.id },
    { id: nanoid(), numero: '4', capacidade: 4, status: 'reservada' },
    { id: nanoid(), numero: '5', capacidade: 2, status: 'livre' },
    { id: nanoid(), numero: '6', capacidade: 8, status: 'livre' },
    { id: nanoid(), numero: '7', capacidade: 4, status: 'ocupada', comandaId: comandas[1]?.id },
    { id: nanoid(), numero: 'VIP', capacidade: 10, status: 'reservada' },
  ]
}

const GARCOM_CORES = ['#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#fbbf24']

export function PdvBoard({ products }: Readonly<PdvBoardProps>) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('comandas')
  const [comandas, setComandas] = useState<Comanda[]>(buildInitialComandas)
  const [mesas, setMesas] = useState<Mesa[]>(() => buildInitialMesas(buildInitialComandas()))
  const [garcons, setGarcons] = useState<Garcom[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingComanda, setEditingComanda] = useState<Comanda | null>(null)
  const [showMesaModal, setShowMesaModal] = useState(false)
  const [mesaPreSelected, setMesaPreSelected] = useState<Mesa | null>(null)

  // ── Comandas DnD ──────────────────────────────────────────────────────────
  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination || source.droppableId === destination.droppableId) return
    const newStatus = destination.droppableId as ComandaStatus
    setComandas((prev) =>
      prev.map((c) => (c.id === draggableId ? { ...c, status: newStatus } : c)),
    )
  }, [])

  // ── Mesas status change (via kanban drag) ─────────────────────────────────
  function handleMesaStatusChange(mesaId: string, newStatus: MesaStatus) {
    setMesas((prev) =>
      prev.map((m) => (m.id === mesaId ? { ...m, status: newStatus } : m)),
    )
  }

  // ── Nova Comanda ──────────────────────────────────────────────────────────
  function handleNewComanda(data: {
    mesa: string; clienteNome: string; clienteDocumento: string
    itens: ComandaItem[]; desconto: number; acrescimo: number
  }) {
    const nova: Comanda = {
      id: nanoid(), status: 'aberta',
      mesa: data.mesa || undefined,
      clienteNome: data.clienteNome || undefined,
      clienteDocumento: data.clienteDocumento || undefined,
      itens: data.itens, desconto: data.desconto, acrescimo: data.acrescimo,
      abertaEm: new Date(),
    }
    setComandas((prev) => [nova, ...prev])
    if (mesaPreSelected) {
      setMesas((prev) =>
        prev.map((m) =>
          m.id === mesaPreSelected.id
            ? { ...m, status: 'ocupada' as MesaStatus, comandaId: nova.id }
            : m,
        ),
      )
      setMesaPreSelected(null)
    }
    setShowNewModal(false)
    return nova
  }

  // ── Editar Comanda ────────────────────────────────────────────────────────
  function handleEditComanda(data: {
    mesa: string; clienteNome: string; clienteDocumento: string
    itens: ComandaItem[]; desconto: number; acrescimo: number
  }) {
    if (!editingComanda) {
      return {
        id: nanoid(), status: 'aberta' as ComandaStatus,
        mesa: data.mesa || undefined, clienteNome: data.clienteNome || undefined,
        clienteDocumento: data.clienteDocumento || undefined,
        itens: data.itens, desconto: data.desconto, acrescimo: data.acrescimo,
        abertaEm: new Date(),
      }
    }
    const updated: Comanda = {
      ...editingComanda,
      mesa: data.mesa || undefined, clienteNome: data.clienteNome || undefined,
      clienteDocumento: data.clienteDocumento || undefined,
      itens: data.itens, desconto: data.desconto, acrescimo: data.acrescimo,
    }
    setComandas((prev) => prev.map((c) => (c.id === editingComanda.id ? updated : c)))
    setEditingComanda(null)
    return updated
  }

  function handleStatusChange(comanda: Comanda, newStatus: ComandaStatus) {
    setComandas((prev) =>
      prev.map((c) => (c.id === comanda.id ? { ...c, status: newStatus } : c)),
    )
    if (newStatus === 'fechada') {
      setMesas((prev) =>
        prev.map((m) =>
          m.comandaId === comanda.id
            ? { ...m, status: 'livre' as MesaStatus, comandaId: undefined }
            : m,
        ),
      )
    }
  }

  // ── Mesas CRUD ────────────────────────────────────────────────────────────
  function handleCreateMesa(data: { numero: string; capacidade: number; status: MesaStatus }) {
    setMesas((prev) => [...prev, { id: nanoid(), ...data }])
    setShowMesaModal(false)
  }

  function handleClickMesaLivre(mesa: Mesa) {
    setMesaPreSelected(mesa)
    setShowNewModal(true)
  }

  function handleClickMesaOcupada(comanda: Comanda) {
    setEditingComanda(comanda)
    setActiveTab('comandas')
  }

  // ── Garçons ───────────────────────────────────────────────────────────────
  function handleAddGarcom(nome: string) {
    const idx = garcons.length
    setGarcons((prev) => [
      ...prev,
      { id: nanoid(), nome, cor: GARCOM_CORES[idx % GARCOM_CORES.length] },
    ])
  }

  function handleRemoveGarcom(id: string) {
    setGarcons((prev) => prev.filter((g) => g.id !== id))
    // Remove atribuição das mesas
    setMesas((prev) => prev.map((m) => (m.garcomId === id ? { ...m, garcomId: undefined } : m)))
  }

  function handleAssignGarcom(mesaId: string, garcomId: string | undefined) {
    setMesas((prev) => prev.map((m) => (m.id === mesaId ? { ...m, garcomId } : m)))
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const abertas = comandas.filter((c) => c.status !== 'fechada')
  const totalEmAberto = abertas.reduce((sum, c) => sum + calcTotal(c), 0)
  const mesasLivres = mesas.filter((m) => m.status === 'livre').length
  const mesasOcupadas = mesas.filter((m) => m.status === 'ocupada').length

  const boardProducts = products.length > 0 ? products : [
    { id: 'demo1', name: 'Hamburguer', category: 'Lanches', unitPrice: 25.00, currency: 'BRL' },
    { id: 'demo2', name: 'Pizza Grande', category: 'Pizzas', unitPrice: 45.00, currency: 'BRL' },
    { id: 'demo3', name: 'Refrigerante', category: 'Bebidas', unitPrice: 8.00, currency: 'BRL' },
    { id: 'demo4', name: 'Sushi Combo', category: 'Japonesa', unitPrice: 68.00, currency: 'BRL' },
    { id: 'demo5', name: 'Batata Frita', category: 'Acompanhamentos', unitPrice: 12.00, currency: 'BRL' },
    { id: 'demo6', name: 'Cerveja 600ml', category: 'Bebidas', unitPrice: 15.00, currency: 'BRL' },
  ]

  const TABS = [
    { id: 'comandas' as ActiveTab, label: 'Comandas', icon: ShoppingBag },
    { id: 'salao'    as ActiveTab, label: 'Salão',    icon: LayoutGrid  },
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
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Comandas abertas</p>
            <p className="mt-1 text-2xl font-bold text-white">{abertas.length}</p>
          </div>
        </div>

        <div className="imperial-card-soft flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-[18px] bg-[rgba(52,242,127,0.12)] text-[#36f57c]">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Em aberto</p>
            <p className="mt-1 text-2xl font-bold text-[#36f57c]">{formatCurrency(totalEmAberto, 'BRL')}</p>
          </div>
        </div>

        <div className="imperial-card-soft flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-[18px] bg-[rgba(122,136,150,0.12)] text-[var(--text-soft)]">
            <LayoutGrid className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Mesas</p>
            <p className="mt-1 text-2xl font-bold text-white">
              <span className="text-[#36f57c]">{mesasLivres}</span>
              <span className="mx-1 text-[var(--text-muted)] text-lg">/</span>
              <span className="text-[#fb923c]">{mesasOcupadas}</span>
              <span className="ml-1.5 text-xs font-normal text-[var(--text-soft)]">livres / ocupadas</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: activeTab === id ? 'rgba(52,242,127,0.1)' : 'transparent',
              color: activeTab === id ? '#36f57c' : 'var(--text-soft)',
              border: activeTab === id ? '1px solid rgba(52,242,127,0.25)' : '1px solid transparent',
            }}
            onClick={() => setActiveTab(id)}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── ABA COMANDAS ── */}
      {activeTab === 'comandas' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-soft)]">
              Arraste as comandas entre colunas para atualizar o status
            </p>
            <button
              className="flex items-center gap-2 rounded-[14px] border border-[rgba(52,242,127,0.4)] bg-[rgba(52,242,127,0.1)] px-4 py-2.5 text-sm font-semibold text-[#36f57c] transition-all hover:bg-[rgba(52,242,127,0.18)]"
              type="button"
              onClick={() => { setMesaPreSelected(null); setShowNewModal(true) }}
            >
              Nova Comanda
            </button>
          </div>

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
        </>
      )}

      {/* ── ABA SALÃO (mesas + garçons unificados) ── */}
      {activeTab === 'salao' && (
        <SalaoUnificado
          mesas={mesas}
          garcons={garcons}
          comandas={comandas}
          onStatusChange={handleMesaStatusChange}
          onAssignGarcom={handleAssignGarcom}
          onAddGarcom={handleAddGarcom}
          onRemoveGarcom={handleRemoveGarcom}
          onAddMesa={() => setShowMesaModal(true)}
          onClickLivre={handleClickMesaLivre}
          onClickOcupada={handleClickMesaOcupada}
        />
      )}

      {/* Modais */}
      {showNewModal && (
        <PdvComandaModal
          products={boardProducts}
          initialMesa={mesaPreSelected?.numero}
          onClose={() => { setShowNewModal(false); setMesaPreSelected(null) }}
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
      {showMesaModal && (
        <PdvMesaModal
          onClose={() => setShowMesaModal(false)}
          onSave={handleCreateMesa}
        />
      )}
    </div>
  )
}
