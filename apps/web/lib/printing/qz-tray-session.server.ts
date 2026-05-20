import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { resolveApiBaseUrl } from '@/lib/api-base-url'

const SESSION_CHECK_TIMEOUT_MS = 4_000

export async function assertActiveSession() {
  const status = await resolveSessionStatus()
  if (status === 'active') {
    return null
  }

  if (status === 'unavailable') {
    return NextResponse.json({ message: 'Nao foi possivel validar a sessao para assinar QZ Tray.' }, { status: 503 })
  }

  return NextResponse.json({ message: 'Sessao autenticada obrigatoria para assinar QZ Tray.' }, { status: 401 })
}

async function resolveSessionStatus(): Promise<'active' | 'invalid' | 'missing' | 'unavailable'> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get('cookie')
  if (!cookie) {
    return 'missing'
  }

  try {
    const response = await fetch(`${resolveApiBaseUrl()}/api/v1/auth/me`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        cookie,
      },
      signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
    })

    return response.ok ? 'active' : 'invalid'
  } catch {
    return 'unavailable'
  }
}
