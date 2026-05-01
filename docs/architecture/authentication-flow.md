# Authentication Flow

**Versao:** 1.1  
**Ultima atualizacao:** 2026-05-01

## 1. Visao geral

O Desk Imperial usa autenticacao por sessao server-side, cookies HttpOnly e CSRF por token duplo.

Fluxo base:

1. login owner, staff ou demo
2. criacao de sessao persistida no backend
3. emissao do cookie de sessao + cookie CSRF
4. `SessionGuard` para leitura protegida
5. `SessionGuard + CsrfGuard` para mutacoes

O runtime atual **nao** usa JWT como credencial principal do portal.

---

## 2. Endpoints atuais de auth

Os endpoints publicos da borda `auth` hoje sao:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/demo`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/verify-email/request`
- `POST /api/v1/auth/verify-email/confirm`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/profile`
- `GET /api/v1/auth/activity`
- `GET /api/v1/auth/activity-feed`

---

## 3. Sessao e cookies

### 3.1 Cookies atuais

Em desenvolvimento:

- sessao: `partner_session`
- csrf: `partner_csrf`

Em producao:

- sessao: `__Host-partner_session`
- csrf: `__Host-partner_csrf`

Todos os cookies usam:

- `path=/`
- `HttpOnly=true` para a sessao
- `HttpOnly=false` para o cookie CSRF
- `sameSite=lax` por padrao
- `secure=true` automaticamente em producao

### 3.2 `GET /auth/me`

O endpoint de sessao atual:

- reemite o cookie CSRF quando necessario
- devolve o `AuthContext`
- devolve tambem `csrfToken` no body para o cliente usar nas mutacoes

Esse endpoint e a forma padrao do frontend sincronizar sessao + token CSRF.

---

## 4. Fluxo de login

```text
frontend
  -> POST /api/v1/auth/login
  -> backend valida credenciais
  -> AuthSessionService.createSession(...)
  -> backend persiste a sessao
  -> backend emite cookies de sessao e csrf
  -> frontend consulta /api/v1/auth/me
  -> fluxo autenticado segue com SessionGuard / CsrfGuard
```

O mesmo padrao vale para:

- login demo (`POST /auth/demo`)
- login STAFF vinculado a `Employee`

---

## 5. Fluxo de logout e revogacao

### 5.1 Logout

`POST /api/v1/auth/logout` hoje faz:

1. fecha grant demo se existir
2. marca a sessao como revogada no banco
3. limpa cookie de sessao
4. limpa cookie CSRF
5. limpa cookie de prova do Admin PIN
6. grava audit log
7. invalida cache da sessao
8. derruba sockets realtime rastreados por `sessionId`
9. refresca caches derivados do workspace

### 5.2 Revogacao indireta

Quando um funcionario e desativado ou perde acesso:

- sessoes relacionadas sao revogadas
- caches de sessao sao invalidados
- sockets realtime associados sao desconectados explicitamente

Esse detalhe importa porque o sistema hoje nao confia apenas no heartbeat do socket para encerrar sessao revogada.

---

## 6. CSRF

O `CsrfGuard` protege mutacoes autenticadas.

Validacoes principais:

- sessao autenticada
- origem/referer permitidos
- cookie CSRF presente
- header `X-CSRF-Token` presente
- comparacao segura entre o token esperado e o token enviado

Sem CSRF valido, a mutacao falha com erro de autorizacao.

---

## 7. Rate limiting

`AuthRateLimitService` aplica controle por Redis em:

- login
- solicitacao de reset
- validacao de codigo de reset
- solicitacao de verify-email
- validacao de codigo de verify-email
- churn de conexao realtime

Detalhe atual:

- login e fluxos criticos falham fechado se o cache obrigatorio estiver indisponivel
- realtime usa politica fail-open para nao travar completamente o connect quando o cache oscila

---

## 8. Verify-email e reset de senha

### Verify-email

1. `POST /api/v1/auth/verify-email/request`
2. backend gera codigo OTP com TTL
3. entrega por email
4. `POST /api/v1/auth/verify-email/confirm`
5. backend valida codigo, tentativas e expiracao

### Reset de senha

1. `POST /api/v1/auth/forgot-password`
2. backend gera token/codigo de reset
3. entrega por email
4. `POST /api/v1/auth/reset-password`
5. backend redefine a senha e registra auditoria

Os dois fluxos usam rate limit e audit log.

---

## 9. Cache de sessao

O runtime atual usa dois tipos de cache:

### 9.1 Cache positivo

- chave por `tokenHash`
- chave por `sessionId`
- TTL curto (`SESSION_CACHE_TTL_SECONDS`)

### 9.2 Cache negativo

Tambem existe cache negativo curto para tokens:

- ausentes
- revogados
- expirados
- inativos
- orfaos

Esse ponto evita bater no banco toda vez que um token invalido e repetido em loop.

---

## 10. Admin PIN

O Admin PIN e um fluxo separado, mas dependente da sessao autenticada.

Estado atual:

- PIN guardado com hash server-side
- verificacao via `POST /api/v1/admin/verify-pin`
- prova curta emitida em cookie HttpOnly
- `AdminPinGuard` ou verificacao de prova em fluxo especifico
- nao existe JWT exposto ao browser nesse fluxo

Cookies do Admin PIN:

- dev: `partner_admin_pin`
- prod: `__Host-partner_admin_pin`

---

## 11. Realtime e auth

O gateway de realtime operacional usa a mesma sessao do portal.

Aceita credencial por:

- cookie da sessao
- `Authorization`
- `X-Access-Token`
- `handshake.auth.token`

Na reconexao ou revogacao:

- tokens invalidos podem cair no negative cache
- sessao revogada derruba o socket rastreado
- o frontend trata `operations.error` como falha semantica de sessao/realtime

---

## 12. Regras de evolucao

- nao reintroduzir JWT no portal sem mudar o documento e os guards
- manter logout/revogacao desconectando sockets ativos
- preservar CSRF em toda mutacao autenticada
- sempre validar `auth.controller.ts`, `auth-session.service.ts` e `auth-rate-limit.service.ts` antes de alterar esta documentacao
