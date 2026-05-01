import type { Mesa, MesaStatus } from '@/components/pdv/pdv-types'

export const MOBILE_TABLE_STATUS_COLOR: Record<MesaStatus, string> = {
  livre: '#36f57c',
  ocupada: '#f87171',
  reservada: '#60a5fa',
}

export const MOBILE_TABLE_STATUS_LABEL: Record<MesaStatus, string> = {
  livre: 'Livre',
  ocupada: 'Em Atendimento',
  reservada: 'Reservada',
}

export function buildMobileTableSnapshot(mesas: Mesa[], currentEmployeeId?: string | null) {
  const livres = mesas.filter((mesa) => mesa.status === 'livre')
  const ocupadas = mesas.filter((mesa) => mesa.status !== 'livre')
  const reservadas = mesas.filter((mesa) => mesa.status === 'reservada')
  const suasMesas = currentEmployeeId ? mesas.filter((mesa) => mesa.garcomId === currentEmployeeId).length : 0

  return {
    livres,
    ocupadas,
    reservadas,
    suasMesas,
  }
}

export function resolveWaiterColor(waiterName?: string | null) {
  if (!waiterName) {
    return undefined
  }

  return `hsl(${[...waiterName].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360}, 70%, 60%)`
}

export function resolveComandaPreview(comandaId?: string | null) {
  if (!comandaId) {
    return 'Comanda em andamento'
  }
  return `Comanda ${comandaId.slice(0, 6).toUpperCase()}`
}

export function resolveResponsibilityLabel({
  currentEmployeeId,
  garcomId,
  garcomNome,
}: Readonly<{
  currentEmployeeId?: string | null
  garcomId?: string | null
  garcomNome?: string | null
}>) {
  if (currentEmployeeId && garcomId === currentEmployeeId) {
    return 'Sua mesa'
  }

  if (garcomNome) {
    return `Responsável ${garcomNome.split(' ')[0]}`
  }

  return 'Sem responsável'
}
