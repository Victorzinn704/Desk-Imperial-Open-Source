'use client'

import { useMemo, useState } from 'react'
import { Plus, Users, X } from 'lucide-react'
import type { Mesa, Comanda, Garcom } from './pdv-types'
import { calcTotal, formatElapsed } from './pdv-types'
import { formatCurrency } from '@/lib/currency'

type Props = {
  garcons: Garcom[]
  mesas: Mesa[]
  comandas: Comanda[]
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onAddGarcom: (nome: string) => void
  onRemoveGarcom: (id: string) => void
}

const GARCOM_CORES = [
  '#a78bfa', // roxo
  '#34d399', // verde água
  '#fb923c', // laranja
  '#f472b6', // rosa
  '#60a5fa', // azul
  '#fbbf24', // amarelo
  '#e879f9', // fúcsia
  '#2dd4bf', // teal
]

function resolveMesaComanda(mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) {
  return mesa.comandaId ? comandaById.get(mesa.comandaId) : undefined
}

// Bonequinho SVG estilizado
function StickFigure({ color }: { color: string }) {
  return (
    <svg width="38" height="54" viewBox="0 0 38 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* cabeça */}
      <circle cx="19" cy="9" r="7" stroke={color} strokeWidth="2.2" />
      {/* corpo */}
      <line x1="19" y1="16" x2="19" y2="34" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {/* braços */}
      <line x1="8" y1="22" x2="30" y2="22" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {/* perna esquerda */}
      <line x1="19" y1="34" x2="11" y2="50" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {/* perna direita */}
      <line x1="19" y1="34" x2="27" y2="50" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function MesaChip({
  mesa,
  comanda,
  garcomCor,
  onUnassign,
}: {
  mesa: Mesa
  comanda?: Comanda
  garcomCor: string
  onUnassign: () => void
}) {
  return (
    <div
      className="relative rounded-xl border p-3 group transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: `${garcomCor}08`,
        borderColor: `${garcomCor}33`,
      }}
    >
      {/* Unassign button */}
      <button
        type="button"
        title="Remover mesa"
        onClick={onUnassign}
        className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
      >
        <X className="size-3" />
      </button>

      <div className="flex items-center justify-between pr-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: `${garcomCor}80` }}>
            Mesa
          </p>
          <p className="text-2xl font-bold text-white leading-none">{mesa.numero}</p>
        </div>
        <div className="flex items-center gap-1" style={{ color: `${garcomCor}70` }}>
          <Users className="size-3" />
          <span className="text-[10px]">{mesa.capacidade}</span>
        </div>
      </div>

      {comanda && (
        <div
          className="mt-2 rounded-lg px-2 py-1.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {comanda.clienteNome && (
            <p className="text-[11px] font-medium text-white truncate mb-0.5">{comanda.clienteNome}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-soft)]">
              {comanda.itens.length} {comanda.itens.length === 1 ? 'item' : 'itens'} · {formatElapsed(comanda.abertaEm)}
            </span>
            <span className="text-[11px] font-bold" style={{ color: garcomCor }}>
              {formatCurrency(calcTotal(comanda), 'BRL')}
            </span>
          </div>
        </div>
      )}

      {!comanda && (
        <p className="mt-1 text-[10px]" style={{ color: `${garcomCor}60` }}>
          sem comanda
        </p>
      )}
    </div>
  )
}

function AssignModal({
  garcons,
  mesasDisponiveis,
  onAssign,
  onClose,
}: {
  garcons: Garcom[]
  mesasDisponiveis: Mesa[]
  onAssign: (mesaId: string, garcomId: string) => void
  onClose: () => void
}) {
  const [selectedMesa, setSelectedMesa] = useState<string>('')
  const [selectedGarcom, setSelectedGarcom] = useState<string>('')

  function handleSave() {
    if (selectedMesa && selectedGarcom) {
      onAssign(selectedMesa, selectedGarcom)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: '#0e1018', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <h3 className="text-base font-bold text-white mb-4">Atribuir Mesa ao Garçom</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)] mb-1.5 block">
              Mesa
            </label>
            <select
              className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--accent)]"
              value={selectedMesa}
              onChange={(e) => setSelectedMesa(e.target.value)}
            >
              <option value="">Selecione uma mesa</option>
              {mesasDisponiveis.map((m) => (
                <option key={m.id} value={m.id}>
                  Mesa {m.numero} — {m.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)] mb-1.5 block">
              Garçom
            </label>
            <select
              className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--accent)]"
              value={selectedGarcom}
              onChange={(e) => setSelectedGarcom(e.target.value)}
            >
              <option value="">Selecione um garçom</option>
              {garcons.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[rgba(255,255,255,0.1)] py-2.5 text-sm text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.2)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedMesa || !selectedGarcom}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-black transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            Atribuir
          </button>
        </div>
      </div>
    </div>
  )
}

function AddGarcomModal({ onSave, onClose }: { onSave: (nome: string) => void; onClose: () => void }) {
  const [nome, setNome] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-xs rounded-2xl border p-6 shadow-2xl"
        style={{ background: '#0e1018', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <h3 className="text-base font-bold text-white mb-4">Novo Garçom</h3>
        <input
          autoFocus
          type="text"
          placeholder="Nome do garçom"
          className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && nome.trim()) {
              onSave(nome.trim())
              onClose()
            }
          }}
        />
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[rgba(255,255,255,0.1)] py-2.5 text-sm text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.2)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!nome.trim()}
            onClick={() => {
              onSave(nome.trim())
              onClose()
            }}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-black transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}

