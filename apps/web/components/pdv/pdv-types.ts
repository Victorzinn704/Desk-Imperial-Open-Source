export type ComandaStatus = 'aberta' | 'em_preparo' | 'pronta' | 'fechada'

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
  itens: ComandaItem[]
  desconto: number
  acrescimo: number
  abertaEm: Date
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
    color: 'text-[#60a5fa]',
    dotColor: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.08)',
    borderColor: 'rgba(96, 165, 250, 0.22)',
  },
  {
    id: 'em_preparo',
    label: 'Em Preparo',
    color: 'text-[#fb923c]',
    dotColor: '#fb923c',
    bgColor: 'rgba(251, 146, 60, 0.08)',
    borderColor: 'rgba(251, 146, 60, 0.22)',
  },
  {
    id: 'pronta',
    label: 'Pronta',
    color: 'text-[#36f57c]',
    dotColor: '#36f57c',
    bgColor: 'rgba(54, 245, 124, 0.08)',
    borderColor: 'rgba(54, 245, 124, 0.22)',
  },
  {
    id: 'fechada',
    label: 'Fechada',
    color: 'text-[#7a8896]',
    dotColor: '#7a8896',
    bgColor: 'rgba(122, 136, 150, 0.06)',
    borderColor: 'rgba(122, 136, 150, 0.16)',
  },
]

export function calcTotal(comanda: Comanda): number {
  const bruto = comanda.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0)
  const comDesconto = bruto * (1 - comanda.desconto / 100)
  return comDesconto * (1 + comanda.acrescimo / 100)
}

export function formatElapsed(abertaEm: Date): string {
  const ms = Date.now() - abertaEm.getTime()
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h${m > 0 ? ` ${m}min` : ''}`
}
