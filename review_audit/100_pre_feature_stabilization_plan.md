# Gate de Estabilizacao Antes de Novas Features

**Data:** 2026-04-14
**Status:** ativo
**Objetivo:** manter regressao sob controle enquanto o projeto fecha o backlog restante de qualidade, observabilidade, governanca e hotspots estruturais

---

## 1. Regra de Operacao

Enquanto este gate estiver ativo:

1. novas features grandes continuam em espera;
2. correcoes de qualidade real, observabilidade e governanca tem prioridade;
3. cada lote funcional precisa sair com teste e evidence de comando.

---

## 2. Checklist Obrigatorio por Lote

| Area | Criterio | Estado atual |
| --- | --- | --- |
| Escopo | `npm run quality:scope:strict` verde | atendido anteriormente |
| Contrato | `npm run quality:contracts` verde | atendido em preflight |
| Preflight | `npm run quality:preflight` verde | atendido |
| Coverage Sonar | `npm --workspace @partner/web run test:coverage:sonar` verde | atendido |
| Authz | `PATCH /auth/profile` blindado contra `STAFF` | atendido |
| Integridade | cancelamento com `comandaId` restaurando estoque | atendido |
| Auditoria | ator real separado do owner | atendido |
| Frontend operacional | reconnect + estados `loading/error/offline/empty` corrigidos | atendido no baseline atual |
| Sonar | reduzir `new_violations` e subir `new_coverage` | pendente; servidor local indisponivel nesta rodada |
| Coverage | owner/staff mobile cobertos por gate real | parcial; superficie entrou no baseline, mas web segue em `69.11%` |
| Observabilidade | alerta com entrega validada + dashboards/SLO funcional | parcial; dashboards e alertas de latencia foram versionados |
| Docs operacionais | release + staging + incidente + restore publicados | parcial; release/staging/incidente/rollback publicados, restore pendente |

---

## 3. Comandos Oficiais

Rodar antes de qualquer PR funcional:

```powershell
npm run quality:warnings
npm run quality:scope:strict
npm run quality:contracts
npm run quality:preflight
```

Rodar para fechamento de lote maior:

```powershell
npm run quality:preflight:full
```

---

## 4. Lotes Restantes

### Lote A - Sonar e Coverage

1. restaurar visibilidade do Sonar;
2. tornar `npm run test:coverage` reproduzivel;
3. atacar uncovered lines e warnings nos hotspots tocados.

### Lote B - Observabilidade Funcional

1. validar dashboards `desk.finance.*` e `desk.operations.*` provisionados;
2. complementar alertas com erro/disponibilidade dos fluxos criticos;
3. validacao sintetica de entrega do Alertmanager.

### Lote C - Governanca Operacional

1. exercitar `release-criteria` e o runbook publicado;
2. formalizar backup/restore basico;
3. registrar evidencias de staging e rollback.

### Lote D - Reducao de Hotspots

1. onboarding/auth;
2. `ComandaService`;
3. `DashboardShell` e shells mobile.

---

## 5. Criterio para Liberar Novas Features

O gate so e removido quando:

1. Sonar Gate ficar verde por pelo menos 3 execucoes seguidas;
2. owner/staff mobile estiverem cobertos por gate funcional explicito;
3. alertas criticos tiverem entrega validada;
4. runbooks de release/staging/incidente/restore estiverem publicados;
5. o warning baseline entrar em tendencia real de queda.
