'use client'

import type { ProductRecord } from '@contracts/contracts'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ApiError, fetchOperationsLive } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { type RealtimeStatus, useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import { buildOperationsViewModel } from '@/lib/operations'
import type { SimpleProduct } from '@/components/pdv/comanda-modal'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import { calcTotal } from '@/components/pdv/pdv-types'
import { buildPdvOperationalMetrics, type PdvEnvironmentVariant } from './pdv-environment.model'

const OPERATIONS_LIVE_PDV_QUERY_KEY = ['operations', 'live', 'pdv-full'] as const
const PDV_FALLBACK_REFETCH_INTERVAL_MS = 2_500

const pdvHeadings = {
  grid: {
    eyebrow: 'Grid de produtos',
    title: 'PDV - Nova comanda',
    description: 'Produtos, comandas e cozinha.',
  },
  comandas: {
    eyebrow: 'Comandas abertas',
    title: 'Trilho de comandas',
    description: 'Mesas abertas e cobrança.',
  },
  kds: {
    eyebrow: 'KDS para cozinha',
    title: 'Fila de preparo',
    description: 'Fila e status de preparo.',
  },
  cobranca: {
    eyebrow: 'Cobranca focada',
    title: 'Fechamento e caixa',
    description: 'Fechamento, caixa e pendências.',
  },
} satisfies Record<PdvEnvironmentVariant, { eyebrow: string; title: string; description: string }>

type OperationsLiveData = Awaited<ReturnType<typeof fetchOperationsLive>>
type OperationsLiveQueryState = Pick<
  ReturnType<typeof usePdvOperationsLiveQuery>,
  'dataUpdatedAt' | 'error' | 'isFetching' | 'isLoading'
>

export function usePdvEnvironmentController(variant: PdvEnvironmentVariant) {
  const queryClient = useQueryClient()
  const { productsQuery, sessionQuery } = useDashboardQueries({ section: 'pdv' })
  const user = sessionQuery.data?.user
  const { status: realtimeStatus } = useOperationsRealtime(Boolean(user?.userId), queryClient, {
    currentUserId: user?.userId ?? null,
    notificationChannel: 'WEB_TOAST',
  })
  const operationsQuery = usePdvOperationsLiveQuery(user?.userId, realtimeStatus)

  const operations = operationsQuery.data
  const boardProducts = useMemo(() => buildBoardProducts(productsQuery.data?.items), [productsQuery.data?.items])
  const operationsState = useMemo(
    () =>
      buildPdvOperationsState({
        boardProducts,
        operations,
        operationsQuery: {
          dataUpdatedAt: operationsQuery.dataUpdatedAt,
          error: operationsQuery.error,
          isFetching: operationsQuery.isFetching,
          isLoading: operationsQuery.isLoading,
        },
        variant,
      }),
    [
      boardProducts,
      operations,
      operationsQuery.dataUpdatedAt,
      operationsQuery.error,
      operationsQuery.isFetching,
      operationsQuery.isLoading,
      variant,
    ],
  )

  return {
    boardProducts,
    heading: pdvHeadings[variant],
    isSessionLoading: sessionQuery.isLoading,
    sessionError: sessionQuery.error instanceof ApiError ? sessionQuery.error : null,
    showExecutiveOperations: user?.role === 'OWNER',
    user,
    ...operationsState,
  }
}

function usePdvOperationsLiveQuery(userId: string | undefined, realtimeStatus: RealtimeStatus) {
  return useQuery({
    queryKey: OPERATIONS_LIVE_PDV_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: false }),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchInterval: userId && realtimeStatus !== 'connected' ? PDV_FALLBACK_REFETCH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
  })
}

function buildPdvOperationsState({
  boardProducts,
  operations,
  operationsQuery,
  variant,
}: {
  boardProducts: SimpleProduct[]
  operations: OperationsLiveData | undefined
  operationsQuery: OperationsLiveQueryState
  variant: PdvEnvironmentVariant
}) {
  const operationsView = buildOperationsViewModel(operations)
  const comandas = buildPdvComandas(operations)
  const mesas = buildPdvMesas(operations)
  const abertas = comandas.filter((comanda) => comanda.status !== 'fechada')
  const kitchenCounters = buildKitchenCounters(operationsView.timelineItems)
  const hasMesaRegistry = Boolean(operations?.mesas?.length)
  const occupiedTables = mesas.filter((mesa) => mesa.status === 'ocupada').length
  const freeTables = mesas.filter((mesa) => mesa.status === 'livre').length

  return {
    inPreparationItems: kitchenCounters.inPreparationItems,
    metrics: buildPdvOperationalMetrics({
      activeProductsCount: boardProducts.length,
      freeTables,
      hasMesaRegistry,
      inPreparationItems: kitchenCounters.inPreparationItems,
      kitchenItemsCount: operationsView.timelineItems.length,
      lowStockProductsCount: boardProducts.filter((product) => product.isLowStock).length,
      occupiedTables,
      openComandasCount: abertas.length,
      readyKitchenItems: kitchenCounters.readyKitchenItems,
      totalEmAberto: abertas.reduce((sum, comanda) => sum + calcTotal(comanda), 0),
      variant,
    }),
    operations,
    operationsError: operationsQuery.error instanceof ApiError ? operationsQuery.error.message : null,
    operationsFetching: operationsQuery.isFetching,
    operationsLoading: operationsQuery.isLoading,
    operationsUpdatedAt: operationsQuery.dataUpdatedAt,
    operationsView,
  }
}

function buildBoardProducts(products: readonly ProductRecord[] | undefined): SimpleProduct[] {
  return (products ?? []).filter(isActiveProduct).map(toBoardProduct)
}

function isActiveProduct(product: ProductRecord) {
  return product.active
}

function toBoardProduct(product: ProductRecord): SimpleProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand ?? null,
    category: product.category,
    barcode: product.barcode ?? null,
    packagingClass: product.packagingClass,
    quantityLabel: product.quantityLabel ?? null,
    unitPrice: product.unitPrice,
    currency: String(product.currency),
    stock: product.stock,
    isLowStock: product.isLowStock,
    imageUrl: product.imageUrl ?? null,
    catalogSource: product.catalogSource ?? null,
    isCombo: product.isCombo ?? false,
    comboDescription: product.comboDescription ?? null,
    comboItems: product.comboItems ?? [],
  }
}

function buildKitchenCounters(timelineItems: Array<{ status: string }>) {
  return {
    inPreparationItems: timelineItems.filter((item) => item.status === 'in_preparation').length,
    readyKitchenItems: timelineItems.filter((item) => item.status === 'ready').length,
  }
}
