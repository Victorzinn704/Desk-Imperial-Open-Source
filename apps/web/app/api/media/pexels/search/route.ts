import { NextResponse } from 'next/server'
import { searchPexelsImages } from '@/lib/pexels'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''
  const perPageParam = Number(searchParams.get('perPage') ?? '8')

  if (!query) {
    return NextResponse.json({ error: 'Informe q para buscar imagens.' }, { status: 400 })
  }

  try {
    const images = await searchPexelsImages({
      query,
      perPage: Number.isFinite(perPageParam) ? perPageParam : 8,
    })

    return NextResponse.json(
      {
        items: images,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=86400, stale-while-revalidate=43200',
        },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar imagens no Pexels.'
    const status = message.includes('PEXELS_API_KEY') ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
