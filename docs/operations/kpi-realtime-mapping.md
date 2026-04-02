# KPI Realtime Mapping

## Objetivo

Definir de forma explícita quais KPIs do Desk Imperial devem reagir a cada evento operacional, sem misturar fechamento consolidado, caixa por sessão e projeção do salão.

## KPI por fonte de verdade

### 1. Receita realizada

- Fonte principal: `closure.grossRevenueAmount`
- Significado: total já fechado/pago no dia
- Deve reagir a:
  - `comanda.closed`
  - `cash.closure.updated`
- Não deve depender de:
  - `comanda.updated` de item aberto

### 2. Lucro realizado

- Fonte principal: `closure.realizedProfitAmount`
- Significado: lucro estimado do que já foi efetivamente fechado
- Deve reagir a:
  - `comanda.closed`
  - `cash.closure.updated`
- Não deve depender de:
  - alterações em comandas ainda abertas

### 3. Em aberto

- Fonte principal: soma das `comandas` com status diferente de `CLOSED` e `CANCELLED`
- Significado: valor ainda não realizado, mas em operação no salão
- Deve reagir a:
  - `comanda.opened`
  - `comanda.updated`
  - `comanda.closed`
- Não precisa depender de:
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
- Não deve reagir a:
  - adição de item em comanda ainda aberta

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
- `cash.updated` atualiza caixa por sessão
- `cash.closure.updated` atualiza consolidado executivo real

## Diretriz de refinamento

- Evitar usar `cash.closure.updated` como "evento universal"
- Preferir que cada KPI seja atualizado pelo evento do seu dominio
- Manter o servidor como fonte de verdade e o cache como espelho rápido
