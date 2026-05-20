import { BadRequestException } from '@nestjs/common'
import { ComandaPaymentMethod, PaymentTerminalIntentStatus, Prisma } from '@prisma/client'
import type { WorkspaceScopedAuthContext } from '../auth/auth.types'
import type { RequestContext } from '../../common/utils/request-context.util'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { MercadoPagoPointOrderResult } from './mercado-pago-point.client'
import { toNumberOrZero } from './operations-domain.utils'

const APPROVED_PAYMENT_STATUS = 'approved'
const TERMINAL_REJECTED_STATUSES = new Set(['rejected'])
const TERMINAL_CANCELLED_STATUSES = new Set(['cancelled', 'canceled'])
const TERMINAL_EXPIRED_STATUSES = new Set(['expired'])

export type MercadoPagoWebhookInput = {
  body: unknown
  context: RequestContext
  query: Record<string, unknown>
  requestId: string | undefined
  signature: string | undefined
}

export type ExistingPaymentTerminalIntent = {
  amount: Prisma.Decimal
  cashSessionId: string | null
  comandaId: string
  companyOwnerId: string
  createdByUserId: string
  employeeId: string | null
  externalReference: string
  id: string
  method: ComandaPaymentMethod
  note: string | null
  providerOrderId: string | null
  providerPaymentId: string | null
}

export function resolveWebhookDataId(input: MercadoPagoWebhookInput) {
  const queryDataId = resolveQueryDataId(input.query)
  const bodyDataId = resolveBodyDataId(input.body)
  const dataId = queryDataId ?? bodyDataId
  if (!dataId) {
    throw new BadRequestException('Webhook Mercado Pago sem identificador da order.')
  }

  return dataId
}

export function resolveIntentStatus(order: MercadoPagoPointOrderResult) {
  const providerStatus = resolveProviderStatus(order)
  if (order.paymentStatus === APPROVED_PAYMENT_STATUS) {
    return PaymentTerminalIntentStatus.APPROVED
  }

  if (providerStatus && TERMINAL_REJECTED_STATUSES.has(providerStatus)) {
    return PaymentTerminalIntentStatus.REJECTED
  }

  if (providerStatus && TERMINAL_CANCELLED_STATUSES.has(providerStatus)) {
    return PaymentTerminalIntentStatus.CANCELLED
  }

  if (providerStatus && TERMINAL_EXPIRED_STATUSES.has(providerStatus)) {
    return PaymentTerminalIntentStatus.EXPIRED
  }

  return PaymentTerminalIntentStatus.PENDING
}

export function resolveProviderStatus(order: MercadoPagoPointOrderResult) {
  return (order.paymentStatus ?? order.status)?.toLowerCase() ?? null
}

export function isApprovedOrderSafeForIntent(
  order: MercadoPagoPointOrderResult,
  intent: ExistingPaymentTerminalIntent,
) {
  const externalReferenceMatches = !order.externalReference || order.externalReference === intent.externalReference
  return (
    externalReferenceMatches && roundCurrency(order.paidAmount ?? 0) === roundCurrency(toNumberOrZero(intent.amount))
  )
}

export function buildTerminalIntentStatusDates(status: PaymentTerminalIntentStatus) {
  const now = new Date()
  if (status === PaymentTerminalIntentStatus.CANCELLED) {
    return { cancelledAt: now }
  }

  if (status === PaymentTerminalIntentStatus.REJECTED) {
    return { rejectedAt: now }
  }

  return {}
}

export function buildProviderPaymentIdUpdate(order: MercadoPagoPointOrderResult) {
  return order.paymentId ? { providerPaymentId: order.paymentId } : {}
}

export function buildTerminalIntentWorkspaceAuth(intent: ExistingPaymentTerminalIntent): WorkspaceScopedAuthContext {
  return {
    companyOwnerUserId: null,
    role: 'OWNER',
    userId: intent.createdByUserId,
    workspaceOwnerUserId: intent.companyOwnerId,
  }
}

function resolveBodyDataId(body: unknown) {
  if (!body || typeof body !== 'object') {
    return null
  }

  return resolveNestedDataId(body) ?? resolveResourcePathId(body)
}

function resolveQueryDataId(query: Record<string, unknown>) {
  return toSingleString(query['data.id']) ?? resolveNestedDataId(query) ?? toSingleString(query.id)
}

function resolveNestedDataId(source: unknown) {
  if (!source || typeof source !== 'object') {
    return null
  }

  const data = (source as { data?: unknown }).data
  if (!data || typeof data !== 'object') {
    return null
  }

  return toSingleString((data as { id?: unknown }).id)
}

function resolveResourcePathId(body: unknown) {
  if (!body || typeof body !== 'object') {
    return null
  }

  const resource = toSingleString((body as { resource?: unknown }).resource)
  if (!resource) {
    return null
  }

  const segments = resource.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? null
}

function toSingleString(value: unknown) {
  if (Array.isArray(value)) {
    return toSingleString(value[0])
  }

  return typeof value === 'string' && value.trim() ? value.trim() : null
}
