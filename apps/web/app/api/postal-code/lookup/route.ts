import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ViaCepResponse = {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  estado?: string
  erro?: boolean
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { postalCode?: string } | null
  const normalizedPostalCode = normalizePostalCode(body?.postalCode)

  if (!normalizedPostalCode) {
    return NextResponse.json({ message: 'Informe um CEP valido.' }, { status: 400 })
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${normalizedPostalCode}/json/`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (response.status === 400) {
      return NextResponse.json({ message: 'Informe um CEP valido.' }, { status: 400 })
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Nao foi possivel consultar o CEP agora. Tente novamente em instantes.' },
        { status: 503 },
      )
    }

    const payload = (await response.json()) as ViaCepResponse

    if (payload.erro) {
      return NextResponse.json({ message: 'CEP nao encontrado. Confira o numero informado.' }, { status: 404 })
    }

    return NextResponse.json({
      postalCode: payload.cep?.trim() || formatPostalCode(normalizedPostalCode),
      streetLine1: payload.logradouro?.trim() || null,
      addressComplement: payload.complemento?.trim() || null,
      district: payload.bairro?.trim() || null,
      city: payload.localidade?.trim() || null,
      state: payload.uf?.trim() || null,
      stateName: payload.estado?.trim() || null,
      country: 'Brasil',
      source: 'viacep',
    })
  } catch {
    return NextResponse.json(
      { message: 'Nao foi possivel consultar o CEP agora. Tente novamente em instantes.' },
      { status: 503 },
    )
  }
}

function normalizePostalCode(value: string | undefined) {
  const digits = (value ?? '').replaceAll(/\D/g, '').slice(0, 8)
  return /^\d{8}$/.test(digits) ? digits : null
}

function formatPostalCode(value: string) {
  return `${value.slice(0, 5)}-${value.slice(5)}`
}
