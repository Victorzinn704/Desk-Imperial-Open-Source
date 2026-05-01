# Fluxos do Usuario — Desk Imperial

**Versao:** 1.1  
**Ultima atualizacao:** 2026-05-01

---

## Como ler este documento

Este arquivo descreve os fluxos que hoje existem no produto, do jeito que o repo realmente sustenta.

Perfis:

- **OWNER** — dono do negocio
- **STAFF** — colaborador operacional

As URLs publicas e os endpoints abaixo assumem o contrato atual:

- web: `https://app.deskimperial.online`
- api: `https://api.deskimperial.online/api/v1`

---

## Fluxo 1 — Primeiro acesso do OWNER

**Objetivo:** criar o workspace e conseguir entrar no portal.

```text
1. Acessa /cadastro
2. Informa nome, email, senha e dados basicos do negocio
3. Backend cria a conta e registra os dados iniciais do workspace
4. Sistema envia codigo de verificacao por email
5. OWNER confirma o email pelo fluxo de verificacao
6. Faz login
7. /app escolhe a superficie OWNER e redireciona para /app/owner
```

Pontos reais do runtime:

- verificacao de email usa `POST /api/v1/auth/verify-email/request` e `POST /api/v1/auth/verify-email/confirm`
- geocodificacao do endereco continua tolerante a falha
- a sessao nasce por cookie HttpOnly, nao por JWT exposto no browser

---

## Fluxo 2 — Login diario e retomada de sessao

**Objetivo:** abrir o sistema no inicio do turno.

```text
1. Acessa /login
2. Informa email e senha
3. Backend valida credenciais e cria Session
4. Web recebe cookies de sessao e CSRF
5. /api/v1/auth/me devolve o contexto autenticado + csrfToken
6. /app decide se o usuario vai para /app/owner ou /app/staff
```

No estado atual:

- logout revoga a sessao e derruba sockets realtime rastreados
- a sessao entra em cache positivo e tambem em negative cache para estados invalidos/revogados
- reconnect de realtime depende dessa mesma sessao

---

## Fluxo 3 — Cadastro rapido de produto com barcode

**Objetivo:** colocar produto no catalogo sem abrir um formulario pesado.

```text
1. OWNER abre /app/owner/cadastro-rapido
2. Digita ou escaneia um EAN
3. Web consulta /app/api/barcode/lookup
4. Route local valida a sessao chamando /api/v1/auth/me
5. Se houver match, o produto recebe pre-preenchimento
6. OWNER ajusta nome, embalagem, custo, preco e estoque
7. Opcionalmente chama smart draft
8. Salva no catalogo via /api/v1/products
```

Fontes de enriquecimento atuais:

- Open Food Facts
- catalogo nacional de bebidas empacotadas do projeto
- smart draft com Gemini em `POST /api/v1/products/smart-draft`

Esse fluxo ja e parte do produto real, nao laboratorio isolado.

---

## Fluxo 4 — Gestao normal de catalogo

**Objetivo:** manter portfolio, estoque e combos coerentes.

```text
1. OWNER lista produtos
2. Cria produto novo ou ajusta um existente
3. Pode importar arquivo de catalogo
4. Pode fazer restock em lote
5. Pode arquivar, restaurar ou excluir definitivamente
```

Endpoints reais:

- `GET /api/v1/products`
- `POST /api/v1/products`
- `POST /api/v1/products/import`
- `POST /api/v1/products/restock-bulk`
- `PATCH /api/v1/products/:productId`
- `DELETE /api/v1/products/:productId`
- `DELETE /api/v1/products/:productId/permanent`
- `POST /api/v1/products/:productId/restore`

---

## Fluxo 5 — STAFF abre caixa e entra na operacao

**Objetivo:** preparar o turno operacional.

```text
1. STAFF faz login
2. /app redireciona para /app/staff
3. STAFF abre o caixa do dia
4. O workspace realtime conecta no namespace /operations
5. O cliente entra nas rooms operacionais permitidas
6. O painel passa a reagir a comandas, cozinha e mesas
```

Pontos atuais:

- STAFF nao deve receber eventos financeiros de room `cash`
- reconnect ja trata `operations.error`, foreground resume e churn mobile de forma mais explicita

---

## Fluxo 6 — Atendimento de comanda

**Objetivo:** registrar atendimento de mesa ou balcao e levar isso ate o fechamento.

```text
1. STAFF ou OWNER abre uma comanda
2. Adiciona itens individualmente ou em lote
3. Vincula mesa e atendente responsavel
4. Cozinha recebe os itens que exigem preparo
5. Status do item evolui por cozinha
6. Pagamentos sao registrados na comanda
7. Comanda e fechada
8. Caixa, resumo e realtime refletem o fechamento
```

Endpoints reais:

- `POST /api/v1/operations/comandas`
- `POST /api/v1/operations/comandas/:comandaId/items`
- `POST /api/v1/operations/comandas/:comandaId/items/batch`
- `PATCH /api/v1/operations/comandas/:comandaId`
- `POST /api/v1/operations/comandas/:comandaId/assign`
- `POST /api/v1/operations/comandas/:comandaId/status`
- `POST /api/v1/operations/comandas/:comandaId/payments`
- `POST /api/v1/operations/comandas/:comandaId/close`
- `PATCH /api/v1/operations/kitchen-items/:itemId/status`

No fluxo atual, "fechar comanda" nao e so trocar coluna de status. Tambem mexe em:

- caixa do dia
- pagamentos da comanda
- resumo operacional
- notificacoes realtime

---

## Fluxo 7 — Gestao de mesas e cozinha

**Objetivo:** manter salao e preparo sincronizados.

