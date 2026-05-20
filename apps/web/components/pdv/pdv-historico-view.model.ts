import { calcTotal, type Comanda, isEndedComandaStatus } from './pdv-types'

export type HistoricoFiltro = 'tudo' | 'abertas' | 'encerradas'
export type HistoricoOrdenacao = 'recentes' | 'maior_valor'

export type HistoricoSummary = {
  abertas: number
  encerradas: number
  total: number
}

export type HistoricoQuery = {
  busca: string
  comandas: Comanda[]
  filtro: HistoricoFiltro
  ordenacao: HistoricoOrdenacao
  responsavel: string
}

export function buildHistoricoResponsaveis(comandas: Comanda[]) {
  return [
    'todos',
    ...Array.from(new Set(comandas.map((comanda) => resolveHistoricoResponsavel(comanda)).filter(Boolean))),
  ]
}

export function buildHistoricoSummary(comandas: Comanda[]): HistoricoSummary {
  const summary = { abertas: 0, encerradas: 0, total: comandas.length }

  for (const comanda of comandas) {
    const key = isEndedComandaStatus(comanda.status) ? 'encerradas' : 'abertas'
    summary[key] += 1
  }

  return summary
}

export function filterHistoricoComandas(query: HistoricoQuery) {
  const normalizedSearch = query.busca.trim().toLowerCase()

  return [...query.comandas]
    .filter((comanda) => matchesHistoricoQuery(comanda, query, normalizedSearch))
    .sort((left, right) => compareHistoricoComandas(left, right, query.ordenacao))
}

export function resolveHistoricoResponsavel(comanda: Comanda) {
  return comanda.garcomNome?.trim() || 'Operação do balcão/empresa'
}

function matchesHistoricoQuery(comanda: Comanda, query: HistoricoQuery, normalizedSearch: string) {
  return (
    matchesHistoricoFiltro(comanda, query.filtro) &&
    matchesHistoricoResponsavel(comanda, query.responsavel) &&
    matchesHistoricoSearch(comanda, normalizedSearch)
  )
}

function matchesHistoricoFiltro(comanda: Comanda, filtro: HistoricoFiltro) {
  if (filtro === 'abertas') {
    return !isEndedComandaStatus(comanda.status)
  }

  if (filtro === 'encerradas') {
    return isEndedComandaStatus(comanda.status)
  }

  return true
}

function matchesHistoricoResponsavel(comanda: Comanda, responsavel: string) {
  return responsavel === 'todos' || resolveHistoricoResponsavel(comanda) === responsavel
}

function matchesHistoricoSearch(comanda: Comanda, normalizedSearch: string) {
  if (!normalizedSearch) {
    return true
  }

  return buildSearchFields(comanda).some((field) => field.toLowerCase().includes(normalizedSearch))
}

function buildSearchFields(comanda: Comanda) {
  return [
    comanda.mesa ?? '',
    comanda.clienteNome ?? '',
    comanda.clienteDocumento ?? '',
    resolveHistoricoResponsavel(comanda),
    ...comanda.itens.map((item) => item.nome),
  ]
}

function compareHistoricoComandas(left: Comanda, right: Comanda, ordenacao: HistoricoOrdenacao) {
  return ordenacao === 'maior_valor'
    ? calcTotal(right) - calcTotal(left)
    : right.abertaEm.getTime() - left.abertaEm.getTime()
}
