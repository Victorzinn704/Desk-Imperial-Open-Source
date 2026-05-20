import { NextResponse } from 'next/server'
import { assertActiveSession } from '@/lib/printing/qz-tray-session.server'
import { readQzCertificate, resolveQzSecurityMaterial, signQzPayload } from '@/lib/printing/qz-tray-security.server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const sessionResponse = await assertActiveSession()
  if (sessionResponse) {
    return sessionResponse
  }

  if (!resolveQzSecurityMaterial()) {
    return buildQzHealthResponse({
      certificateAvailable: false,
      materialConfigured: false,
      signatureAvailable: false,
    })
  }

  const [certificate, signature] = await Promise.all([safeReadCertificate(), safeSignProbe()])

  return buildQzHealthResponse({
    certificateAvailable: certificate.ok,
    certificateError: certificate.error,
    materialConfigured: true,
    signatureAvailable: signature.ok,
    signatureError: signature.error,
  })
}

type QzHealthResult = {
  certificateAvailable: boolean
  certificateError?: string
  materialConfigured: boolean
  signatureAvailable: boolean
  signatureError?: string
}

function buildQzHealthResponse(result: QzHealthResult) {
  return NextResponse.json(
    {
      ...result,
      signedModeReady: result.materialConfigured && result.certificateAvailable && result.signatureAvailable,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

async function safeReadCertificate() {
  try {
    const certificate = await readQzCertificate()
    return { ok: Boolean(certificate) }
  } catch (error) {
    return { error: toPublicError(error), ok: false }
  }
}

async function safeSignProbe() {
  try {
    const signature = await signQzPayload('desk-imperial-qz-health')
    return { ok: Boolean(signature) }
  } catch (error) {
    return { error: toPublicError(error), ok: false }
  }
}

function toPublicError(error: unknown) {
  return error instanceof Error ? error.message : 'Falha desconhecida no material de assinatura QZ Tray.'
}
