# KPI Realtime Mapping

## Objetivo

Definir de forma explicita quais KPIs do Desk Imperial devem reagir a cada evento operacional, sem misturar fechamento consolidado, caixa por sessao e projeção do salao.

## KPI por fonte de verdade

### 1. Receita realizada

- Fonte principal: `closure.grossRevenueAmount`
- Significado: total ja fechado/pago no dia
- Deve reagir a:
  - `comanda.closed`
  - `cash.closure.updated`
- Nao deve depender de:
  - `comanda.updated` de item aberto

### 2. Lucro realizado

- Fonte principal: `closure.realizedProfitAmount`
- Significado: lucro estimado do que ja foi efetivamente fechado
- Deve reagir a:
  - `comanda.closed`
  - `cash.closure.updated`
- Nao deve depender de:
  - alteracoes em comandas ainda abertas

### 3. Em aberto

- Fonte principal: soma das `comandas` com status diferente de `CLOSED` e `CANCELLED`
- Significado: valor ainda nao realizado, mas em operacao no salao
- Deve reagir a:
  - `comanda.opened`
  - `comanda.updated`
  - `comanda.closed`
- Nao precisa depender de:
  - `cash.closure.updated`

### 4. Projecao total

- Fonte principal:
  - `closure.grossRevenueAmount`
  - soma das comandas abertas
- Formula:
  - `realizado + em aberto`
- Deve reagir a:
  - `comanda.opened`
  - `comanda.updated`
  - `comanda.closed`
  - `cash.closure.updated`

### 5. Caixa esperado

- Fonte principal: `closure.expectedCashAmount`
- Significado: abertura + movimentos + vendas fechadas
- Deve reagir a:
  - `cash.opened`
  - `cash.updated`
  - `comanda.closed`
  - `cash.closure.updated`
- Nao deve reagir a:
  - adicao de item em comanda ainda aberta

### 6. Quantidade de comandas abertas

- Fonte principal:
  - `closure.openComandasCount`
  - com consistencia defensiva derivada de `comanda.opened` e `comanda.closed`
- Deve reagir a:
  - `comanda.opened`
  - `comanda.closed`
  - `cash.closure.updated`

## Regra operacional

- `comanda.updated` atualiza estado vivo do salao
- `comanda.closed` atualiza estado vivo e resultado realizado
- `cash.updated` atualiza caixa por sessao
- `cash.closure.updated` atualiza consolidado executivo real

## Diretriz de refinamento

- Evitar usar `cash.closure.updated` como "evento universal"
- Preferir que cada KPI seja atualizado pelo evento do seu dominio
- Manter o servidor como fonte de verdade e o cache como espelho rapido
