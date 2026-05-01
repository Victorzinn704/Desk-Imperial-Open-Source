# Arquitetura de Segurança — Desk Imperial

**Versão:** 1.1  
**Última atualização:** 2026-05-01

---

## Visão geral

A segurança do Desk Imperial é construída em camadas. Cada camada resolve um problema diferente e opera de forma independente — a falha de uma não compromete as outras.

```
┌─────────────────────────────────────────────────────┐
│                    Requisição HTTP                  │
├─────────────────────────────────────────────────────┤
│  1. Rate Limit (Redis)     → bloqueia abuso         │
│  2. Origin Check           → bloqueia CSRF externo  │
│  3. SessionGuard           → valida sessão ativa     │
│  4. CsrfGuard              → valida token CSRF       │
│  5. AdminPinGuard          → valida ação sensível    │
│  6. Workspace Isolation    → filtra por tenant       │
│  7. Audit Log              → registra evento         │
└─────────────────────────────────────────────────────┘
```

---

## 1. Sessão e cookies

### Como funciona

A autenticação usa uma **sessão opaca** com cookie HttpOnly. O browser não acessa o token de sessão via JavaScript.

**Cookies emitidos no login:**

| Cookie                                                    | Flags                                  | Conteúdo                                                     |
| --------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `partner_session` (dev) / `__Host-partner_session` (prod) | HttpOnly, Secure em prod, SameSite=Lax | Token opaco aleatório da sessão                              |
| `partner_csrf` (dev) / `__Host-partner_csrf` (prod)       | Secure em prod, SameSite=Lax           | Token CSRF legível pelo cliente para mutações                |
| `partner_admin_pin` / `__Host-partner_admin_pin`          | HttpOnly, Secure em prod, SameSite=Lax | Prova curta de verificação do Admin PIN para ações sensíveis |

O token opaco da sessão é persistido na entidade `Session` com `tokenHash` no banco. A cada requisição autenticada, o `SessionGuard` e o `AuthSessionService` validam:

1. o cookie de sessão existe
2. o token resolve para uma sessão ativa
3. a sessão não está expirada nem revogada
4. o ator autenticado continua ativo e autorizado

**Cache de sessão:** o contexto de autenticação é cacheado por `tokenHash` e `sessionId`, com invalidação no logout/revogação. O caminho de autenticação também usa negative cache curto para reduzir churn de token inválido em reconnect e brute force.

---

## 2. CSRF (Cross-Site Request Forgery)

### O problema que resolve

Um site malicioso poderia forçar o browser do usuário a fazer uma requisição autenticada usando os cookies já existentes. O CSRF token impede isso.

### Como funciona — Double Submit Cookie

```
Login
  → servidor emite: cookie de sessão (HttpOnly) + cookie CSRF (legível)

Mutação (POST/PATCH/DELETE)
  → frontend lê o cookie CSRF via JavaScript
  → frontend envia como header: X-CSRF-Token
  → servidor compara: cookie CSRF == header == token esperado para a sessão
```

O `CsrfGuard` executa verificações com `timingSafeEqual` (resistente a timing attacks):

1. `cookieToken == headerToken` — garante que o header veio de código que leu o cookie
2. `cookieToken == expectedToken` — garante que o token pertence à sessão atual

O token esperado é derivado do `sessionId` via HMAC-SHA256 com `CSRF_SECRET` ou, em fallback controlado, `COOKIE_SECRET`.

### Verificação de origin

Além do double-submit, o `CsrfGuard` também valida o header `Origin` (ou `Referer`) da requisição. Origens não listadas em `ALLOWED_ORIGINS` são rejeitadas com HTTP 403 antes de qualquer verificação de token.

---

## 3. Senhas e hashing

Todas as senhas são armazenadas com **argon2id** — o vencedor do Password Hashing Competition e recomendação atual do OWASP.

```typescript
// argon2id com parâmetros padrão
const hash = await argon2.hash(password, { type: argon2.argon2id })
const valid = await argon2.verify(hash, inputPassword)
```

O Admin PIN também usa argon2id — o hash fica no campo `adminPinHash` do usuário.

Nenhuma senha, token ou PIN aparece em logs. Campos sensíveis são redigidos antes de qualquer output.

---

## 4. Rate Limiting

Implementado via Redis pelo `AuthRateLimitService`. Cada endpoint sensível tem sua própria política:

| Endpoint                   | Limite       | Janela | Lock   |
| -------------------------- | ------------ | ------ | ------ |
| Login                      | 5 tentativas | 15 min | 15 min |
| Reset de senha (solicitar) | 3 tentativas | 15 min | 15 min |
| Reset de senha (código)    | 5 tentativas | 15 min | 15 min |
| Verificação de e-mail      | 5 tentativas | 15 min | 15 min |
| Admin PIN                  | 3 tentativas | 5 min  | 5 min  |

**Graceful degradation:** se o Redis estiver indisponível, o rate limit não funciona — mas o sistema continua operando. O risco é aceito em favor da disponibilidade.

A chave de rate limit para login é baseada no e-mail normalizado (não no IP), o que evita falsos positivos por IPs compartilhados (NAT corporativo, etc.).

---

## 5. Admin PIN

Protege ações sensíveis que um funcionário não deveria executar sem autorização do dono: aplicar desconto acima do limite, cancelar pedido, etc.

