'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { calcTotal, isEndedComandaStatus, type Comanda } from './pdv-types'
import { OperationEmptyState } from '@/components/operations/operation-empty-state'
import { formatBRL as formatCurrency } from '@/lib/currency'

type Filtro = 'tudo' | 'abertas' | 'encerradas'
type Ordenacao = 'recentes' | 'maior_valor'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aberta: { label: 'Aberta', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  em_preparo: { label: 'Em preparo', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  pronta: { label: 'Pronta', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  cancelada: { label: 'Cancelada', color: '#f87171', bg: 'rgba(248,113,113,0.16)' },
  fechada: { label: 'Paga', color: '#36f57c', bg: 'rgba(54,245,124,0.12)' },
}

function formatDateTime(date: Date) {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PdvHistoricoView({ comandas }: Readonly<{ comandas: Comanda[] }>) {
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [busca, setBusca] = useState('')
  const [responsavel, setResponsavel] = useState('todos')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('recentes')

  const responsaveis = useMemo(() => {
    return [
      'todos',
      ...Array.from(
        new Set(comandas.map((comanda) => comanda.garcomNome?.trim() || 'Operação do balcão/empresa').filter(Boolean)),
      ),
    ]
  }, [comandas])

  const summary = useMemo(() => {
    let abertas = 0
    let encerradas = 0

    for (const comanda of comandas) {
      if (isEndedComandaStatus(comanda.status)) {
        encerradas += 1
      } else {
        abertas += 1
      }
    }

    return { abertas, encerradas, total: comandas.length }
  }, [comandas])

  const sorted = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase()
    const matchesFiltro = (comanda: Comanda) => {
      if (filtro === 'abertas') {return !isEndedComandaStatus(comanda.status)}
      if (filtro === 'encerradas') {return isEndedComandaStatus(comanda.status)}
      return true
    }

    return comandas
      .filter((comanda) => {
        if (!matchesFiltro(comanda)) {return false}

        const nomeResponsavel = comanda.garcomNome?.trim() || 'Operação do balcão/empresa'
        if (responsavel !== 'todos' && nomeResponsavel !== responsavel) {return false}

        if (!buscaNormalizada) {return true}

        const campos = [
          comanda.mesa ?? '',
          comanda.clienteNome ?? '',
          comanda.clienteDocumento ?? '',
          nomeResponsavel,
          ...comanda.itens.map((item) => item.nome),
        ]

        return campos.some((campo) => campo.toLowerCase().includes(buscaNormalizada))
      })
      .sort((a, b) => {
        if (ordenacao === 'maior_valor') {
          return calcTotal(b) - calcTotal(a)
        }

        return b.abertaEm.getTime() - a.abertaEm.getTime()
      })
  }, [busca, comandas, filtro, ordenacao, responsavel])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Histórico de comandas</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">
            Visualize comandas abertas, pagas e canceladas com seus itens, valores e responsável pelo atendimento.
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:min-w-[760px]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_200px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-soft)]" />
              <input
                aria-label="Buscar comandas"
                className="w-full rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-soft)] focus:border-[rgba(52,242,127,0.35)] focus:outline-none"
                placeholder="Buscar por mesa, cliente, documento, item ou responsável"
                type="text"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </label>

            <select
              aria-label="Filtrar por responsável"
              className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[rgba(52,242,127,0.35)] focus:outline-none"
              value={responsavel}
              onChange={(event) => setResponsavel(event.target.value)}
            >
              {responsaveis.map((item) => (
                <option className="bg-[#11161d] text-[var(--text-primary)]" key={item} value={item}>
                  {item === 'todos' ? 'Todos os responsáveis' : item}
                </option>
              ))}
            </select>

            <select
              aria-label="Ordenar comandas"
              className="rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[rgba(52,242,127,0.35)] focus:outline-none"
              value={ordenacao}
              onChange={(event) => setOrdenacao(event.target.value as Ordenacao)}
            >
              <option className="bg-[#11161d] text-[var(--text-primary)]" value="recentes">
                Mais recentes
              </option>
              <option className="bg-[#11161d] text-[var(--text-primary)]" value="maior_valor">
                Maior valor
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-1">
            {(
              [
                { id: 'tudo' as const, label: `Tudo (${summary.total})` },
                { id: 'abertas' as const, label: `Abertas (${summary.abertas})` },
                { id: 'encerradas' as const, label: `Encerradas (${summary.encerradas})` },
              ] as const
            ).map(({ id, label }) => (
              <button
                className="rounded-[10px] px-4 py-2 text-sm font-medium transition-all"
                key={id}
                style={{
                  background: filtro === id ? 'rgba(52,242,127,0.1)' : 'transparent',
                  color: filtro === id ? '#36f57c' : 'var(--text-soft)',
                  border: filtro === id ? '1px solid rgba(52,242,127,0.25)' : '1px solid transparent',
                }}
                type="button"
                onClick={() => setFiltro(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/8 px-6">
          <OperationEmptyState
            Icon={Search}
            description="Ajuste os filtros, refine a busca ou aguarde novas movimentações no salão."
            title="Nenhuma comanda encontrada"
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((comanda) => (
            <HistoricoCard comanda={comanda} key={comanda.id} />
          ))}
        </ul>
      )}
    </div>
  )
}

