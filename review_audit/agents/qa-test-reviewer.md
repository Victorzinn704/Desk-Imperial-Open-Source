# Auditoria QA / Testes - Desk Imperial

**Data:** 2026-04-14
**Escopo:** cobertura, CI e protecao de regressao em fluxos criticos

---

## Resumo

A base de testes e ampla, e a CI ja inclui `backend-e2e`. Nesta rodada, a superficie de cobertura web ficou mais honesta para mobile/realtime, mas o total ainda esta abaixo do gate e o lote full de coverage depende de Redis real no backend.

---

## Achados

### Q-02 (P1) - Cobertura web com exclusoes permanentes em area critica

- **Tipo:** parcialmente mitigado
- **Evidencia:** `apps/web/vitest.config.ts`, `apps/web/package.json`, `apps/web/coverage/coverage-summary.json`
- **Leitura:** `owner-mobile` e `use-operations-realtime.ts` voltaram para a cobertura padrao, e o gate critico ganhou testes de shell/mutations; o total web ainda ficou em `69.11%`.
- **Impacto:** a cobertura reportada melhorou a honestidade do risco, mas ainda nao protege a superficie operacional no nivel esperado.
- **Recomendacao:** subir cobertura dos hotspots lideres antes de endurecer o gate base.

### Q-03 (P1) - E2E web atual cobre majoritariamente auth/navegacao

- **Tipo:** fato confirmado
- **Evidencia:** `apps/web/e2e/auth.spec.ts`, `apps/web/e2e/navigation.spec.ts`, `apps/web/e2e/critical-flows.spec.ts`
- **Impacto:** fluxo operacional completo (PDV/comanda/cozinha) segue com baixa cobertura E2E.
- **Recomendacao:** adicionar fluxo E2E operacional ponta a ponta no baseline.

### Q-04 (P2) - Baseline de warnings alto afeta testabilidade

- **Tipo:** confirmado por warning map
- **Evidencia:** `review_audit/102_quality_warning_map.md`
- **Impacto:** arquivos longos e complexos dificultam escrita de testes robustos.
- **Recomendacao:** refatorar por funcoes/componentes menores antes de expandir suites.

### Q-05 (P1) - Lote full de coverage ainda nao e reproduzivel sem Redis real

- **Tipo:** confirmado por execucao
- **Evidencia:** saida de `npm run test:coverage`
- **Impacto:** a governanca de coverage do monorepo ainda depende de infraestrutura local que nem sempre esta pronta.
- **Recomendacao:** subir Redis no lote local de coverage ou separar o smoke `be-01-operational-smoke.spec.ts` do comando global.

---

## Pontos Positivos

1. `backend-e2e` ja existe no workflow principal.
2. Testes criticos continuam no pipeline.
3. `test:coverage:sonar` do frontend passou apos reintroduzir superficies operacionais na medicao.
4. Build full-stack existe na CI e reduz risco de release quebrado.

---

## Veredito QA

A plataforma de testes e funcional, mas precisa de tres alavancas para subir de nivel: **cobertura operacional web mais representativa**, **reproducao estavel do lote full de coverage** e **reducao de uncovered lines/violacoes novas que seguram o Sonar**.
