# Mercado Pago Point

## Fluxo Atual

1. O PDV chama `POST /api/v1/operations/comandas/:comandaId/terminal-payment-intents`.
2. A API cria uma intent local `PENDING` em `PaymentTerminalIntent`.
3. A API tenta enfileirar a criacao da order Point no Redis.
4. Se a fila estiver disponivel, a resposta volta imediatamente para o PDV com a intent local pendente.
5. O worker `MercadoPagoTerminalOrderWorker` consome o job e chama `POST https://api.mercadopago.com/v1/orders` com:
   - `type: "point"`;
   - `external_reference` sem PII;
   - `X-Idempotency-Key`;
   - `transactions.payments[0].amount` com duas casas decimais;
   - `config.point.terminal_id`.
6. Se Redis estiver indisponivel, a API usa fallback inline para nao bloquear operacao local.
7. A order e o payment retornados pelo Mercado Pago ficam gravados na intent.
8. A comanda continua aberta e nenhum pagamento local `CONFIRMED` e criado nessa etapa.
9. O webhook `POST /api/v1/operations/webhooks/mercado-pago` valida `x-signature`/`x-request-id`.
10. A API consulta `GET /v1/orders/{order_id}` no Mercado Pago antes de reconciliar.
11. Se o pagamento externo estiver `approved` e o valor/referencia baterem, a API cria um `ComandaPayment CONFIRMED` idempotente.

Essa separacao evita fechar caixa/comanda antes de a adquirente confirmar o pagamento.

## Atualizacao 2026-05-08 — Payment Intent Assincrono

O caminho quente do PDV nao espera mais a API do Mercado Pago quando Redis esta saudavel. A criacao da order virou job:

```text
PDV -> API cria intent local -> Redis queue -> worker Mercado Pago -> intent recebe providerOrderId
```

Componentes:

- `ComandaTerminalPaymentService`: cria e retorna a intent local.
- `ComandaTerminalPaymentProviderService`: decide entre fila Redis e fallback inline.
- `MercadoPagoTerminalOrderRuntime`: encapsula chaves Redis, delayed retry e dequeue bloqueante.
- `MercadoPagoTerminalOrderWorker`: chama o Mercado Pago fora da requisicao do PDV e atualiza a intent.

Beneficio esperado:

- toque no mobile/PWA retorna mais rapido;
- instabilidade momentanea do Mercado Pago nao derruba a requisicao inicial;
- retry fica centralizado no worker;
- a confirmacao financeira continua dependente de webhook/consulta autenticada, nao do browser.

Como validar:

1. garanta `REDIS_URL` valido no ambiente da API;
2. envie cobranca pelo botao "Enviar para maquininha";
3. confira que a intent nasce `PENDING`;
4. confira nos logs da API que o worker gravou `providerOrderId`;
5. pague na Point;
6. valide webhook -> pagamento local confirmado -> realtime atualiza a comanda.

Se Redis cair, o fallback inline continua existindo, mas esse modo deve aparecer como degradacao operacional nos logs.

## Variaveis

```env
MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_CLIENT_ID=
MERCADO_PAGO_CLIENT_SECRET=
MERCADO_PAGO_POINT_TERMINAL_ID=
MERCADO_PAGO_ORDERS_URL=https://api.mercadopago.com/v1/orders
MERCADO_PAGO_WEBHOOK_SECRET=
```

`MERCADO_PAGO_POINT_TERMINAL_ID` pode ser omitido se o frontend enviar `terminalId` no payload.
`MERCADO_PAGO_WEBHOOK_SECRET` e obrigatorio para aceitar notificacoes externas.
`MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_CLIENT_ID` e `MERCADO_PAGO_CLIENT_SECRET` ficam documentados para o ciclo OAuth/credenciais da conta, mas o fluxo Point server-side usa o `MERCADO_PAGO_ACCESS_TOKEN`.

