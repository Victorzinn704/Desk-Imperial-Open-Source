# Staff PWA MVP

Data: 2026-04-21
Status: em estabilizacao.

## Objetivo

Definir o escopo oficial do PWA do funcionario para manter a operacao rapida, compartilhada no que precisa ser compartilhado e pessoal onde existe dado sensivel.

## Classificacao

Tipo: operacional

O funcionario abre o app no meio do atendimento. Ele precisa agir em segundos: abrir mesa, adicionar item, acompanhar cozinha, fechar comanda e consultar o proprio historico.

## Navegacao inferior oficial

O Staff PWA trabalha com 4 abas:

1. Mesas
2. Cozinha
3. Pedidos
4. Historico

Nao entram no Staff PWA:

- financeiro global
- configuracao densa
- BI do estabelecimento
- extrato detalhado de vendas de outros funcionarios

## Escopo por aba

### 1. Mesas

Objetivo: enxergar o salao e iniciar ou retomar atendimento.

Estado atual:

- mapa compartilhado do salao
- resumo curto de mesas livres, em uso, reservadas e proprias
- mesa ocupada mostra responsavel principal
- mesa livre abre nova comanda
- mesa ocupada retoma a comanda existente

Regra de dominio:

- mesa e entidade operacional compartilhada
- outro garcom pode apoiar uma mesa sem virar dono do historico dela
- a API operacional do STAFF retorna comandas abertas do salao inteiro, mas comandas encerradas apenas do funcionario autenticado

### 2. Cozinha

Objetivo: tirar pedidos da fila e evitar gargalo de preparo.

Estado atual:

- fila compartilhada do salao
- resumo curto de fila, preparo, prontos e mesas ativas
- leitura de proxima acao
- item de cozinha mostra mesa e responsavel principal
- item do proprio funcionario aparece como `Sua mesa`
- a API de cozinha e global por workspace para STAFF ativo, sem escopo por garcom

### 3. Pedidos

Objetivo: acompanhar comandas abertas do salao e adiantar atendimento.

Estado atual:

- comandas abertas sao compartilhadas
- cada comanda mostra responsavel principal
- o funcionario ativo pode adicionar itens, avancar status, cancelar e fechar comandas abertas do workspace
- a autoria da acao vai para auditoria, mas o credito/historico da comanda continua no responsavel principal
- o strip mostra apenas ativas, em preparo e prontas

### 4. Historico

Objetivo: consultar apenas o que o funcionario realmente atendeu.

Estado atual:

- historico e pessoal
- comandas encerradas de outros funcionarios nao aparecem
- detalhes de comanda encerrada de outro funcionario sao bloqueados pela API
- resumo mostra receita realizada, receita esperada e posicao no turno
- ranking aparece como contexto, nao como extrato dos outros operadores

## Pedido / Builder

Objetivo: montar pedido a partir de uma mesa ou comanda, nunca como catalogo solto.

Estado atual:

- modo `Nova comanda` mostra mesa, situacao e pressao da cozinha
- modo `Retomar pedido` mostra responsavel principal da comanda
- CTA de nova comanda usa `Abrir comanda`
- CTA de comanda existente usa `Adicionar itens`

## Boundary oficial

| Area | Recorte |
| --- | --- |
| Mesas | global do salao |
| Cozinha | global do salao |
| Comandas abertas | global do salao |
| Historico | pessoal do funcionario |
| Ranking | pessoal com contexto de equipe |
| Vendas | proprias, salvo quando o dono estiver no Owner PWA |

## Criterio de pronto do MVP

O Staff PWA so entra em release quando:

1. mesas, cozinha, comandas e historico respeitarem os recortes acima
2. acoes criticas funcionarem com realtime e reconexao
3. historico pessoal nao vazar comanda de outro funcionario
4. mesa e comanda exibirem responsavel principal
5. pedido sempre nascer de mesa ou comanda
6. testes focados cobrirem boundary, offline e fluxo principal
