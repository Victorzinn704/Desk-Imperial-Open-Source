# HTTP Request Examples

A fonte completa está em:

- `docs/operations/developer-support-http-examples.md`

Esta página existe para descoberta rápida por quem procura `docs/support`.

## Sequência mínima

```bash
curl -i http://localhost:4000/api/v1/health
curl -s http://localhost:4000/api/v1/openapi.json -o .cache/openapi-local.json
curl -i -b .cache/cookies.txt http://localhost:4000/api/v1/auth/me
```

## Mutação autenticada

Mutações exigem cookie de sessão e CSRF:

```bash
curl -i -b .cache/cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-cookie-value>" \
  -X POST http://localhost:4000/api/v1/operations/comandas \
  --data "{\"tableLabel\":\"Mesa 1\",\"participantCount\":2}"
```

## Postman/Insomnia

Use a coleção inicial:

- `docs/api/desk-imperial-support.postman_collection.json`

Quando possível, importe também o OpenAPI atual (`/api/v1/openapi.json`) para evitar drift.
