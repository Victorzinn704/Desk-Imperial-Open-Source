import { STATUS_COLORS } from '@/lib/design-tokens'

export type ComandaStatus = 'aberta' | 'em_preparo' | 'pronta' | 'fechada'

export type MesaStatus = 'livre' | 'ocupada' | 'reservada'

export type Mesa = {
  id: string
  numero: string
  capacidade: number
  status: MesaStatus
  section?: string
  comandaId?: string // comanda vinculada (quando ocupada)
  garcomId?: string // garçom responsável
  garcomNome?: string // nome do garçom para exibição
}

export type Garcom = {
  id: string
  nome: string
  cor: string // cor de destaque da coluna
}

export type ComandaItem = {
  produtoId: string
  nome: string
  quantidade: number
  precoUnitario: number
  observacao?: string
}

export type Comanda = {
  id: string
  status: ComandaStatus
  mesa?: string
  clienteNome?: string
  clienteDocumento?: string
  garcomId?: string
  garcomNome?: string
  itens: ComandaItem[]
  desconto: number
  acrescimo: number
  abertaEm: Date
  subtotalBackend?: number
  // backend provided totals for compact mode:
  totalBackend?: number
}

export type KanbanColumn = {
  id: ComandaStatus
  label: string
  color: string
  dotColor: string
  bgColor: string
  borderColor: string
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'aberta',
    label: 'Aberta',
    color: 'text-[var(--accent)]',
    dotColor: STATUS_COLORS.reservada.solid,
    bgColor: STATUS_COLORS.reservada.bg,
    borderColor: STATUS_COLORS.reservada.border,
  },
  {
    id: 'em_preparo',
    label: 'Em Preparo',
    color: 'text-[var(--warning)]',
    dotColor: STATUS_COLORS.emPreparo.solid,
    bgColor: STATUS_COLORS.emPreparo.bg,
    borderColor: STATUS_COLORS.emPreparo.border,
  },
  {
    id: 'pronta',
    label: 'Pronta',
    color: 'text-[var(--success)]',
    dotColor: STATUS_COLORS.livre.solid,
    bgColor: STATUS_COLORS.livre.bg,
    borderColor: STATUS_COLORS.livre.border,
  },
  {
    id: 'fechada',
    label: 'Fechada',
    color: 'text-[#7a8896]',
    dotColor: STATUS_COLORS.fechada.solid,
    bgColor: STATUS_COLORS.fechada.bg,
    borderColor: STATUS_COLORS.fechada.border,
  },
] as const

export function calcSubtotal(comanda: Pick<Comanda, 'itens' | 'subtotalBackend'>): number {
  const bruto = comanda.itens.reduce((sum, item) => {
    const quantidade = Number.isFinite(item.quantidade) ? item.quantidade : 0
    const precoUnitario = Number.isFinite(item.precoUnitario) ? item.precoUnitario : 0
    return sum + Math.max(0, quantidade) * Math.max(0, precoUnitario)
  }, 0)

  if (
    (comanda.itens.length === 0 || bruto <= 0) &&
    comanda.subtotalBackend !== undefined &&
    comanda.subtotalBackend > 0
  ) {
    return comanda.subtotalBackend
  }

  return bruto
}

export function calcTotal(comanda: Comanda): number {
  const bruto = calcSubtotal(comanda)
  const desconto = Number.isFinite(comanda.desconto) ? comanda.desconto : 0
  const acrescimo = Number.isFinite(comanda.acrescimo) ? comanda.acrescimo : 0
  const comDesconto = bruto * (1 - desconto / 100)
  const total = comDesconto * (1 + acrescimo / 100)

  if (total <= 0 && comanda.totalBackend !== undefined && comanda.totalBackend > 0) {
    return comanda.totalBackend
  }

  return total
}

export function formatElapsed(abertaEm: Date): string {
  const ms = Date.now() - abertaEm.getTime()
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h${m > 0 ? ` ${m}min` : ''}`
}
