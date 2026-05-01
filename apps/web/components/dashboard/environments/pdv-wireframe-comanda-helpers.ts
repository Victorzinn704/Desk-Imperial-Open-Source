import type { Comanda } from '@/components/pdv/pdv-types'
import type { PdvComandaGroupId, PdvComandaGroupOption } from './pdv-wireframe-environment.types'

const mesaRegex = /^mesa\b/i
const balcaoRegex = /balcao|balc[aã]o/i
const deliveryRegex = /delivery|ifood|uber/i

export function hasMesa(comanda: Comanda) {
  return (
    Boolean(comanda.mesa?.trim()) && !balcaoRegex.test(comanda.mesa ?? '') && !deliveryRegex.test(comanda.mesa ?? '')
  )
}

export function resolveComandaLabel(comanda: Comanda) {
  if (comanda.mesa?.trim()) {
    return mesaRegex.test(comanda.mesa) ? comanda.mesa : `Mesa ${comanda.mesa}`
  }
  if (comanda.clienteNome?.trim()) {
    return comanda.clienteNome
  }
  return 'Balcao'
}

export function formatComandaCode(id: string) {
  if (id.startsWith('#')) {
    return id
  }
  const digits = id.replace(/\D/g, '')
  if (digits.length > 0) {
    return `#${digits.slice(-4)}`
  }
  return `#${id.slice(0, 4).toUpperCase()}`
}

export function compressMesaLabel(label: string) {
  const digits = label.match(/\d+/)?.[0]
  if (digits) {
    return `M${digits.padStart(2, '0')}`
  }
  return label.length > 14 ? `${label.slice(0, 14)}…` : label
}

export function buildPdvComandaGroups(comandas: Comanda[]): PdvComandaGroupOption[] {
  const mesa = comandas.filter(hasMesa)
  const balcao = comandas.filter((comanda) => !hasMesa(comanda) || balcaoRegex.test(comanda.mesa ?? ''))
  const delivery = comandas.filter((comanda) =>
    deliveryRegex.test(`${comanda.mesa ?? ''} ${comanda.clienteNome ?? ''}`),
  )

  return [
    { id: 'todas', label: 'todas', count: comandas.length },
    { id: 'mesa', label: 'mesa', count: mesa.length },
    { id: 'balcao', label: 'balcão', count: balcao.length },
    { id: 'delivery', label: 'delivery', count: delivery.length },
  ]
}

export function filterPdvComandas(comandas: Comanda[], activeGroup: PdvComandaGroupId) {
  switch (activeGroup) {
    case 'mesa':
      return comandas.filter(hasMesa)
    case 'balcao':
      return comandas.filter((comanda) => !hasMesa(comanda) || balcaoRegex.test(comanda.mesa ?? ''))
    case 'delivery':
      return comandas.filter((comanda) => deliveryRegex.test(`${comanda.mesa ?? ''} ${comanda.clienteNome ?? ''}`))
    case 'todas':
    default:
      return comandas
  }
}
