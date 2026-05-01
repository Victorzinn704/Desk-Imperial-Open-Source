import type { ComandaRecord, ComandaStatus, MesaRecord, OperationsLiveResponse } from '@contracts/contracts'

export function findComandaInSnapshot(snapshot: OperationsLiveResponse, comandaId: string) {
  for (const group of [...snapshot.employees, snapshot.unassigned]) {
    const comanda = group.comandas.find((item) => item.id === comandaId)
    if (comanda) {
      return comanda
    }
  }

  return null
}

export function upsertComandaRecord(snapshot: OperationsLiveResponse, nextComanda: ComandaRecord) {
  const groupsWithoutComanda = snapshot.employees.map((group) => ({
    ...group,
    comandas: group.comandas.filter((item) => item.id !== nextComanda.id),
  }))
  const unassignedWithoutComanda = {
    ...snapshot.unassigned,
    comandas: snapshot.unassigned.comandas.filter((item) => item.id !== nextComanda.id),
  }

  let targetWasVisible = false
  const employees = groupsWithoutComanda.map((group) => {
    if (group.employeeId !== nextComanda.currentEmployeeId) {
      return withGroupMetrics(group)
    }

    targetWasVisible = true
    return withGroupMetrics({
      ...group,
      comandas: upsertComanda(group.comandas, nextComanda),
    })
  })

  const shouldUseUnassigned = nextComanda.currentEmployeeId == null
  const unassigned = shouldUseUnassigned
    ? withGroupMetrics({
        ...unassignedWithoutComanda,
        comandas: upsertComanda(unassignedWithoutComanda.comandas, nextComanda),
      })
    : withGroupMetrics(unassignedWithoutComanda)

  return {
    ...snapshot,
    employees,
    mesas: upsertMesaForComanda(
      snapshot.mesas,
      nextComanda,
      shouldUseUnassigned || targetWasVisible || findComandaInSnapshot(snapshot, nextComanda.id) != null,
    ),
    unassigned,
  }
}

export function patchClosureOpenComandasCount(snapshot: OperationsLiveResponse, delta: number) {
  if (!snapshot.closure) {
    return snapshot
  }

  return {
    ...snapshot,
    closure: {
      ...snapshot.closure,
      openComandasCount: Math.max(0, snapshot.closure.openComandasCount + delta),
    },
  }
}

export function resolveTargetGroup(snapshot: OperationsLiveResponse, employeeId: string | null) {
  if (!employeeId) {
    return snapshot.unassigned
  }

  return snapshot.employees.find((group) => group.employeeId === employeeId) ?? null
}

export function upsertMesa(mesas: MesaRecord[], next: MesaRecord) {
  const existing = mesas.find((mesa) => mesa.id === next.id)
  if (!existing) {
    return [...mesas, next]
  }

  return mesas.map((mesa) => (mesa.id === next.id ? { ...existing, ...next } : mesa))
}

export function withGroupMetrics<T extends { comandas: ComandaRecord[] }>(group: T): T {
  const totalComandas = group.comandas.length
  const openComandas = group.comandas.filter((comanda) => isOpenComandaStatus(comanda.status)).length
  const totalAmount = group.comandas.reduce((sum, comanda) => sum + (Number(comanda.totalAmount) || 0), 0)

  return {
    ...group,
    metrics: { openComandas, totalAmount, totalComandas },
  } as T
}

export function isOpenComandaStatus(status: ComandaStatus) {
  return status === 'OPEN' || status === 'IN_PREPARATION' || status === 'READY'
}

function upsertComanda(list: ComandaRecord[], next: ComandaRecord) {
  const existing = list.find((comanda) => comanda.id === next.id)
  if (!existing) {
    return [next, ...list]
  }

  return list.map((comanda) => (comanda.id === next.id ? { ...existing, ...next } : comanda))
}

function upsertMesaForComanda(mesas: MesaRecord[], comanda: ComandaRecord, shouldTrack: boolean) {
  if (!shouldTrack) {
    return mesas
  }

  const nextStatus: MesaRecord['status'] = isOpenComandaStatus(comanda.status) ? 'ocupada' : 'livre'
  const nextComandaId = nextStatus === 'ocupada' ? comanda.id : null
  const nextEmployeeId = nextStatus === 'ocupada' ? comanda.currentEmployeeId : null

  return mesas.map((mesa) =>
    mesa.id === comanda.mesaId
      ? {
          ...mesa,
          comandaId: nextComandaId,
          employeeId: nextEmployeeId,
          status: nextStatus,
        }
      : mesa,
  )
}
