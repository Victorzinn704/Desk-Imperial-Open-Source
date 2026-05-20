const APP_SCOPE_TERMS = [
  'visão executiva geral',
  'visao executiva geral',
  'agenda',
  'app',
  'aplicativo',
  'caixa',
  'calendario',
  'calendário',
  'canal',
  'canais',
  'cliente',
  'clientes',
  'comanda',
  'comandas',
  'comercio',
  'comércio',
  'dashboard',
  'demanda',
  'desk',
  'equipe',
  'estoque',
  'financeiro',
  'funcionario',
  'funcionário',
  'jogo',
  'jogos',
  'lucro',
  'margem',
  'mesa',
  'mesas',
  'operacao',
  'operação',
  'operacional',
  'pedido',
  'pedidos',
  'pdv',
  'perfil',
  'portfolio',
  'portfólio',
  'produto',
  'produtos',
  'preco',
  'preço',
  'precificacao',
  'precificação',
  'concorrencia',
  'concorrência',
  'cross-selling',
  'relatorio',
  'relatório',
  'salao',
  'salão',
  'seguranca',
  'segurança',
  'venda',
  'vendas',
]

export const APP_SCOPED_AI_MESSAGE =
  'Posso responder apenas perguntas sobre o Desk Imperial: caixa, vendas, estoque, portfólio, PDV, salão, agenda, equipe, perfil e operação do app.'

export function isAppScopedAiFocus(focus: string) {
  const normalizedFocus = focus
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

  return APP_SCOPE_TERMS.some((term) => {
    const normalizedTerm = term
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

    return normalizedFocus.includes(normalizedTerm)
  })
}
