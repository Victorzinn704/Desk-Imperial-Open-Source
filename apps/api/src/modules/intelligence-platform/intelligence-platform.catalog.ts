import type { AuthContext } from '../auth/auth.types'
import type { IntelligenceToolDefinition } from './intelligence-platform.types'

const TOOL_CATALOG: IntelligenceToolDefinition[] = [
  {
    id: 'sales.summary.today',
    title: 'Vendas de hoje',
    ownerModule: 'finance',
    kind: 'read',
    description: 'Resumo operacional de receita, pedidos e ticket do dia.',
    allowedRoles: ['OWNER', 'STAFF'],
    channels: ['WEB', 'PWA', 'TELEGRAM'],
    requiresStepUp: false,
  },
  {
    id: 'finance.summary.period',
    title: 'Financeiro por periodo',
    ownerModule: 'finance',
    kind: 'read',
    description: 'Consolida receita, lucro e margem no periodo filtrado.',
    allowedRoles: ['OWNER'],
    channels: ['WEB', 'PWA', 'TELEGRAM'],
    requiresStepUp: false,
  },
  {
    id: 'inventory.low-stock.list',
    title: 'Estoque baixo',
    ownerModule: 'products',
    kind: 'read',
    description: 'Lista itens com pressao de reposicao e leitura de risco.',
    allowedRoles: ['OWNER'],
    channels: ['WEB', 'PWA', 'TELEGRAM'],
    requiresStepUp: false,
  },
  {
    id: 'operations.comandas.open',
    title: 'Comandas abertas',
    ownerModule: 'operations',
    kind: 'read',
    description: 'Resumo vivo de comandas abertas por mesa, canal e operador.',
    allowedRoles: ['OWNER', 'STAFF'],
    channels: ['WEB', 'PWA'],
    requiresStepUp: false,
  },
  {
    id: 'employees.performance.ranking',
    title: 'Ranking da equipe',
    ownerModule: 'employees',
    kind: 'read',
    description: 'Leitura de desempenho por colaborador com foco em vendas.',
    allowedRoles: ['OWNER'],
    channels: ['WEB', 'PWA', 'TELEGRAM'],
    requiresStepUp: false,
  },
  {
    id: 'cash.close.request',
    title: 'Solicitar fechamento de caixa',
    ownerModule: 'operations',
    kind: 'action',
    description: 'Dispara fluxo controlado de fechamento de caixa com step-up auth.',
    allowedRoles: ['OWNER'],
    channels: ['WEB', 'PWA', 'TELEGRAM'],
    requiresStepUp: true,
  },
]

export function resolveIntelligenceToolsForRole(role: AuthContext['role']) {
  return TOOL_CATALOG.filter((tool) => tool.allowedRoles.includes(role))
}
