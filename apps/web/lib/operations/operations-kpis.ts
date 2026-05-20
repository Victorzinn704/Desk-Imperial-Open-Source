import type { OperationsLiveResponse } from '@contracts/contracts'

type OperationGroup = OperationsLiveResponse['employees'][number]
type OperationComanda = OperationGroup['comandas'][number]
type OperationItem = OperationComanda['items'][number]

const CLOSED_COMANDA_STATUSES = new Set(['CLOSED', 'CANCELLED'])
const KITCHEN_PENDING_STATUSES = new Set(['QUEUED', 'IN_PREPARATION'])
const TOP_LIST_LIMIT = 5

function collectOperationGroups(snapshot: OperationsLiveResponse | null | undefined) {
  if (!snapshot) {
    return []
  }

  const employeeGroups = Array.isArray(snapshot.employees) ? snapshot.employees : []
  const unassignedGroups = snapshot.unassigned ? [snapshot.unassigned] : []

  return [...employeeGroups, ...unassignedGroups]
}

function collectComandas(snapshot: OperationsLiveResponse | null | undefined): OperationComanda[] {
  if (!snapshot) {
    return []
  }

  return collectOperationGroups(snapshot).flatMap((group) => group.comandas)
}

function collectOpenComandas(snapshot: OperationsLiveResponse | null | undefined) {
  return collectComandas(snapshot).filter(isOpenComanda)
}

function collectItems(snapshot: OperationsLiveResponse | null | undefined): OperationItem[] {
  return collectComandas(snapshot).flatMap((comanda) => comanda.items)
}

function isOpenComanda(comanda: OperationComanda) {
  return !CLOSED_COMANDA_STATUSES.has(comanda.status)
}

function isClosedComanda(comanda: OperationComanda) {
  return comanda.status === 'CLOSED'
}

function isKitchenPendingItem(item: OperationItem) {
  return KITCHEN_PENDING_STATUSES.has(item.kitchenStatus ?? '')
}

function sumComandaTotals(comandas: OperationComanda[]) {
  return comandas.reduce((sum, comanda) => sum + comanda.totalAmount, 0)
}

function summarizeComandas(comandas: OperationComanda[]) {
  const openComandas = comandas.filter(isOpenComanda)
  const receitaRealizada = sumComandaTotals(comandas.filter(isClosedComanda))
  const faturamentoAberto = sumComandaTotals(openComandas)

  return {
    receitaRealizada,
    faturamentoAberto,
    receitaEsperada: receitaRealizada + faturamentoAberto,
    openComandasCount: openComandas.length,
  }
}

function buildRankingEntryFromGroup(group: OperationGroup): [string, OperationsPerformerRankingEntry] | null {
  if (!group.employeeId) {
    return null
  }

  const valor = sumComandaTotals(group.comandas)
  const comandas = group.comandas.length
  if (valor <= 0 && comandas <= 0) {
    return null
  }

  return [group.employeeId, { nome: group.displayName, valor, comandas }]
}

function emptyPerformerKpis(): OperationPerformerKpis {
  return {
    receitaRealizada: 0,
    receitaEsperada: 0,
    openComandasCount: 0,
  }
}

export type OperationsPerformerRankingEntry = {
  nome: string
  valor: number
  comandas: number
}

export type OperationsTopProductEntry = {
  nome: string
  qtd: number
  valor: number
}

export type OperationsExecutiveKpis = {
  receitaRealizada: number
  faturamentoAberto: number
  projecaoTotal: number
  lucroRealizado: number
  lucroEsperado: number
  caixaEsperado: number
  openComandasCount: number
  openSessionsCount: number
}

export type OperationPerformerKpis = {
  receitaRealizada: number
  receitaEsperada: number
  openComandasCount: number
}

export type OperationPerformerStanding = {
  position: number | null
  totalPerformers: number
  leaderName: string | null
  leaderValue: number
  performerValue: number
  deltaToLeader: number
}

