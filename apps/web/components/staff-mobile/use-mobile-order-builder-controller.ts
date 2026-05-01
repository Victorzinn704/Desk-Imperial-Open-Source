'use client'

import { startTransition, useCallback, useDeferredValue, useMemo, useState } from 'react'
import type { ComandaItem } from '@/components/pdv/pdv-types'
import {
  addProductToCart,
  buildInitialCart,
  filterProducts,
  getActiveProducts,
  getInitialItemsKey,
  getSortedCategories,
  removeProductFromCart,
} from './mobile-order-builder.helpers'
import type { CartEntry, MobileOrderBuilderProps } from './mobile-order-builder.types'

interface CartState {
  items: CartEntry[]
  sourceKey: string
}

type MobileOrderBuilderControllerArgs = Pick<MobileOrderBuilderProps, 'busy' | 'initialItems' | 'onSubmit' | 'produtos'>

export interface MobileOrderBuilderController {
  activeProdutos: MobileOrderBuilderProps['produtos']
  addItem: (produto: MobileOrderBuilderProps['produtos'][number]) => void
  categories: string[]
  deferredSearch: string
  filtered: MobileOrderBuilderProps['produtos']
  getQty: (produtoId: string) => number
  handleSearchChange: (value: string) => void
  handleSubmit: () => Promise<void>
  openCategory: (category: string) => void
  removeItem: (produtoId: string) => void
  search: string
  selectedCategory: string | null
  showAllProducts: () => void
  totalItems: number
  totalValue: number
}

function useCatalogSelectionState() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => setSearch(value))
  }, [])

  const showAllProducts = useCallback(() => {
    startTransition(() => setSelectedCategory(null))
  }, [])

  const openCategory = useCallback((category: string) => {
    startTransition(() => setSelectedCategory(category))
  }, [])

  return { deferredSearch, handleSearchChange, openCategory, search, selectedCategory, showAllProducts }
}

function useMobileOrderBuilderCatalog(
  produtos: MobileOrderBuilderProps['produtos'],
  deferredSearch: string,
  selectedCategory: string | null,
) {
  const activeProdutos = useMemo(() => getActiveProducts(produtos), [produtos])
  const categories = useMemo(() => getSortedCategories(activeProdutos), [activeProdutos])
  const filtered = useMemo(
    () => filterProducts(activeProdutos, deferredSearch, selectedCategory),
    [activeProdutos, deferredSearch, selectedCategory],
  )

  return { activeProdutos, categories, filtered }
}

function useCartMetrics(cart: CartEntry[]) {
  const qtyMap = useMemo(() => {
    const map = new Map<string, number>()
    cart.forEach((entry) => map.set(entry.produtoId, (map.get(entry.produtoId) ?? 0) + entry.quantidade))
    return map
  }, [cart])

  const totalItems = useMemo(() => cart.reduce((sum, entry) => sum + entry.quantidade, 0), [cart])
  const totalValue = useMemo(() => cart.reduce((sum, entry) => sum + entry.quantidade * entry.precoUnitario, 0), [cart])

  return { qtyMap, totalItems, totalValue }
}

function buildResolvedCart({
  cartState,
  initialItems,
  initialItemsKey,
}: {
  cartState: CartState
  initialItems: MobileOrderBuilderProps['initialItems']
  initialItemsKey: string
}) {
  if (cartState.sourceKey === initialItemsKey) {
    return cartState.items
  }

  return buildInitialCart(initialItems as CartEntry[] | undefined)
}

function useCartState(initialItems: MobileOrderBuilderProps['initialItems'], initialItemsKey: string) {
  const [cartState, setCartState] = useState<CartState>(() => ({
    items: buildInitialCart(initialItems as CartEntry[] | undefined),
    sourceKey: initialItemsKey,
  }))

  const cart = useMemo(
    () => buildResolvedCart({ cartState, initialItems, initialItemsKey }),
    [cartState, initialItems, initialItemsKey],
  )

  const setCart = useCallback(
    (updater: (current: CartEntry[]) => CartEntry[]) => {
      setCartState((currentState) => ({
        items: updater(buildResolvedCart({ cartState: currentState, initialItems, initialItemsKey })),
        sourceKey: initialItemsKey,
      }))
    },
    [initialItems, initialItemsKey],
  )

  return { cart, setCart }
}

function useMobileOrderBuilderActions({
  busy,
  cart,
  onSubmit,
  setCart,
}: {
  busy?: boolean
  cart: CartEntry[]
  onSubmit: MobileOrderBuilderProps['onSubmit']
  setCart: (updater: (current: CartEntry[]) => CartEntry[]) => void
}) {
  const addItem = useCallback(
    (produto: MobileOrderBuilderProps['produtos'][number]) => {
      setCart((prev) => addProductToCart(prev, produto))
    },
    [setCart],
  )

  const removeItem = useCallback(
    (produtoId: string) => {
      setCart((prev) => removeProductFromCart(prev, produtoId))
    },
    [setCart],
  )

  const handleSubmit = useCallback(async () => {
    if (cart.length === 0 || busy) {
      return
    }

    const items: ComandaItem[] = cart.map(({ _key: _ignored, ...rest }) => rest)
    await onSubmit(items)
  }, [busy, cart, onSubmit])

  return { addItem, handleSubmit, removeItem }
}

export function useMobileOrderBuilderController({
  busy,
  initialItems,
  onSubmit,
  produtos,
}: MobileOrderBuilderControllerArgs): MobileOrderBuilderController {
  const selection = useCatalogSelectionState()
  const initialItemsKey = useMemo(() => getInitialItemsKey(initialItems as CartEntry[] | undefined), [initialItems])
  const { cart, setCart } = useCartState(initialItems, initialItemsKey)
  const { activeProdutos, categories, filtered } = useMobileOrderBuilderCatalog(
    produtos,
    selection.deferredSearch,
    selection.selectedCategory,
  )
  const { qtyMap, totalItems, totalValue } = useCartMetrics(cart)
  const { addItem, handleSubmit, removeItem } = useMobileOrderBuilderActions({ busy, cart, onSubmit, setCart })
  const getQty = useCallback((produtoId: string) => qtyMap.get(produtoId) ?? 0, [qtyMap])

  return {
    activeProdutos,
    addItem,
    categories,
    deferredSearch: selection.deferredSearch,
    filtered,
    getQty,
    handleSearchChange: selection.handleSearchChange,
    handleSubmit,
    openCategory: selection.openCategory,
    removeItem,
    search: selection.search,
    selectedCategory: selection.selectedCategory,
    showAllProducts: selection.showAllProducts,
    totalItems,
    totalValue,
  }
}
