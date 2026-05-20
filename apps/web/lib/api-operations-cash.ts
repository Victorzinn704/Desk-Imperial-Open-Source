import type { CashSessionRecord, OperationsLiveResponse } from '@contracts/contracts'

import { apiFetch, type JsonBody, withOperationsOptions } from './api-core'

type OperationsRequestOptions = {
  includeSnapshot?: boolean
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

export type CreateCashMovementPayload = {
  type: string
  amount: number
  note?: string
}

export type CloseCashSessionPayload = {
  countedCashAmount: number
  notes?: string
}

export async function openCashSession(payload: OpenCashSessionPayload, options?: OperationsRequestOptions) {
  return apiFetch<{ cashSession: CashSessionRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions('/operations/cash-sessions', resolveOptions(options)),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function closeCashClosure(payload: CloseCashClosurePayload, options?: OperationsRequestOptions) {
  return apiFetch<{ snapshot?: OperationsLiveResponse }>(
    withOperationsOptions('/operations/closures/close', resolveOptions(options)),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function createCashMovement(
  cashSessionId: string,
  payload: CreateCashMovementPayload,
  options?: OperationsRequestOptions,
) {
  return apiFetch<{ cashSession: CashSessionRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/cash-sessions/${cashSessionId}/movements`, resolveOptions(options)),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function closeCashSession(
  cashSessionId: string,
  payload: CloseCashSessionPayload,
  options?: OperationsRequestOptions,
) {
  return apiFetch<{ cashSession: CashSessionRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/cash-sessions/${cashSessionId}/close`, resolveOptions(options)),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

function resolveOptions(options?: OperationsRequestOptions): OperationsRequestOptions {
  return { includeSnapshot: false, ...options }
}
