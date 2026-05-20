'use client'

import { type ChangeEvent, useCallback, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import type { Comanda } from './pdv-types'
import { HistoricoCard } from './pdv-historico-card'
import {
  buildHistoricoResponsaveis,
  buildHistoricoSummary,
  filterHistoricoComandas,
  type HistoricoFiltro,
  type HistoricoOrdenacao,
  type HistoricoSummary,
} from './pdv-historico-view.model'

export function PdvHistoricoView({ comandas }: Readonly<{ comandas: Comanda[] }>) {
  const controller = useHistoricoController(comandas)

  return (
    <div className="space-y-5">
      <HistoricoControls controller={controller} />
      <HistoricoResults comandas={controller.sorted} />
    </div>
  )
}

function useHistoricoController(comandas: Comanda[]) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<HistoricoFiltro>('tudo')
  const [ordenacao, setOrdenacao] = useState<HistoricoOrdenacao>('recentes')
  const [responsavel, setResponsavel] = useState('todos')

  return {
    busca,
    filtro,
    ordenacao,
    responsavel,
    responsaveis: useMemo(() => buildHistoricoResponsaveis(comandas), [comandas]),
    setBusca,
    setFiltro,
    setOrdenacao,
    setResponsavel,
    sorted: useMemo(
      () => filterHistoricoComandas({ busca, comandas, filtro, ordenacao, responsavel }),
      [busca, comandas, filtro, ordenacao, responsavel],
    ),
    summary: useMemo(() => buildHistoricoSummary(comandas), [comandas]),
  }
}

type HistoricoController = ReturnType<typeof useHistoricoController>

function HistoricoHeader() {
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">Histórico de comandas</p>
      <p className="mt-1 text-sm text-[var(--text-soft)]">
        Visualize comandas abertas, pagas e canceladas com seus itens, valores e responsável pelo atendimento.
      </p>
    </div>
  )
}

function HistoricoControls({ controller }: Readonly<{ controller: HistoricoController }>) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <HistoricoHeader />
      <div className="flex flex-col gap-3 xl:min-w-[760px]">
        <HistoricoFilterFields controller={controller} />
        <HistoricoFiltroTabs
          filtro={controller.filtro}
          summary={controller.summary}
          onFiltroChange={controller.setFiltro}
        />
      </div>
    </div>
  )
}

function HistoricoFilterFields({ controller }: Readonly<{ controller: HistoricoController }>) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_200px]">
      <HistoricoSearchField busca={controller.busca} onBuscaChange={controller.setBusca} />
      <HistoricoResponsavelSelect
        responsaveis={controller.responsaveis}
        responsavel={controller.responsavel}
        onResponsavelChange={controller.setResponsavel}
      />
      <HistoricoOrdenacaoSelect ordenacao={controller.ordenacao} onOrdenacaoChange={controller.setOrdenacao} />
    </div>
  )
}

function HistoricoSearchField({
  busca,
  onBuscaChange,
}: Readonly<{ busca: string; onBuscaChange: (value: string) => void }>) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onBuscaChange(event.target.value),
    [onBuscaChange],
  )

  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-soft)]" />
      <input
        aria-label="Buscar comandas"
        className="w-full rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-soft)] focus:border-[rgba(52,242,127,0.35)] focus:outline-none"
        placeholder="Buscar por mesa, cliente, documento, item ou responsável"
        type="text"
        value={busca}
        onChange={handleChange}
      />
    </label>
  )
}

function HistoricoResponsavelSelect({
  responsavel,
  responsaveis,
  onResponsavelChange,
}: Readonly<{ responsavel: string; responsaveis: string[]; onResponsavelChange: (value: string) => void }>) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => onResponsavelChange(event.target.value),
    [onResponsavelChange],
  )

  return (
    <select
      aria-label="Filtrar por responsável"
      className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[rgba(52,242,127,0.35)] focus:outline-none"
      value={responsavel}
      onChange={handleChange}
    >
      {responsaveis.map((item) => (
        <option className="bg-[#11161d] text-[var(--text-primary)]" key={item} value={item}>
          {item === 'todos' ? 'Todos os responsáveis' : item}
        </option>
      ))}
    </select>
  )
}

function HistoricoOrdenacaoSelect({
  ordenacao,
  onOrdenacaoChange,
}: Readonly<{ ordenacao: HistoricoOrdenacao; onOrdenacaoChange: (value: HistoricoOrdenacao) => void }>) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => onOrdenacaoChange(event.target.value as HistoricoOrdenacao),
    [onOrdenacaoChange],
  )

  return (
    <select
      aria-label="Ordenar comandas"
      className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[rgba(52,242,127,0.35)] focus:outline-none"
      value={ordenacao}
      onChange={handleChange}
    >
      <option className="bg-[#11161d] text-[var(--text-primary)]" value="recentes">
        Mais recentes
      </option>
      <option className="bg-[#11161d] text-[var(--text-primary)]" value="maior_valor">
        Maior valor
      </option>
    </select>
  )
}

function HistoricoFiltroTabs({
  filtro,
  summary,
  onFiltroChange,
}: Readonly<{ filtro: HistoricoFiltro; summary: HistoricoSummary; onFiltroChange: (value: HistoricoFiltro) => void }>) {
  const tabs = useMemo(() => buildFiltroTabs(summary), [summary])

  return (
    <div className="flex items-center gap-2 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-1">
      {tabs.map((tab) => (
        <HistoricoFiltroButton active={filtro === tab.id} key={tab.id} tab={tab} onFiltroChange={onFiltroChange} />
      ))}
    </div>
  )
}

function HistoricoFiltroButton({
  active,
  tab,
  onFiltroChange,
}: Readonly<{
  active: boolean
  tab: ReturnType<typeof buildFiltroTabs>[number]
  onFiltroChange: (value: HistoricoFiltro) => void
}>) {
  const handleClick = useCallback(() => onFiltroChange(tab.id), [onFiltroChange, tab.id])
  return (
    <button
      className="rounded-[10px] px-4 py-2 text-sm font-medium transition-all"
      key={tab.id}
      style={buildFiltroButtonStyle(active)}
      type="button"
      onClick={handleClick}
    >
      {tab.label}
    </button>
  )
}

function HistoricoResults({ comandas }: Readonly<{ comandas: Comanda[] }>) {
  if (comandas.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-white/8 px-6">
        <OperationEmptyState
          Icon={Search}
          description="Ajuste os filtros, refine a busca ou aguarde novas movimentações no salão."
          title="Nenhuma comanda encontrada"
        />
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {comandas.map((comanda) => (
        <HistoricoCard comanda={comanda} key={comanda.id} />
      ))}
    </ul>
  )
}

function buildFiltroTabs(summary: HistoricoSummary) {
  return [
    { id: 'tudo' as const, label: `Tudo (${summary.total})` },
    { id: 'abertas' as const, label: `Abertas (${summary.abertas})` },
    { id: 'encerradas' as const, label: `Encerradas (${summary.encerradas})` },
  ]
}

function buildFiltroButtonStyle(active: boolean) {
  return {
    background: active ? 'rgba(52,242,127,0.1)' : 'transparent',
    border: active ? '1px solid rgba(52,242,127,0.25)' : '1px solid transparent',
    color: active ? '#36f57c' : 'var(--text-soft)',
  }
}
