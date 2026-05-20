import type { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'

export type PdvEnvironmentVariant = 'grid' | 'comandas' | 'kds' | 'cobranca'

export type PdvOperationalMetric = {
  label: string
  value: string
  caption: string
  muted?: boolean
}

type PdvOperationalMetricInput = Readonly<{
  activeProductsCount: number
  freeTables: number
  hasMesaRegistry: boolean
  inPreparationItems: number
  kitchenItemsCount: number
  lowStockProductsCount: number
  occupiedTables: number
  openComandasCount: number
  readyKitchenItems: number
  totalEmAberto: number
  variant: PdvEnvironmentVariant
}>

export function buildPdvOperationalMetrics({
  activeProductsCount,
  freeTables,
  hasMesaRegistry,
  inPreparationItems,
  kitchenItemsCount,
  lowStockProductsCount,
  occupiedTables,
  openComandasCount,
  readyKitchenItems,
  totalEmAberto,
  variant,
}: PdvOperationalMetricInput): PdvOperationalMetric[] {
  if (variant === 'kds') {
    return buildKdsMetrics({ inPreparationItems, kitchenItemsCount, openComandasCount, readyKitchenItems })
  }

  if (variant === 'cobranca') {
    return buildCobrancaMetrics({
      freeTables,
      hasMesaRegistry,
      kitchenItemsCount,
      occupiedTables,
      openComandasCount,
      totalEmAberto,
    })
  }

  return buildDefaultPdvMetrics({
    activeProductsCount,
    freeTables,
    hasMesaRegistry,
    kitchenItemsCount,
    lowStockProductsCount,
    occupiedTables,
    openComandasCount,
    totalEmAberto,
    variant,
  })
}

function buildKdsMetrics({
  inPreparationItems,
  kitchenItemsCount,
  openComandasCount,
  readyKitchenItems,
}: Pick<
  PdvOperationalMetricInput,
  'inPreparationItems' | 'kitchenItemsCount' | 'openComandasCount' | 'readyKitchenItems'
>): PdvOperationalMetric[] {
  return [
    {
      label: 'tickets na fila',
      value: String(kitchenItemsCount),
      caption: 'pedidos aguardando cozinha',
      muted: kitchenItemsCount === 0,
    },
    {
      label: 'em preparo',
      value: String(inPreparationItems),
      caption: 'itens já em execução',
      muted: inPreparationItems === 0,
    },
    {
      label: 'prontos',
      value: String(readyKitchenItems),
      caption: 'aguardando retirada',
      muted: readyKitchenItems === 0,
    },
    {
      label: 'comandas abertas',
      value: String(openComandasCount),
      caption: 'base ativa da operação',
      muted: openComandasCount === 0,
    },
  ]
}

function buildCobrancaMetrics({
  freeTables,
  hasMesaRegistry,
  kitchenItemsCount,
  occupiedTables,
  openComandasCount,
  totalEmAberto,
}: Pick<
  PdvOperationalMetricInput,
  'freeTables' | 'hasMesaRegistry' | 'kitchenItemsCount' | 'occupiedTables' | 'openComandasCount' | 'totalEmAberto'
>): PdvOperationalMetric[] {
  return [
    {
      label: 'comandas abertas',
      value: String(openComandasCount),
      caption: 'contas ainda em andamento',
      muted: openComandasCount === 0,
    },
    {
      label: 'em aberto',
      value: formatCurrency(totalEmAberto, 'BRL'),
      caption: 'valor ainda não liquidado',
      muted: totalEmAberto === 0,
    },
    {
      label: 'mesas ocupadas',
      value: String(occupiedTables),
      caption: buildMesaOccupancyCaption({ freeTables, hasMesaRegistry, occupiedTables }),
      muted: occupiedTables === 0,
    },
    {
      label: 'fila cozinha',
      value: String(kitchenItemsCount),
      caption: 'acompanhe atrasos antes de cobrar',
      muted: kitchenItemsCount === 0,
    },
  ]
}

function buildDefaultPdvMetrics({
  activeProductsCount,
  freeTables,
  hasMesaRegistry,
  kitchenItemsCount,
  lowStockProductsCount,
  occupiedTables,
  openComandasCount,
  totalEmAberto,
  variant,
}: Pick<
  PdvOperationalMetricInput,
  | 'activeProductsCount'
  | 'freeTables'
  | 'hasMesaRegistry'
  | 'kitchenItemsCount'
  | 'lowStockProductsCount'
  | 'occupiedTables'
  | 'openComandasCount'
  | 'totalEmAberto'
  | 'variant'
>): PdvOperationalMetric[] {
  return [
    {
      label: 'comandas abertas',
      value: String(openComandasCount),
      caption: 'pedidos em serviço neste momento',
      muted: openComandasCount === 0,
    },
    {
      label: 'em aberto',
      value: formatCurrency(totalEmAberto, 'BRL'),
      caption: 'valor vivo da operação',
      muted: totalEmAberto === 0,
    },
    {
      label: 'mesas ocupadas',
      value: String(occupiedTables),
      caption: buildMesaOccupancyCaption({ freeTables, hasMesaRegistry, occupiedTables }),
      muted: occupiedTables === 0,
    },
    {
      label: variant === 'grid' ? 'produtos ativos' : 'fila cozinha',
      value: variant === 'grid' ? String(activeProductsCount) : String(kitchenItemsCount),
      caption: variant === 'grid' ? `${lowStockProductsCount} com estoque baixo` : 'tickets aguardando preparo',
      muted: variant === 'grid' ? activeProductsCount === 0 : kitchenItemsCount === 0,
    },
  ]
}

function buildMesaOccupancyCaption({
  freeTables,
  hasMesaRegistry,
  occupiedTables,
}: {
  freeTables: number
  hasMesaRegistry: boolean
  occupiedTables: number
}) {
  if (!hasMesaRegistry) {
    return occupiedTables > 0 ? 'sem mapa de mesas ativas' : 'cadastre mesas para visão de ocupação'
  }

  return `${freeTables} livres agora`
}

export function formatOperationalClock(timestamp: number) {
  if (!timestamp) {
    return 'agora'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

export function resolvePdvAccessMessage(error: ApiError | null) {
  if (!error) {
    return 'Faça login para abrir o PDV.'
  }

  if (error.status === 0) {
    return 'O PDV não carregou porque a API local não respondeu. Verifique se o backend está ativo em http://localhost:4000.'
  }

  if (error.status === 401) {
    return 'Sua sessão expirou. Entre novamente para abrir o PDV.'
  }

  return `Não foi possível abrir o PDV agora. ${error.message}`
}
