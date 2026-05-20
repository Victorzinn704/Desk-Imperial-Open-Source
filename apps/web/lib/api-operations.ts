import type {
  ComandaPaymentMethod,
  ComandaRecord,
  ComandaStatus,
  OperationsKitchenResponse,
  OperationsLiveResponse,
  OperationsSummaryResponse,
  PaymentTerminalIntentRecord,
} from '@contracts/contracts'

import { type ApiBody, apiFetch, type JsonBody, withOperationsOptions } from './api-core'

export { closeCashClosure, closeCashSession, createCashMovement, openCashSession } from './api-operations-cash'
export type {
  CloseCashClosurePayload,
  CloseCashSessionPayload,
  CreateCashMovementPayload,
  OpenCashSessionPayload,
} from './api-operations-cash'
export { createMesa, fetchMesas, updateMesa } from './api-operations-mesas'
export type { CreateMesaInput, UpdateMesaInput } from './api-operations-mesas'

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
  paymentMethod?: ComandaPaymentMethod
}

export type CreateComandaPaymentPayload = {
  amount: number
  method: ComandaPaymentMethod
  note?: string
}

export type TerminalPaymentMethod = Extract<ComandaPaymentMethod, 'PIX' | 'DEBIT' | 'CREDIT'>

export type CreateComandaTerminalPaymentIntentPayload = {
  amount?: number
  method: TerminalPaymentMethod
  note?: string
  replacePending?: boolean
  terminalId?: string
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

export async function createComandaPayment(
  comandaId: string,
  payload: CreateComandaPaymentPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/payments`, resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function createComandaTerminalPaymentIntent(
  comandaId: string,
  payload: CreateComandaTerminalPaymentIntentPayload,
) {
  return apiFetch<{ terminalPaymentIntent: PaymentTerminalIntentRecord }>(
    `/operations/comandas/${comandaId}/terminal-payment-intents`,
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
