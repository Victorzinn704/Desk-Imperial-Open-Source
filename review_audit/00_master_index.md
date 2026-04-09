# Auditoria Desk Imperial — Master Index

**Data:** 2026-04-09
**Projeto:** `C:\Users\Desktop\Documents\desk-imperial`
**Branch:** master (main = branch de PRs)
**Escopo:** Full-stack audit (backend, frontend, infra, security, UX, tests, docs)

---

## Status por Dominio

| Dominio          | Fonte        | Status      | Arquivo                            |
| ---------------- | ------------ | ----------- | ---------------------------------- |
| Inventario       | Orquestrador | CONCLUIDO   | `01_repo_map.md`                   |
| Achados          | Orquestrador | CONCLUIDO   | `03_findings_log.md` (24 achados)  |
| Riscos           | Orquestrador | CONCLUIDO   | `04_risk_matrix.md`                |
| Scorecard        | Orquestrador | CONCLUIDO   | `05_maturity_scorecard.md`         |
| Plano            | Orquestrador | CONCLUIDO   | `99_master_improvement_plan.md`    |
| Hipoteses        | Orquestrador | CONCLUIDO   | `02_assumptions_and_unknowns.md`   |
| Backend          | Subagente    | NAO ESCRITO | `agents/backend-review.md`         |
| Frontend         | Subagente    | NAO ESCRITO | `agents/frontend-review.md`        |
| Seguranca        | Subagente    | NAO ESCRITO | `agents/security-review.md`        |
| Infra/DevOps     | Subagente    | NAO ESCRITO | `agents/infra-devops-review.md`    |
| Arquitetura      | Subagente    | NAO ESCRITO | `agents/architecture-review.md`    |
| Manutenibilidade | Subagente    | NAO ESCRITO | `agents/maintainability-review.md` |
| QA/Tests         | Subagente    | NAO ESCRITO | `agents/qa-tests-review.md`        |
| Observabilidade  | Subagente    | NAO ESCRITO | `agents/observability-review.md`   |

**Nota:** Os subagentes lancados nao conseguiram escrever os relatorios devido a mudanca de contexto durante a auditoria (projeto errado → projeto correto). Porem, o orquestrador coletou evidencias diretamente e consolidou todos os achados criticos nos artefatos principais.

## Proximos Passos

1. **IMEDIATO:** Rotacionar credenciais de `.secrets/ops-credentials.txt`
2. **IMEDIATO:** Habilitar `NPM_CONFIG_AUDIT` no CI
3. **IMEDIATO:** Remover senha default do docker-compose
4. **Semana 1-2:** Decompor `auth.service.ts` (2433 → < 800 linhas)
5. **Semana 2-3:** Decompor `operations-helpers.service.ts` (1451 → < 500 linhas)
6. **Semana 3-4:** Separar `api.ts` por dominio (1315 → 6 arquivos < 300 linhas)
7. **Semana 4:** Automatizar deploy Railway via CI

## Blockers

- Nenhum no momento
