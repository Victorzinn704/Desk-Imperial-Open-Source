'use client'

import { useMemo, useState } from 'react'
import { ClipboardList, LoaderCircle, TriangleAlert, WifiOff } from 'lucide-react'
import { calcTotal, type Comanda } from '@/components/pdv/pdv-types'

export type ComandasFilter = 'tudo' | 'abertas' | 'fechadas'
export type ResponsibleFilter = 'all' | string

export const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aberta: { label: 'Aberta', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  em_preparo: { label: 'Em preparo', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  pronta: { label: 'Pronta', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  fechada: { label: 'Paga', color: '#36f57c', bg: 'rgba(54,245,124,0.12)' },
}

export type OwnerComandasViewProps = Readonly<{
  comandas: Comanda[]
  focusedId?: string | null
  onCloseComanda?: (id: string, discountAmount: number, serviceFeeAmount: number) => Promise<unknown> | void
  isLoading?: boolean
  isOffline?: boolean
  errorMessage?: string | null
  isBusy?: boolean
}>

type EmptyStateConfig = {
  Icon: typeof ClipboardList
  description: string
  title: string
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function resolveResponsibleLabel(comanda: Comanda) {
  return comanda.garcomNome?.trim() || 'Operação geral'
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

function buildResponsibleOptions(comandas: Comanda[]) {
  const values = new Set<string>()
  for (const comanda of comandas) {
    values.add(resolveResponsibleLabel(comanda))
  }

  return ['all', ...Array.from(values).sort((left, right) => left.localeCompare(right, 'pt-BR'))]
}

function filterByResponsible(comandas: Comanda[], responsibleFilter: ResponsibleFilter) {
  if (responsibleFilter === 'all') {
    return comandas
  }
  return comandas.filter((comanda) => resolveResponsibleLabel(comanda) === responsibleFilter)
}

function filterByStatus(comandas: Comanda[], filtro: ComandasFilter) {
  return comandas.filter((comanda) => {
    if (filtro === 'abertas') {
      return comanda.status !== 'fechada'
    }
    if (filtro === 'fechadas') {
      return comanda.status === 'fechada'
    }
    return true
  })
}

function sortComandas(comandas: Comanda[], focusedId: string | null | undefined) {
  const ordered = [...comandas].sort((left, right) => right.abertaEm.getTime() - left.abertaEm.getTime())
  if (!focusedId) {
    return ordered
  }

  return ordered.sort((left, right) => {
    if (left.id === focusedId) {
      return -1
    }
    if (right.id === focusedId) {
      return 1
    }
    return 0
  })
}

function countByStatus(comandas: Comanda[], status: 'fechada' | 'aberta' | 'pronta') {
  if (status === 'fechada') {
    return comandas.filter((comanda) => comanda.status === 'fechada').length
  }
  if (status === 'pronta') {
    return comandas.filter((comanda) => comanda.status === 'pronta').length
  }
  return comandas.filter((comanda) => comanda.status !== 'fechada').length
}

function getSelectedResponsibleLabel(responsibleFilter: ResponsibleFilter) {
  return responsibleFilter === 'all' ? 'Equipe inteira' : responsibleFilter
}

function buildEmptyStateLabel(filtro: ComandasFilter) {
  if (filtro === 'abertas') {
    return 'aberta'
  }
  if (filtro === 'fechadas') {
    return 'fechada'
  }
  return 'disponível'
}

export function buildOwnerComandasEmptyState({
  errorMessage,
  filtro,
  isLoading,
  isOffline,
}: {
  errorMessage: string | null
  filtro: ComandasFilter
  isLoading: boolean
  isOffline: boolean
}): EmptyStateConfig {
  if (isLoading) {
    return {
      Icon: LoaderCircle,
      description: 'Buscando comandas e comprovantes.',
      title: 'Carregando comandas',
    }
  }

  if (errorMessage) {
    return {
      Icon: TriangleAlert,
      description: errorMessage,
      title: 'Não foi possível carregar as comandas',
    }
  }

  if (isOffline) {
    return {
      Icon: WifiOff,
      description: 'Reconecte para sincronizar o extrato atual das comandas.',
      title: 'Sem conexão para listar comandas',
    }
  }

  return {
    Icon: ClipboardList,
    description: 'Nenhum registro encontrado para este filtro.',
    title: `Nenhuma comanda ${buildEmptyStateLabel(filtro)}`,
  }
}

export function useOwnerComandasController(comandas: Comanda[], focusedId: string | null | undefined) {
  const [filtro, setFiltro] = useState<ComandasFilter>('tudo')
  const [responsibleFilter, setResponsibleFilter] = useState<ResponsibleFilter>('all')

  const responsibleOptions = useMemo(() => buildResponsibleOptions(comandas), [comandas])
  const scopedByResponsible = useMemo(
    () => filterByResponsible(comandas, responsibleFilter),
    [comandas, responsibleFilter],
  )
  const filtered = useMemo(() => filterByStatus(scopedByResponsible, filtro), [filtro, scopedByResponsible])
  const sorted = useMemo(() => sortComandas(filtered, focusedId), [filtered, focusedId])

  return {
    countAbertas: countByStatus(scopedByResponsible, 'aberta'),
    countFechadas: countByStatus(scopedByResponsible, 'fechada'),
    countProntas: countByStatus(scopedByResponsible, 'pronta'),
    filtro,
    filtered,
    responsibleFilter,
    responsibleOptions,
    scopedByResponsible,
    selectedResponsibleLabel: getSelectedResponsibleLabel(responsibleFilter),
    setFiltro,
    setResponsibleFilter,
    sorted,
    ultimaComanda: scopedByResponsible[0] ?? null,
    valorEmAberto: scopedByResponsible
      .filter((comanda) => comanda.status !== 'fechada')
      .reduce((sum, comanda) => sum + calcTotal(comanda), 0),
  }
}
