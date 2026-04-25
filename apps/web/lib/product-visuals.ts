import { resolveBrazilianPackagedBeverageVisual } from './brazilian-packaged-beverage-catalog'

type ProductVisualInput = {
  name: string
  brand?: string | null
  category?: string | null
  barcode?: string | null
  packagingClass?: string | null
  quantityLabel?: string | null
  imageUrl?: string | null
  catalogSource?: string | null
  isCombo?: boolean | null
}

type ProductVisual = {
  src: string
  alt: string
  source: 'catalog' | 'combo-fallback' | 'curated-beverage-photo' | 'national-beverage-catalog'
}

const comboFallbacks = [
  {
    keywords: ['pizza', 'calabresa', 'mussarela', 'pepperoni', 'forno'],
    src: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['petisco', 'cerveja', 'beer', 'chopp', 'balde', 'bucket', 'lager', 'futebol'],
    src: 'https://images.pexels.com/photos/12940820/pexels-photo-12940820.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    keywords: ['drink', 'drinks', 'coquetel', 'cocktail', 'caipirinha', 'gin', 'destilado'],
    src: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['burger', 'hamb', 'lanche', 'batata', 'combo', 'kit'],
    src: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  },
] as const

export function resolveProductVisual(product: ProductVisualInput): ProductVisual | null {
  const directImage = sanitizeVisualUrl(product.imageUrl)
  if (directImage) {
    return {
      src: directImage,
      alt: `Foto de ${product.name}`,
      source: 'catalog',
    }
  }

  if (isComboLike(product)) {
    return {
      src: resolveComboFallback(product),
      alt: `Imagem ilustrativa de ${product.name}`,
      source: 'combo-fallback',
    }
  }

  const curatedBeveragePhoto = resolveCuratedBeveragePhoto(product)
  if (curatedBeveragePhoto) {
    return curatedBeveragePhoto
  }

  const beverageVisual = resolveBrazilianPackagedBeverageVisual(product)
  if (beverageVisual) {
    return beverageVisual
  }

  return null
}

function resolveCuratedBeveragePhoto(product: ProductVisualInput): ProductVisual | null {
  const haystack = normalizeVisualText(
    `${product.name} ${product.brand ?? ''} ${product.category ?? ''} ${product.packagingClass ?? ''}`,
  )
  if (!looksLikeBeerOrCombo(haystack)) {
    return null
  }

  const match = curatedBeveragePhotos.find((entry) => entry.keywords.some((keyword) => haystack.includes(keyword)))
  if (!match) {
    return null
  }

  return {
    src: match.src,
    alt: `Foto de ${product.name}`,
    source: 'curated-beverage-photo',
  }
}

const curatedBeveragePhotos = [
  {
    keywords: ['budweiser', 'bud'],
    src: 'https://images.pexels.com/photos/16655780/pexels-photo-16655780.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    keywords: ['corona'],
    src: 'https://images.pexels.com/photos/1089932/pexels-photo-1089932.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    keywords: ['heineken'],
    src: 'https://images.pexels.com/photos/11098951/pexels-photo-11098951.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    keywords: ['stella artois', 'stella'],
    src: 'https://images.pexels.com/photos/12940650/pexels-photo-12940650.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    keywords: ['skol'],
    src: 'https://images.pexels.com/photos/19733808/pexels-photo-19733808.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    keywords: ['spaten'],
    src: 'https://images.pexels.com/photos/30325819/pexels-photo-30325819.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
] as const

function looksLikeBeerOrCombo(haystack: string) {
  return ['cerveja', 'beer', 'chopp', 'long neck', 'litrao', 'litrão', 'combo', 'petisco'].some((keyword) =>
    haystack.includes(normalizeVisualText(keyword)),
  )
}

export function buildProductInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('')

  return initials || 'IT'
}

function resolveComboFallback(product: ProductVisualInput) {
  const haystack = `${product.name} ${product.category ?? ''}`.toLowerCase()
  const matchedFallback = comboFallbacks.find((entry) => entry.keywords.some((keyword) => haystack.includes(keyword)))

  return (
    matchedFallback?.src ??
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
  )
}

function isComboLike(product: ProductVisualInput) {
  if (product.isCombo) {
    return true
  }

  const haystack = `${product.name} ${product.category ?? ''}`.toLowerCase()
  return ['combo', 'combos', 'kit', 'balde', 'petisco', 'promocao', 'promoção'].some((keyword) =>
    haystack.includes(keyword),
  )
}

function normalizeVisualText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function sanitizeVisualUrl(value: string | null | undefined) {
  if (!value?.trim()) {
    return null
  }

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}
