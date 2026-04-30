# Plataforma de Inteligencia, RAG e Telegram

Data: 2026-04-29  
Status: direcao arquitetural travada

## Objetivo

Criar a fronteira oficial para:

- Gemini
- RAG
- tools internas
- notificacoes externas
- Telegram

Sem transformar o Desk Imperial em um backend acoplado a bot ou LLM.

## Leitura executiva

O Desk Imperial ja tem base suficiente para evoluir isso:

- NestJS + Prisma + Redis
- Socket.IO por workspace
- cache por dominio
- audit log
- Gemini ja integrado em `market-intelligence`

O que falta nao e stack. E boundary.

Hoje o Gemini vive como uma integracao pontual de insight executivo. Isso e aceitavel para leitura unica, mas nao pode virar o runtime de agente inteiro.

## Regra principal

LLM nao vira centro de regra de negocio.

Regras de:

- comanda
- caixa
- estoque
- financeiro
- funcionarios
- auth

continuam nos modulos de dominio.

O agente so:

- consulta contexto permitido
- escolhe tools autorizadas
- pede execucao por contratos fechados
- entrega resposta ou notificacao

## Boundary alvo

```text
apps/api/src/modules/
  market-intelligence/        # leitura executiva atual via Gemini
  notifications/             # outbound: telegram, email, webhook
  intelligence-platform/     # novo boundary do agente
    application/
      orchestrators/
      use-cases/
    domain/
      intents/
      policies/
      prompts/
      tools/
    infra/
      gemini/
      rag/
      langchain/
      telemetry/
```

## Divisao de responsabilidade

### 1. `market-intelligence`

Continua existindo.

Responsabilidade:

- resumo executivo
- leitura orientada de negocio
- endpoint sincrono de insight

Nao deve absorver:

- Telegram
- RAG geral
- comandos operacionais
- roteamento de tools

### 2. `notifications`

Responsabilidade:

- fila outbound
- retry e backoff
- idempotencia de entrega
- Telegram
- e-mail
- webhooks

Regra fixa:

nenhum modulo de dominio fala com Telegram diretamente.

### 3. `intelligence-platform`

Responsabilidade:

- interpretar intencao
- montar contexto autorizado
- consultar RAG
- resolver quais tools podem ser usadas
- orquestrar chamada ao Gemini
- registrar auditoria

Nao deve:

- bater direto em controller de dominio
- executar SQL livre
- enviar mensagem externa por conta propria

Ele chama:

- services de dominio
- adapters de tools
- `notifications` quando precisar entrega assíncrona

## Modelo operacional

```text
web / pwa / telegram / jobs
  -> intelligence-platform
    -> policy + intent resolver
    -> rag retriever
    -> tool registry
    -> gemini adapter
    -> audit log
    -> notifications (quando for outbound)
```

## Ferramentas do agente

Toda tool precisa ser contratual e limitada.

Formato minimo:

```text
tool id
owner module
input schema
output schema
rate limit
audit event
allowed roles
```

### Primeiras tools candidatas

- `sales.summary.today`
- `finance.summary.period`
- `inventory.low-stock.list`
- `operations.comandas.open`
- `employees.performance.ranking`
- `cash.close.request`

### Tools proibidas nesta fase

- query SQL arbitraria
- execucao de mutacao sem `idempotencyKey`
- qualquer tool que atravesse workspaces
- qualquer tool com escopo administrativo amplo sem PIN/step-up auth

## RAG

RAG entra para contexto, nao para dominio transacional.

Fontes recomendadas na fase 1:

- politicas e docs operacionais do proprio produto
- docs de modulos
- contratos de API internos
- catalogo de eventos e significados
- help interno por perfil de usuario

Fontes proibidas agora:

- tabelas OLTP completas
- historico bruto de pessoas sem redacao
- dumps integrais de comanda, auth ou consentimento

## LangChain

LangChain entra como camada de orquestracao, nao como espinha dorsal do dominio.

Uso correto:

- tool calling
- structured output
- retrieval pipeline
- observabilidade de chain

Uso incorreto:

- regra de negocio dentro do prompt
- retry operacional em cima de mutacao sensivel
- branching de dominio baseado em texto livre

## Telegram

### Fase 1

Somente outbound assíncrono para owner/empresa:

- resumo diario
- estoque baixo
- alerta de caixa
- fechamento

### Fase 2

Comandos curtos e fechados:

- `/vendas_hoje`
- `/estoque_baixo`
- `/fechar_caixa`
- `/pausar_alertas`

### Fase 3

Entrada conversacional controlada, ja usando `intelligence-platform`.

Mesmo aqui:

- sem SQL livre
- sem acesso fora do workspace
- sem mutacao sem confirmacao

## Seguranca

### Dados

- workspace scoping obrigatorio em tudo
- redacao de PII antes de sair do dominio
- prompts sem segredos
- logs secos, sem payload completo de usuario

### API

- endpoints do agente separados dos endpoints de dominio
- rate limit por workspace + ator + canal
- idempotencia para tools mutantes
- auditoria de toda execucao de tool

### Telegram

- webhook assinado
- rotacao de secret
- allowlist de chat por workspace
- persistencia de `chatId` com opt-in

## Performance

O runtime do agente nao pode travar operacao ao vivo.

Decisoes:

- fluxo operacional continua sem depender do agente
- perguntas pesadas e relatorios entram em job/queue quando preciso
- cache Redis em respostas e contexto derivado
- timeouts curtos por ferramenta externa

## Observabilidade

Toda execucao relevante precisa registrar:

- `intent_resolved`
- `rag_retrieved`
- `tool_called`
- `tool_failed`
- `model_called`
- `response_delivered`
- `delivery_failed`

Campos minimos:

- `workspaceId`
- `actorUserId`
- `channel`
- `toolId`
- `latencyMs`
- `cacheHit`
- `idempotencyKey`

## Ordem correta de implementacao

### Etapa 1 — boundary

- criar `notifications`
- criar `intelligence-platform`
- registrar interfaces de tool e policy

### Etapa 2 — Telegram outbound

- fila
- retry
- rate limit
- entrega owner-first

### Etapa 3 — tools fechadas

- vendas
- estoque
- financeiro
- caixa

### Etapa 4 — RAG

- corpus interno
- retriever
- policy de contexto

### Etapa 5 — agente conversacional

- Gemini estruturado
- tool routing
- comandos e perguntas guiadas

## O que nao fazer

- colocar Telegram direto dentro de `operations` ou `finance`
- mover regra de caixa/comanda para LangChain
- deixar LLM consultar banco sem camada de policy
- abrir endpoint generico `ask-anything`
- tratar prompt como controle de acesso

## Veredito

O caminho empresarial correto para o Desk Imperial e:

1. `notifications` como boundary outbound
2. `intelligence-platform` como runtime de orquestracao
3. Gemini como adapter de modelo
4. RAG apenas para contexto autorizado
5. Telegram como canal, nunca como centro de regra

Esse desenho preserva seguranca, escalabilidade e manutencao sem matar a velocidade do produto.
