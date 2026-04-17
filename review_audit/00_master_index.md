# Auditoria Desk Imperial - Master Index

**Data:** 2026-04-14
**Projeto:** `C:\Users\Desktop\Documents\desk-imperial`
**Branch:** `master`
**Modo atual:** correcao dirigida + validacao evidence-first

---

## Estado Geral

A auditoria saiu do modo somente leitura e entrou em fase de correcao dirigida nos riscos mais profundos de authz, integridade de estoque, auditoria, cache e operacao mobile.

Baseline confirmado apos a rodada de correcoes:

1. `npm run typecheck`: PASS
2. `npm run build`: PASS
3. `npm run quality:preflight`: PASS
4. `npm run test:critical`: PASS
5. testes direcionados backend (`auth`, `audit-log`, `orders`): PASS
6. testes direcionados web (`staff/owner mobile`, `realtime`, `operations-query`): PASS
7. `npm --workspace @partner/web run test:coverage:sonar`: PASS
8. `npm run quality:warnings`: PASS
9. `npm run lint`: PASS com warnings altos
10. `npm run test:coverage`: FAIL no backend por dependencia do smoke `be-01-operational-smoke.spec.ts` com Redis real

Leitura operacional atual:

1. o projeto nao esta mais quebrado no eixo principal de build/release;
2. os `P0` funcionais mapeados nesta auditoria foram removidos do codigo atual do worktree;
3. dashboards de negocio, alertas basicos de latencia e runbooks principais passaram a existir no repositorio;
4. o risco dominante agora migra para cobertura real, Sonar/warnings, validacao de entrega operacional e hotspots estruturais.

---

## Status por Dominio

| Dominio | Status | Fonte principal |
| --- | --- | --- |
| Inventario / mapa | ATUALIZADO | `01_repo_map.md` |
| Hipoteses e lacunas | ATUALIZADO | `02_assumptions_and_unknowns.md` |
| Achados consolidados | ATUALIZADO | `03_findings_log.md` |
| Matriz de risco | ATUALIZADO | `04_risk_matrix.md` |
| Scorecard | ATUALIZADO | `05_maturity_scorecard.md` |
| Plano mestre | ATUALIZADO | `99_master_improvement_plan.md` |
| Gate pre-feature | ATIVO | `100_pre_feature_stabilization_plan.md` |
| Fortificacao Sonar | ATIVO | `101_code_fortification_sonar_refactoring_log.md` |
| Warning map / coverage | ATIVO | `102_quality_warning_map.md` |
| Arquitetura | ATUALIZADO | `agents/architecture-reviewer.md` |
| Backend | ATUALIZADO | `agents/backend-reviewer.md` |
| Frontend | ATUALIZADO | `agents/frontend-reviewer.md` |
| Seguranca | ATUALIZADO | `agents/security-reviewer.md` |
| Infra / DevOps | ATUALIZADO | `agents/infra-devops-reviewer.md` |
| QA / Testes | ATUALIZADO | `agents/qa-test-reviewer.md` |

---

## Comandos Executados Nesta Rodada

| Comando | Resultado | Leitura |
| --- | --- | --- |
| `npm --workspace @partner/api test -- auth.service.session-and-recovery.spec.ts audit-log.service.spec.ts orders.service.spec.ts` | PASSOU | regressao backend cobriu authz, auditoria e cancelamento/estoque |
| `npm --workspace @partner/web test -- staff-mobile-shell.test.tsx owner-comandas-view.test.tsx mobile-comanda-list.test.tsx use-operations-realtime.socket.test.tsx operations-query.test.ts` | PASSOU | regressao web cobriu reconnect, shells mobile e patching |
| `npm --workspace @partner/web test -- components/dashboard/hooks/useDashboardMutations.test.tsx components/staff-mobile/staff-mobile-shell.test.tsx components/owner-mobile/owner-mobile-shell.test.tsx components/staff-mobile/mobile-comanda-list.test.tsx components/owner-mobile/owner-comandas-view.test.tsx` | PASSOU | validou o lote de cobertura novo para mutacoes e shells mobile |
| `npm run typecheck` | PASSOU | monorepo consistente apos as correcoes |
| `npm run build` | PASSOU | frontend e backend geram build valido |
| `npm run quality:preflight` | PASSOU | escopo, contratos, whitespace, lint, typecheck, testes criticos e builds em verde |
| `npm --workspace @partner/web run test:coverage:sonar` | PASSOU | lcov do frontend foi regenerado para Sonar sem afrouxar o gate base |
| `npm run quality:warnings` | PASSOU | warning map atualizado com `web lines=69.11%`, `eslint warnings=493` e Sonar indisponivel localmente |
| `npm run test:coverage` | FALHOU | suite completa para no smoke `be-01-operational-smoke.spec.ts` quando Redis real nao esta disponivel |
| `npm run lint` | PASSOU | baseline estrutural ainda alto em warnings |

