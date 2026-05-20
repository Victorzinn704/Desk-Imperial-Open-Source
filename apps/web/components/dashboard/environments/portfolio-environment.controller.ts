'use client'

import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import type { ProductFormValues } from '@/lib/validation'
import type { PortfolioProductsPanel } from './portfolio-products-panel'
import {
  buildSaleInitialValues,
  calcAvgMargin,
  filterProducts,
  type PortfolioSurfaceState,
  type SaleMode,
} from './portfolio-environment.model'
import { createPortfolioEnvironmentContent, type PortfolioEnvironmentContent } from './portfolio-environment.content'
import {
  createProductCommands,
  createSaleCommands,
  nextSaleModeSurface,
  requestProductDeletion,
  resolveApiErrorMessage,
  type SaleSubmitHandler,
} from './portfolio-environment.commands'
import type { PortfolioProductWorkbenchState, PortfolioSaleWorkbenchState } from './portfolio-environment.workbenches'

type ProductsPanelProps = Parameters<typeof PortfolioProductsPanel>[0]
type SurfaceSetter = Dispatch<SetStateAction<PortfolioSurfaceState>>

export type PortfolioEnvironmentViewModel = {
  actions: {
    changeSaleMode: (mode: SaleMode) => void
    closeSurface: () => void
    openDeliverySaleSurface: () => void
    openNewProductSurface: () => void
    submitProduct: (values: ProductFormValues) => void
    submitSale: SaleSubmitHandler
  }
  content: PortfolioEnvironmentContent
  productWorkbench: PortfolioProductWorkbenchState | null
  productsPanel: ProductsPanelProps
  saleWorkbench: PortfolioSaleWorkbenchState | null
}

export function usePortfolioEnvironmentController(): PortfolioEnvironmentViewModel {
  const [surface, setSurface] = useState<PortfolioSurfaceState>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkRestockFeedback, setBulkRestockFeedback] = useState<string | null>(null)

  const data = usePortfolioDashboardData()
  const mutations = useDashboardMutations()
  const activeSurface = resolveActiveSurface({ surface })
  const productCommands = createProductCommands({
    activeProduct: activeSurface.productSurface?.product ?? null,
    mutations,
    setBulkRestockFeedback,
    setSurface,
  })
  const saleCommands = createSaleCommands({ mutations, setSurface })
  const filteredProducts = useMemo(() => filterProducts(data.products, searchQuery), [data.products, searchQuery])
  const content = usePortfolioContent({ data })

  return {
    actions: createSurfaceActions({ saleCommands, setSurface, submitProduct: productCommands.submitProduct }),
    content,
    productWorkbench: createProductWorkbenchState({
      activeProductSurface: activeSurface.productSurface,
      data,
      productCommands,
    }),
    productsPanel: createProductsPanelProps({
      bulkRestockFeedback,
      data,
      filteredProducts,
      productCommands,
      searchQuery,
      setSearchQuery,
      setSurface,
    }),
    saleWorkbench: createSaleWorkbenchState({ activeSale: activeSurface.sale, data, saleCommands }),
  }
}

function usePortfolioDashboardData() {
  const { financeQuery, productsQuery, employeesQuery, sessionQuery } = useDashboardQueries({ section: 'portfolio' })
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data?.items])
  const employees = useMemo(() => employeesQuery.data?.items ?? [], [employeesQuery.data?.items])
  const displayCurrency = resolveDisplayCurrency({ finance: financeQuery.data, products })

  return {
    currentUser: sessionQuery.data?.user,
    displayCurrency,
    employees,
    finance: financeQuery.data,
    products,
    productsError: resolveApiErrorMessage({ error: productsQuery.error }),
    productsTotals: productsQuery.data?.totals,
  }
}

function usePortfolioContent({
  data,
}: Readonly<{
  data: ReturnType<typeof usePortfolioDashboardData>
}>) {
  return useMemo(
    () =>
      createPortfolioEnvironmentContent({
        avgMargin: calcAvgMargin(data.products),
        categoryBreakdown: data.finance?.categoryBreakdown ?? [],
        displayCurrency: data.displayCurrency,
        lowStockItems: data.finance?.totals.lowStockItems ?? 0,
        products: data.products,
        productsTotals: data.productsTotals,
      }),
    [data.displayCurrency, data.finance, data.products, data.productsTotals],
  )
}

