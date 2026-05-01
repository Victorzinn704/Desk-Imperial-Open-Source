# Auditoria Backend - Desk Imperial

**Data:** 2026-04-14
**Escopo:** auth, sessao, orders, finance cache e integridade funcional

---

## Resumo

O backend nao esta apenas com "riscos de consistencia". A leitura atual confirmou dois defeitos graves de comportamento:

1. falha de autorizacao em `PATCH /auth/profile`;
2. cancelamento de pedido originado por comanda sem restauracao de estoque.

Tambem ha risco real de identidade de auditoria incorreta e janela curta de sessao stale por cache.

---

## Achados

### B-01 (P0) - `PATCH /auth/profile` aceita `STAFF` e altera o workspace do owner

- **Tipo:** fato confirmado
- **Evidencia:** `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth-session.service.ts`, `apps/api/src/modules/auth/auth-shared.util.ts`
- **Leitura:** a rota usa apenas sessao + CSRF; `updateProfile()` nao chama `assertOwnerRole()`. Em sessao `STAFF`, o contexto serializado carrega `userId` do owner.
- **Impacto:** escalada de privilegio intra-workspace; funcionario pode alterar nome da empresa, nome do responsavel e moeda do owner.
- **Confianca:** muito alta
- **Recomendacao:** tornar a rota `OWNER`-only e separar o fluxo de perfil do staff.

### B-02 (P1) - A identidade do ator real se perde em sessoes `STAFF`

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/api/src/modules/auth/auth-session.service.ts`, `apps/api/src/modules/auth/auth-shared.util.ts`, `apps/api/src/modules/auth/auth.controller.ts`
- **Leitura:** o contexto distingue `workspaceOwnerUserId`, mas `userId` continua apontando para o owner; endpoints de atividade usam `auth.userId`.
- **Impacto:** auditoria e activity feed podem refletir acoes do funcionario como se fossem do owner.
- **Confianca:** alta
- **Recomendacao:** separar `actorUserId` de `workspaceOwnerUserId` no `AuthContext`.

### B-03 (P0) - Cancelamento de pedido com `comandaId` nao reverte inventario

- **Tipo:** fato confirmado
- **Evidencia:** `apps/api/src/modules/orders/orders.service.ts`, `apps/api/src/modules/operations/operations-comanda-helpers.utils.ts`
- **Leitura:** o consumo de estoque acontece no fluxo que gera o pedido da comanda; o cancelamento restaura estoque apenas quando `order.comandaId` e nulo.
- **Impacto:** dados de estoque podem ficar permanentemente divergentes apos cancelamento aceito.
- **Confianca:** muito alta
- **Recomendacao:** bloquear o fluxo ate haver reversao correta, ou implementar reversao transacional equivalente ao consumo.

### B-04 (P1) - `updateProfile()` nao invalida caches derivados do workspace

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth-session.service.ts`, `apps/api/src/common/services/cache.service.ts`, `apps/api/src/modules/finance/pillars.service.ts`
- **Leitura:** a mutacao limpa apenas a sessao atual; `finance`, `pillars`, `orders`, `products` e `operations` continuam dependentes de cache indexado por usuario.
- **Impacto:** moeda e dados de perfil podem seguir stale por TTL, inclusive em leitura financeira.
- **Confianca:** alta
- **Recomendacao:** criar invalidacao central do workspace para alteracoes de perfil/moeda.

### B-05 (P2) - Cache de sessao pode aceitar expiracao real por alguns segundos

- **Tipo:** fato confirmado + risco potencial
- **Evidencia:** `apps/api/src/modules/auth/auth-session.service.ts`
- **Leitura:** `cacheAuthSession()` aplica piso de `5` segundos e `validateSessionToken()` devolve cache sem revalidar `expiresAt`.
- **Impacto:** janela curta, mas real, de autenticacao alem do que o banco permite.
- **Confianca:** alta
- **Recomendacao:** carregar `expiresAt` no cache e validar na leitura, ou remover o piso de TTL.

---

## Pontos Positivos Revalidados

1. A revogacao de sessao de funcionario arquivado continua implementada via `employees.service -> revokeEmployeeSessions`.
2. O cancelamento usa transacao serializable e tenta evitar corrida simples de duplo cancelamento.
3. O ponto antigo de CSRF por prefixo nao se confirmou no codigo atual.

---

## Veredito Backend

O backend tem base boa, mas ainda nao merece selo de confiabilidade alta. O proximo ciclo deve priorizar **authz correta, identidade auditavel e integridade de estoque** antes de qualquer refactor estrutural amplo.
