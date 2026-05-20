import { ApiError } from './api-core'

export type CatalogImageCandidate = {
  id: string
  alt: string
  photographer: string
  photographerUrl: string
  previewUrl: string
  imageUrl: string
  color: string | null
  sourceUrl: string
}

export async function searchCatalogImages(query: string, perPage = 6) {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return [] as CatalogImageCandidate[]
  }

  const url = new URL('/api/media/pexels/search', window.location.origin)
  url.searchParams.set('q', normalizedQuery)
  url.searchParams.set('perPage', String(perPage))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const payload = (await safeReadJson(response)) as { error?: string }
    throw new ApiError(payload?.error || 'Nao foi possivel buscar imagens agora.', response.status)
  }

  const payload = (await response.json()) as {
    items?: CatalogImageCandidate[]
  }

  return payload.items ?? []
}

async function safeReadJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}
