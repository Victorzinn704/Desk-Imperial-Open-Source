import { BadRequestException } from '@nestjs/common'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { MarketInsightFocus } from './market-intelligence.types'

const DEFAULT_MARKET_INSIGHT_FOCUS = 'Visao executiva geral'

const ALLOWED_SCOPE_PHRASES = ['visao executiva geral']

const ALLOWED_SCOPE_TERMS = [
  'agenda',
  'app',
  'aplicativo',
  'caixa',
  'calendario',
  'canal',
  'canais',
  'cliente',
  'comanda',
  'comercio',
  'dashboard',
  'demanda',
  'desk',
  'equipe',
  'estoque',
  'financeiro',
  'funcionario',
  'jogo',
  'lucro',
  'margem',
  'mesa',
  'operacao',
  'operacional',
  'pedido',
  'pdv',
  'perfil',
  'portfolio',
  'preco',
  'precificacao',
  'concorrencia',
  'cross-selling',
  'produto',
  'relatorio',
  'salao',
  'seguranca',
  'venda',
]

export function resolveMarketInsightFocus(focus: string | undefined): MarketInsightFocus {
  const value =
    sanitizePlainText(focus, 'Foco da analise', {
      allowEmpty: true,
      rejectFormula: true,
    }) ?? DEFAULT_MARKET_INSIGHT_FOCUS

  if (!isDeskImperialAppFocus(value)) {
    throw new BadRequestException(
      'A IA do Desk Imperial responde apenas perguntas sobre o aplicativo, caixa, vendas, estoque, portfólio, PDV, salão, agenda, equipe e operação.',
    )
  }

  return { value }
}

function isDeskImperialAppFocus(focus: string) {
  const normalizedFocus = normalizeScopeText(focus)
  return [...ALLOWED_SCOPE_PHRASES, ...ALLOWED_SCOPE_TERMS].some((term) => normalizedFocus.includes(term))
}

function normalizeScopeText(value: string) {
  return value
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
