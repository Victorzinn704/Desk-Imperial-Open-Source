import type { EquipeCurrency, EquipeRow } from './equipe-environment.types'

export type EquipePeriodPanelProps = {
  averageTicket: number
  currency: EquipeCurrency
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
  totalPayout: number
  totalRevenue: number
}

export type EquipeRadarPanelProps = {
  averageTicket: number
  currency: EquipeCurrency
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
  totalCommission: number
}

export type EquipeRankingPanelProps = {
  currency: EquipeCurrency
  rows: EquipeRow[]
}

export type EquipeSignalsPanelProps = {
  averageTicket: number
  currency: EquipeCurrency
  rows: EquipeRow[]
  totalCommission: number
}

export type EquipeDirectoryPanelProps = {
  currency: EquipeCurrency
  rows: EquipeRow[]
}
