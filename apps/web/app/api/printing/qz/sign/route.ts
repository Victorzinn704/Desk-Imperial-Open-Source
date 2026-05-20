import { NextResponse } from 'next/server'
import { assertActiveSession } from '@/lib/printing/qz-tray-session.server'
import { resolveQzSecurityMaterial, signQzPayload } from '@/lib/printing/qz-tray-security.server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_QZ_PAYLOAD_SIZE = 64_000

export async function POST(request: Request) {
  if (!resolveQzSecurityMaterial()) {
    return new NextResponse(null, { status: 204 })
  }

  const sessionResponse = await assertActiveSession()
  if (sessionResponse) {
    return sessionResponse
  }

  const payload = await readSignaturePayload(request)
  if (!payload) {
    return NextResponse.json({ message: 'Payload QZ invalido para assinatura.' }, { status: 400 })
  }

  try {
    const signature = await signQzPayload(payload)
    return NextResponse.json({ signature }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Nao foi possivel assinar payload QZ Tray.' }, { status: 503 })
  }
}

async function readSignaturePayload(request: Request) {
  const body = (await request.json().catch(() => null)) as { toSign?: unknown } | null
  const toSign = typeof body?.toSign === 'string' ? body.toSign : ''
  if (!toSign || toSign.length > MAX_QZ_PAYLOAD_SIZE) {
    return null
  }

  return toSign
}
