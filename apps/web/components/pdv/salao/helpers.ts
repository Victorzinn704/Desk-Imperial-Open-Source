import { calcTotal, type Comanda, type Mesa } from '../pdv-types'
import { type FilterStatus, urgencyLevel } from './constants'

export function matchesMesaFilter(
  mesa: Mesa,
  comanda: Comanda | undefined,
  filter: FilterStatus,
  now: number,
): boolean {
  if (filter === 'todos') {
    return true
  }

  if (filter === 'sem_garcom') {
    return !mesa.garcomId && mesa.status !== 'livre'
  }

  if (filter === 'atencao') {
    return urgencyLevel(mesa, comanda, now) >= 2
  }

  return mesa.status === filter
}

export function buildSalaoStats(mesas: Mesa[], comandaById: ReadonlyMap<string, Comanda>, now: number) {
  let livres = 0
  let ocupadas = 0
  let semGarcom = 0
  let comAtencao = 0
  let totalAberto = 0

  for (const mesa of mesas) {
    const comanda = mesa.comandaId ? comandaById.get(mesa.comandaId) : undefined

    if (mesa.status === 'livre') {
      livres += 1
    }

    if (mesa.status === 'ocupada') {
      ocupadas += 1
      if (comanda) {
        totalAberto += calcTotal(comanda)
      }
    }

    if (mesa.status !== 'livre' && !mesa.garcomId) {
      semGarcom += 1
    }

    if (urgencyLevel(mesa, comanda, now) >= 2) {
      comAtencao += 1
    }
  }

  return {
    livres,
    ocupadas,
    semGarcom,
    comAtencao,
    totalAberto,
  }
}
