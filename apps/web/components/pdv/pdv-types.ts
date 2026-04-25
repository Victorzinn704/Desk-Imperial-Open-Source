export type ComandaStatus = 'aberta' | 'em_preparo' | 'pronta' | 'cancelada' | 'fechada'

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

export type ComandaPayment = {
  id: string
  method: 'CASH' | 'PIX' | 'DEBIT' | 'CREDIT' | 'VOUCHER' | 'OTHER'
  amount: number
  note?: string
  paidAt: Date
}

export type Comanda = {
  id: string
  status: ComandaStatus
  mesa?: string
  clienteNome?: string
  clienteDocumento?: string
  participantCount?: number
  notes?: string
  garcomId?: string
  garcomNome?: string
  itens: ComandaItem[]
  desconto: number
  acrescimo: number
  abertaEm: Date
  subtotalBackend?: number
  // backend provided totals for compact mode:
  totalBackend?: number
  paidAmount?: number
  remainingAmount?: number
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID'
  payments?: ComandaPayment[]
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
    color: 'text-[#2563eb]',
    dotColor: '#2563eb',
    bgColor: 'rgba(37, 99, 235, 0.08)',
    borderColor: 'rgba(37, 99, 235, 0.22)',
  },
  {
    id: 'em_preparo',
    label: 'Em Preparo',
    color: 'text-[#d97706]',
    dotColor: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.08)',
    borderColor: 'rgba(217, 119, 6, 0.22)',
  },
  {
    id: 'pronta',
    label: 'Pronta',
    color: 'text-[#16a34a]',
    dotColor: '#16a34a',
    bgColor: 'rgba(22, 163, 74, 0.08)',
    borderColor: 'rgba(22, 163, 74, 0.22)',
  },
  {
    id: 'cancelada',
    label: 'Cancelada',
    color: 'text-[#dc2626]',
    dotColor: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: 'rgba(220, 38, 38, 0.22)',
  },
  {
    id: 'fechada',
    label: 'Fechada',
    color: 'text-[#6b7280]',
    dotColor: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.06)',
    borderColor: 'rgba(107, 114, 128, 0.16)',
  },
]

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

export function isEndedComandaStatus(status: ComandaStatus): boolean {
  return status === 'fechada' || status === 'cancelada'
}

export function formatElapsed(abertaEm: Date): string {
  const ms = Date.now() - abertaEm.getTime()
  const min = Math.floor(ms / 60000)
  if (min < 60) {
    return `${min}min`
  }
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h${m > 0 ? ` ${m}min` : ''}`
}
