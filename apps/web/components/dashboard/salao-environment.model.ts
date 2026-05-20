import type { MesaRecord } from '@contracts/contracts'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'
import { normalizeTableLabel } from '@/components/pdv/normalize-table-label'
import { calcTotal, type Comanda, type Mesa } from '@/components/pdv/pdv-types'
import type { View } from './salao'

export type SalaoSurface = 'legacy' | 'lab'

export type SalaoEnvironmentProps = {
  initialView?: View
  onViewChange?: (view: View) => void
  onOpenPdvFromMesa?: (intent: Omit<PdvMesaIntent, 'requestId'>) => void
  surface?: SalaoSurface
}

export type SalaoSectionStat = {
  label: string
  occupied: number
  occupancy: number
  total: number
}

export type SalaoStats = {
  activeWaiters: number
  averageOpenTicket: number
  freeMesas: Mesa[]
  occupiedMesas: Mesa[]
  occupiedRate: number
  openRevenue: number
  reservedMesas: Mesa[]
  sectionStats: SalaoSectionStat[]
}

type SalaoLiveEmployee = {
  displayName: string
  employeeId?: string | null
}

type SalaoLiveData =
  | {
      employees: SalaoLiveEmployee[]
    }
  | null
  | undefined

export const FULL_LIVE_QUERY_KEY = ['operations', 'live', 'full'] as const

export function buildGarcomNames(liveData: SalaoLiveData) {
  const names: Record<string, string> = {}

  for (const employee of liveData?.employees ?? []) {
    if (employee.employeeId) {
      names[employee.employeeId] = employee.displayName
    }
  }

  return names
}

export function splitMesasByActiveState(mesas: MesaRecord[]) {
  return {
    activeMesas: mesas.filter((mesa) => mesa.active),
    inactiveMesas: mesas.filter((mesa) => !mesa.active),
  }
}

export function mergeLiveMesasWithRecords(liveMesas: Mesa[], mesaRecords: MesaRecord[]) {
  const activeRecords = mesaRecords.filter((mesa) => mesa.active)
  const recordsByLabel = new Map(activeRecords.map((mesa) => [normalizeTableLabel(mesa.label), mesa]))
  const mergedMesas = liveMesas.map((mesa) => mergeLiveMesaWithRecord(mesa, recordsByLabel))
  const mergedLabels = new Set(mergedMesas.map((mesa) => normalizeTableLabel(mesa.numero)))
  const missingMesas = activeRecords.filter((mesa) => !mergedLabels.has(normalizeTableLabel(mesa.label)))

  return [...mergedMesas, ...missingMesas.map(toFreeLiveMesa)]
}

export function buildSalaoStats(liveMesas: Mesa[], liveComandas: Comanda[]): SalaoStats {
  const occupiedMesas = liveMesas.filter(isOccupiedMesa)
  const reservedMesas = liveMesas.filter(isReservedMesa)
  const freeMesas = liveMesas.filter(isFreeMesa)
  const openRevenue = sumOpenRevenue(occupiedMesas, liveComandas)

  return {
    activeWaiters: countActiveWaiters(occupiedMesas),
    averageOpenTicket: occupiedMesas.length > 0 ? openRevenue / occupiedMesas.length : 0,
    freeMesas,
    occupiedMesas,
    occupiedRate: liveMesas.length > 0 ? Math.round((occupiedMesas.length / liveMesas.length) * 100) : 0,
    openRevenue,
    reservedMesas,
    sectionStats: buildSectionStats(liveMesas),
  }
}

export function buildSectionStats(liveMesas: Mesa[]): SalaoSectionStat[] {
  const grouped = new Map<string, { occupied: number; total: number }>()

  for (const mesa of liveMesas) {
    const key = getMesaSectionLabel(mesa)
    const current = grouped.get(key) ?? { occupied: 0, total: 0 }
    current.total += 1
    current.occupied += mesa.status === 'ocupada' ? 1 : 0
    grouped.set(key, current)
  }

  return Array.from(grouped.entries()).map(toSectionStat).sort(compareSectionStats)
}

export function filterMesasBySection(liveMesas: Mesa[], sectionFilter: string) {
  if (sectionFilter === 'all') {
    return liveMesas
  }

  return liveMesas.filter((mesa) => getMesaSectionLabel(mesa) === sectionFilter)
}

