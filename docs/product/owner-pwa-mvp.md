# Owner PWA MVP

Data: 2026-04-21
Status: em estabilizacao.

## Objetivo

Definir o escopo oficial do PWA do dono para que ele seja operacional de verdade, sem carregar o peso visual e funcional do desktop.

## Classificacao

Tipo: hibrido
Peso: 70% operacional / 30% analitico

O dono no celular quer enxergar o que esta acontecendo agora, agir rapido e consultar historico. O celular nao substitui o desktop em gestao profunda.

## Navegacao inferior oficial

O Owner PWA trabalha com 5 abas:

1. Hoje
2. Comandas
3. PDV
4. Financeiro
5. Conta

`Cadastro rapido` nao entra como item da bottom nav. Ele entra como atalho prioritario dentro do fluxo.

## Escopo por aba

### 1. Hoje

Objetivo: abrir o app e entender a operacao em segundos.

Deve conter:

- status do caixa
- vendas do dia
- comandas abertas
- pedidos em preparo / prontos
- alertas operacionais
- atalhos:
  - abrir caixa
  - nova comanda
  - ver cozinha
  - cadastro rapido

Estado atual da modelagem:

- abertura do turno com prioridade operacional explicita
- KPIs em strip unico, sem microcards soltos
- acoes principais em lista unica de decisao
- radar do turno consolidando equipe e top produtos no mesmo painel
- leitura curta por garcom com chips de filtro, mantendo foco em receita, comandas e abertas agora sem virar painel executivo pesado

### 2. Comandas

Objetivo: acompanhar e consultar o fluxo principal do negocio.

Subareas:

- Ao vivo
- Historico
- Canceladas
- Delivery

Deve conter:

- busca por cliente, mesa, canal e id
- status da comanda
- valor total
- forma de pagamento
- operador responsavel
- horario

Estado atual da modelagem:

- filtro por garcom responsavel para leitura de atendimento individual
- recorte recalculando totais e status sem abrir outra tela

### 3. PDV

Objetivo: abrir, editar e fechar pedido pelo celular.

Deve conter:

- contexto da venda: mesa, balcao, delivery
- categorias horizontais
- busca
- grade/lista de produtos
- carrinho persistente
- fechamento com observacao, desconto, acrescimo e cliente
- envio para cozinha

Estado atual da modelagem:

- PDV nasce de mesa ou comanda, nao de catalogo solto
- modo `Mesas` mostra salao e permite abrir/retomar atendimento
- modo `Cozinha` aparece como subarea operacional do PDV movel
- builder reaproveita a base madura do staff, com contexto extra do owner
- `Cadastro rapido` aparece como acao de apoio, sem virar item fixo da bottom nav

### 4. Financeiro

Objetivo: dar controle rapido, nao analise de escritorio.

Deve conter:

- resumo do dia
- caixa atual
- recebimentos
- ticket medio
- cancelamentos / estornos
- fechamento de turno

Estado atual da modelagem:

- abertura curta com prioridade financeira do turno
- KPIs em strip unico, sem microcards soltos
- acoes principais reduzidas a `Caixa do turno` e `Financeiro completo`

### 5. Conta

Objetivo: organizar configuracoes moveis sem virar settings desktop comprimido.

Deve conter:

- empresa
- equipe e acessos
- impressoras e dispositivos
- integracoes
- notificacoes
- seguranca e sessao

Estado atual da modelagem:

- identidade do proprietario em abertura curta
- atalhos agrupados por `Sistema` e `Operacao`
- sem lista genérica de botões soltos

## Cadastro rapido

Essa e a feature prioritaria do PWA.

### Papel no produto

- acelerar cadastro de produto
- ser a principal porta de scan de codigo de barras
- reduzir digitacao no balcao

### Onde aparece

- atalho em `Hoje`
- atalho em `PDV`
- entrada em `Conta > Catalogo e cadastro rapido`

### Escopo do MVP

- captura por camera
- leitura de EAN
- busca de produto existente por codigo
- cadastro manual rapido
- preenchimento assistido por dados de catalogo/API quando disponivel
- fila offline quando a rede falhar

### Entrega inicial ja aberta

- rota dedicada do owner em `/app/owner/cadastro-rapido`
- cadastro manual rapido ligado ao backend real de produtos
- persistencia real de EAN quando o codigo estiver valido
- leitura local por scanner HID / digitacao manual como primeiro passo operacional
- leitura por camera nativa quando o navegador suportar `BarcodeDetector`
- fallback limpo para EAN manual/HID quando a leitura nativa nao existir
- lookup por EAN via rota local do web, com pre-preenchimento de nome, marca e categoria
- lookup por EAN enriquecido com medida, embalagem sugerida, porcao e contexto visual do item
- fila offline local no aparelho para cadastro de produto quando a API cair
- drenagem automatica da fila offline ao reconectar ou receber `Background Sync`
- superficie de `Comandas` reestruturada em leitura mais densa, com foco em status, extrato e fechamento sem card decorativo interno

## Boundary oficial

| Area | Recorte |
| --- | --- |
| Hoje | leitura global curta do estabelecimento |
| Comandas | global, com filtro por garcom responsavel |
| PDV | global da operacao, por mesa/comanda |
| Financeiro | resumo movel; analise densa fica no desktop |
| Conta | atalhos de sistema e operacao, sem settings desktop comprimido |
| Cadastro rapido | fluxo dedicado fora da bottom nav |
| Staff | nao aparece aqui; o staff tem PWA proprio e historico pessoal |

### Fase posterior

- integracao com app Android dedicado para scan de alta frequencia
- modos de dispositivo local para operacao continua

## Reaproveitamento aprovado

Pode reaproveitar:

- queries e mutacoes operacionais
- realtime por workspace
- offline queue
- regras de permissao
- contratos e schemas
- componentes de comportamento maduros

Nao deve reaproveitar cegamente:

- shell visual atual
- layout desktop comprimido
- cards e estruturas que nasceram para o web

## Criterio de pronto do MVP

O Owner PWA so entra em fase de release quando:

1. bottom nav estiver estavel
2. telas criticas funcionarem com sessao real
3. fluxo de comanda e PDV responder em tempo real
4. cadastro rapido estiver operacional
5. offline/reconexao nao corromperem estado
6. a experiencia couber em uma tela pequena sem ruido de dashboard desktop
