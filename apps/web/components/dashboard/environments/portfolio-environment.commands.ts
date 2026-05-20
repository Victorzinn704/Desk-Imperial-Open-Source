import type { Dispatch, SetStateAction } from 'react'
import type { ProductRecord } from '@contracts/contracts'
import type { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import type { OrderForm } from '@/components/dashboard/order-form'
import { ApiError } from '@/lib/api'
import type { ProductFormValues } from '@/lib/validation'
import {
  buildProductPayload,
  confirmProductDeletion,
  type PortfolioSurfaceState,
  resolveProductMutationError,
  type SaleMode,
} from './portfolio-environment.model'

type DashboardMutations = ReturnType<typeof useDashboardMutations>
export type SaleSubmitHandler = NonNullable<Parameters<typeof OrderForm>[0]['onSubmit']>
type SaleSubmitInput = Parameters<SaleSubmitHandler>[0]
type SurfaceSetter = Dispatch<SetStateAction<PortfolioSurfaceState>>

export function createProductCommands({
  activeProduct,
  mutations,
  setBulkRestockFeedback,
  setSurface,
}: Readonly<{
  activeProduct: ProductRecord | null
  mutations: DashboardMutations
  setBulkRestockFeedback: Dispatch<SetStateAction<string | null>>
  setSurface: SurfaceSetter
}>) {
  const closeSurface = () => setSurface(null)
  const updateProduct = (payload: Parameters<DashboardMutations['updateProductMutation']['mutate']>[0]) =>
    mutations.updateProductMutation.mutate(payload, { onSuccess: closeSurface })
  const deleteProduct = (id: string) =>
    mutations.deleteProductMutation.mutate(id, {
      onSuccess: () => closeProductSurfaceAfterDeletion({ activeProduct, deletedProductId: id, setSurface }),
    })

  return {
    archiveProduct: (id: string) => mutations.archiveProductMutation.mutate(id, { onSuccess: closeSurface }),
    bulkRestockPending: mutations.bulkRestockProductsMutation.isPending,
    bulkRestockProducts: () =>
      mutations.bulkRestockProductsMutation.mutate(
        { mode: 'low_stock', targetStock: 24 },
        { onSuccess: (payload) => setBulkRestockFeedback(createBulkRestockFeedback({ payload })) },
      ),
    creatingProduct: mutations.createProductMutation.isPending,
    deleteProduct,
    productBusy: isProductMutationBusy({ mutations }),
    productMutationError: resolveProductErrors({ mutations }),
    restoreProduct: mutations.restoreProductMutation.mutate,
    submitProduct: (values: ProductFormValues) => {
      const payload = buildProductPayload(values, activeProduct)
      if (activeProduct) {
        updateProduct({ productId: activeProduct.id, values: payload })
        return
      }

      mutations.createProductMutation.mutate(payload, { onSuccess: closeSurface })
    },
    updatingProduct: mutations.updateProductMutation.isPending,
  }
}

export function createSaleCommands({
  mutations,
  setSurface,
}: Readonly<{
  mutations: DashboardMutations
  setSurface: SurfaceSetter
}>) {
  return {
    saleMutationError: resolveApiErrorMessage({ error: mutations.createOrderMutation.error }),
    salePending: mutations.createOrderMutation.isPending,
    submitSale: ({ values }: SaleSubmitInput) =>
      mutations.createOrderMutation.mutate({ values }, { onSuccess: () => setSurface(null) }),
  }
}

export function requestProductDeletion({
  deleteProduct,
  productId,
  products,
}: Readonly<{
  deleteProduct: (id: string) => void
  productId: string
  products: ProductRecord[]
}>) {
  const target = products.find((product) => product.id === productId)
  if (confirmProductDeletion(target?.name)) {
    deleteProduct(productId)
  }
}

export function nextSaleModeSurface({
  current,
  mode,
}: Readonly<{
  current: PortfolioSurfaceState
  mode: SaleMode
}>): PortfolioSurfaceState {
  return current?.kind === 'sale' ? { ...current, mode } : current
}

export function resolveApiErrorMessage({
  error,
}: Readonly<{
  error: unknown
}>) {
  return error instanceof ApiError ? error.message : null
}

function closeProductSurfaceAfterDeletion({
  activeProduct,
  deletedProductId,
  setSurface,
}: Readonly<{
  activeProduct: ProductRecord | null
  deletedProductId: string
  setSurface: SurfaceSetter
}>) {
  if (activeProduct?.id === deletedProductId) {
    setSurface(null)
  }
}

function isProductMutationBusy({
  mutations,
}: Readonly<{
  mutations: DashboardMutations
}>) {
  return [
    mutations.createProductMutation.isPending,
    mutations.updateProductMutation.isPending,
    mutations.archiveProductMutation.isPending,
    mutations.restoreProductMutation.isPending,
    mutations.deleteProductMutation.isPending,
  ].some(Boolean)
}

function resolveProductErrors({
  mutations,
}: Readonly<{
  mutations: DashboardMutations
}>) {
  return resolveProductMutationError([
    mutations.createProductMutation.error,
    mutations.updateProductMutation.error,
    mutations.archiveProductMutation.error,
    mutations.bulkRestockProductsMutation.error,
    mutations.restoreProductMutation.error,
    mutations.deleteProductMutation.error,
  ])
}

function createBulkRestockFeedback({
  payload,
}: Readonly<{
  payload: Awaited<ReturnType<DashboardMutations['bulkRestockProductsMutation']['mutateAsync']>>
}>) {
  return payload.summary.updatedCount > 0
    ? `${payload.summary.updatedCount} produto(s) reabastecido(s) para no mínimo ${payload.summary.targetStock} und base.`
    : 'Nenhum produto precisava de reabastecimento nesta passada.'
}
