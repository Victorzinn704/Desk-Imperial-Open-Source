# Auditoria Desk Imperial — Master Index

**Data:** 2026-04-10  
**Projeto:** `C:\Users\Desktop\Documents\desk-imperial`  
**Branch:** `master`

---

## Estado Geral

Auditoria consolidada com:

- inventário técnico revalidado
- 6 relatórios especializados em `review_audit/agents/`
- execução local de lint, typecheck, testes críticos, build e scanners
- achados priorizados em `P0-P3`

Os artefatos anteriores de `review_audit/` foram substituídos quando continham drift material.

---

## Status por Domínio

| Domínio | Status | Fonte principal |
| --- | --- | --- |
| Inventário / mapa | CONCLUÍDO | `01_repo_map.md` |
| Hipóteses / lacunas | ATUALIZADO | `02_assumptions_and_unknowns.md` |
| Achados | CONCLUÍDO | `03_findings_log.md` |
| Matriz de risco | CONCLUÍDO | `04_risk_matrix.md` |
| Scorecard | CONCLUÍDO | `05_maturity_scorecard.md` |
| Plano mestre | CONCLUÍDO | `99_master_improvement_plan.md` |
| Backend | CONCLUÍDO | `agents/backend-reviewer.md` |
| Frontend | CONCLUÍDO | `agents/frontend-reviewer.md` |
| Segurança | CONCLUÍDO | `agents/security-reviewer.md` |
| Infra / DevOps | CONCLUÍDO | `agents/infra-devops-reviewer.md` |
| Arquitetura | CONCLUÍDO | `agents/architecture-reviewer.md` |
| QA / Testes | CONCLUÍDO | `agents/qa-test-reviewer.md` |

---

## Comandos Executados

| Comando | Resultado | Observação |
| --- | --- | --- |
| `npm run lint` | PASSOU | sem erros |
| `npm run typecheck` | PASSOU | cache do turbo reaproveitado |
| `npm run repo:scan-public` | FALHOU | apontou risco em `infra/oracle/.env.example` |
| `npm run security:audit-runtime` | FALHOU | encontrou vulnerabilidades high/critical fora do allowlist |
| `npm run test:critical` | PASSOU | backend + web verdes |
| `npm audit --audit-level=high` | FALHOU | 21 vulnerabilidades totais |
| `npm audit --omit=dev --json` | FALHOU | 8 vulnerabilidades de produção |
| `npm run build` | FALHOU | build do web quebrado |
| `npm --workspace @partner/web run test:e2e:critical` | FALHOU | timeout do web server pelo mesmo erro de build |

---

## Divergências Revalidadas contra o Baseline Anterior

1. A API hoje já tem CSP configurado.
2. Health endpoints existem.
3. Migrations Prisma estão versionadas no repositório.
4. O CI atual executa `npm audit`.
5. O problema principal do compose local não é mais o Postgres; é Redis/Grafana com defaults inseguros.

---

## Próximos Passos Imediatos

1. Corrigir `apps/web/app/page.tsx` para restaurar o build.
2. Rotacionar segredos e eliminar plaintext operacional.
3. Corrigir cancelamento concorrente de pedido.
4. Atualizar dependências de runtime vulneráveis.
5. Endurecer logs/CSV/CSRF.

---

## Blockers Reais

Não há bloqueio para continuar analisando o repositório, mas há blockers de entrega:

- o frontend não gera build de produção;
- segredos locais mantêm risco operacional alto;
- rollback/DR permanecem frágeis.