Para atualizar localmente sem colar segredo no chat:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-mercado-pago-secrets.ps1 -EnvPath .\.env
```

O script solicita cada valor com `Read-Host -AsSecureString` e preserva valores existentes quando voce pressiona Enter. As chaves do Mercado Pago precisam vir do painel do Mercado Pago; o projeto nao gera `public_key`, `access_token`, `client_id`, `client_secret` ou `webhook_secret`.

## Como Descobrir O Terminal ID

A tela de credenciais do Mercado Pago mostra credenciais da aplicacao (`Public Key`, `Access Token`, `Client ID` e `Client Secret`). Ela nao mostra a maquininha fisica.

Para o nosso fluxo de "Enviar para maquininha", o valor correto e o campo `data.terminals[].id` retornado pela API de terminais Point. Ele deve ser salvo como `MERCADO_PAGO_POINT_TERMINAL_ID`.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\list-mercado-pago-terminals.ps1 -EnvPath .\.env
```

Se existir apenas uma maquininha vinculada a conta, o script tambem pode gravar o valor automaticamente no `.env`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\list-mercado-pago-terminals.ps1 -EnvPath .\.env -SaveIfSingle
```

O script le `MERCADO_PAGO_ACCESS_TOKEN` do `.env`, nao imprime o token e lista:

- `terminal_id`: valor que entra em `MERCADO_PAGO_POINT_TERMINAL_ID`;
- `pos_id`: caixa/PDV associado ao terminal;
- `store_id`: loja associada ao terminal;
- `operating_mode`: precisa estar em `PDV` para integracao via API.

Se nenhuma maquininha aparecer, os cenarios mais provaveis sao: token de outra conta, uso de credenciais de teste quando a Point esta em producao, terminal ainda nao vinculado a conta, ou terminal ainda em modo `STANDALONE`.

Se a coluna `operating_mode` vier como `STANDALONE`, o ID esta correto, mas a Point ainda nao esta pronta para receber orders via API. Ative o modo PDV:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-mercado-pago-terminal-pdv.ps1 -EnvPath .\.env
```

Para simular sem alterar a maquininha, use `-WhatIf`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-mercado-pago-terminal-pdv.ps1 -EnvPath .\.env -WhatIf
```

Depois reinicie a maquininha e confirme no aparelho: `Mais opcoes > Configuracoes > Modo de vinculacao`.

O `Webhook_Secret_MercadoPago` nao e o `Client Secret`. Ele precisa ser o segredo da configuracao de Webhooks/assinatura do Mercado Pago. Se esse valor nao bater com o `x-signature` recebido, a API rejeita a notificacao.

## Status de Operação

- O botão operacional deve ser "Enviar para maquininha", sem matar o fluxo manual de fechamento.
- Se houver intent pendente, o usuário deve conseguir cancelar/reenviar somente depois que a API cancelar a order pendente ou reconhecer erro terminal.
- A comanda só deve ir para histórico quando a reconciliação confirmar pagamento aprovado e o fechamento local registrar a modalidade correta.
- A impressão térmica do comprovante operacional depende do navegador/QZ Tray no caixa; o webhook no Oracle apenas confirma o pagamento e atualiza o estado.

## Checklist Oracle

1. Confirmar no ambiente remoto, sem imprimir valores:
   - `MERCADO_PAGO_ACCESS_TOKEN`
   - `MERCADO_PAGO_POINT_TERMINAL_ID`
   - `MERCADO_PAGO_WEBHOOK_SECRET`
   - `REDIS_URL`
2. Confirmar que a maquininha está em modo `PDV`.
3. Configurar o webhook do Mercado Pago para:
   - `https://api.deskimperial.online/api/v1/operations/webhooks/mercado-pago`
4. Fazer uma cobrança real pequena e validar:
   - intent local `PENDING`;
   - webhook recebido com assinatura válida;
   - consulta autenticada `GET /v1/orders/{order_id}`;
   - pagamento local `CONFIRMED`;
   - comanda atualizada em realtime.

## Regra De Seguranca

Nunca aceitar status de pagamento apenas pelo payload do browser. O browser pode pedir a cobranca, mas a confirmacao financeira precisa vir da consulta autenticada ao Mercado Pago ou de webhook assinado.

## Referencias Oficiais

- Create order Point: https://www.mercadopago.com.br/developers/en/reference/in-person-payments/point/orders/create-order/post
- Get order by ID: https://www.mercadopago.com.mx/developers/en/reference/in-person-payments/point/orders/get-order/get
- List terminals Point: https://www.mercadopago.com.br/developers/pt/reference/in-person-payments/point/terminals/get-terminals/get
- Webhook signature: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
