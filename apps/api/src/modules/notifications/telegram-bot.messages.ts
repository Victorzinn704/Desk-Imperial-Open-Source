import {
  boldTelegram,
  bulletLine,
  codeTelegram,
  formatTelegramCurrency,
  formatTelegramPercent,
  metricLine,
} from './telegram-message-format'

type TelegramCurrency = 'BRL' | 'USD' | 'EUR'

type TelegramRole = 'OWNER' | 'STAFF'

export function buildTelegramHelpMessage(role: TelegramRole) {
  const common = ['/ajuda', '/menu', '/vendas', '/status', '/portal', '/desvincular']
  const ownerExtras = role === 'OWNER' ? ['/caixa', '/relatorio', '/equipe', '/alertas'] : ['/alertas']

  return [
    '👋 Desk Imperial no Telegram',
    '',
    boldTelegram('Central operacional'),
    'Use os cards abaixo para navegar sem decorar comandos.',
    '',
    boldTelegram('Comandos disponíveis'),
    ...common.map((command) => `• ${codeTelegram(command)}`),
    ...ownerExtras.map((command) => `• ${codeTelegram(command)}`),
  ].join('\n')
}

export function buildTelegramStatusMessage(input: {
  botUsername: string | null
  companyName?: string | null
  enabledChannels: string[]
  fullName: string
  role: TelegramRole
}) {
  return [
    '🧭 Status do seu acesso',
    '',
    metricLine('🏢', 'Empresa', input.companyName?.trim() || 'Workspace principal'),
    metricLine('🪪', 'Perfil', input.role === 'OWNER' ? 'Dono' : 'Operação / staff'),
    metricLine('👤', 'Usuário', input.fullName),
    metricLine('🤖', 'Canal do bot', `@${input.botUsername ?? 'Desk_Imperial_bot'}`),
    metricLine('📡', 'Canais ativos', input.enabledChannels.length ? input.enabledChannels.join(', ') : 'nenhum'),
  ].join('\n')
}

export function buildTelegramPortalMessage(portalUrl: string | null) {
  return [
    '🌐 Portal do Desk Imperial',
    '',
    portalUrl ? codeTelegram(portalUrl) : 'O link público do portal ainda não foi configurado neste ambiente.',
    '',
    'Use o portal para ajustar preferências, vínculo do Telegram e governança operacional.',
  ].join('\n')
}

export function buildTelegramVendasMessage(input: {
  currency: TelegramCurrency
  summary: {
    kpis: {
      receitaRealizada: number
      faturamentoAberto: number
      projecaoTotal: number
      openComandasCount: number
    }
    topProducts: Array<{ nome: string }>
  }
}) {
  const leadingProduct = input.summary.topProducts[0]

  return [
    '📊 Vendas de hoje',
    '',
    boldTelegram('Resumo operacional'),
    metricLine('✅', 'Receita realizada', formatTelegramCurrency(input.summary.kpis.receitaRealizada, input.currency)),
    metricLine(
      '🟡',
      'Faturamento aberto',
      formatTelegramCurrency(input.summary.kpis.faturamentoAberto, input.currency),
    ),
    metricLine('📌', 'Projeção total', formatTelegramCurrency(input.summary.kpis.projecaoTotal, input.currency)),
    metricLine('🧾', 'Comandas abertas', input.summary.kpis.openComandasCount),
    leadingProduct
      ? metricLine('🏆', 'Produto líder', leadingProduct.nome)
      : bulletLine('🏆', 'Produto líder: sem dados'),
  ].join('\n')
}

export function buildTelegramCaixaMessage(input: {
  closure:
    | {
        openComandasCount?: number
        expectedCashAmount?: number
        grossRevenueAmount?: number
        realizedProfitAmount?: number
      }
    | null
    | undefined
  currency: TelegramCurrency
  openSessionsCount: number
}) {
  return [
    '💰 Caixa do dia',
    '',
    boldTelegram('Leitura do caixa operacional'),
    metricLine('🟢', 'Sessões abertas', input.openSessionsCount),
    metricLine('🧾', 'Comandas abertas', input.closure?.openComandasCount ?? 0),
    metricLine('💵', 'Caixa esperado', formatTelegramCurrency(input.closure?.expectedCashAmount ?? 0, input.currency)),
    metricLine('📥', 'Receita bruta', formatTelegramCurrency(input.closure?.grossRevenueAmount ?? 0, input.currency)),
    metricLine(
      '📈',
      'Lucro realizado',
      formatTelegramCurrency(input.closure?.realizedProfitAmount ?? 0, input.currency),
    ),
  ].join('\n')
}

