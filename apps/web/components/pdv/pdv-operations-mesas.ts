import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'
import { normalizeTableLabel } from './normalize-table-label'
import type { Mesa } from './pdv-types'
import { isOpenOperationsStatus } from './pdv-operations-status'

type OperationGroup = ReturnType<typeof collectOperationGroups>[number]
type EmployeeMaps = {
  comandaOwnerName: Map<string, string>
  empMap: Map<string, string>
}
type ComandaByTable = Map<string, ComandaRecord>

const pdvMesasCache = new WeakMap<OperationsLiveResponse, Mesa[]>()
const employeeMapsCache = new WeakMap<OperationsLiveResponse, EmployeeMaps>()

export function buildPdvMesas(snapshot: OperationsLiveResponse | undefined): Mesa[] {
  const cached = readPdvMesasCache(snapshot)
  if (cached) {
    return cached
  }

  const maps = buildEmployeeMaps(snapshot)
  const mesas = hasSeededMesas(snapshot) ? buildSeededPdvMesas(snapshot, maps) : buildMesasFromComandas(snapshot, maps)
  cachePdvMesas(snapshot, mesas)
  return mesas
}

function buildEmployeeMaps(snapshot: OperationsLiveResponse | undefined): EmployeeMaps {
  const cached = readEmployeeMapsCache(snapshot)
  if (cached) {
    return cached
  }

  const maps = collectOperationGroups(snapshot).reduce(indexEmployeeGroup, createEmployeeMaps())
  cacheEmployeeMaps(snapshot, maps)
  return maps
}

function collectOperationGroups(snapshot: OperationsLiveResponse | undefined) {
  const employeeGroups = snapshot?.employees ?? []
  const unassignedGroups = snapshot?.unassigned ? [snapshot.unassigned] : []
  return [...employeeGroups, ...unassignedGroups]
}

function readEmployeeMapsCache(snapshot: OperationsLiveResponse | undefined) {
  return snapshot ? employeeMapsCache.get(snapshot) : undefined
}

function cacheEmployeeMaps(snapshot: OperationsLiveResponse | undefined, maps: EmployeeMaps) {
  if (snapshot) {
    employeeMapsCache.set(snapshot, maps)
  }
}

function createEmployeeMaps(): EmployeeMaps {
  return {
    comandaOwnerName: new Map<string, string>(),
    empMap: new Map<string, string>(),
  }
}

function indexEmployeeGroup(maps: EmployeeMaps, group: OperationGroup) {
  indexEmployeeIdentifiers(maps.empMap, group)
  indexComandaOwners(maps.comandaOwnerName, group)
  return maps
}

function indexEmployeeIdentifiers(empMap: Map<string, string>, group: OperationGroup) {
  const userId = resolveGroupUserId(group)
  if (group.employeeId) {
    empMap.set(group.employeeId, group.displayName)
  }
  if (userId) {
    empMap.set(userId, group.displayName)
  }
}

function resolveGroupUserId(group: OperationGroup) {
  const userId = (group as Record<string, unknown>).userId
  return typeof userId === 'string' && userId.length > 0 ? userId : null
}

function indexComandaOwners(comandaOwnerName: Map<string, string>, group: OperationGroup) {
  for (const comanda of group.comandas) {
    comandaOwnerName.set(comanda.id, group.displayName)
  }
}

function buildMesasFromComandas(snapshot: OperationsLiveResponse | undefined, maps: EmployeeMaps): Mesa[] {
  return [...buildFirstActiveComandaByTable(snapshot)].map(([label, currentComanda]) =>
    buildFallbackMesaFromComanda(label, currentComanda, maps),
  )
}

function buildFallbackMesaFromComanda(label: string, currentComanda: ComandaRecord, maps: EmployeeMaps): Mesa {
  const gId = currentComanda.currentEmployeeId ?? undefined
  return {
    id: label,
    numero: label,
    capacidade: label === 'VIP' ? 10 : 4,
    status: 'ocupada',
    comandaId: currentComanda.id,
    garcomId: gId,
    garcomNome: resolveGarcomNome(maps, gId, currentComanda),
  }
}

function readPdvMesasCache(snapshot: OperationsLiveResponse | undefined) {
  return snapshot ? pdvMesasCache.get(snapshot) : undefined
}

function cachePdvMesas(snapshot: OperationsLiveResponse | undefined, mesas: Mesa[]) {
  if (snapshot) {
    pdvMesasCache.set(snapshot, mesas)
  }
}

function hasSeededMesas(snapshot: OperationsLiveResponse | undefined): snapshot is OperationsLiveResponse {
  return Boolean(snapshot?.mesas?.length)
}

function buildSeededPdvMesas(snapshot: OperationsLiveResponse, maps: EmployeeMaps): Mesa[] {
  const comandaByTable = buildActiveComandaByTable(snapshot)
  return snapshot.mesas.filter((mesa) => mesa.active).map((mesa) => toPdvMesa(mesa, comandaByTable, maps))
}

function buildActiveComandaByTable(snapshot: OperationsLiveResponse | undefined) {
  return collectOpenComandas(snapshot).reduce<ComandaByTable>(registerActiveComandaByTable, new Map())
}

function buildFirstActiveComandaByTable(snapshot: OperationsLiveResponse | undefined) {
  return collectOpenComandas(snapshot).reduce<ComandaByTable>(registerFirstActiveComandaByTable, new Map())
}

function collectOpenComandas(snapshot: OperationsLiveResponse | undefined) {
  return collectComandas(snapshot).filter((comanda) => isOpenOperationsStatus(comanda.status))
}

function collectComandas(snapshot: OperationsLiveResponse | undefined) {
  return collectOperationGroups(snapshot).flatMap((group) => group.comandas)
}

function registerActiveComandaByTable(comandaByTable: ComandaByTable, comanda: ComandaRecord) {
  const normalizedLabel = normalizeTableLabel(comanda.tableLabel)
  if (normalizedLabel) {
    comandaByTable.set(normalizedLabel, comanda)
  }
  return comandaByTable
}

function registerFirstActiveComandaByTable(comandaByTable: ComandaByTable, comanda: ComandaRecord) {
  const normalizedLabel = normalizeTableLabel(comanda.tableLabel)
  if (normalizedLabel && !comandaByTable.has(normalizedLabel)) {
    comandaByTable.set(normalizedLabel, comanda)
  }
  return comandaByTable
}

function toPdvMesa(
  mesa: OperationsLiveResponse['mesas'][number],
  comandaByTable: ComandaByTable,
  maps: EmployeeMaps,
): Mesa {
  const matchedComanda = comandaByTable.get(normalizeTableLabel(mesa.label))
  const gId = mesa.currentEmployeeId ?? matchedComanda?.currentEmployeeId ?? undefined
  return {
    id: mesa.id,
    numero: mesa.label,
    capacidade: mesa.capacity,
    status: resolveMesaStatus(mesa.status, matchedComanda),
    comandaId: mesa.comandaId ?? matchedComanda?.id ?? undefined,
    garcomId: gId,
    garcomNome: resolveGarcomNome(maps, gId, matchedComanda),
  }
}

function resolveMesaStatus(status: Mesa['status'], matchedComanda: ComandaRecord | undefined) {
  return status === 'ocupada' || matchedComanda ? 'ocupada' : status
}

function resolveGarcomNome(maps: EmployeeMaps, gId: string | undefined, comanda?: { id: string }) {
  const fromMap = gId ? maps.empMap.get(gId) : undefined
  return fromMap ?? (comanda ? maps.comandaOwnerName.get(comanda.id) : undefined)
}
