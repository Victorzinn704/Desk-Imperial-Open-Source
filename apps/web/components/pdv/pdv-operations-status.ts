import type { ComandaRecord } from '@contracts/contracts'
import { type Comanda, isEndedComandaStatus } from './pdv-types'

export function mapComandaStatus(status: ComandaRecord['status']): Comanda['status'] {
  switch (status) {
    case 'IN_PREPARATION':
      return 'em_preparo'
    case 'READY':
      return 'pronta'
    case 'CANCELLED':
      return 'cancelada'
    case 'CLOSED':
      return 'fechada'
    default:
      return 'aberta'
  }
}

export function isOpenOperationsStatus(status: ComandaRecord['status']) {
  return !isEndedComandaStatus(mapComandaStatus(status))
}
