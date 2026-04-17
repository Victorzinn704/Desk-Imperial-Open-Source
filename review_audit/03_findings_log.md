# Log Cumulativo de Achados - Desk Imperial

**Data:** 2026-04-14
**Criterio:** somente achados revalidados no estado atual do repositorio, com separacao entre ativo, mitigado e risco estrutural

---

## Resumo por Prioridade Ativa

| Prioridade | Qtde ativa |
| --- | ---: |
| `P0` | 0 |
| `P1` | 8 |
| `P2` | 4 |

---

## Mitigados Nesta Rodada

### AUD-302 - Hardening de Alertmanager no codigo versionado

- **Status:** mitigado no repo; validacao sintetica de producao ainda pendente
- **Evidencia:** `infra/oracle/ops/alertmanager/render-config.sh`, `infra/docker/observability/alertmanager/render-config.sh`, `infra/oracle/ops/compose.yaml`
- **Leitura:** `ALERTMANAGER_ENV=production` agora exige `ALERTMANAGER_WEBHOOK_URL`

### AUD-316 - `PATCH /auth/profile` blindado contra `STAFF`

- **Status:** resolvido
- **Evidencia:** `apps/api/src/modules/auth/auth.service.ts`, `apps/api/test/auth.service.session-and-recovery.spec.ts`
- **Leitura:** `updateProfile()` passou a chamar `assertOwnerRole()`

### AUD-317 - Auditoria passou a distinguir ator real do owner

- **Status:** resolvido
- **Evidencia:** `apps/api/src/modules/auth/auth-session.service.ts`, `apps/api/src/modules/auth/auth-shared.util.ts`, `apps/api/src/modules/monitoring/audit-log.service.ts`, `apps/api/test/audit-log.service.spec.ts`
- **Leitura:** `actorUserId` agora flui pelo contexto de sessao e feed de atividade

### AUD-319 - Cancelamento com comanda volta a restaurar estoque

- **Status:** resolvido
- **Evidencia:** `apps/api/src/modules/orders/orders.service.ts`, `apps/api/test/orders.service.spec.ts`
- **Leitura:** restauracao de inventario deixou de depender de `order.comandaId` ser nulo

### AUD-311 - Update de perfil/moeda invalida caches derivados

- **Status:** resolvido
- **Evidencia:** `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth-session.service.ts`, `apps/web/components/dashboard/hooks/useDashboardMutations.ts`, `apps/api/test/auth.service.session-and-recovery.spec.ts`
- **Leitura:** backend invalida caches do workspace e frontend invalida queries afetadas

### AUD-321 - Persistencia offline do staff agora e aguardada

- **Status:** resolvido
- **Evidencia:** `apps/web/components/staff-mobile/staff-mobile-shell.tsx`
- **Leitura:** `enqueueOfflineItems()` passou a aguardar `enqueue()` antes de confirmar sucesso

### AUD-323 - Reconnect agora forca baseline refresh

- **Status:** resolvido
- **Evidencia:** `apps/web/components/operations/hooks/use-operations-socket.ts`, `apps/web/components/operations/use-operations-realtime.ts`, `apps/web/components/staff-mobile/staff-mobile-shell.test.tsx`
- **Leitura:** reconexao passou a invalidar estado de workspace antes de confiar no snapshot

### AUD-324 - Estados mobile deixaram de mascarar falha como vazio

- **Status:** resolvido
- **Evidencia:** `apps/web/components/staff-mobile/mobile-table-grid.tsx`, `apps/web/components/staff-mobile/kitchen-orders-view.tsx`, `apps/web/components/staff-mobile/mobile-comanda-list.tsx`, `apps/web/components/owner-mobile/owner-comandas-view.tsx`
- **Leitura:** loading/error/offline ganharam tratamento explicito

### AUD-318 / AUD-326 / AUD-327 - Mitigacoes secundarias aplicadas

