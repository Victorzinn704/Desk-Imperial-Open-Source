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
  source: 'catalog' | 'combo-fallback'
}

const comboFallbacks = [
  {
    keywords: ['pizza', 'calabresa', 'mussarela', 'pepperoni', 'forno'],
    src: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['petisco', 'cerveja', 'beer', 'chopp', 'balde', 'bucket', 'lager', 'futebol'],
    src: 'https://images.pexels.com/photos/20329664/pexels-photo-20329664.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
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

  return null
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
