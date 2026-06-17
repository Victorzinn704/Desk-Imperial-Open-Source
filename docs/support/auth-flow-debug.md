# Auth Flow Debug

Use este roteiro para investigar `401`, `403`, CSRF, sessão, role e workspace.

## 1. Fluxo esperado

1. Cliente chama `POST /api/v1/auth/login`.
2. API emite cookie de sessão HttpOnly.
3. API emite cookie CSRF legível pelo cliente.
4. Cliente chama `GET /api/v1/auth/me` para sincronizar sessão.
5. Mutação autenticada envia `X-CSRF-Token` com o valor do cookie CSRF.
6. API valida sessão, origem, CSRF, role e workspace.

Referência: `docs/architecture/authentication-flow.md`.

## 2. `401`

Investigar:

- cookie de sessão ausente;
- cookie de outro domínio;
- sessão expirada;
- sessão revogada;
- chamada para ambiente errado;
- cliente não preserva cookies.

Evidência:

```bash
curl -i -b .cache/cookies.txt http://localhost:4000/api/v1/auth/me
```

## 3. `403`

Investigar:

- usuário autenticado sem permissão;
- staff acessando rota de owner;
- `X-CSRF-Token` ausente ou diferente do cookie;
- Origin/Referer incompatível;
- Admin PIN ausente em ação sensível;
- workspace incorreto.

Evidência:

```bash
curl -i -b .cache/cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-cookie-value>" \
  -X POST http://localhost:4000/api/v1/operations/comandas \
  --data "{\"tableLabel\":\"Mesa 1\",\"participantCount\":2}"
```

## 4. Staff versus owner

Um staff pode estar autenticado e ainda assim receber `403`. Isso é esperado quando a rota exige owner.

Validar:

- `User.role`;
- vínculo em `Employee.loginUserId`;
- owner do workspace;
- endpoint permitido para staff.

Use o playbook SQL:

- `docs/operations/developer-support-sql-audit-playbook.md`

## 5. Comunicação padrão

```text
A requisição foi autenticada, mas falhou na autorização. O usuário atual não possui permissão para essa rota ou a mutação não enviou CSRF válido. O request-id é X. Reproduzimos com a mesma sessão e a resposta foi 403.
```

Não orientar usuário a desabilitar CSRF, relaxar CORS ou compartilhar cookie.