export function buildOperationsExecutiveKpis(
  snapshot: OperationsLiveResponse | null | undefined,
): OperationsExecutiveKpis {
  const closure = snapshot?.closure ?? null
  const openComandas = collectOpenComandas(snapshot)
  const faturamentoAberto = sumComandaTotals(openComandas)
  const receitaRealizada = closure?.grossRevenueAmount ?? 0
  const lucroRealizado = closure?.realizedProfitAmount ?? 0

  return {
    receitaRealizada,
    faturamentoAberto,
    projecaoTotal: receitaRealizada + faturamentoAberto,
    lucroRealizado,
    // O snapshot atual nao carrega custo aberto por item; esta leitura segue
    // provisoria ate expormos custo operacional detalhado no contrato.
    lucroEsperado: lucroRealizado + faturamentoAberto,
    caixaEsperado: closure?.expectedCashAmount ?? 0,
    openComandasCount: closure?.openComandasCount ?? openComandas.length,
    openSessionsCount: closure?.openSessionsCount ?? 0,
  }
}

export function buildPerformerKpis(snapshot: OperationsLiveResponse | null | undefined, performerId?: string | null) {
  if (!snapshot) {
    return emptyPerformerKpis()
  }

  const group = performerId
    ? (collectOperationGroups(snapshot).find((employee) => employee.employeeId === performerId) ?? null)
    : snapshot.unassigned

  if (!group) {
    return emptyPerformerKpis()
  }

  const summary = summarizeComandas(group.comandas)

  return {
    receitaRealizada: summary.receitaRealizada,
    receitaEsperada: summary.receitaEsperada,
    openComandasCount: summary.openComandasCount,
  }
}

export function buildPerformerStanding(
  snapshot: OperationsLiveResponse | null | undefined,
  performerId?: string | null,
): OperationPerformerStanding {
  if (!(snapshot && performerId)) {
    return {
      position: null,
      totalPerformers: 0,
      leaderName: null,
      leaderValue: 0,
      performerValue: 0,
      deltaToLeader: 0,
    }
  }

  const ranking = collectOperationGroups(snapshot)
    .map((employee) => {
      const performerValue = sumComandaTotals(employee.comandas)
      return {
        employeeId: employee.employeeId,
        nome: employee.displayName,
        valor: performerValue,
      }
    })
    .filter((employee) => employee.employeeId)
    .sort((left, right) => right.valor - left.valor)

  const currentIndex = ranking.findIndex((entry) => entry.employeeId === performerId)
  const current = currentIndex >= 0 ? ranking[currentIndex] : null
  const leader = ranking[0] ?? null

  return {
    position: currentIndex >= 0 ? currentIndex + 1 : null,
    totalPerformers: ranking.length,
    leaderName: leader?.nome ?? null,
    leaderValue: leader?.valor ?? 0,
    performerValue: current?.valor ?? 0,
    deltaToLeader: current && leader ? Math.max(0, leader.valor - current.valor) : 0,
  }
}

export function buildKitchenQueueCount(snapshot: OperationsLiveResponse | null | undefined) {
  return collectOpenComandas(snapshot)
    .flatMap((comanda) => comanda.items)
    .filter(isKitchenPendingItem).length
}

export function countKitchenPendingItems(snapshot: OperationsLiveResponse | null | undefined) {
  return buildKitchenQueueCount(snapshot)
}

export function buildPerformerRanking(
  snapshot: OperationsLiveResponse | null | undefined,
  ownerDisplayName: string,
): OperationsPerformerRankingEntry[] {
  if (!snapshot) {
    return []
  }

  const map = new Map<string, OperationsPerformerRankingEntry>()
  for (const employee of collectOperationGroups(snapshot)) {
    const entry = buildRankingEntryFromGroup(employee)
    if (entry) {
      map.set(...entry)
    }
  }

  const ownerValor = sumComandaTotals(snapshot.unassigned?.comandas ?? [])
  const ownerComandas = snapshot.unassigned?.comandas.length ?? 0
  if (ownerValor > 0 || ownerComandas > 0) {
    map.set('owner', { nome: ownerDisplayName, valor: ownerValor, comandas: ownerComandas })
  }

  return [...map.values()].sort((left, right) => right.valor - left.valor).slice(0, TOP_LIST_LIMIT)
}

export function buildTopProducts(snapshot: OperationsLiveResponse | null | undefined): OperationsTopProductEntry[] {
  if (!snapshot) {
    return []
  }

  const map = new Map<string, OperationsTopProductEntry>()
  for (const item of collectItems(snapshot)) {
    const current = map.get(item.productName) ?? { nome: item.productName, qtd: 0, valor: 0 }
    current.qtd += item.quantity
    current.valor += item.quantity * item.unitPrice
    map.set(item.productName, current)
  }

  return [...map.values()].sort((left, right) => right.valor - left.valor).slice(0, TOP_LIST_LIMIT)
}
