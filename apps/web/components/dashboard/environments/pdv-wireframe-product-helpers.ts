import type { PdvCategoryOption, ProductCardRecord } from './pdv-wireframe-environment.types'

export function buildPdvCategories(products: ProductCardRecord[]): PdvCategoryOption[] {
  const counts = new Map<string, number>()
  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1)
  }

  return [
    { id: 'tudo', label: 'tudo', count: products.length },
    ...[...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'pt-BR'))
      .map(([label, count]) => ({ id: label, label: label.toLowerCase(), count })),
  ]
}

export function filterPdvProducts(products: ProductCardRecord[], activeCategory: string) {
  return activeCategory === 'tudo' ? products : products.filter((product) => product.category === activeCategory)
}
