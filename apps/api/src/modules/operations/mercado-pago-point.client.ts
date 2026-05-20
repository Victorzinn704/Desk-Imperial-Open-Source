import { BadGatewayException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { z } from 'zod'

const MERCADO_PAGO_ORDERS_URL = 'https://api.mercadopago.com/v1/orders'
const POINT_ORDER_EXPIRATION_TIME = 'PT16M'
const POINT_ORDER_TIMEOUT_MS = 10000

const mercadoPagoPointOrderResponseSchema = z
  .object({
    external_reference: z.string().nullable().optional(),
    id: z.string(),
    status: z.string().optional(),
    transactions: z
      .object({
        payments: z
          .array(
            z
              .object({
                amount: z.union([z.string(), z.number()]).nullable().optional(),
                id: z.string().optional(),
                paid_amount: z.union([z.string(), z.number()]).nullable().optional(),
                status: z.string().optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough()

export type MercadoPagoPointPaymentMethod = 'PIX' | 'DEBIT' | 'CREDIT'

export type MercadoPagoPointCreateOrderInput = {
  amount: number
  description: string
  externalReference: string
  idempotencyKey: string
  method: MercadoPagoPointPaymentMethod
  terminalId: string
}

export type MercadoPagoPointCancelOrderInput = {
  idempotencyKey: string
  orderId: string
}

export type MercadoPagoPointOrderResult = {
  externalReference: string | null
  orderId: string
  paymentId: string | null
  paymentStatus: string | null
  paidAmount: number | null
  status: string | null
}

@Injectable()
export class MercadoPagoPointClient {
  constructor(private readonly configService: ConfigService) {}

  getDefaultTerminalId() {
    return this.configService.get<string>('MERCADO_PAGO_POINT_TERMINAL_ID')?.trim() || null
  }

  assertConfigured() {
    this.getAccessToken()
  }

  async createOrder(input: MercadoPagoPointCreateOrderInput): Promise<MercadoPagoPointOrderResult> {
    const accessToken = this.getAccessToken()
    const response = await fetch(this.getOrdersUrl(), {
      body: JSON.stringify(buildPointOrderPayload(input)),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      method: 'POST',
      signal: AbortSignal.timeout(POINT_ORDER_TIMEOUT_MS),
    })

    const body = await readMercadoPagoJson(response)
    if (!response.ok) {
      throwMercadoPagoError(response.status, body)
    }

    return toPointOrderResult(body)
  }

  async getOrder(orderId: string): Promise<MercadoPagoPointOrderResult> {
    const response = await fetch(`${this.getOrdersUrl()}/${encodeURIComponent(orderId)}`, {
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      method: 'GET',
      signal: AbortSignal.timeout(POINT_ORDER_TIMEOUT_MS),
    })

    const body = await readMercadoPagoJson(response)
    if (!response.ok) {
      throwMercadoPagoError(response.status, body)
    }

    return toPointOrderResult(body)
  }

  async cancelOrder(input: MercadoPagoPointCancelOrderInput): Promise<MercadoPagoPointOrderResult> {
    const response = await fetch(`${this.getOrdersUrl()}/${encodeURIComponent(input.orderId)}/cancel`, {
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.idempotencyKey,
      },
      method: 'POST',
      signal: AbortSignal.timeout(POINT_ORDER_TIMEOUT_MS),
    })

    const body = await readMercadoPagoJson(response)
    if (!response.ok) {
      if (isAlreadyCanceledOrder(response.status, body)) {
        return {
          externalReference: null,
          orderId: input.orderId,
          paidAmount: null,
          paymentId: null,
          paymentStatus: 'canceled',
          status: 'canceled',
        }
      }
      throwMercadoPagoError(response.status, body, 'cancel')
    }

    return toPointOrderResult(body)
  }

  private getAccessToken() {
    const token = this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN')?.trim()
    if (!token) {
      throw new ServiceUnavailableException('Mercado Pago Point nao esta configurado.')
    }

    return token
  }

  private getOrdersUrl() {
    return this.configService.get<string>('MERCADO_PAGO_ORDERS_URL')?.trim() || MERCADO_PAGO_ORDERS_URL
  }
}

function buildPointOrderPayload(input: MercadoPagoPointCreateOrderInput) {
  return {
    config: buildPointOrderConfig(input),
    description: input.description,
    expiration_time: POINT_ORDER_EXPIRATION_TIME,
    external_reference: input.externalReference,
    transactions: { payments: [{ amount: input.amount.toFixed(2) }] },
    type: 'point',
  }
}

function buildPointOrderConfig(input: MercadoPagoPointCreateOrderInput) {
  return {
    point: {
      print_on_terminal: 'no_ticket',
      terminal_id: input.terminalId,
    },
    ...buildPaymentMethodConfig(input.method),
  }
}

function buildPaymentMethodConfig(method: MercadoPagoPointPaymentMethod) {
  const defaultType = resolveDefaultPaymentType(method)
  return defaultType ? { payment_method: { default_type: defaultType } } : {}
}

function resolveDefaultPaymentType(method: MercadoPagoPointPaymentMethod) {
  if (method === 'PIX') {
    return null
  }

  if (method === 'CREDIT') {
    return 'credit_card'
  }

  if (method === 'DEBIT') {
    return 'debit_card'
  }

  return null
}

async function readMercadoPagoJson(response: Response) {
  const rawBody = await response.text()
  if (!rawBody) {
    return null
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    return null
  }
}

function toPointOrderResult(rawBody: unknown): MercadoPagoPointOrderResult {
  const body = mercadoPagoPointOrderResponseSchema.parse(rawBody)
  const payment = body.transactions?.payments?.[0] ?? null

  return {
    externalReference: body.external_reference ?? null,
    orderId: body.id,
    paymentId: payment?.id ?? null,
    paymentStatus: payment?.status ?? null,
    paidAmount: toOptionalNumber(payment?.paid_amount ?? payment?.amount),
    status: body.status ?? payment?.status ?? null,
  }
}

function toOptionalNumber(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function throwMercadoPagoError(status: number, rawBody: unknown, action: 'create' | 'cancel' = 'create'): never {
  const code = extractMercadoPagoErrorCode(rawBody)
  if (action === 'create' && status === 409 && code === 'already_queued_order_for_terminal') {
    throw new ConflictException('A maquininha ja possui uma cobranca pendente.')
  }

  if (action === 'cancel' && status === 409) {
    throw new ConflictException('A cobranca ja chegou na maquininha. Cancele no terminal antes de reenviar.')
  }

  throw new BadGatewayException(buildMercadoPagoErrorMessage(status, code, action))
}

function isAlreadyCanceledOrder(status: number, rawBody: unknown) {
  return status === 409 && extractMercadoPagoErrorCode(rawBody) === 'order_already_canceled'
}

function extractMercadoPagoErrorCode(rawBody: unknown) {
  if (!rawBody || typeof rawBody !== 'object') {
    return null
  }

  const candidate = rawBody as { cause?: unknown; error?: unknown; errors?: unknown; message?: unknown }
  const directCode = readErrorCode(candidate.error) ?? readErrorCode(candidate.message)
  if (directCode) {
    return directCode
  }

  return readFirstNestedErrorCode(candidate.errors) ?? readFirstNestedErrorCode(candidate.cause)
}

function readFirstNestedErrorCode(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return readErrorCode(value)
  }

  for (const item of value) {
    const code = readErrorCode(item)
    if (code) {
      return code
    }
  }

  return null
}

function readErrorCode(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as { code?: unknown; error?: unknown; message?: unknown }
  return (
    readErrorCode(candidate.code) ??
    readErrorCode(candidate.error) ??
    (typeof candidate.message === 'string' ? candidate.message.trim() : null)
  )
}

function buildMercadoPagoErrorMessage(status: number, code: string | null, action: 'create' | 'cancel') {
  const suffix = code ? ` (${code})` : ` (HTTP ${status})`
  const operation = action === 'cancel' ? 'o cancelamento da cobranca' : 'a criacao da cobranca'
  return `Mercado Pago Point recusou ${operation}${suffix}.`
}
