import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'node:crypto'

type MercadoPagoWebhookSignatureInput = {
  dataId: string
  requestId: string | null | undefined
  secret: string | null | undefined
  signature: string | null | undefined
}

type MercadoPagoSignatureParts = {
  timestamp: string
  value: string
}

export function assertMercadoPagoWebhookSignature(input: MercadoPagoWebhookSignatureInput) {
  const secret = resolveWebhookSecret(input.secret)
  const signature = resolveWebhookSignature(input.signature)

  const manifest = buildMercadoPagoSignatureManifest({
    dataId: input.dataId,
    requestId: input.requestId?.trim() || null,
    timestamp: signature.timestamp,
  })
  const expectedSignature = createHmac('sha256', secret).update(manifest).digest('hex')
  assertAuthorizedSignature(signature.value, expectedSignature)
}

function resolveWebhookSecret(secret: string | null | undefined) {
  const normalized = secret?.trim()
  if (!normalized) {
    throw new ServiceUnavailableException('Webhook Mercado Pago nao esta configurado.')
  }

  return normalized
}

function resolveWebhookSignature(signature: string | null | undefined) {
  const parsedSignature = parseMercadoPagoSignature(signature)
  if (!parsedSignature) {
    throw new UnauthorizedException('Webhook Mercado Pago sem assinatura valida.')
  }

  return parsedSignature
}

function assertAuthorizedSignature(signature: string, expectedSignature: string) {
  if (!timingSafeHexEqual(signature, expectedSignature)) {
    throw new UnauthorizedException('Webhook Mercado Pago nao autorizado.')
  }
}

function parseMercadoPagoSignature(signature: string | null | undefined): MercadoPagoSignatureParts | null {
  const entries = new Map(
    (signature ?? '')
      .split(',')
      .map((part) => part.trim().split('='))
      .filter((part): part is [string, string] => part.length === 2 && Boolean(part[0]) && Boolean(part[1])),
  )
  const timestamp = entries.get('ts')?.trim()
  const value = entries.get('v1')?.trim()

  return timestamp && value ? { timestamp, value } : null
}

function buildMercadoPagoSignatureManifest(input: { dataId: string; requestId: string | null; timestamp: string }) {
  const segments = [`id:${input.dataId}`]
  if (input.requestId) {
    segments.push(`request-id:${input.requestId}`)
  }

  segments.push(`ts:${input.timestamp}`)
  return `${segments.join(';')};`
}

function timingSafeHexEqual(left: string, right: string) {
  if (!(isHexDigest(left) && isHexDigest(right))) {
    return false
  }

  const leftBuffer = Buffer.from(left, 'hex')
  const rightBuffer = Buffer.from(right, 'hex')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function isHexDigest(value: string) {
  return value.length > 0 && value.length % 2 === 0 && /^[a-f0-9]+$/i.test(value)
}
