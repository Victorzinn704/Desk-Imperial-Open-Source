import { normalizeTextForSearch } from '@/lib/normalize-text-for-search'
import type { ProductRecord } from '@contracts/contracts'
import type { CartEntry } from './mobile-order-builder.types'

export function getInitialItemsKey(initialItems: CartEntry[] | undefined) {
  return (initialItems ?? [])
    .map((item) =>
      [item.produtoId, item.nome, String(item.quantidade), String(item.precoUnitario), item.observacao ?? ''].join('|'),
    )
    .join('::')
}

export function buildInitialCart(initialItems: CartEntry[] | undefined): CartEntry[] {
  const grouped = new Map<string, CartEntry>()

  for (const item of initialItems ?? []) {
    const key = [item.produtoId, item.nome, String(item.precoUnitario), item.observacao ?? ''].join('|')
    const existing = grouped.get(key)
    if (existing) {
      grouped.set(key, {
        ...existing,
        quantidade: existing.quantidade + item.quantidade,
      })
      continue
    }

    grouped.set(key, {
      ...item,
      _key: key,
    })
  }

  return Array.from(grouped.values())
}

export function getCategoryIconKey(category: string) {
  const low = category.toLowerCase()
  if (low.includes('alco') || low.includes('cerveja') || low.includes('chopp')) {
    return 'beer'
  }
  if (low.includes('vinho')) {
    return 'wine'
  }
  if (low.includes('bebida') || low.includes('suco') || low.includes('refr')) {
    return 'drink'
  }
  if (low.includes('combo') || low.includes('kit')) {
    return 'combo'
  }
  if (low.includes('pizza') || low.includes('lanche') || low.includes('burger')) {
    return 'pizza'
  }
  return 'food'
}

export function getActiveProducts(produtos: ProductRecord[]) {
  return produtos.filter((produto) => produto.active)
}

export function getSortedCategories(produtos: ProductRecord[]) {
  return Array.from(new Set(produtos.map((produto) => produto.category)))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base', numeric: true }))
}

export function filterProducts(produtos: ProductRecord[], search: string, selectedCategory: string | null) {
  const normalizedSearch = normalizeTextForSearch(search)
  return produtos.filter((produto) => {
    const matchSearch =
      normalizedSearch.length === 0 ||
      normalizeTextForSearch(produto.name).includes(normalizedSearch) ||
      normalizeTextForSearch(produto.category).includes(normalizedSearch)
    const matchCategory = selectedCategory ? produto.category === selectedCategory : true
    return matchSearch && matchCategory
  })
}

export function addProductToCart(cart: CartEntry[], produto: ProductRecord) {
  const existing = cart.find((entry) => entry.produtoId === produto.id)
  if (existing) {
    return cart.map((entry) =>
      entry.produtoId === produto.id ? { ...entry, quantidade: entry.quantidade + 1 } : entry,
    )
  }

  return [
    ...cart,
    {
      _key: produto.id,
      produtoId: produto.id,
      nome: produto.name,
      quantidade: 1,
      precoUnitario: produto.unitPrice,
    },
  ]
}

export function removeProductFromCart(cart: CartEntry[], produtoId: string) {
  const existing = cart.find((entry) => entry.produtoId === produtoId)
  if (!existing) {
    return cart
  }

  if (existing.quantidade === 1) {
    return cart.filter((entry) => entry.produtoId !== produtoId)
  }

  return cart.map((entry) => (entry.produtoId === produtoId ? { ...entry, quantidade: entry.quantidade - 1 } : entry))
}