export function PdvGarcomBoard({ garcons, mesas, comandas, onAssign, onAddGarcom, onRemoveGarcom }: Readonly<Props>) {
  const [showAddGarcom, setShowAddGarcom] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const comandaById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])

  // Garçom index → cor
  function getGarcomCor(garcom: Garcom) {
    const idx = garcons.findIndex((g) => g.id === garcom.id)
    return garcom.cor || GARCOM_CORES[idx % GARCOM_CORES.length]
  }

  // Mesas sem garçom ou ocupadas/reservadas
  const mesasParaAtribuir = mesas.filter((m) => m.status !== 'livre')

  if (garcons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] py-20 text-center gap-5">
        <div className="opacity-40">
          <StickFigure color="#9b8460" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-soft)]">Nenhum garçom cadastrado</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Adicione garçons para distribuir as mesas</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddGarcom(true)}
          className="flex items-center gap-2 rounded-[14px] border border-[rgba(155,132,96,0.4)] bg-[rgba(155,132,96,0.1)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] transition-all hover:bg-[rgba(155,132,96,0.18)]"
        >
          <Plus className="size-4" />
          Adicionar Garçom
        </button>

        {showAddGarcom && <AddGarcomModal onSave={onAddGarcom} onClose={() => setShowAddGarcom(false)} />}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-soft)]">
          {garcons.length} {garcons.length === 1 ? 'garçom' : 'garçons'} em turno
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAssign(true)}
            disabled={mesasParaAtribuir.length === 0}
            className="flex items-center gap-1.5 rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.2)] disabled:opacity-40"
          >
            Atribuir Mesa
          </button>
          <button
            type="button"
            onClick={() => setShowAddGarcom(true)}
            className="flex items-center gap-1.5 rounded-[12px] border border-[rgba(155,132,96,0.35)] bg-[rgba(155,132,96,0.08)] px-3 py-2 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[rgba(155,132,96,0.16)]"
          >
            <Plus className="size-3.5" />
            Garçom
          </button>
        </div>
      </div>

      {/* Colunas */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {garcons.map((garcom) => {
          const cor = getGarcomCor(garcom)
          const garcomMesas = mesas.filter((m) => m.garcomId === garcom.id)
          const totalAtivo = garcomMesas.reduce((sum, m) => {
            const c = resolveMesaComanda(m, comandaById)
            return sum + (c ? calcTotal(c) : 0)
          }, 0)

          return (
            <div
              key={garcom.id}
              className="flex-shrink-0 rounded-2xl border flex flex-col"
              style={{
                width: 220,
                borderColor: `${cor}28`,
                background: `${cor}05`,
              }}
            >
              {/* Header do garçom */}
              <div
                className="flex flex-col items-center pt-5 pb-3 px-3 border-b gap-1 relative"
                style={{ borderColor: `${cor}20` }}
              >
                {/* Remover */}
                <button
                  type="button"
                  title="Remover garçom"
                  onClick={() => onRemoveGarcom(garcom.id)}
                  className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 hover:opacity-100 transition-opacity hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                >
                  <X className="size-3" />
                </button>

                {/* Bonequinho */}
                <div className="rounded-full p-2" style={{ background: `${cor}15`, border: `1.5px solid ${cor}30` }}>
                  <StickFigure color={cor} />
                </div>

                <p className="text-sm font-bold text-white mt-1">{garcom.nome}</p>

                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {garcomMesas.length} {garcomMesas.length === 1 ? 'mesa' : 'mesas'}
                  </span>
                  {totalAtivo > 0 && (
                    <span className="text-[10px] font-semibold" style={{ color: cor }}>
                      {formatCurrency(totalAtivo, 'BRL')}
                    </span>
                  )}
                </div>
              </div>

              {/* Mesas atribuídas */}
              <div className="flex flex-col gap-2.5 p-3 flex-1 min-h-[160px]">
                {garcomMesas.length === 0 && (
                  <p className="text-center text-xs text-[var(--text-muted)] pt-6">Nenhuma mesa atribuída</p>
                )}
                {garcomMesas.map((mesa) => (
                  <MesaChip
                    key={mesa.id}
                    mesa={mesa}
                    comanda={resolveMesaComanda(mesa, comandaById)}
                    garcomCor={cor}
                    onUnassign={() => onAssign(mesa.id, undefined)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Add garçom inline */}
        <button
          type="button"
          onClick={() => setShowAddGarcom(true)}
          className="flex-shrink-0 w-14 rounded-2xl border border-dashed border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[var(--text-muted)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:text-[var(--text-soft)]"
          title="Adicionar garçom"
        >
          <Plus className="size-5" />
        </button>
      </div>

      {/* Modais */}
      {showAddGarcom && <AddGarcomModal onSave={onAddGarcom} onClose={() => setShowAddGarcom(false)} />}

      {showAssign && (
        <AssignModal
          garcons={garcons}
          mesasDisponiveis={mesasParaAtribuir}
          onAssign={onAssign}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  )
}
