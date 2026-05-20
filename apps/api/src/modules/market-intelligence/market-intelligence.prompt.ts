import type { AuthContext } from '../auth/auth.types'
import type { FinanceService } from '../finance/finance.service'
import type { MarketInsightFocus } from './market-intelligence.types'

type BuildMarketInsightPromptInput = {
  auth: AuthContext
  finance: Awaited<ReturnType<FinanceService['getSummaryForUser']>>
  focus: MarketInsightFocus
}

export function buildMarketInsightPrompt(params: BuildMarketInsightPromptInput) {
  return [
    'Voce e um consultor executivo de mercado e previsao comercial para pequenas e medias operacoes.',
    'Responda apenas perguntas sobre o aplicativo Desk Imperial e sua operacao: caixa, vendas, estoque, portfolio, PDV, salao, agenda, equipe, perfil, relatorios e indicadores internos.',
    'Se o foco pedir assunto fora do aplicativo ou fora dos dados internos, recuse educadamente dentro do JSON e redirecione para uma pergunta operacional do Desk Imperial.',
    'Use apenas os dados internos abaixo. Nao invente noticias externas, cotacoes adicionais ou fatos nao fornecidos.',
    'Quando fizer previsoes, trate-as como inferencias de curto prazo baseadas na operacao observada.',
    'Responda em portugues do Brasil.',
    'Entregue JSON valido com as chaves:',
    '- summary: resumo executivo em 2 ou 3 frases',
    '- forecast: previsao de curto prazo com explicacao objetiva',
    '- opportunities: lista de 3 oportunidades',
    '- risks: lista de 3 riscos',
    '- nextActions: lista de 3 a 4 acoes praticas',
    '',
    `Foco principal da consulta: ${params.focus.value}`,
    '',
    'Dados da operacao:',
    JSON.stringify(buildPromptPayload(params), null, 2),
  ].join('\n')
}

function buildPromptPayload(params: BuildMarketInsightPromptInput) {
  return {
    companyName: params.auth.companyName ?? params.auth.fullName,
    displayCurrency: params.finance.displayCurrency,
    ratesUpdatedAt: params.finance.ratesUpdatedAt,
    totals: params.finance.totals,
    salesByChannel: params.finance.salesByChannel.slice(0, 5),
    topCustomers: params.finance.topCustomers.slice(0, 5),
    topProducts: params.finance.topProducts.slice(0, 5).map(toPromptProduct),
    topEmployees: params.finance.topEmployees.slice(0, 5),
    topRegions: params.finance.topRegions.slice(0, 5),
    revenueTimeline: params.finance.revenueTimeline,
    categoryBreakdown: params.finance.categoryBreakdown.slice(0, 6),
    focus: params.focus.value,
  }
}

function toPromptProduct(product: Awaited<ReturnType<FinanceService['getSummaryForUser']>>['topProducts'][number]) {
  return {
    name: product.name,
    category: product.category,
    stock: product.stock,
    marginPercent: product.marginPercent,
    inventorySalesValue: product.inventorySalesValue,
    potentialProfit: product.potentialProfit,
  }
}
