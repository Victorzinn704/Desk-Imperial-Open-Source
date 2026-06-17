# Developer Support Case Studies

**Objetivo:** registrar padrões de investigação que conectam API, logs, SQL read-only, regra de negócio e comunicação técnica.

Os casos abaixo são modelos de diagnóstico baseados nos fluxos reais do Desk Imperial. Eles não substituem investigação de incidente real; servem como roteiro para reproduzir e documentar causa raiz.

## Caso 1 — `401` em `/api/v1/auth/me`

### Sintoma

Cliente informa que o frontend está deslogando ou que chamadas autenticadas retornam `401`.

### Investigação

1. Reproduzir `GET /api/v1/auth/me` com cookie jar.
2. Verificar se a resposta tem `x-request-id`.
3. Confirmar se o login anterior retornou `Set-Cookie`.
4. Consultar sessões recentes do usuário em modo read-only.
5. Conferir domínio/base URL usado pelo cliente.

### Evidência esperada

- sem cookie de sessão: problema no cliente/domínio;
- sessão expirada/revogada: fluxo normal de autenticação;
- sessão válida no banco, mas API retorna `401`: investigar guard de sessão e cookie parsing.

### Resposta técnica

```text
O endpoint /auth/me retornou 401 porque a requisição não enviou cookie de sessão válido. Reproduzimos com o mesmo fluxo usando cookie jar e a chamada autenticada passou. Ajuste o cliente para preservar cookies entre login e chamadas subsequentes.
```

## Caso 2 — Funcionário recebe `403` em endpoint de owner

### Sintoma

Usuário staff consegue logar, mas falha ao acessar dados administrativos.

### Investigação

1. Identificar endpoint e método.
2. Confirmar role do usuário.
3. Consultar vínculo `Employee.loginUserId`.
4. Verificar se o endpoint é permitido para staff.
5. Reproduzir com sessão owner e sessão staff.

### Evidência esperada

- staff recebe `403` em endpoint administrativo;
- owner recebe `200`;
- não há exposição de dados de outro workspace.

### Resposta técnica

```text
A resposta 403 está correta para esse endpoint: o usuário autenticado é funcionário e a rota é restrita ao owner. Para o fluxo staff, use as superfícies operacionais permitidas ou ajuste a regra de permissão via mudança de produto.
```

## Caso 3 — Payload inválido em criação de produto

### Sintoma

Integração externa envia produto e recebe erro de validação.

### Investigação

1. Capturar payload sanitizado.
2. Comparar com `/api/v1/openapi.json`.
3. Verificar campos monetários, `barcode`, `category`, `unitCost`, `unitPrice` e `stock`.
4. Confirmar duplicidade de `name` ou `barcode` no workspace.

### Evidência esperada

- erro de contrato quando campo obrigatório está ausente;
- conflito quando `name` ou `barcode` já existem no workspace;
- produto criado quando payload segue contrato.

### Resposta técnica

```text
O payload não segue o contrato atual da API. O campo X está ausente/em formato incompatível. Use o OpenAPI vigente em /api/v1/openapi.json para ajustar o cliente e repita a chamada com x-request-id anexado.
```

## Caso 4 — Comanda retorna `409` ao abrir mesa

### Sintoma

Usuário tenta abrir uma comanda e recebe conflito.

### Investigação

1. Verificar `tableLabel` e `mesaId`, quando houver.
2. Consultar comandas abertas do workspace.
3. Confirmar status da mesa/comanda.
4. Conferir se existe sessão de caixa exigida para o fluxo.

### Evidência esperada

- mesa já associada a comanda aberta;
- estado operacional impede nova comanda;
- erro de regra de negócio, não bug de autenticação.

### Resposta técnica

```text
A API retornou 409 porque já existe comanda aberta para essa mesa no workspace. O comportamento protege o salão contra duplicidade operacional. Feche ou mova a comanda existente antes de abrir outra.
```

## Caso 5 — Item de comida não aparece na cozinha

### Sintoma

Comanda recebeu item, mas cozinha/PWA não atualizou.

### Investigação

1. Confirmar resposta da mutação que adicionou item.
2. Consultar `ComandaItem` por `comandaId`.
3. Verificar `Product.requiresKitchen`.
4. Conferir `kitchenStatus`, `kitchenQueuedAt` e `GET /operations/kitchen`.
5. Conferir evento realtime `kitchen.item.queued`.

