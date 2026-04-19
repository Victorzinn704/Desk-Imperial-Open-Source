import type {
  DashboardSectionId,
  DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'

export type DesignLabSectionId =
  | 'overview'
  | 'pdv'
  | 'salao'
  | 'pedidos'
  | 'caixa'
  | 'cozinha'
  | 'financeiro'
  | 'calendario'
  | 'portfolio'
  | 'equipe'
  | 'payroll'
  | 'ia'
  | 'config'

export type DesignLabPdvTabId = 'grid' | 'comandas' | 'kds' | 'cobranca'
export type DesignLabPedidosTabId = 'tabela' | 'timeline' | 'kanban' | 'detalhe' | 'historico'
export type DesignLabFinanceiroTabId = 'movimentacao' | 'fluxo' | 'dre' | 'contas' | 'mapa'

type DesignLabTabDefinition<TTab extends string> = {
  id: TTab
  label: string
  description: string
}

const DESIGN_LAB_SECTION_PATHS: Record<DesignLabSectionId, string> = {
  overview: '/design-lab/overview',
  pdv: '/design-lab/pdv',
  salao: '/design-lab/salao',
  pedidos: '/design-lab/pedidos',
  caixa: '/design-lab/caixa',
  cozinha: '/design-lab/cozinha',
  financeiro: '/design-lab/financeiro',
  calendario: '/design-lab/calendario',
  portfolio: '/design-lab/portfolio',
  equipe: '/design-lab/equipe',
  payroll: '/design-lab/payroll',
  ia: '/design-lab/ia',
  config: '/design-lab/config',
}

export const designLabPdvTabs: ReadonlyArray<DesignLabTabDefinition<DesignLabPdvTabId>> = [
  {
    id: 'grid',
    label: 'Grid de venda',
    description: 'Catálogo e comanda em uma única superfície operacional.',
  },
  {
    id: 'comandas',
    label: 'Comandas abertas',
    description: 'Leitura rápida das mesas e balcão em andamento.',
  },
  {
    id: 'kds',
    label: 'Cozinha / KDS',
    description: 'Fila de preparo e tickets em andamento.',
  },
  {
    id: 'cobranca',
    label: 'Cobrança',
    description: 'Fechamento concentrado em uma comanda por vez.',
  },
]

export const designLabPedidosTabs: ReadonlyArray<DesignLabTabDefinition<DesignLabPedidosTabId>> = [
  {
    id: 'tabela',
    label: 'Tabela',
    description: 'Auditoria densa com filtros e totais.',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Sequência cronológica dos pedidos registrados.',
  },
  {
    id: 'kanban',
    label: 'Kanban',
    description: 'Leitura de status por coluna operacional.',
  },
  {
    id: 'detalhe',
    label: 'Detalhe',
    description: 'Deep dive no pedido mais recente.',
  },
  {
    id: 'historico',
    label: 'Histórico',
    description: 'Hub consolidado de leitura operacional e auditoria.',
  },
]

export const designLabFinanceiroTabs: ReadonlyArray<DesignLabTabDefinition<DesignLabFinanceiroTabId>> = [
  {
    id: 'movimentacao',
    label: 'Movimentação',
    description: 'Receita, lucro e lançamentos do período.',
  },
  {
    id: 'fluxo',
    label: 'Fluxo de caixa',
    description: 'Entradas, saídas e ritmo do caixa.',
  },
  {
    id: 'dre',
    label: 'DRE',
    description: 'Resultado resumido do negócio.',
  },
  {
    id: 'contas',
    label: 'Contas',
    description: 'Acompanhamento de recebimento e base financeira.',
  },
  {
    id: 'mapa',
    label: 'Mapa territorial',
    description: 'Leitura geográfica das vendas e concentração.',
  },
]

export function buildDesignLabHref(
  sectionId: DesignLabSectionId,
  params?: Record<string, string | null | undefined>,
) {
  const pathname = DESIGN_LAB_SECTION_PATHS[sectionId]
  const nextParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      nextParams.set(key, value)
    }
  }

  const query = nextParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function buildDesignLabConfigHref(tab: DashboardSettingsSectionId = 'account') {
  return buildDesignLabHref('config', { tab })
}

export function buildDesignLabPedidosHref(tab: DesignLabPedidosTabId = 'tabela') {
  return buildDesignLabHref('pedidos', { tab })
}

export function buildDesignLabFinanceiroHref(tab: DesignLabFinanceiroTabId = 'movimentacao') {
  return buildDesignLabHref('financeiro', { tab })
}

export function buildDesignLabPdvHref({
  comandaId,
  mesaId,
  mesaLabel,
  tab = 'grid',
}: Readonly<{
  comandaId?: string
  mesaId?: string
  mesaLabel?: string
  tab?: DesignLabPdvTabId
}>) {
  return buildDesignLabHref('pdv', {
    tab,
    comanda: comandaId,
    mesaId,
    mesaLabel,
  })
}

export function mapDashboardSectionToDesignLabHref(sectionId: DashboardSectionId) {
  switch (sectionId) {
    case 'overview':
      return buildDesignLabHref('overview')
    case 'pdv':
      return buildDesignLabHref('pdv')
    case 'salao':
      return buildDesignLabHref('salao')
    case 'pedidos':
      return buildDesignLabPedidosHref('historico')
    case 'financeiro':
      return buildDesignLabFinanceiroHref('movimentacao')
    case 'equipe':
      return buildDesignLabHref('equipe')
    case 'portfolio':
      return buildDesignLabHref('portfolio')
    case 'calendario':
      return buildDesignLabHref('calendario')
    case 'map':
      return buildDesignLabFinanceiroHref('mapa')
    case 'payroll':
      return buildDesignLabHref('payroll')
    case 'settings':
      return buildDesignLabConfigHref('account')
    case 'sales':
    default:
      return buildDesignLabHref('overview')
  }
}

export function parseDesignLabPdvTab(value: string | null | undefined): DesignLabPdvTabId {
  return designLabPdvTabs.some((tab) => tab.id === value) ? (value as DesignLabPdvTabId) : 'grid'
}

export function parseDesignLabPedidosTab(value: string | null | undefined): DesignLabPedidosTabId {
  return designLabPedidosTabs.some((tab) => tab.id === value) ? (value as DesignLabPedidosTabId) : 'tabela'
}

export function parseDesignLabFinanceiroTab(value: string | null | undefined): DesignLabFinanceiroTabId {
  return designLabFinanceiroTabs.some((tab) => tab.id === value) ? (value as DesignLabFinanceiroTabId) : 'movimentacao'
}