function createSurfaceActions({
  saleCommands,
  setSurface,
  submitProduct,
}: Readonly<{
  saleCommands: ReturnType<typeof createSaleCommands>
  setSurface: SurfaceSetter
  submitProduct: (values: ProductFormValues) => void
}>): PortfolioEnvironmentViewModel['actions'] {
  return {
    changeSaleMode: (mode) => setSurface((current) => nextSaleModeSurface({ current, mode })),
    closeSurface: () => setSurface(null),
    openDeliverySaleSurface: () => setSurface({ kind: 'sale', mode: 'delivery', product: null }),
    openNewProductSurface: () => setSurface({ kind: 'product', product: null }),
    submitProduct,
    submitSale: saleCommands.submitSale,
  }
}

function createProductsPanelProps({
  bulkRestockFeedback,
  data,
  filteredProducts,
  productCommands,
  searchQuery,
  setSearchQuery,
  setSurface,
}: Readonly<{
  bulkRestockFeedback: string | null
  data: ReturnType<typeof usePortfolioDashboardData>
  filteredProducts: ProductRecord[]
  productCommands: ReturnType<typeof createProductCommands>
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
  setSurface: SurfaceSetter
}>): ProductsPanelProps {
  return {
    bulkRestockFeedback,
    bulkRestockPending: productCommands.bulkRestockPending,
    busy: productCommands.productBusy,
    currency: data.displayCurrency,
    filteredProducts,
    mutationError: productCommands.productMutationError,
    products: data.products,
    productsError: data.productsError,
    searchQuery,
    setSearchQuery,
    onArchive: productCommands.archiveProduct,
    onBulkRestock: productCommands.bulkRestockProducts,
    onCreate: () => setSurface({ kind: 'product', product: null }),
    onDelete: (productId) =>
      requestProductDeletion({ deleteProduct: productCommands.deleteProduct, productId, products: data.products }),
    onEdit: (product) => setSurface({ kind: 'product', product }),
    onRestore: productCommands.restoreProduct,
    onSell: (product) => setSurface({ kind: 'sale', mode: 'delivery', product }),
  }
}

function createProductWorkbenchState({
  activeProductSurface,
  data,
  productCommands,
}: Readonly<{
  activeProductSurface: Extract<NonNullable<PortfolioSurfaceState>, { kind: 'product' }> | null
  data: ReturnType<typeof usePortfolioDashboardData>
  productCommands: ReturnType<typeof createProductCommands>
}>): PortfolioProductWorkbenchState | null {
  if (activeProductSurface === null) {
    return null
  }

  return {
    creatingProduct: productCommands.creatingProduct,
    mutationError: productCommands.productMutationError,
    product: activeProductSurface.product,
    products: data.products,
    updatingProduct: productCommands.updatingProduct,
  }
}

function createSaleWorkbenchState({
  activeSale,
  data,
  saleCommands,
}: Readonly<{
  activeSale: Extract<NonNullable<PortfolioSurfaceState>, { kind: 'sale' }> | null
  data: ReturnType<typeof usePortfolioDashboardData>
  saleCommands: ReturnType<typeof createSaleCommands>
}>): PortfolioSaleWorkbenchState | null {
  if (activeSale === null) {
    return null
  }

  return {
    currentMode: activeSale.mode,
    employees: data.employees,
    errorMessage: saleCommands.saleMutationError,
    loading: saleCommands.salePending,
    product: activeSale.product,
    products: data.products.filter((product) => product.active),
    saleInitialValues: buildSaleInitialValues(activeSale.product, data.displayCurrency, activeSale.mode),
    userRole: resolveUserRole({ role: data.currentUser?.role }),
  }
}

function resolveActiveSurface({
  surface,
}: Readonly<{
  surface: PortfolioSurfaceState
}>) {
  return {
    productSurface: surface?.kind === 'product' ? surface : null,
    sale: surface?.kind === 'sale' ? surface : null,
  }
}

function resolveDisplayCurrency({
  finance,
  products,
}: Readonly<{
  finance: FinanceSummaryResponse | undefined
  products: ProductRecord[]
}>) {
  return String(finance?.displayCurrency ?? products[0]?.displayCurrency ?? 'BRL')
}

function resolveUserRole({
  role,
}: Readonly<{
  role: string | undefined
}>): 'OWNER' | 'STAFF' {
  return role === 'STAFF' ? 'STAFF' : 'OWNER'
}
