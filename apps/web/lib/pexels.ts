type PexelsPhotoSource = {
  original: string
  large: string
  medium: string
  small: string
  portrait: string
  landscape: string
  tiny: string
}

type PexelsPhoto = {
  id: number
  alt: string
  avg_color: string | null
  photographer: string
  photographer_url: string
  src: PexelsPhotoSource
  url: string
  width: number
  height: number
}

type PexelsSearchResponse = {
  page: number
  per_page: number
  photos: PexelsPhoto[]
  total_results: number
}

export type PexelsImageCandidate = {
  id: string
  alt: string
  photographer: string
  photographerUrl: string
  previewUrl: string
  imageUrl: string
  color: string | null
  sourceUrl: string
}

type SearchPexelsInput = {
  query: string
  perPage?: number
}

const DEFAULT_PEXELS_API_URL = 'https://api.pexels.com/v1'
const MAX_PEXELS_PER_PAGE = 12

export async function searchPexelsImages({
  query,
  perPage = 8,
}: SearchPexelsInput): Promise<PexelsImageCandidate[]> {
  const apiKey = process.env.PEXELS_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY ainda não foi configurada.')
  }

  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return []
  }

  const apiBaseUrl = process.env.PEXELS_API_URL?.trim() || DEFAULT_PEXELS_API_URL
  const searchUrl = new URL(`${apiBaseUrl.replace(/\/$/, '')}/search`)
  searchUrl.searchParams.set('query', normalizedQuery)
  searchUrl.searchParams.set('per_page', String(Math.max(1, Math.min(perPage, MAX_PEXELS_PER_PAGE))))
  searchUrl.searchParams.set('orientation', 'landscape')
  searchUrl.searchParams.set('size', 'medium')
  searchUrl.searchParams.set('locale', 'pt-BR')

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: apiKey,
    },
    next: { revalidate: 86_400 },
  })

  if (!response.ok) {
    const errorMessage = await safeReadText(response)
    throw new Error(errorMessage || `Pexels respondeu ${response.status}.`)
  }

  const payload = (await response.json()) as PexelsSearchResponse
  return payload.photos.map((photo) => ({
    id: String(photo.id),
    alt: photo.alt || 'Imagem de apoio do catálogo',
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    previewUrl: photo.src.medium,
    imageUrl: photo.src.large,
    color: photo.avg_color,
    sourceUrl: photo.url,
  }))
}

async function safeReadText(response: Response) {
  try {
    return (await response.text()).trim()
  } catch {
    return ''
  }
}
