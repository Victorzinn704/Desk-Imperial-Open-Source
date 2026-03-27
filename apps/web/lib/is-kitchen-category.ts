/**
 * Infere se uma categoria de produto deve ir para a cozinha.
 *
 * Categorias de comida/preparo → true  (petisco, aperitivo, prato, etc.)
 * Categorias de bebida/não-preparo → false (cerveja, refrigerante, etc.)
 *
 * A heurística é permissiva: em caso de dúvida, retorna false para não
 * enviar itens para a cozinha indevidamente.
 */
export function isKitchenCategory(category: string): boolean {
  const c = category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  // Bebidas industrializadas — NÃO vão para cozinha
  const IS_DRINK = [
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
  ]
  if (IS_DRINK.some((kw) => c.includes(kw))) return false

  // Comidas / preparos — vão para cozinha
  const IS_FOOD = [
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
  ]
  return IS_FOOD.some((kw) => c.includes(kw))
}
