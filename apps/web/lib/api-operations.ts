import type {
  CashSessionRecord,
  ComandaRecord,
  ComandaStatus,
  MesaRecord,
  OperationsKitchenResponse,
  OperationsLiveResponse,
  OperationsSummaryResponse,
} from '@contracts/contracts'

import { apiFetch, withOperationsOptions } from './api-core'
import type { ApiBody, JsonBody } from './api-core'

export type OperationsLiveOptions = {
  businessDate?: string
  includeCashMovements?: boolean
  compactMode?: boolean
}

function buildOperationsLiveParams(input?: string | OperationsLiveOptions) {
  const params = new URLSearchParams()
  const options =
    typeof input === 'string'
      ? {
          businessDate: input,
        }
      : input

  if (options?.businessDate?.trim()) {
    params.set('businessDate', options.businessDate.trim())
  }

  if (options?.includeCashMovements !== undefined) {
    params.set('includeCashMovements', String(options.includeCashMovements))
  }

  if (options?.compactMode !== undefined) {
    params.set('compactMode', String(options.compactMode))
  }

  return params
}

export async function fetchOperationsLive(input?: string | OperationsLiveOptions) {
  const params = buildOperationsLiveParams(input)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<OperationsLiveResponse>(`/operations/live${suffix}`, {
    method: 'GET',
  })
}

export async function fetchOperationsKitchen(input?: string | OperationsLiveOptions) {
  const params = buildOperationsLiveParams(input)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<OperationsKitchenResponse>(`/operations/kitchen${suffix}`, {
    method: 'GET',
  })
}

export async function fetchOperationsSummary(input?: string | OperationsLiveOptions) {
  const params = buildOperationsLiveParams(input)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<OperationsSummaryResponse>(`/operations/summary${suffix}`, {
    method: 'GET',
  })
}

export async function fetchComandaDetails(comandaId: string) {
  return apiFetch<{ comanda: ComandaRecord }>(`/operations/comandas/${comandaId}/details`, {
    method: 'GET',
  })
}

export type CreateMesaInput = {
  label: string
  capacity?: number
  section?: string
  positionX?: number
  positionY?: number
}

export type UpdateMesaInput = {
  label?: string
  capacity?: number
  section?: string
  positionX?: number
  positionY?: number
  active?: boolean
  reservedUntil?: string | null
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

export type ComandaDraftItemPayload = {
  productId?: string
  productName?: string
  quantity: number
  unitPrice?: number
  notes?: string
}

export type OpenComandaPayload = {
  tableLabel: string
  mesaId?: string
  customerName?: string
  customerDocument?: string
  participantCount?: number
  notes?: string
  cashSessionId?: string
  employeeId?: string
  items?: ComandaDraftItemPayload[]
  discountAmount?: number
  serviceFeeAmount?: number
}

export type ReplaceComandaPayload = {
  tableLabel: string
  mesaId?: string
  customerName?: string
  customerDocument?: string
  participantCount?: number
  notes?: string
  items: ComandaDraftItemPayload[]
  discountAmount?: number
  serviceFeeAmount?: number
}

export type CloseComandaPayload = {
  notes?: string
  discountAmount?: number
  serviceFeeAmount?: number
}

type OperationsRequestOptions = {
  includeSnapshot?: boolean
}

export async function openComanda(payload: OpenComandaPayload, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions('/operations/comandas', resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export type AddComandaItemPayload = {
  productId?: string
  productName?: string
  quantity: number
  unitPrice?: number
  notes?: string
}

export async function addComandaItem(
  comandaId: string,
  payload: AddComandaItemPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/items`, resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function addComandaItems(
  comandaId: string,
  items: AddComandaItemPayload[],
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/items/batch`, resolvedOptions),
    {
      method: 'POST',
      body: { items } as JsonBody,
    },
  )
}

export async function replaceComanda(
  comandaId: string,
  payload: ReplaceComandaPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}`, resolvedOptions),
    {
      method: 'PATCH',
      body: payload,
    },
  )
}

export async function assignComanda(comandaId: string, employeeId?: string, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/assign`, resolvedOptions),
    {
      method: 'POST',
      body: employeeId ? { employeeId } : ({} as JsonBody),
    },
  )
}

export async function updateComandaStatus(
  comandaId: string,
  status: Extract<ComandaStatus, 'OPEN' | 'IN_PREPARATION' | 'READY'>,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/status`, resolvedOptions),
    {
      method: 'POST',
      body: { status } as JsonBody,
    },
  )
}

export async function cancelComanda(comandaId: string, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/status`, resolvedOptions),
    {
      method: 'POST',
      body: { status: 'CANCELLED' } as JsonBody,
    },
  )
}

export async function closeComanda(
  comandaId: string,
  payload: CloseComandaPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/close`, resolvedOptions),
    {
      method: 'POST',
      body: payload,
    },
  )
}

export type OpenCashSessionPayload = {
  openingCashAmount: number
  notes?: string
}

export type CloseCashClosurePayload = {
  countedCashAmount: number
  forceClose?: boolean
  notes?: string
}

export async function openCashSession(payload: OpenCashSessionPayload, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ cashSession: CashSessionRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions('/operations/cash-sessions', resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function closeCashClosure(payload: CloseCashClosurePayload, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ snapshot?: OperationsLiveResponse }>(
    withOperationsOptions('/operations/closures/close', resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export type CreateCashMovementPayload = {
  type: string
  amount: number
  note?: string
}

export async function createCashMovement(
  cashSessionId: string,
  payload: CreateCashMovementPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ cashSession: CashSessionRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/cash-sessions/${cashSessionId}/movements`, resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export type CloseCashSessionPayload = {
  countedCashAmount: number
  notes?: string
}

export async function closeCashSession(
  cashSessionId: string,
  payload: CloseCashSessionPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ cashSession: CashSessionRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/cash-sessions/${cashSessionId}/close`, resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function updateKitchenItemStatus(itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') {
  return apiFetch<{ itemId: string; status: string }>(`/operations/kitchen-items/${itemId}/status`, {
    method: 'PATCH',
    body: { status } as ApiBody,
  })
}

export { buildOperationsLiveParams }
