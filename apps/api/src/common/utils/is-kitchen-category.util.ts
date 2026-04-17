const ACCENT_MARKS_PATTERN = /[\u0300-\u036f]/g

const DRINK_CATEGORY_KEYWORDS = [
  'cerveja',
  'chopp',
  'chope',
  'vinho',
  'drinque',
  'drink',
  'refrigerante',
  'refri',
  'suco',
  'agua',
  'bebida',
  'energetico',
  'destilado',
  'whisky',
  'vodka',
  'rum',
  'gin',
  'cachaca',
  'sake',
  'espumante',
  'prosecco',
  'champagne',
  'kombucha',
  'smoothie',
] as const

const FOOD_CATEGORY_KEYWORDS = [
  'comida',
  'cozinha',
  'prato',
  'refeicao',
  'almoco',
  'jantar',
  'petisco',
  'tira-gosto',
  'tiragosto',
  'aperitivo',
  'entrada',
  'lanche',
  'sanduiche',
  'burger',
  'hamburguer',
  'pizza',
  'massa',
  'macarrao',
  'frango',
  'carne',
  'peixe',
  'frutos',
  'salada',
  'sopa',
  'caldo',
  'porcao',
  'porcoes',
  'combo',
  'kit',
  'tapioca',
  'crepe',
  'espetinho',
  'churrasco',
  'grill',
  'grelhado',
  'frito',
  'assado',
  'cozido',
  'sobremesa',
  'doce',
  'torta',
  'pao',
  'bruschet',
  'carpaccio',
  'nachos',
  'asa',
  'bolinho',
] as const

/**
 * Infere se uma categoria de produto requer preparo na cozinha.
 *
 * Categorias de comida/preparo → true  (petisco, aperitivo, prato, etc.)
 * Categorias de bebida → false (cerveja, refrigerante, etc.)
 *
 * Heurística permissiva: em caso de dúvida retorna false para não
 * rotear itens para cozinha indevidamente.
 */
export function isKitchenCategory(category: string): boolean {
  const normalizedCategory = normalizeCategory(category)

  if (includesAnyKeyword(normalizedCategory, DRINK_CATEGORY_KEYWORDS)) {
    return false
  }

  return includesAnyKeyword(normalizedCategory, FOOD_CATEGORY_KEYWORDS)
}

function normalizeCategory(category: string): string {
  return category.toLowerCase().normalize('NFD').replaceAll(ACCENT_MARKS_PATTERN, '')
}

function includesAnyKeyword(category: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => category.includes(keyword))
}
