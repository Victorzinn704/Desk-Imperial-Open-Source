import { NextResponse } from 'next/server'
import { assertActiveSession } from '@/lib/printing/qz-tray-session.server'
import { readQzCertificate, resolveQzSecurityMaterial } from '@/lib/printing/qz-tray-security.server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  if (!resolveQzSecurityMaterial()) {
    return new NextResponse(null, { status: 204 })
  }

  const sessionResponse = await assertActiveSession()
  if (sessionResponse) {
    return sessionResponse
  }

  try {
    const certificate = await readQzCertificate()
    return new NextResponse(certificate, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch {
    return NextResponse.json({ message: 'Certificado QZ Tray indisponivel no servidor web.' }, { status: 503 })
  }
}
