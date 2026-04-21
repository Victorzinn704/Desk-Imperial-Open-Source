import type {
  DashboardSectionId,
  DashboardTabId,
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
  | 'cadastro-rapido'
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
  emoji?: string
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
  'cadastro-rapido': '/design-lab/cadastro-rapido',
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
    emoji: '📋',
    label: 'Tabela',
    description: 'Auditoria densa com filtros e totais.',
  },
  {
    id: 'timeline',
    emoji: '🕒',
    label: 'Timeline',
    description: 'Sequência cronológica dos pedidos registrados.',
  },
  {
    id: 'kanban',
    emoji: '🧱',
    label: 'Kanban',
    description: 'Leitura de status por coluna operacional.',
  },
  {
    id: 'detalhe',
    emoji: '🔎',
    label: 'Detalhe',
    description: 'Deep dive no pedido mais recente.',
  },
  {
    id: 'historico',
    emoji: '🧾',
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

export function mapDashboardLocationToDesignLabHref({
  sectionId,
  settingsSectionId = 'account',
  tabId,
}: Readonly<{
  sectionId: DashboardSectionId
  settingsSectionId?: DashboardSettingsSectionId
  tabId?: DashboardTabId | null
}>) {
  switch (sectionId) {
    case 'settings':
      return buildDesignLabConfigHref(settingsSectionId)
    case 'pdv':
      return buildDesignLabPdvHref({
        tab:
          tabId === 'comandas' || tabId === 'kds' || tabId === 'cobranca'
            ? tabId
            : 'grid',
      })
    case 'salao':
      return buildDesignLabHref('salao', {
        tab:
          tabId === 'planta'
            ? 'planta'
            : tabId === 'permanencia'
              ? 'comandas'
              : tabId === 'padroes'
                ? 'configuracao'
                : 'operacional',
      })
    case 'financeiro':
      return buildDesignLabFinanceiroHref(
        tabId === 'fluxo' || tabId === 'dre' || tabId === 'contas' ? tabId : 'movimentacao',
      )
    case 'pedidos':
      return buildDesignLabPedidosHref(
        tabId === 'timeline' || tabId === 'kanban' || tabId === 'detalhe' ? tabId : 'tabela',
      )
    case 'equipe':
      if (tabId === 'folha') {
        return buildDesignLabHref('payroll')
      }
      if (tabId === 'escala') {
        return buildDesignLabHref('calendario')
      }
      return buildDesignLabHref('equipe')
    case 'portfolio':
      return buildDesignLabHref('portfolio')
    case 'calendario':
      return buildDesignLabHref('calendario')
    case 'map':
      return buildDesignLabFinanceiroHref('mapa')
    case 'payroll':
      return buildDesignLabHref('payroll')
    case 'sales':
    case 'overview':
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