```text
1. OWNER ou STAFF consulta mesas
2. Cria ou ajusta mesas
3. Operacao live mostra estado do salao
4. Cozinha acompanha fila por item
5. Mudancas viram eventos realtime por room segmentada
```

Endpoints reais:

- `GET /api/v1/operations/mesas`
- `POST /api/v1/operations/mesas`
- `PATCH /api/v1/operations/mesas/:mesaId`
- `GET /api/v1/operations/live`
- `GET /api/v1/operations/kitchen`
- `GET /api/v1/operations/summary`

---

## Fluxo 8 — Fechamento de caixa e consolidacao do dia

**Objetivo:** encerrar o turno com visao confiavel do financeiro operacional.

```text
1. OWNER ou operador abre cash session
2. Registra entradas e saidas operacionais
3. Fecha a sessao de caixa
4. OWNER fecha o business date
5. Sistema consolida receita, lucro e diferencas
6. Painel financeiro passa a refletir o dia consolidado
```

Endpoints reais:

- `POST /api/v1/operations/cash-sessions`
- `POST /api/v1/operations/cash-sessions/:cashSessionId/movements`
- `POST /api/v1/operations/cash-sessions/:cashSessionId/close`
- `POST /api/v1/operations/closures/close`

Esse fluxo e um dos mais sensiveis em latencia percebida porque cruza handler pesado, realtime e refetch.

---

## Fluxo 9 — Pedido formal e estoque

**Objetivo:** registrar venda formal e manter estoque coerente.

```text
1. OWNER ou STAFF autorizado cria um pedido
2. Backend valida itens e estoque
3. Pedido concluido persiste Order e OrderItem
4. Estoque e decrementado
5. Cancelamento posterior reverte o que for aplicavel
```

Endpoints reais:

- `GET /api/v1/orders`
- `POST /api/v1/orders`
- `POST /api/v1/orders/:orderId/cancel`

Observacao: o produto hoje convive com duas trilhas de venda:

- trilha operacional via `Comanda`
- trilha formal via `Order`

---

## Fluxo 10 — Insight executivo com IA

**Objetivo:** obter leitura gerencial com foco operacional.

```text
1. OWNER abre /ai
2. Define foco da leitura
3. Web chama POST /api/v1/market-intelligence/insights
4. Backend valida foco permitido
5. Tenta cache Redis
6. Se nao houver cache, consulta Gemini
7. Salva resposta em cache e devolve resumo estruturado
```

Guardrails atuais:

- o endpoint nao aceita pergunta arbitraria fora do dominio do app
- existe rate limit proprio
- sem `GEMINI_API_KEY`, o sistema responde erro controlado

---

## Fluxo 11 — Vinculo do Telegram

**Objetivo:** conectar o usuario ao bot oficial sem expor credencial manual.

```text
1. Usuario autenticado gera link token no portal
2. Portal abre o bot com /start <token>
3. Bot valida token, workspace e conta
4. Backend cria ou substitui TelegramAccount
5. Usuario passa a receber notificacoes conforme preferencias
```

Endpoints reais:

- `POST /api/v1/notifications/telegram/link-token`
- `GET /api/v1/notifications/telegram/status`
- `DELETE /api/v1/notifications/telegram/link`
- `GET /api/v1/notifications/telegram/preferences`
- `POST /api/v1/notifications/telegram/preferences`
- `GET /api/v1/notifications/preferences/workspace`
- `POST /api/v1/notifications/preferences/workspace`
- `GET /api/v1/notifications/preferences/me`
- `POST /api/v1/notifications/preferences/me`

O webhook inbound fica em:

- `POST /api/v1/notifications/telegram/webhook`

---

## Fluxo 12 — Recuperacao de senha

**Objetivo:** recuperar acesso sem intervenção manual.

```text
1. Usuario acessa /recuperar-senha
2. Informa email
3. Backend envia codigo temporario por email
4. Usuario abre /redefinir-senha
5. Informa codigo + nova senha
6. Sistema invalida o codigo e confirma a troca
```

Contratos reais:

- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

---

## Fluxo 13 — Acao sensivel com Admin PIN

**Objetivo:** liberar operacao critica sem expor prova no JavaScript.

```text
1. OWNER configura o PIN
2. Em acao sensivel, o cliente solicita verificacao do PIN
3. Backend valida o PIN e emite challenge opaco
4. Challenge vira cookie HttpOnly temporario
5. Acao protegida consome essa prova server-side
```

Endpoints reais:

- `GET /api/v1/admin/pin`
- `POST /api/v1/admin/verify-pin`
- `POST /api/v1/admin/pin`
- `DELETE /api/v1/admin/pin`

Importante: o fluxo atual nao usa JWT de Admin PIN no browser.

---

## Resumo visual

```text
Cadastro -> Verificacao de email -> Login -> /app
                                           |
                         +-----------------+-----------------+
                         |                                   |
                       OWNER                               STAFF
                         |                                   |
      +------------------+------------------+        Caixa / Salao / Cozinha
      |                  |                  |               |
  Catalogo         Financeiro / Caixa       IA         Comandas / Mesas
  Barcode          Fechamento               Insight    Realtime
  Smart draft      Orders / margem          Gemini     Kitchen status
  Telegram         Notificacoes
```

---

## Guardrails de evolucao

1. Nao reintroduzir JWT exposto como se fosse o fluxo principal do portal.
2. Nao documentar Telegram, barcode lookup ou smart draft como "futuro"; isso ja esta vivo.
3. Nao simplificar operacao dizendo que tudo passa por `Order`; `Comanda` e `CashSession` sao trilhas centrais do produto.
4. Sempre cruzar este arquivo com controllers reais e com os fluxos de `app/owner` e `app/staff`.
