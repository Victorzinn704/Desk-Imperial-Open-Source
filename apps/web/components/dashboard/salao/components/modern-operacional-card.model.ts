import { calcTotal, type Comanda, formatElapsed, type Mesa, type MesaStatus } from '@/components/pdv/pdv-types'
import { fmtBRL } from '../constants'
import { getMesaStatusMeta, getUrgencyTone, type SalaoTone } from '../theme'

export type ModernCardMetric = {
  label: string
  tone: SalaoTone
  value: string
}

export type ModernOperacionalCardModel = {
  capacityLabel: string
  clientLabel: string
  footerLabel: string
  metrics: ModernCardMetric[]
  statusLabel: string
  statusTone: SalaoTone
  urgencyTone: SalaoTone
  waiterLabel: string
}

type ModernOperacionalCardInput = {
  comanda: Comanda | undefined
  garcomName: string | undefined
  mesa: Mesa
  urgency: 0 | 1 | 2 | 3
}

export function buildModernOperacionalCardModel({
  comanda,
  garcomName,
  mesa,
  urgency,
}: ModernOperacionalCardInput): ModernOperacionalCardModel {
  const statusMeta = getMesaStatusMeta(mesa.status)
  const total = comanda ? calcTotal(comanda) : 0
  const itemCount = comanda ? countComandaItems(comanda) : 0
  const elapsed = comanda ? formatElapsed(comanda.abertaEm) : null

  return {
    capacityLabel: `${mesa.capacidade} lugares`,
    clientLabel: resolveClientLabel(mesa.status, comanda),
    footerLabel: resolveFooterLabel(comanda),
    metrics: [
      buildStatusMetric({ comanda, mesaStatus: mesa.status, statusTone: statusMeta.tone, total }),
      buildTimeMetric({ comanda, elapsed, mesaStatus: mesa.status, urgencyTone: getUrgencyTone(urgency) }),
      buildItemsMetric({ comanda, itemCount }),
      buildFlowMetric(mesa.status),
    ],
    statusLabel: statusMeta.label,
    statusTone: statusMeta.tone,
    urgencyTone: getUrgencyTone(urgency),
    waiterLabel: resolveWaiterLabel(garcomName),
  }
}

function buildStatusMetric({
  comanda,
  mesaStatus,
  statusTone,
  total,
}: {
  comanda: Comanda | undefined
  mesaStatus: MesaStatus
  statusTone: SalaoTone
  total: number
}): ModernCardMetric {
  if (comanda) {
    return { label: 'Em aberto', tone: statusTone, value: fmtBRL(total) }
  }

  if (mesaStatus === 'reservada') {
    return { label: 'Reserva', tone: 'warning', value: 'Mesa guardada' }
  }

  return { label: 'Disponivel', tone: 'success', value: 'Liberada agora' }
}

function buildTimeMetric({
  comanda,
  elapsed,
  mesaStatus,
  urgencyTone,
}: {
  comanda: Comanda | undefined
  elapsed: string | null
  mesaStatus: MesaStatus
  urgencyTone: SalaoTone
}): ModernCardMetric {
  if (comanda && elapsed) {
    return { label: 'Tempo', tone: urgencyTone, value: elapsed }
  }

  if (mesaStatus === 'ocupada') {
    return { label: 'Leitura', tone: urgencyTone, value: 'Sem horario' }
  }

  return { label: 'Leitura', tone: urgencyTone, value: 'Sem pressao' }
}

function buildItemsMetric({
  comanda,
  itemCount,
}: {
  comanda: Comanda | undefined
  itemCount: number
}): ModernCardMetric {
  if (!comanda) {
    return { label: 'Itens', tone: 'neutral', value: 'Nenhum item' }
  }

  return {
    label: 'Itens',
    tone: 'accent',
    value: `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`,
  }
}

function buildFlowMetric(status: MesaStatus): ModernCardMetric {
  const metricsByStatus: Record<MesaStatus, ModernCardMetric> = {
    livre: { label: 'Fluxo', tone: 'success', value: 'Pronta para giro' },
    ocupada: { label: 'Fluxo', tone: 'danger', value: 'Atendimento em curso' },
    reservada: { label: 'Fluxo', tone: 'warning', value: 'Chegada prevista' },
  }

  return metricsByStatus[status]
}

function countComandaItems(comanda: Comanda) {
  return comanda.itens.reduce((sum, item) => sum + item.quantidade, 0)
}

function resolveClientLabel(status: MesaStatus, comanda: Comanda | undefined) {
  const customerName = comanda?.clienteNome?.trim()
  if (customerName) {
    return customerName
  }

  if (status === 'reservada') {
    return 'Reserva aguardando chegada'
  }

  return 'Pronta para abrir nova comanda'
}

function resolveFooterLabel(comanda: Comanda | undefined) {
  if (!comanda) {
    return 'Sem comanda vinculada'
  }

  return `Comanda ${comanda.id.slice(0, 8)}`
}

function resolveWaiterLabel(name: string | undefined) {
  if (!name) {
    return 'Sem garcom'
  }

  return name.split(' ').slice(0, 2).join(' ')
}
