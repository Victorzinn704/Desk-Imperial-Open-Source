'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { fetchOperationsKitchen, fetchOperationsLive } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { buildPdvComandas } from '@/components/pdv/pdv-operations'
import { calcTotal, isEndedComandaStatus } from '@/components/pdv/pdv-types'
import { buildKitchenTickets, buildPdvCategories, filterPdvProducts } from './pdv-wireframe-environment.helpers'
import type { PdvWireframeEnvironmentProps, ProductCardRecord } from './pdv-wireframe-environment.types'

export function usePdvWireframeEnvironmentData({
  mesaIntent,
  user,
  variant,
}: Pick<PdvWireframeEnvironmentProps, 'mesaIntent' | 'user' | 'variant'>) {
  const { productsQuery } = useDashboardQueries({ section: 'pdv' })
  const [activeCategory, setActiveCategory] = useState('tudo')
  const operationsQuery = useOperationsLiveQuery()
  const kitchenQuery = useKitchenOperationsQuery(variant === 'kds')
  const products = resolveActiveProducts(productsQuery.data?.items ?? [])
  const openComandas = useOpenComandas(operationsQuery.data)
  const selectedComanda = resolveSelectedComanda(openComandas, mesaIntent)
  const chargeComanda = resolveChargeComanda(openComandas, selectedComanda)

  return {
    activeCategory,
    categories: buildPdvCategories(products),
    chargeComanda,
    currency: user.preferredCurrency,
    filteredProducts: filterPdvProducts(products, activeCategory),
    kitchenLoading: kitchenQuery.isLoading,
    kitchenTickets: buildKitchenTickets(kitchenQuery.data, openComandas),
    openComandas,
    selectedComanda,
    setActiveCategory,
  }
}

function useOperationsLiveQuery() {
  return useQuery({
    queryKey: ['operations', 'live', 'dashboard-pdv'],
    queryFn: () => fetchOperationsLive({ includeCashMovements: false }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })
}

function useKitchenOperationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['operations', 'kitchen', 'dashboard-pdv'],
    queryFn: () => fetchOperationsKitchen({ includeCashMovements: false }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })
}

function useOpenComandas(operationsData: Parameters<typeof buildPdvComandas>[0]) {
  return useMemo(
    () =>
      buildPdvComandas(operationsData)
        .filter((comanda) => !isEndedComandaStatus(comanda.status))
        .sort((left, right) => left.abertaEm.getTime() - right.abertaEm.getTime()),
    [operationsData],
  )
}

function resolveActiveProducts(items: unknown[]) {
  return (items as ProductCardRecord[]).filter((product) => product.active !== false)
}

function resolveSelectedComanda(
  comandas: ReturnType<typeof buildPdvComandas>,
  mesaIntent: PdvWireframeEnvironmentProps['mesaIntent'],
) {
  return (
    comandas.find((comanda) => comanda.id === mesaIntent?.comandaId) ??
    comandas.find((comanda) => comanda.mesa === mesaIntent?.mesaLabel) ??
    comandas[0] ??
    null
  )
}

function resolveChargeComanda(
  comandas: ReturnType<typeof buildPdvComandas>,
  selectedComanda: ReturnType<typeof resolveSelectedComanda>,
) {
  const ranked = [...comandas].sort((left, right) => calcTotal(right) - calcTotal(left))
  return ranked[0] ?? selectedComanda
}
