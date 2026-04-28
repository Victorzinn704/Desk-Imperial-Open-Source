import type { LockedPedidosPreview, PedidosView } from './pedidos-environment.types'

export const lockedPreviewByView: Record<PedidosView, LockedPedidosPreview> = {
  tabela: {
    primaryTitle: 'Preview travado · tabela',
    primaryFacts: [
      { label: 'foco', value: 'consulta operacional' },
      { label: 'libera', value: 'linhas reais de pedido' },
      { label: 'corte', value: 'canal e operador' },
    ],
    stats: [
      { label: 'colunas', value: '7', description: 'id, data, cliente, itens, valor, canal e status' },
      { label: 'filtros', value: '4', description: 'recorte por operacao e consulta' },
      { label: 'canais', value: '3', description: 'origens comerciais na leitura' },
      { label: 'status', value: '2', description: 'concluido e cancelado' },
    ],
    primaryRows: [
      { label: 'tabela', value: 'bloqueada', note: 'a sessao libera a lista completa', tone: 'warning' },
      { label: 'receita por pedido', value: 'ao entrar', note: 'valor liquido em cada linha', tone: 'info' },
      { label: 'ticket medio', value: 'ao entrar', note: 'media dos concluidos no recorte', tone: 'neutral' },
    ],
    secondaryTitle: 'O que abre na tabela',
    secondaryRows: [
      { label: 'canal lider', value: 'sim', note: 'origem dominante do periodo', tone: 'success' },
      { label: 'operador lider', value: 'sim', note: 'quem mais puxou receita', tone: 'info' },
      { label: 'ultimo registro', value: 'sim', note: 'pedido mais recente da janela', tone: 'neutral' },
    ],
  },
  timeline: {
    primaryTitle: 'Preview travado · timeline',
    primaryFacts: [
      { label: 'foco', value: 'cadencia do turno' },
      { label: 'libera', value: 'ritmo por dia' },
      { label: 'corte', value: 'hora e operador' },
    ],
    stats: [
      { label: 'dias', value: '7', description: 'janelas visiveis ao autenticar' },
      { label: 'marcos', value: '4', description: 'leituras do ritmo operacional' },
      { label: 'eventos', value: 'hora', description: 'sequencia da operacao' },
      { label: 'alertas', value: '2', description: 'cancelamento e pico' },
    ],
    primaryRows: [
      { label: 'linha do tempo', value: 'bloqueada', note: 'libera ordem dos eventos do periodo', tone: 'warning' },
      { label: 'dia mais forte', value: 'ao entrar', note: 'destaca onde o caixa acelerou', tone: 'info' },
      { label: 'ultimo registro', value: 'ao entrar', note: 'mostra o fim do fluxo atual', tone: 'neutral' },
    ],
    secondaryTitle: 'O que abre na timeline',
    secondaryRows: [
      { label: 'dias ativos', value: 'sim', note: 'um bloco por dia com valor consolidado', tone: 'success' },
      { label: 'média por dia', value: 'sim', note: 'cadencia do recorte carregado', tone: 'info' },
      { label: 'maior pico', value: 'sim', note: 'jornada mais pesada do periodo', tone: 'neutral' },
    ],
  },
  kanban: {
    primaryTitle: 'Preview travado · kanban',
    primaryFacts: [
      { label: 'foco', value: 'status do pedido' },
      { label: 'libera', value: 'quadro comercial' },
      { label: 'corte', value: 'concluido e cancelado' },
    ],
    stats: [
      { label: 'colunas', value: '2', description: 'status principais do recorte' },
      { label: 'sinais', value: '4', description: 'pressao e perda em leitura curta' },
      { label: 'acoes', value: '3', description: 'conferencia por status' },
      { label: 'excecoes', value: '2', description: 'ultimo registro e maior ticket' },
    ],
    primaryRows: [
      { label: 'kanban', value: 'bloqueado', note: 'quadro por status entra com a sessao ativa', tone: 'warning' },
      { label: 'perda comercial', value: 'ao entrar', note: 'taxa de cancelamento e sinais do turno', tone: 'info' },
      { label: 'maior pedido', value: 'ao entrar', note: 'identifica o pico do recorte', tone: 'neutral' },
    ],
    secondaryTitle: 'O que abre no kanban',
    secondaryRows: [
      { label: 'concluidos', value: 'sim', note: 'pedidos liquidados por coluna', tone: 'success' },
      { label: 'cancelados', value: 'sim', note: 'quebras e desistencias do recorte', tone: 'warning' },
      { label: 'canal lider', value: 'sim', note: 'leitura de origem dominante', tone: 'info' },
    ],
  },
  detalhe: {
    primaryTitle: 'Preview travado · detalhe',
    primaryFacts: [
      { label: 'foco', value: 'ultimo pedido' },
      { label: 'libera', value: 'itens e notas' },
      { label: 'corte', value: 'cliente e canal' },
    ],
    stats: [
      { label: 'blocos', value: '4', description: 'cliente, itens, totais e contexto' },
      { label: 'totais', value: '3', description: 'receita, lucro e status' },
      { label: 'contexto', value: '4', description: 'operador, canal, horario e notas' },
      { label: 'itens', value: 'lista', description: 'produtos do pedido em foco' },
    ],
    primaryRows: [
      {
        label: 'pedido selecionado',
        value: 'bloqueado',
        note: 'abrir sessao libera a leitura completa',
        tone: 'warning',
      },
      { label: 'itens da comanda', value: 'ao entrar', note: 'quantidade, produto e subtotal', tone: 'info' },
      { label: 'valor e lucro', value: 'ao entrar', note: 'resumo do pedido em foco', tone: 'neutral' },
    ],
    secondaryTitle: 'O que abre no detalhe',
    secondaryRows: [
      { label: 'cliente', value: 'sim', note: 'nome e observacoes do pedido', tone: 'success' },
      { label: 'canal', value: 'sim', note: 'origem da venda detalhada', tone: 'info' },
      { label: 'operador', value: 'sim', note: 'responsavel pela venda', tone: 'neutral' },
    ],
  },
  historico: {
    primaryTitle: 'Preview travado · historico',
    primaryFacts: [
      { label: 'foco', value: 'auditoria do periodo' },
      { label: 'libera', value: 'dias, canais e operadores' },
      { label: 'corte', value: 'ocorrencias relevantes' },
    ],
    stats: [
      { label: 'dias', value: '7', description: 'blocos diarios no historico' },
      { label: 'canais', value: '3', description: 'origens consolidadas na auditoria' },
      { label: 'operadores', value: '4', description: 'leitura por time e turno' },
      { label: 'sinais', value: '4', description: 'cancelamento, receita e cobertura' },
    ],
    primaryRows: [
      { label: 'auditoria', value: 'bloqueada', note: 'o consolidado entra com login ativo', tone: 'warning' },
      { label: 'ultimo cancelamento', value: 'ao entrar', note: 'ultima excecao do periodo', tone: 'info' },
      { label: 'dias ativos', value: 'ao entrar', note: 'datas com pedidos no recorte', tone: 'neutral' },
    ],
    secondaryTitle: 'O que abre no historico',
    secondaryRows: [
      { label: 'operadores', value: 'sim', note: 'quem movimentou o periodo', tone: 'success' },
      { label: 'canais', value: 'sim', note: 'de onde veio o faturamento', tone: 'info' },
      { label: 'timeline diaria', value: 'sim', note: 'um bloco por dia com resumo', tone: 'neutral' },
    ],
  },
}
