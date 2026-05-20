import type { MesaRecord } from '@contracts/contracts'

import { type ApiBody, apiFetch } from './api-core'

export type CreateMesaInput = {
  label: string
  capacity?: number
  section?: string
  positionX?: number
  positionY?: number
}

export type UpdateMesaInput = {
  active?: boolean
  capacity?: number
  label?: string
  positionX?: number
  positionY?: number
  reservedUntil?: string | null
  section?: string
}

export async function fetchMesas() {
  return apiFetch<MesaRecord[]>('/operations/mesas', { method: 'GET' })
}

export async function createMesa(body: CreateMesaInput) {
  return apiFetch<MesaRecord>('/operations/mesas', { method: 'POST', body: body as ApiBody })
}

export async function updateMesa(mesaId: string, body: UpdateMesaInput) {
  return apiFetch<MesaRecord>(`/operations/mesas/${mesaId}`, { method: 'PATCH', body: body as ApiBody })
}