---

## Riscos Ativos Mais Relevantes

1. Sonar segue sem baseline atualizavel localmente e a cobertura web continua em `69.11%`, abaixo do gate.
2. `npm run test:coverage` ainda nao e reprodutivel de ponta a ponta sem Redis real por causa do smoke operacional backend.
3. Alertas funcionais entraram em config, mas a entrega real do Alertmanager continua sem validacao sintetica em ambiente.
4. Owner mobile segue sem um contrato de outbox offline equivalente ao staff.
5. Hotspots estruturais (`ComandaService`, shells mobile, onboarding/auth`) continuam grandes e caros para evoluir.

---

## Achados Fechados Nesta Rodada

1. `AUD-316` - `PATCH /auth/profile` agora bloqueia sessao `STAFF`.
2. `AUD-317` - trilha de auditoria e feed passaram a distinguir `actorUserId` do owner do workspace.
3. `AUD-319` - cancelamento de pedido voltou a restaurar estoque mesmo quando originado por comanda.
4. `AUD-311` - update de perfil/moeda invalida caches derivados de workspace e o cliente invalida queries afetadas.
5. `AUD-321` - fila offline do staff agora aguarda persistencia antes de confirmar sucesso.
6. `AUD-323` - reconnect do realtime passou a forcar refresh do baseline.
7. `AUD-324` - telas mobile separaram `loading`, `error`, `offline` e `empty`.
8. `AUD-318`, `AUD-326` e `AUD-327` tambem ficaram mitigados no worktree atual.
9. `AUD-304` - dashboards provisionados para metricas de negocio entraram nas stacks `docker` e `oracle`.
10. `AUD-309` - `release-criteria` passou a refletir o gate real de `.github/workflows/ci.yml`.
11. `AUD-310` - runbook de staging/incidente/rollback foi publicado e indexado na documentacao.

## Mitigacoes Parciais Desta Rodada

1. `AUD-305` - alertas por latencia funcional entraram em Prometheus, mas a entrega real ainda precisa ser validada em ambiente.
2. `AUD-308` - owner-mobile e `use-operations-realtime.ts` voltaram para a superficie de cobertura, mas o total web segue abaixo do threshold.
3. `AUD-301` - o trilho Sonar voltou a ter artefato de coverage atualizado, mas o servidor local nao esta acessivel para recalcular o gate.

---

## Proximos Passos Imediatos

1. fechar `AUD-301` e `AUD-308`: recuperar visibilidade do Sonar e elevar cobertura web nos hotspots dominantes (`staff-mobile-shell`, `owner-mobile-shell`, `pin-setup-card`, `order-form`);
2. fechar `AUD-305`: validar entrega real do Alertmanager e complementar SLO funcional com alertas de erro/disponibilidade;
3. decidir se `AUD-315` sera resolvido estendendo outbox para owner ou removendo promessas offline dessa superficie;
4. iniciar `AUD-314`: reduzir ciclo `auth`/`consent`/`geocoding` sem reabrir risco funcional;
5. tornar `npm run test:coverage` reproduzivel com Redis real ou isolar o smoke backend fora do lote de coverage local.
