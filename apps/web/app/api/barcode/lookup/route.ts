import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { lookupBarcodeCatalogPayload, normalizeBarcode } from '@/lib/barcode-lookup.server'
import { resolveApiBaseUrl } from '@/lib/api-base-url'

export const dynamic = 'force-dynamic'

const LOOKUP_TIMEOUT_MS = 6_000

export async function POST(request: Request) {
  const sessionStatus = await resolveSessionStatus()
  const sessionResponse = buildSessionErrorResponse(sessionStatus)
  if (sessionResponse) {
    return sessionResponse
  }

  const body = (await request.json().catch(() => null)) as { barcode?: string } | null
  const barcode = normalizeBarcode({ value: body?.barcode })
  if (!barcode) {
    return NextResponse.json({ message: 'Informe um EAN valido com 8, 12, 13 ou 14 digitos.' }, { status: 400 })
  }

  const result = await lookupBarcodeCatalogPayload({ barcode, requestUrl: request.url })
  return result.ok
    ? NextResponse.json(result.payload)
    : NextResponse.json({ message: result.message }, { status: result.status })
}

function buildSessionErrorResponse(status: Awaited<ReturnType<typeof resolveSessionStatus>>) {
  if (status === 'missing' || status === 'invalid') {
    return NextResponse.json({ message: 'Sessao autenticada obrigatoria para consultar EAN.' }, { status: 401 })
  }

  if (status === 'unavailable') {
    return NextResponse.json(
      { message: 'Nao foi possivel validar a sessao agora. Verifique se a API local esta ativa.' },
      { status: 503 },
    )
  }

  return null
}

async function resolveSessionStatus(): Promise<'active' | 'invalid' | 'missing' | 'unavailable'> {
  const cookie = (await headers()).get('cookie')
  if (!cookie) {
    return 'missing'
  }

  return fetchSessionStatus(cookie)
}

async function fetchSessionStatus(cookie: string): Promise<'active' | 'invalid' | 'unavailable'> {
  try {
    const response = await fetch(`${resolveApiBaseUrl()}/api/v1/auth/me`, {
      cache: 'no-store',
      headers: { Accept: 'application/json', cookie },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    })

    return response.ok ? 'active' : 'invalid'
  } catch {
    return 'unavailable'
  }
}
