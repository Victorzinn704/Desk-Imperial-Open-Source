# Auditoria de Seguranca - Desk Imperial

**Data:** 2026-04-14
**Escopo:** AppSec, authn/authz, trilha de auditoria e operacao segura

---

## Resumo

A superficie de AppSec melhorou em pontos antigos, mas a leitura profunda confirmou uma falha de autorizacao importante no backend e uma confusao de identidade nas trilhas de auditoria.

Hoje, o maior risco de seguranca nao esta em CVE ou hotspot Sonar aberto; esta em **autorizacao incorreta e identidade operacional ambigua**.

---

## Achados

### S-01 (P0) - `PATCH /auth/profile` permite mutacao do owner por sessao `STAFF`

- **Tipo:** fato confirmado
- **Evidencia:** `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth-session.service.ts`, `apps/api/src/modules/auth/auth-shared.util.ts`
- **Impacto:** escalada de privilegio intra-workspace; funcionario autenticado pode alterar dados do owner/workspace.
- **Confianca:** muito alta
- **Recomendacao:** tornar a rota exclusiva para `OWNER` e separar o fluxo de perfil de funcionario.

### S-02 (P1) - Trilha de auditoria perde o ator real em sessoes `STAFF`

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/api/src/modules/auth/auth-session.service.ts`, `apps/api/src/modules/auth/auth-shared.util.ts`, `apps/api/src/modules/auth/auth.controller.ts`
- **Impacto:** acoes do funcionario podem aparecer como se tivessem sido executadas pelo owner.
- **Confianca:** alta
- **Recomendacao:** separar `actorUserId` de `workspaceOwnerUserId` em auth, auditoria e activity feed.

### S-03 (P0) - Entrega de alerta opcional enfraquece resposta a incidente

- **Tipo:** fato confirmado
- **Evidencia:** `infra/oracle/ops/alertmanager/render-config.sh`, `infra/oracle/ops/.env.example`
- **Impacto:** incidente de seguranca pode nao ser notificado a tempo.
- **Confianca:** alta
- **Recomendacao:** obrigatoriedade de webhook em producao e teste sintetico recorrente.

### S-04 (P2) - Cache de sessao pode sobreviver alguns segundos alem da expiracao real

- **Tipo:** fato confirmado + risco potencial
- **Evidencia:** `apps/api/src/modules/auth/auth-session.service.ts`
- **Impacto:** pequena janela de autenticacao apos expiracao real da sessao.
- **Confianca:** alta
- **Recomendacao:** revalidar `expiresAt` na leitura do cache ou remover o piso de TTL.

### S-05 (P2) - Politica de backup/DR segue insuficiente para continuidade segura

- **Tipo:** fato confirmado
- **Evidencia:** `infra/oracle/README.md`
- **Impacto:** incidente grave ou comprometimento sem RTO/RPO e restore formalizado.
- **Confianca:** alta
- **Recomendacao:** definir backup/restore, teste recorrente e ownership de continuidade.

---

## Itens Revalidados como Melhorados

1. Sonar security hotspots: `0` no baseline atual.
2. `security:audit-runtime`: PASS no allowlist vigente.
3. O ponto antigo de CSRF por prefixo nao se confirmou no codigo atual.

---

## Veredito de Seguranca

Seguranca de aplicacao esta melhor do que no baseline antigo, mas ainda nao esta em nivel confiavel para excelencia. O foco imediato deve ser **authz correta, identidade auditavel e operacao com alerta entregue de verdade**.
