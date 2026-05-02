import type React from 'react'
import type { DashboardSettingsSectionId } from '@/components/dashboard/dashboard-navigation'
import type { RealtimeStatus } from '@/components/operations/use-operations-realtime'
import type { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import type { ComandaItem } from '@/components/pdv/pdv-types'
import type { OwnerCurrentUser, OwnerMobileTab, OwnerPdvView, PendingAction } from './owner-mobile-shell-types'
import type { useOwnerMobileShellMutations } from './use-owner-mobile-shell-mutations'
import type { useOwnerMobileShellQueries } from './use-owner-mobile-shell-queries'

export function mapOrderItemPayload(item: ComandaItem) {
  const isManual = item.produtoId.startsWith('manual-')
  return {
    productId: isManual ? undefined : item.produtoId,
    productName: isManual ? item.nome : undefined,
    quantity: item.quantidade,
    unitPrice: item.precoUnitario,
    notes: item.observacao,
  }
}

export function buildGarconSnapshots(
  activeComandas: ReturnType<typeof buildPdvComandas>,
  garconRanking: { nome: string; valor: number; comandas: number }[],
) {
  const activeByPerformer = new Map<string, number>()
  for (const comanda of activeComandas) {
    const performerName = comanda.garcomNome?.trim()
    if (!performerName) {
      continue
    }
    activeByPerformer.set(performerName, (activeByPerformer.get(performerName) ?? 0) + 1)
  }

  const known = new Set<string>()
  const snapshots = garconRanking.map((performer) => {
    known.add(performer.nome)
    return { ...performer, abertasAgora: activeByPerformer.get(performer.nome) ?? 0 }
  })

  for (const [nome, abertasAgora] of activeByPerformer.entries()) {
    if (known.has(nome)) {
      continue
    }
    snapshots.push({ nome, valor: 0, comandas: 0, abertasAgora })
  }

  return snapshots.sort((left, right) => right.valor - left.valor || right.abertasAgora - left.abertasAgora)
}

export function getDisplayName(user: OwnerCurrentUser | null) {
  return user?.fullName ?? user?.name ?? 'Proprietário'
}

export function getCompanyName(user: OwnerCurrentUser | null) {
  return user?.companyName ?? 'Desk Imperial'
}

export function getTodayErrorMessage(errors: {
  ordersErrorMessage: string | null
  operationsErrorMessage: string | null
  kitchenErrorMessage: string | null
  summaryErrorMessage: string | null
}) {
  return (
    errors.ordersErrorMessage ??
    errors.operationsErrorMessage ??
    errors.kitchenErrorMessage ??
    errors.summaryErrorMessage ??
    null
  )
}

export function getFinanceErrorMessage(
  summaryErrorMessage: string | null,
  ordersErrorMessage: string | null,
  financeErrorMessage: string | null,
) {
  return summaryErrorMessage ?? ordersErrorMessage ?? financeErrorMessage ?? null
}

export function getPdvErrorMessage(
  pdvView: OwnerPdvView,
  kitchenErrorMessage: string | null,
  operationsErrorMessage: string | null,
) {
  return pdvView === 'cozinha' ? kitchenErrorMessage : operationsErrorMessage
}

type ControllerBuildArgs = {
  activeSettingsSection: DashboardSettingsSectionId
  activeTab: OwnerMobileTab
  currentUser: OwnerCurrentUser | null
  focusedComandaId: string | null
  handleSubmit: (items: ComandaItem[]) => Promise<void>
  metrics: {
    activeComandas: ReturnType<typeof buildPdvComandas>
    comandas: ReturnType<typeof buildPdvComandas>
    executiveKpis: {
      caixaEsperado: number
      lucroRealizado: number
      openComandasCount: number
      receitaRealizada: number
    }
    garconRanking: { nome: string; valor: number; comandas: number }[]
    garconSnapshots: { nome: string; valor: number; comandas: number; abertasAgora: number }[]
    kitchenBadge: number
    mesas: ReturnType<typeof buildPdvMesas>
    mesasLivres: number
    mesasOcupadas: number
    ticketMedio: number
    todayOrderCount: number
    todayRevenue: number
    topProdutos: { nome: string; qtd: number; valor: number }[]
  }
  mutations: ReturnType<typeof useOwnerMobileShellMutations>
  navigateSettingsSection: (sectionId: DashboardSettingsSectionId) => void
  pdvView: OwnerPdvView
  pendingAction: PendingAction | null
  queries: ReturnType<typeof useOwnerMobileShellQueries>
  realtime: {
    containerRef: React.RefObject<HTMLDivElement | null>
    indicatorStyle: React.CSSProperties
    isOffline: boolean
    isRefreshing: boolean
    progress: number
    realtimeStatus: RealtimeStatus
  }
  router: { push: (href: string) => void }
  screenError: string | null
  setActiveTab: (tab: OwnerMobileTab) => void
  setActiveSettingsSection: (sectionId: DashboardSettingsSectionId) => void
  setFocusedComandaId: (id: string | null) => void
  setPdvView: (view: OwnerPdvView) => void
  setPendingAction: (action: PendingAction | null) => void
  setScreenError: (message: string | null) => void
}

function buildControllerVisuals({
  currentUser,
  pdvView,
  queries,
}: Pick<ControllerBuildArgs, 'currentUser' | 'pdvView' | 'queries'>) {
  return {
    companyName: getCompanyName(currentUser),
    displayName: getDisplayName(currentUser),
    financeErrorMessage: getFinanceErrorMessage(
      queries.summaryErrorMessage,
      queries.ordersErrorMessage,
      queries.financeErrorMessage,
    ),
    pdvErrorMessage: getPdvErrorMessage(pdvView, queries.kitchenErrorMessage, queries.operationsErrorMessage),
    todayErrorMessage: getTodayErrorMessage(queries),
  }
}

function buildControllerState({
  activeSettingsSection,
  activeTab,
  focusedComandaId,
  pdvView,
  pendingAction,
  screenError,
  setActiveTab,
  setActiveSettingsSection,
  setFocusedComandaId,
  setPdvView,
  setPendingAction,
  setScreenError,
}: Pick<
  ControllerBuildArgs,
  | 'activeTab'
  | 'activeSettingsSection'
  | 'focusedComandaId'
  | 'pdvView'
  | 'pendingAction'
  | 'screenError'
  | 'setActiveTab'
  | 'setActiveSettingsSection'
  | 'setFocusedComandaId'
  | 'setPdvView'
  | 'setPendingAction'
  | 'setScreenError'
>) {
  return {
    activeSettingsSection,
    activeTab,
    focusedComandaId,
    pdvView,
    pendingAction,
    screenError,
    setActiveTab,
    setActiveSettingsSection,
    setFocusedComandaId,
    setPdvView,
    setPendingAction,
    setScreenError,
  }
}

export function buildOwnerMobileShellControllerValue(args: ControllerBuildArgs) {
  return {
    ...args.metrics,
    ...args.mutations,
    ...args.queries,
    ...args.realtime,
    ...buildControllerState(args),
    ...buildControllerVisuals(args),
    handleSubmit: args.handleSubmit,
    isBusy:
      args.mutations.openComandaMutation.isPending ||
      args.mutations.addComandaItemMutation.isPending ||
      args.mutations.addComandaItemsMutation.isPending ||
      args.mutations.replaceComandaMutation.isPending ||
      args.mutations.updateComandaStatusMutation.isPending ||
      args.mutations.closeComandaMutation.isPending ||
      args.mutations.createComandaPaymentMutation.isPending ||
      args.mutations.openCashSessionMutation.isPending,
    router: args.router,
    navigateSettingsSection: args.navigateSettingsSection,
  }
}