- **Status:** resolvidos
- **Evidencia:** `apps/api/src/modules/auth/auth-session.service.ts`, `apps/web/components/staff-mobile/mobile-comanda-list.tsx`, `apps/web/components/owner-mobile/owner-comandas-view.tsx`, `apps/web/lib/operations/operations-realtime-patching.ts`
- **Leitura:** sessao cache revalida expiracao; `isBusy` protege acoes destrutivas; patch realtime nao subconta `openComandasCount`

---

## P1 - Alto / Prioritario

### AUD-301 - Visibilidade Sonar segue bloqueada e a cobertura web continua abaixo do gate

- **Dominio:** Qualidade / Entrega
- **Status:** ativo
- **Classificacao:** fato confirmado + bloqueio de evidencia
- **Evidencia:** `review_audit/102_quality_warning_map.md`, `apps/web/coverage/coverage-summary.json`, `npm run quality:warnings`, `Invoke-WebRequest http://localhost:9000/api/system/status`
- **Detalhe objetivo:** Sonar local respondeu `fetch failed`; cobertura web atual ficou em `69.11%`; `npm run test:coverage` ainda falha no backend sem Redis real
- **Impacto:** regressao pode voltar a entrar por superficies pouco cobertas e hotspots longos
- **Recomendacao:** restaurar conectividade com o Sonar e atacar uncovered lines dominantes em `staff-mobile`, `owner-mobile`, `dashboard` e `operations`
- **Confianca:** muito alta

### AUD-304 - Metricas de negocio nao entram em dashboards provisionados

- **Dominio:** Observabilidade de produto
- **Status:** resolvido no repositorio, pendente validacao em ambiente
- **Classificacao:** fato confirmado
- **Evidencia:** `apps/api/src/common/observability/business-telemetry.util.ts`, `infra/docker/observability/grafana/dashboards/business-observability-overview.json`, `infra/oracle/ops/grafana/dashboards/business-observability-overview.json`
- **Impacto:** a opacidade funcional caiu no baseline versionado; a efetividade real ainda depende de provisionamento no Grafana alvo
- **Recomendacao:** validar o dashboard provisionado em runtime e ligar revisao operacional a ele
- **Confianca:** alta

### AUD-305 - Regras de alerta focam infra, nao SLO funcional

- **Dominio:** SRE / Operacao
- **Status:** parcialmente mitigado
- **Classificacao:** fato confirmado
- **Evidencia:** `infra/docker/observability/prometheus/alert.rules.yml`, `infra/oracle/ops/prometheus/alert.rules.yml`, `infra/docker/observability/alertmanager/render-config.sh`, `infra/oracle/ops/alertmanager/render-config.sh`
- **Impacto:** latencia funcional agora entrou no baseline, mas entrega real e alertas de erro/disponibilidade ainda nao estao validados
- **Recomendacao:** validar entrega do Alertmanager e complementar a malha com alertas de erro/availability por dominio
- **Confianca:** alta

### AUD-308 - Cobertura padrao web exclui superficies operacionais criticas

- **Dominio:** QA / Governanca de cobertura
- **Status:** parcialmente mitigado
- **Classificacao:** fato confirmado
- **Evidencia:** `apps/web/vitest.config.ts`, `apps/web/package.json`, `apps/web/components/staff-mobile/staff-mobile-shell.test.tsx`, `apps/web/components/owner-mobile/owner-mobile-shell.test.tsx`, `apps/web/components/dashboard/hooks/useDashboardMutations.test.tsx`, `apps/web/coverage/coverage-summary.json`
- **Impacto:** owner-mobile e realtime voltaram para a superficie medida, mas o total web ainda nao protege a operacao de forma suficiente
- **Recomendacao:** subir a cobertura dos hotspots lideres de uncovered lines antes de endurecer o gate
- **Confianca:** alta

### AUD-309 - Criterio de release em docs segue desalinhado do pipeline real