function HistoricoCard({ comanda }: Readonly<{ comanda: Comanda }>) {
  const [open, setOpen] = useState(false)
  const total = calcTotal(comanda)
  const subtotal = comanda.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0)
  const descontoVal = subtotal * (comanda.desconto / 100)
  const acrescimoVal = subtotal * (comanda.acrescimo / 100)
  const badge = STATUS_MAP[comanda.status] ?? STATUS_MAP.aberta
  const totalItens = comanda.itens.reduce((sum, item) => sum + item.quantidade, 0)

  return (
    <li className="overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
      <button
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)]"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-[var(--text-primary)]">Mesa {comanda.mesa ?? '—'}</p>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.label}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-soft)]">
            <span>{formatDateTime(comanda.abertaEm)}</span>
            <span>{totalItens} itens</span>
            <span>{comanda.garcomNome ? `Responsável: ${comanda.garcomNome}` : 'Operação do balcão/empresa'}</span>
            {comanda.clienteNome ? <span>Cliente: {comanda.clienteNome}</span> : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold" style={{ color: badge.color }}>
              {formatCurrency(total)}
            </p>
          </div>
          {open ? (
            <ChevronDown className="size-4 text-[var(--text-soft)]" />
          ) : (
            <ChevronRight className="size-4 text-[var(--text-soft)]" />
          )}
        </div>
      </button>

      {open ? (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-5 py-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div>
              {comanda.itens.length === 0 ? (
                <p className="text-sm text-[var(--text-soft)]">Nenhum item registrado.</p>
              ) : (
                <ul className="space-y-2.5">
                  {comanda.itens.map((item, index) => (
                    <li className="flex items-start justify-between gap-4" key={`${item.produtoId}-${index}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {item.quantidade}x {item.nome}
                        </p>
                        {item.observacao ? (
                          <p className="mt-1 text-xs italic text-[var(--text-soft)]">{item.observacao}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                        {formatCurrency(item.quantidade * item.precoUnitario)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Resumo</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between text-[var(--text-soft)]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {comanda.desconto > 0 ? (
                  <div className="flex items-center justify-between text-[#f87171]">
                    <span>Desconto ({comanda.desconto}%)</span>
                    <span>- {formatCurrency(descontoVal)}</span>
                  </div>
                ) : null}
                {comanda.acrescimo > 0 ? (
                  <div className="flex items-center justify-between text-[#fb923c]">
                    <span>Serviço ({comanda.acrescimo}%)</span>
                    <span>+ {formatCurrency(acrescimoVal)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-2 text-base font-semibold text-[var(--text-primary)]">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  )
}