### Evidência esperada

- se `requiresKitchen=false`, o item não deve ir à cozinha;
- se `requiresKitchen=true` e `kitchenStatus IS NULL`, há falha de regra;
- se banco está correto e UI não atualiza, investigar cache/realtime.

### Resposta técnica

```text
O item foi persistido na comanda. A investigação agora separa duas hipóteses: regra de cozinha não marcou kitchenStatus ou o PWA não aplicou o snapshot/evento. A query read-only e o x-request-id vão indicar qual caminho seguir.
```

## Caso 6 — Pagamento Point aprovado não fecha comanda

### Sintoma

Cliente paga na maquininha, mas a comanda continua aberta.

### Investigação

1. Consultar `PaymentTerminalIntent` da comanda.
2. Confirmar `providerOrderId`, `providerPaymentId`, `providerStatus`.
3. Verificar webhook recebido com assinatura válida.
4. Conferir logs do worker e fila Redis.
5. Verificar `ComandaPayment` confirmado.

### Evidência esperada

- intent `PENDING` sem provider: worker não criou order;
- provider aprovado sem `ComandaPayment`: reconciliação falhou;
- webhook inválido: assinatura/secret/configuração;
- pagamento confirmado: problema de UI/realtime.

### Resposta técnica

```text
O browser apenas cria a intenção de pagamento. A confirmação financeira depende do webhook assinado ou da consulta autenticada ao Mercado Pago. A intent está em status X, então o próximo passo é validar webhook/worker/reconciliação antes de fechar a comanda.
```

## Caso 7 — Webhook duplicado

### Sintoma

Mesmo evento externo chega mais de uma vez.

### Investigação

1. Confirmar `externalReference` e idempotency key.
2. Consultar intents por `externalReference`.
3. Verificar se já existe `ComandaPayment` confirmado.
4. Conferir logs do webhook com `x-request-id`.

### Evidência esperada

- múltiplas entregas do provider não podem gerar múltiplos pagamentos locais;
- idempotência deve impedir duplicidade financeira;
- se duplicou pagamento, incidente crítico.

### Resposta técnica

```text
Receber webhook duplicado é esperado em integrações externas. O comportamento correto é processar idempotentemente. A investigação valida se a duplicidade ficou limitada ao evento ou se alterou estado financeiro.
```

## Caso 8 — Barcode não reconhecido no cadastro rápido

### Sintoma

Usuário escaneia ou digita EAN e o produto não preenche.

### Investigação

1. Normalizar barcode.
2. Testar rota interna `/api/barcode/lookup`.
3. Conferir provider usado e timeout.
4. Verificar se o produto já existe por `barcode`.
5. Validar fallback manual de cadastro.

### Evidência esperada

- provider externo sem dado: fallback manual é comportamento correto;
- rota interna falhando: investigar sessão/auth ou provider chain;
- produto já cadastrado: responder conflito/duplicidade.

### Resposta técnica

```text
O lookup por EAN depende de fontes externas e pode não retornar todos os produtos. Quando não houver correspondência confiável, o cadastro manual deve continuar disponível. Se a rota interna falhar com sessão válida, anexar x-request-id para investigar.
```

## Caso 9 — API responde certo, mas PWA mostra estado antigo

### Sintoma

`operations/live` ou `operations/kitchen` retorna dados corretos, mas a tela mobile não atualiza.

### Investigação

1. Comparar resposta REST com tela.
2. Verificar cache React Query.
3. Conferir evento Socket.IO.
4. Checar service worker e rede do Android.
5. Reproduzir em notebook e mobile.

### Evidência esperada

- REST correto + UI errada: problema frontend/cache;
- REST errado: problema backend/query;
- evento ausente: problema realtime/fan-out;
- evento recebido e não aplicado: patcher/cache.

### Resposta técnica

```text
A API já contém o estado correto, então a falha está no caminho cliente: cache, realtime ou service worker. A correção deve preservar o fallback REST e medir o tempo entre mutação, evento e render.
```

## Como manter este documento útil

Adicionar um novo caso quando:

- a falha se repetir;
- houver diagnóstico com `x-request-id`, SQL e logs;
- a causa raiz virar mudança de código, contrato ou documentação;
- o caso ajudar outro desenvolvedor a não repetir a mesma investigação.