### Fluxo de verificação

```
1. Frontend solicita verificação: `POST /api/v1/admin/verify-pin`
2. Servidor valida o PIN contra o hash (argon2id)
3. Se correto:
   → gera um `challengeId` único
   → registra a prova efêmera no Redis com TTL
   → emite um cookie HttpOnly curto com a prova da verificação
4. A ação protegida é liberada
5. `AdminPinGuard` verifica a prova curta e o vínculo com a sessão/workspace
```

### O que fica no cookie

O cookie de verificação contém um objeto serializado com:

- `challengeId` — UUID único por verificação
- `workspaceOwnerUserId` — garante que a verificação pertence ao workspace certo
- `sessionId` — amarra a verificação à sessão ativa
- `pinFingerprint` — fingerprint do hash do PIN (detecta PIN alterado)
- `issuedAt` / `expiresAt` — validade da verificação

**O PIN em si nunca sai do servidor.** O cookie apenas prova que a verificação aconteceu.

### Anti-brute-force

Após 3 tentativas incorretas em 5 minutos, o PIN é bloqueado por 5 minutos. O estado fica no Redis. Se o Redis estiver indisponível, o sistema rejeita a verificação por precaução.

---

## 5.1 Realtime autenticado

O runtime de Socket.IO operacional usa o mesmo modelo de sessão do portal. O handshake aceita, nesta ordem:

1. `handshake.auth.token`
2. `handshake.auth.bearer`
3. `handshake.auth.accessToken`
4. header `Authorization: Bearer ...`
5. header `X-Access-Token`
6. cookie de sessão (`partner_session` / `__Host-partner_session`)

Se a sessão estiver inválida, expirada ou revogada, o namespace `/operations` rejeita a conexão.

---

## 6. Isolamento de workspace (multi-tenant)

Todas as queries de negócio filtram por `companyOwnerId`. Não existe query que retorne dados de múltiplos workspaces em uma única resposta.

O `companyOwnerId` vem exclusivamente do contexto de autenticação (`auth.companyOwnerId`) — nunca de parâmetros fornecidos pelo cliente.

```typescript
// Padrão em todos os services de negócio
const data = await this.prisma.order.findMany({
  where: {
    companyOwnerId: auth.companyOwnerId, // do contexto de sessão
    // ...outros filtros
  },
})
```

Funcionários (`STAFF`) têm acesso restrito por role — mesmo autenticados, não acessam financeiro, folha, configurações nem dados de outros workspaces.

---

## 7. Audit Log

Eventos críticos são registrados na tabela `AuditLog` com:

- Tipo do evento (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `PIN_VERIFIED`, `PIN_FAILED`, etc.)
- Severidade (`INFO`, `WARN`, `ERROR`)
- `userId` associado
- IP e User-Agent (quando disponível)
- Timestamp

O log é append-only — não existe endpoint de deleção de audit log.

**Eventos registrados:**

| Evento                         | Severidade |
| ------------------------------ | ---------- |
| Login com sucesso              | INFO       |
| Falha de login                 | WARN       |
| Conta bloqueada por rate limit | WARN       |
| Reset de senha solicitado      | INFO       |
| Reset de senha concluído       | INFO       |
| E-mail verificado              | INFO       |
| Admin PIN verificado           | INFO       |
| Admin PIN inválido             | WARN       |
| Admin PIN bloqueado            | WARN       |

---

## 8. Proteção de campos sensíveis em logs

O sistema usa `sanitizePlainText` e redação explícita antes de qualquer output de log. Campos como `password`, `pin`, `token`, `hash`, `secret` nunca aparecem em logs — são substituídos por `[REDACTED]`.

---

## 9. Variáveis de ambiente críticas para segurança

| Variável         | Uso                                          | Risco se vazar                                |
| ---------------- | -------------------------------------------- | --------------------------------------------- |
| `COOKIE_SECRET`  | Endurece derivação e integridade de cookies  | Enfraquece a proteção de sessão/CSRF          |
| `CSRF_SECRET`    | Deriva tokens CSRF por sessão                | Permite bypass de CSRF                        |
| `ENCRYPTION_KEY` | Cifra campos sensíveis protegidos no backend | Exposição de dados criptografados em repouso  |
| `DATABASE_URL`   | Conexão direta ao banco                      | Acesso total aos dados                        |
| `REDIS_URL`      | Conexão ao Redis                             | Acesso ao cache, rate limit e provas efêmeras |

Nenhuma dessas variáveis vai para o cliente. O `.env.example` contém apenas valores de placeholder.

---

## Limitações conhecidas

- **Sem alertas automáticos:** eventos de segurança são registrados no audit log, mas não geram notificações em tempo real. Um ataque em andamento pode não ser detectado rapidamente. Ver [risks-and-limitations.md](../product/risks-and-limitations.md#s-01--sem-alertas-de-segurança-automáticos-em-produção).
- **Rate limit depende do Redis:** se o Redis cair, o rate limit para de funcionar. O risco é aceito em favor da disponibilidade.
- **Sessão baseada em cookie:** o sistema não suporta autenticação via token Bearer (não há API pública). Isso é intencional — o produto é uma aplicação web, não uma API de terceiros.

---

## Reportar uma vulnerabilidade

Não abra uma issue pública. Veja o processo completo em [SECURITY.md](../../SECURITY.md).
