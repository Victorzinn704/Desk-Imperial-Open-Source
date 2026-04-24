type ProductImageSearchInput = {
  name: string
  brand?: string | null
  category?: string | null
  packagingClass?: string | null
  quantityLabel?: string | null
  isCombo?: boolean | null
}

const COMBO_KEYWORDS = ['combo', 'combos', 'kit', 'balde', 'petisco', 'promocao', 'promoção']
const PREPARED_DRINK_KEYWORDS = ['drink', 'drinks', 'coquetel', 'coquetéis', 'cocktail', 'caipirinha', 'gin']
const FOOD_KEYWORDS = [
  'pizza',
  'burger',
  'hamb',
  'lanche',
  'batata',
  'porção',
  'porcao',
  'petisco',
  'pastel',
  'prato',
  'sobremesa',
  'açaí',
  'acai',
  'sanduíche',
  'sanduiche',
  'poke',
]
const PACKAGED_BEVERAGE_KEYWORDS = [
  'cerveja',
  'refrigerante',
  'água',
  'agua',
  'energético',
  'energetico',
  'suco',
  'chá',
  'cha',
  'lata',
  'garrafa',
  'long neck',
]

export function buildProductImageSearchQuery(input: ProductImageSearchInput) {
  const name = input.name.trim()
  if (!name) {
    return null
  }

  if (isPackagedBeverageLike(input)) {
    return null
  }

  const haystack = normalize(`${input.name} ${input.brand ?? ''} ${input.category ?? ''}`)

  if (isComboLike(input, haystack)) {
    return `${name} comida combo restaurante`
  }

  if (containsAny(haystack, PREPARED_DRINK_KEYWORDS)) {
    return `${name} drink bar`
  }

  if (containsAny(haystack, FOOD_KEYWORDS)) {
    return `${name} comida restaurante`
  }

  if (input.category?.trim()) {
    return `${name} ${input.category.trim()} restaurante`
  }

  return `${name} produto restaurante`
}

export function isPackagedBeverageLike(input: ProductImageSearchInput) {
  const haystack = normalize(
    `${input.name} ${input.brand ?? ''} ${input.category ?? ''} ${input.packagingClass ?? ''} ${input.quantityLabel ?? ''}`,
  )

  return containsAny(haystack, PACKAGED_BEVERAGE_KEYWORDS)
}

function isComboLike(input: ProductImageSearchInput, haystack: string) {
  return Boolean(input.isCombo) || containsAny(haystack, COMBO_KEYWORDS)
}

function containsAny(haystack: string, keywords: readonly string[]) {
  return keywords.some((keyword) => haystack.includes(normalize(keyword)))
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
