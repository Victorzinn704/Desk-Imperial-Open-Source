import type { OperationsLiveResponse } from '@contracts/contracts'

function collectComandas(snapshot: OperationsLiveResponse | null | undefined) {
  if (!snapshot) {
    return []
  }

  return [...snapshot.employees, snapshot.unassigned].flatMap((group) => group.comandas)
}

function collectOpenComandas(snapshot: OperationsLiveResponse | null | undefined) {
  return collectComandas(snapshot).filter((comanda) => comanda.status !== 'CLOSED' && comanda.status !== 'CANCELLED')
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

export function buildOperationsExecutiveKpis(
  snapshot: OperationsLiveResponse | null | undefined,
): OperationsExecutiveKpis {
  const closure = snapshot?.closure ?? null
  const openComandas = collectOpenComandas(snapshot)
  const faturamentoAberto = openComandas.reduce((sum, comanda) => sum + comanda.totalAmount, 0)
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
    ? (snapshot.employees.find((employee) => employee.employeeId === performerId) ?? null)
    : snapshot.unassigned

  if (!group) {
    return emptyPerformerKpis()
  }

  const receitaRealizada = group.comandas
    .filter((comanda) => comanda.status === 'CLOSED')
    .reduce((sum, comanda) => sum + comanda.totalAmount, 0)
  const openComandas = group.comandas.filter((comanda) => comanda.status !== 'CLOSED' && comanda.status !== 'CANCELLED')
  const faturamentoAberto = openComandas.reduce((sum, comanda) => sum + comanda.totalAmount, 0)

  return {
    receitaRealizada,
    receitaEsperada: receitaRealizada + faturamentoAberto,
    openComandasCount: openComandas.length,
  }
}

export function buildKitchenQueueCount(snapshot: OperationsLiveResponse | null | undefined) {
  if (!snapshot) {
    return 0
  }

  let count = 0
  for (const group of [...snapshot.employees, snapshot.unassigned]) {
    for (const comanda of group.comandas) {
      if (comanda.status === 'CLOSED' || comanda.status === 'CANCELLED') {continue}
      for (const item of comanda.items) {
        if (item.kitchenStatus === 'QUEUED' || item.kitchenStatus === 'IN_PREPARATION') {
          count += 1
        }
      }
    }
  }

  return count
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
  for (const employee of snapshot.employees) {
    if (!employee.employeeId) {continue}

    let valor = 0
    let comandas = 0
    for (const comanda of employee.comandas) {
      valor += comanda.totalAmount
      comandas += 1
    }

    if (valor > 0 || comandas > 0) {
      map.set(employee.employeeId, { nome: employee.displayName, valor, comandas })
    }
  }

  const ownerValor = snapshot.unassigned.comandas.reduce((sum, comanda) => sum + comanda.totalAmount, 0)
  const ownerComandas = snapshot.unassigned.comandas.length
  if (ownerValor > 0 || ownerComandas > 0) {
    map.set('owner', { nome: ownerDisplayName, valor: ownerValor, comandas: ownerComandas })
  }

  return [...map.values()].sort((left, right) => right.valor - left.valor).slice(0, 5)
}

export function buildTopProducts(snapshot: OperationsLiveResponse | null | undefined): OperationsTopProductEntry[] {
  if (!snapshot) {
    return []
  }

  const map = new Map<string, OperationsTopProductEntry>()
  for (const group of [...snapshot.employees, snapshot.unassigned]) {
    for (const comanda of group.comandas) {
      for (const item of comanda.items) {
        const current = map.get(item.productName) ?? { nome: item.productName, qtd: 0, valor: 0 }
        current.qtd += item.quantity
        current.valor += item.quantity * item.unitPrice
        map.set(item.productName, current)
      }
    }
  }

  return [...map.values()].sort((left, right) => right.valor - left.valor).slice(0, 5)
}