- **Dominio:** Governanca / Processo
- **Status:** resolvido
- **Classificacao:** fato confirmado
- **Evidencia:** `docs/release/release-criteria-2026-03-28.md`, `.github/workflows/ci.yml`
- **Impacto:** o drift documental caiu; o risco residual ficou concentrado em executar o checklist publicado
- **Recomendacao:** manter este documento como espelho operacional do workflow `CI`
- **Confianca:** alta

### AUD-310 - Ausencia de runbook formal de staging/incidente

- **Dominio:** Operacao / Continuidade
- **Status:** resolvido no baseline documental
- **Classificacao:** fato confirmado
- **Evidencia:** `docs/operations/staging-incident-rollback-runbook.md`, `docs/INDEX.md`
- **Impacto:** a resposta minima deixou de depender so de memoria tacita; backup/restore ainda seguem como backlog proprio
- **Recomendacao:** exercitar o runbook em staging e complementar com restore testado
- **Confianca:** alta

### AUD-314 - Ciclo `auth`/`consent`/`geocoding` permanece ativo

- **Dominio:** Arquitetura backend
- **Classificacao:** fato confirmado
- **Evidencia:** `apps/api/src/modules/auth/auth.module.ts`, `apps/api/src/modules/consent/consent.module.ts`, `apps/api/src/modules/geocoding/geocoding.module.ts`
- **Impacto:** onboarding continua com boundary fragil e alto custo de mudanca
- **Recomendacao:** extrair workflow de onboarding e zerar `forwardRef` cruzado
- **Confianca:** alta

### AUD-315 - Modelo de outbox offline segue inconsistente entre owner e staff

- **Dominio:** Frontend / Confiabilidade operacional
- **Classificacao:** fato confirmado + inferencia forte
- **Evidencia:** `apps/web/components/owner-mobile/owner-mobile-shell.tsx`, `apps/web/components/shared/use-offline-queue.ts`, `apps/web/components/staff-mobile/staff-mobile-shell.tsx`
- **Impacto:** owner continua sem um contrato offline equivalente ao staff
- **Recomendacao:** decidir entre unificar outbox offline para owner e staff ou explicitar que owner nao opera offline
- **Confianca:** alta

---

## P2 - Importante / Nao urgente

### AUD-312 - Backup/DR ainda nao esta formalizado no runtime Oracle

- **Dominio:** Infra / Resiliencia
- **Classificacao:** fato confirmado
- **Evidencia:** `infra/oracle/README.md`

### AUD-313 - Baseline de warnings segue alto e concentrado

- **Dominio:** Manutenibilidade
- **Classificacao:** confirmado por execucao
- **Evidencia:** `review_audit/102_quality_warning_map.md`, saida de `npm run lint`

### AUD-325 - Deteccao de mobile ainda causa fetch duplo e hydration swap

- **Dominio:** Frontend / Performance operacional
- **Classificacao:** fato confirmado + inferencia forte
- **Evidencia:** `apps/web/components/dashboard/hooks/useMobileDetection.ts`, `apps/web/components/dashboard/dashboard-shell.tsx`

### AUD-328 - Hotspots estruturais concentram shell, estado e regra

- **Dominio:** Arquitetura / Manutenibilidade
- **Classificacao:** fato confirmado + inferencia forte
- **Evidencia:** `apps/api/src/modules/operations/comanda.service.ts`, `apps/web/components/dashboard/dashboard-shell.tsx`, `apps/web/components/staff-mobile/staff-mobile-shell.tsx`, `apps/web/components/owner-mobile/owner-mobile-shell.tsx`

---

## Fechamento

1. o projeto saiu de um estado de risco funcional critico para um estado de debito estrutural e operacional ainda alto, mas controlavel;
2. os gates locais principais voltaram a refletir um branch executavel;
3. a proxima onda de melhoria deve atacar coverage real, observabilidade funcional, runbooks e hotspots longos.
