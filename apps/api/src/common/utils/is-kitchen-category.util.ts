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
  const c = category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const DRINK_KEYWORDS = [
    'cerveja', 'chopp', 'chope', 'vinho', 'drinque', 'drink',
    'refrigerante', 'refri', 'suco', 'agua', 'bebida', 'energetico',
    'destilado', 'whisky', 'vodka', 'rum', 'gin', 'cachaca', 'sake',
    'espumante', 'prosecco', 'champagne', 'kombucha', 'smoothie',
  ]
  if (DRINK_KEYWORDS.some((kw) => c.includes(kw))) return false

  const FOOD_KEYWORDS = [
    'comida', 'cozinha', 'prato', 'refeicao', 'almoco', 'jantar',
    'petisco', 'tira-gosto', 'tiragosto', 'aperitivo', 'entrada',
    'lanche', 'sanduiche', 'burger', 'hamburguer', 'pizza', 'massa',
    'macarrao', 'frango', 'carne', 'peixe', 'frutos',
    'salada', 'sopa', 'caldo', 'porcao', 'porcoes', 'combo', 'kit',
    'tapioca', 'crepe', 'espetinho', 'churrasco', 'grill', 'grelhado',
    'frito', 'assado', 'cozido', 'sobremesa', 'doce', 'torta',
    'pao', 'bruschet', 'carpaccio', 'nachos', 'asa', 'bolinho',
  ]
  return FOOD_KEYWORDS.some((kw) => c.includes(kw))
}