export function resolveMesaUrgency(input: { comanda: Comanda | undefined; mesa: Mesa; referenceTime: number }) {
  if (!shouldMeasureMesaUrgency(input)) {
    return 0
  }

  const comanda = input.comanda
  if (!comanda) {
    return 0
  }

  const minutes = Math.floor((input.referenceTime - comanda.abertaEm.getTime()) / 60_000)
  if (minutes >= 90) {
    return 3
  }

  if (minutes >= 60) {
    return 2
  }

  return minutes >= 30 ? 1 : 0
}

export function filterComandas(comandas: Comanda[], filter: 'tudo' | 'abertas' | 'fechadas') {
  return comandas.filter((comanda) => isComandaInFilter(comanda, filter))
}

export function sortComandasByNewest(comandas: Comanda[]) {
  return [...comandas].sort((left, right) => right.abertaEm.getTime() - left.abertaEm.getTime())
}

export function countComandaItems(comanda: Comanda) {
  return comanda.itens.reduce((sum, item) => sum + item.quantidade, 0)
}

export function findMesaForComanda(liveMesas: Mesa[], comanda: Comanda) {
  return liveMesas.find((candidate) => candidate.numero === comanda.mesa || candidate.id === comanda.mesa)
}

export function toPdvMesaIntent(mesa: Mesa) {
  return {
    mesaId: mesa.id,
    mesaLabel: mesa.numero,
    comandaId: mesa.comandaId,
  }
}

function mergeLiveMesaWithRecord(mesa: Mesa, recordsByLabel: ReadonlyMap<string, MesaRecord>) {
  const record = recordsByLabel.get(normalizeTableLabel(mesa.numero))
  if (!record) {
    return mesa
  }

  return {
    ...mesa,
    id: record.id,
    numero: record.label,
    capacidade: record.capacity,
    section: record.section ?? undefined,
  }
}

function toFreeLiveMesa(mesa: MesaRecord): Mesa {
  return {
    id: mesa.id,
    numero: mesa.label,
    capacidade: mesa.capacity,
    section: mesa.section ?? undefined,
    status: mesa.status,
    comandaId: mesa.comandaId ?? undefined,
    garcomId: mesa.currentEmployeeId ?? undefined,
  }
}

export function getSectionTone(section: SalaoSectionStat) {
  if (section.occupancy >= 75) {
    return 'danger'
  }

  return section.occupancy >= 40 ? 'warning' : 'success'
}

export function getNextAction(stats: Pick<SalaoStats, 'occupiedRate' | 'reservedMesas'>) {
  if (stats.occupiedRate >= 75) {
    return { tone: 'warning' as const, value: 'girar mesas' }
  }

  return stats.reservedMesas.length > 0
    ? { tone: 'info' as const, value: 'preparar reserva' }
    : { tone: 'success' as const, value: 'manter cadência' }
}

function sumOpenRevenue(occupiedMesas: Mesa[], liveComandas: Comanda[]) {
  return occupiedMesas.reduce((sum, mesa) => {
    const comanda = liveComandas.find((current) => current.id === mesa.comandaId)
    return sum + (comanda ? calcTotal(comanda) : 0)
  }, 0)
}

function countActiveWaiters(occupiedMesas: Mesa[]) {
  return new Set(occupiedMesas.map((mesa) => mesa.garcomId).filter(Boolean)).size
}

function getMesaSectionLabel(mesa: Pick<Mesa, 'section'>) {
  return mesa.section?.trim() || 'Sem seção'
}

function toSectionStat([label, stats]: [string, { occupied: number; total: number }]): SalaoSectionStat {
  return {
    label,
    occupied: stats.occupied,
    occupancy: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0,
    total: stats.total,
  }
}

function compareSectionStats(left: SalaoSectionStat, right: SalaoSectionStat) {
  return right.occupied - left.occupied || left.label.localeCompare(right.label)
}

function isOccupiedMesa(mesa: Mesa) {
  return mesa.status === 'ocupada'
}

function isReservedMesa(mesa: Mesa) {
  return mesa.status === 'reservada'
}

function isFreeMesa(mesa: Mesa) {
  return mesa.status === 'livre'
}

function shouldMeasureMesaUrgency(input: { comanda: Comanda | undefined; mesa: Mesa; referenceTime: number }) {
  return Boolean(input.comanda && input.mesa.status === 'ocupada' && input.referenceTime > 0)
}

function isComandaInFilter(comanda: Comanda, filter: 'tudo' | 'abertas' | 'fechadas') {
  if (filter === 'abertas') {
    return comanda.status !== 'fechada'
  }

  return filter === 'fechadas' ? comanda.status === 'fechada' : true
}