export function buildTelegramRelatorioMessage(input: {
  finance: {
    categoryBreakdown: Array<{ category: string }>
    displayCurrency: TelegramCurrency
    salesCategoryBreakdown?: Array<{ category: string }> | undefined
    topProducts: Array<{ name: string }>
    totals: {
      averageMarginPercent: number
      completedOrders: number
      currentMonthProfit: number
      currentMonthRevenue: number
    }
  }
}) {
  const topCategory = input.finance.salesCategoryBreakdown?.[0] ?? input.finance.categoryBreakdown[0]
  const topProduct = input.finance.topProducts[0]

  return [
    '📈 Relatório financeiro',
    '',
    boldTelegram('Mês atual'),
    metricLine(
      '💳',
      'Receita',
      formatTelegramCurrency(input.finance.totals.currentMonthRevenue, input.finance.displayCurrency),
    ),
    metricLine(
      '💹',
      'Lucro',
      formatTelegramCurrency(input.finance.totals.currentMonthProfit, input.finance.displayCurrency),
    ),
    metricLine('📊', 'Margem média', formatTelegramPercent(input.finance.totals.averageMarginPercent)),
    metricLine('📦', 'Pedidos concluídos', input.finance.totals.completedOrders),
    topCategory
      ? metricLine('🏷️', 'Categoria líder', topCategory.category)
      : bulletLine('🏷️', 'Categoria líder: sem dados'),
    topProduct ? metricLine('🏆', 'Produto líder', topProduct.name) : bulletLine('🏆', 'Produto líder: sem dados'),
  ].join('\n')
}

export function buildTelegramEquipeMessage(input: {
  employees: {
    items: Array<{ active: boolean; displayName: string; employeeCode: string }>
    totals: { activeEmployees: number; totalEmployees: number }
  }
}) {
  const activePreview = input.employees.items
    .filter((employee) => employee.active)
    .slice(0, 8)
    .map((employee) => bulletLine('•', `${employee.displayName} (${employee.employeeCode})`))

  return [
    '👥 Equipe ativa',
    '',
    metricLine('🧑‍🍳', 'Total de funcionários', input.employees.totals.totalEmployees),
    metricLine('🟢', 'Ativos', input.employees.totals.activeEmployees),
    '',
    boldTelegram('Pessoas em operação'),
    ...(activePreview.length ? activePreview : ['Nenhum funcionário ativo no momento.']),
  ].join('\n')
}

export function buildTelegramAlertasMessage(deliveryChannels: string[]) {
  const channels = deliveryChannels.map(formatDeliveryChannel)
  const events = [
    ['📊', 'Resumo diário de vendas'],
    ['📈', 'Resumo semanal de vendas'],
    ['📦', 'Estoque baixo'],
    ['💰', 'Caixa fechado'],
    ['🚨', 'Alerta operacional'],
    ['✅', 'Pagamento aprovado'],
    ['❌', 'Pagamento recusado'],
    ['🎯', 'Meta batida'],
  ] as const

  return [
    '🔔 Central de alertas',
    '',
    boldTelegram('Canais prontos para disparo'),
    ...(channels.length
      ? channels.map((channel) => bulletLine('✅', channel))
      : [bulletLine('⚠️', 'Nenhum canal outbound ativo')]),
    '',
    boldTelegram('Eventos monitorados'),
    ...events.map(([icon, label]) => bulletLine(icon, label)),
    '',
    'Ajuste fino de preferências fica no portal do Desk Imperial.',
  ].join('\n')
}

export function buildFechamentoIntroMessage() {
  return [
    '🧮 Fechamento de caixa guiado',
    '',
    'Passo 1/2: Informe o valor de sangria (em reais, ex: 250 ou 250,50). Envie 0 se nao houve.',
    '',
    'Cancele a qualquer momento com /cancelar.',
  ].join('\n')
}

export function buildFechamentoRecordedMessage(input: { observation: string | null; sangria: number }) {
  return [
    '✅ Rascunho de fechamento registrado.',
    `Sangria: ${formatTelegramCurrency(input.sangria, 'BRL')}`,
    `Observacao: ${input.observation ?? '(nenhuma)'}`,
    '',
    'Conclua o fechamento real no portal do Desk Imperial para gerar o lancamento.',
  ].join('\n')
}

function formatDeliveryChannel(channel: string) {
  const labels: Record<string, string> = {
    EMAIL: 'E-mail',
    TELEGRAM: 'Telegram',
  }
  return labels[channel] ?? channel
}
