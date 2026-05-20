import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import type { PedidosView, PedidosViewCopy } from './pedidos-environment.types'
export { buildPedidosHeaderStats } from './pedidos-environment-header-stats'
export { buildPedidosMetaItems } from './pedidos-environment-meta-items'

export const viewCopy: Record<PedidosView, PedidosViewCopy> = {
  tabela: {
    eyebrow: 'Tabela com filtros',
    title: 'Pedidos do periodo',
    description: 'Histórico, status e receita.',
  },
  timeline: {
    eyebrow: 'Linha do tempo',
    title: 'Sequencia de eventos',
    description: 'Ritmo e sequência operacional.',
  },
  kanban: {
    eyebrow: 'Kanban por status',
    title: 'Status dos pedidos',
    description: 'Concluídos, cancelados e pendências.',
  },
  detalhe: {
    eyebrow: 'Detalhe do pedido',
    title: 'Pedido selecionado',
    description: 'Itens, cliente e valores.',
  },
  historico: {
    eyebrow: 'Historico consolidado',
    title: 'Auditoria operacional',
    description: 'Leitura diaria de pedidos, operadores, canais e ocorrencias.',
  },
}

export function resolvePedidosView(activeTab: DashboardTabId | 'historico' | null): PedidosView {
  if (activeTab === 'timeline' || activeTab === 'kanban' || activeTab === 'detalhe' || activeTab === 'historico') {
    return activeTab
  }

  return 'tabela'
}
