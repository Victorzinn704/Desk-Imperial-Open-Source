import { NextResponse } from 'next/server'

const EAN_PICTURES_API_URL = (process.env.EAN_PICTURES_API_URL ?? 'http://www.eanpictures.com.br:9000/api').replace(
  /\/$/,
  '',
)
const IMAGE_TIMEOUT_MS = 6_000
const validBarcodeLengths = new Set([8, 12, 13, 14])

export async function GET(_request: Request, { params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = await params
  const normalizedBarcode = normalizeBarcode(barcode)
  if (!normalizedBarcode) {
    return NextResponse.json({ message: 'EAN invalido.' }, { status: 400 })
  }

  const response = await fetch(`${EAN_PICTURES_API_URL}/gtin/${normalizedBarcode}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
  }).catch(() => null)

  if (!response?.ok) {
    return NextResponse.json({ message: 'Imagem do EAN indisponivel.' }, { status: 404 })
  }

  const contentType = response.headers.get('content-type') ?? 'image/png'
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ message: 'Resposta de imagem invalida.' }, { status: 502 })
  }

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': contentType,
    },
  })
}

function normalizeBarcode(value: string | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  return validBarcodeLengths.has(digits.length) ? digits : null
}
