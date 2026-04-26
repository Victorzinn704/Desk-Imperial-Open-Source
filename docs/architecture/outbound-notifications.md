# Notificacoes Externas e Telegram

Data: 2026-04-26  
Status: alvo imediato

## Objetivo

Definir a fronteira oficial de notificacoes externas do Desk Imperial antes de ligar Telegram, para evitar acoplamento direto entre dominio e integracao.

## Decisao travada

- Telegram entra como canal outbound assíncrono.
- A primeira fase atende apenas owner/empresa.
- O bot nao nasce como assistente conversacional.
- Regras de negocio continuam no backend principal; Telegram recebe eventos prontos para entrega.

## Boundary oficial

```text
modules/
  operations/
  finance/
  inventory/
  auth/
  notifications/        # novo boundary de entrega externa
    application/
    domain/
    infra/
      telegram/
      email/
      webhook/
```

## Regra nao negociavel

Nenhum modulo de dominio pode chamar Telegram diretamente.

Exemplos proibidos:

- `operations -> telegramService.send(...)`
- `finance -> bot.sendMessage(...)`
- `auth -> webhook externo direto`

Exemplo correto:

1. dominio fecha a regra
2. dominio publica evento interno
3. `notifications` decide canais e entrega

## Fase 1 recomendada

### Casos de uso

- resumo diario de vendas
- resumo semanal
- estoque baixo
- caixa fechado
- alerta operacional importante

### Comandos minimos

- `/vendas_hoje`
- `/fechar_caixa`
- `/pausar_alertas`

## Modelo operacional

```text
Operation/Finance/Inventory
  -> Audit/Domain Event
  -> NotificationsApplicationService
  -> queue/cache boundary
  -> TelegramAdapter
```

## Contrato minimo

### Entrada no modulo de notificacoes

- `workspaceId`
- `eventType`
- `recipientScope`
- `payload resumido`
- `idempotencyKey`

### Saida observavel

- `queued`
- `sent`
- `failed`
- `suppressed`

## Requisitos tecnicos

- idempotencia por evento
- retry com backoff
- rate limit por workspace
- opt-out por usuario
- persistencia do `chatId`
- auditoria de entrega

## O que nao entra agora

- RAG
- LangChain
- bot que responde qualquer pergunta
- consulta livre ao banco
- comandos administrativos amplos

## Motivo

O produto ainda esta fechando frentes operacionais e de performance. Se Telegram nascer como chatbot antes do boundary de notificacoes, ele vira um segundo centro de regra e aumenta risco de regressao.
