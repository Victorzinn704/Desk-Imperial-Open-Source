# Exemplos HTTP Para Suporte A Desenvolvedores

**Base local sugerida:** `http://localhost:4000/api/v1`  
**Contrato:** `GET /api/v1/openapi.json` e UI em `/api/v1/docs`.

Todos os exemplos usam dados fictícios. Não cole cookies, tokens, PINs ou credenciais reais em documentação, issue ou chat.

## 1. Health check

```bash
curl -i http://localhost:4000/api/v1/health
```

Uso esperado:

- confirmar que a API responde;
- verificar headers públicos;
- capturar `x-request-id` quando presente.

## 2. Consultar OpenAPI

```bash
curl -s http://localhost:4000/api/v1/openapi.json -o .cache/openapi-local.json
```

No Postman ou Insomnia, prefira importar o OpenAPI atual em vez de manter uma coleção manual que pode ficar com drift.

## 3. Login com cookie jar

```bash
curl -i -c .cache/cookies.txt \
  -H "Content-Type: application/json" \
  -X POST http://localhost:4000/api/v1/auth/login \
  --data "{\"email\":\"owner@example.com\",\"loginMode\":\"OWNER\",\"password\":\"<senha-demo>\"}"
```

Verificar:

- `Set-Cookie` de sessão;
- cookie CSRF legível pelo cliente;
- `x-request-id`;
- status `200` ou erro de autenticação claro.

## 4. Validar sessão

```bash
curl -i -b .cache/cookies.txt http://localhost:4000/api/v1/auth/me
```

Se retornar `401`, investigar:

- cookie jar vazio;
- domínio/base URL diferente;
- sessão expirada;
- ambiente errado;
- browser bloqueando cookie.

## 5. Mutação sem CSRF para reproduzir `403`

Este teste valida a proteção, não deve ser tratado como bug.

```bash
curl -i -b .cache/cookies.txt \
  -H "Content-Type: application/json" \
  -X POST http://localhost:4000/api/v1/operations/comandas \
  --data "{\"tableLabel\":\"Mesa 1\",\"participantCount\":2}"
```

Resultado esperado:

- `403` quando a rota exige CSRF;
- corpo com erro rastreável;
- `x-request-id` para logs.

## 6. Mutação com CSRF

Extraia o valor do cookie CSRF da sessão e envie no header `X-CSRF-Token`.

```bash
curl -i -b .cache/cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-cookie-value>" \
  -X POST http://localhost:4000/api/v1/operations/comandas \
  --data "{\"tableLabel\":\"Mesa 1\",\"participantCount\":2}"
```

Se ainda retornar `403`, investigar:

- cookie CSRF diferente do header;
- Origin/Referer incompatível;
- sessão de outro ambiente;
- usuário sem permissão para a ação.

## 7. Listar produtos

```bash
curl -i -b .cache/cookies.txt http://localhost:4000/api/v1/products
```

Uso em suporte:

- verificar se o workspace tem catálogo;
- confirmar se o usuário autenticado enxerga os próprios produtos;
- comparar resposta da API com UI do PWA.

## 8. Cadastro de produto mínimo

```bash
curl -i -b .cache/cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-cookie-value>" \
  -X POST http://localhost:4000/api/v1/products \
  --data "{
    \"name\":\"Produto Demo\",
    \"category\":\"Bebidas\",
    \"unitCost\":3.50,
    \"unitPrice\":7.00,
    \"stock\":10,
    \"barcode\":\"7890000000000\"
  }"
```

Se falhar:

- validar contrato no OpenAPI;
- conferir campos monetários;
- conferir duplicidade de `name` ou `barcode` no workspace.

## 9. Abrir comanda

```bash
curl -i -b .cache/cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-cookie-value>" \
  -X POST http://localhost:4000/api/v1/operations/comandas \
  --data "{\"tableLabel\":\"Mesa 3\",\"participantCount\":2}"
```

Investigar `409` quando:

- mesa já está ocupada;
- caixa/sessão operacional está incompatível;
- existe regra de negócio impedindo o estado solicitado.

## 10. Adicionar item na comanda

```bash
curl -i -b .cache/cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-cookie-value>" \
  -X POST http://localhost:4000/api/v1/operations/comandas/<comandaId>/items \
  --data "{\"productId\":\"<productId>\",\"quantity\":1}"
```

Depois validar:

- `GET /api/v1/operations/kitchen` quando o produto exige cozinha;
- `GET /api/v1/operations/live` para salão/PWA;
- evento realtime no cliente;
- `ComandaItem.kitchenStatus` no banco.

## 11. Snapshot operacional

```bash
curl -i -b .cache/cookies.txt \
  "http://localhost:4000/api/v1/operations/live?includeCashMovements=false&compactMode=true"
```

Uso em suporte:

- diferenciar problema de API versus problema de render/cache no frontend;
- medir tamanho de payload;
- confirmar se a API já contém o estado esperado.

## 12. Fila de cozinha

```bash
curl -i -b .cache/cookies.txt http://localhost:4000/api/v1/operations/kitchen
```

Se a cozinha não recebeu item:

- confirmar `Product.requiresKitchen`;
- confirmar `ComandaItem.kitchenStatus`;
- conferir logs da mutação;
- conferir se o PWA está usando cache antigo.

## 13. Intent de pagamento Point

```bash
curl -i -b .cache/cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-cookie-value>" \
  -X POST http://localhost:4000/api/v1/operations/comandas/<comandaId>/terminal-payment-intents \
  --data "{\"method\":\"DEBIT\",\"amount\":25.00}"
```

Regra de suporte:

- o browser cria a intenção;
- a confirmação financeira depende de webhook assinado ou consulta autenticada ao Mercado Pago;
- nunca tratar resposta do browser como pagamento confirmado.

## 14. Teste de permissão comum

Com sessão de funcionário, tente endpoint de owner. O esperado é `403` quando a rota não for permitida para staff.

```bash
curl -i -b .cache/staff-cookies.txt http://localhost:4000/api/v1/employees
```

Se retornar dados de outro workspace ou função não permitida, tratar como falha de autorização e abrir investigação de segurança.

## 15. Padrão de resposta técnica

```text
Endpoint: POST /api/v1/operations/comandas
Status: 403
x-request-id: req_...
Causa provável: mutação autenticada sem CSRF válido.
Como reproduzimos: curl sem X-CSRF-Token retornou 403; curl com cookie/header válidos avançou.
Próximo passo: garantir envio do cookie CSRF no header X-CSRF-Token e repetir a chamada.
```
