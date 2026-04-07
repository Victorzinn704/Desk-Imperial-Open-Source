import { STATUS_COLORS } from '@/lib/design-tokens'
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
  { value: 'aberta', label: 'Aberta', color: STATUS_COLORS.reservada.solid },
  { value: 'em_preparo', label: 'Em Preparo', color: STATUS_COLORS.emPreparo.solid },
  { value: 'pronta', label: 'Pronta', color: STATUS_COLORS.livre.solid },
  { value: 'fechada', label: 'Fechar Comanda', color: STATUS_COLORS.fechada.solid },
]
