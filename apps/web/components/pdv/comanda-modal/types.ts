import type { ComandaItem, Comanda } from '../pdv-types'

export type SimpleProduct = {
  id: string
  name: string
  category: string
  unitPrice: number
  currency: string
  stock: number
  isLowStock: boolean
  isCombo?: boolean
  comboDescription?: string | null
  comboItems?: Array<{
    componentProductName: string
    totalUnits: number
  }>
}

export type SaveComandaPayload = {
  mesa: string
  clienteNome: string
  clienteDocumento: string
  itens: ComandaItem[]
  desconto: number
  acrescimo: number
}

export type StatusOption = {
  value: Comanda['status']
  label: string
  color: string
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'aberta', label: 'Aberta', color: '#60a5fa' },
  { value: 'em_preparo', label: 'Em Preparo', color: '#fb923c' },
  { value: 'pronta', label: 'Pronta', color: '#36f57c' },
  { value: 'fechada', label: 'Fechar Comanda', color: '#7a8896' },
]
