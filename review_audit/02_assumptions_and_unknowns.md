# Hipoteses, Incertezas e Lacunas - Desk Imperial

**Data:** 2026-04-14

---

## 1. Fatos Confirmados Nesta Rodada

1. `npm run typecheck`, `npm run build`, `npm run test:critical` e `npm run quality:preflight` passaram no worktree atual.
2. `PATCH /auth/profile` agora exige role de owner no backend.
3. `actorUserId` passou a ser distinguido do owner do workspace para auditoria e activity feed.
4. cancelamento de pedido restaura estoque mesmo quando o pedido veio de comanda.
5. `updateProfile` passou a invalidar caches derivados do workspace, incluindo `finance:pillars`.
6. reconnect do realtime agora dispara refresh de baseline.
7. shells mobile deixaram de mascarar `loading/error/offline` como estado vazio.
8. Alertmanager versionado no repo exige webhook quando `ALERTMANAGER_ENV=production`.
9. dashboards provisionados para metricas de negocio entraram nas stacks `infra/docker` e `infra/oracle`.
10. `release-criteria-2026-03-28.md` passou a refletir o gate real da CI.
11. `docs/operations/staging-incident-rollback-runbook.md` foi publicado e entrou no indice oficial.
12. `npm --workspace @partner/web run test:coverage:sonar` passou e regenerou a cobertura para o trilho Sonar.
13. `npm run test:coverage` falhou no backend porque o smoke `be-01-operational-smoke.spec.ts` depende de Redis real.

---

## 2. Hipoteses Fechadas

1. "o projeto esta quebrado para build" -> falsa no estado atual do worktree.
2. "preflight falha por problema funcional" -> falsa no estado atual; o ruído era whitespace.
3. "PATCH /auth/profile aceita STAFF" -> falsa apos esta rodada.
4. "feed de atividade sempre mistura staff com owner" -> falsa apos esta rodada.
5. "cancelamento com comanda nao reverte estoque" -> falsa apos esta rodada.
6. "reconnect so troca badge visual sem refresh" -> falsa apos esta rodada.

---

## 3. Itens Ainda Nao Verificaveis So com Repositorio Local

1. se o webhook configurado em producao esta realmente entregando alertas;
2. se os dashboards provisionados estao aplicados e saudaveis no Grafana do ambiente alvo;
3. qual e a politica real de backup/restore executada fora dos runbooks;
4. qual e a taxa real de uso offline no owner mobile para dimensionar `AUD-315`;
5. como o Sonar server remoto esta calculando o delta mais recente apos estas correcoes.

---

## 4. Incertezas Residuais

1. a efetividade do hardening do Alertmanager ainda precisa de validacao sintetica em ambiente de deploy;
2. a cobertura web ficou mais honesta na superficie mobile, mas continua baixa o suficiente para mascarar regressao fora dos hotspots ja testados;
3. o lote `npm run test:coverage` depende de Redis real ou de um recorte explicito do smoke operacional backend;
4. os hotspots estruturais seguem altos o suficiente para reintroduzir defeitos se novas features entrarem sem fatiamento.

---

## 5. Regra de Uso Deste Documento

1. fato confirmado: exige codigo, comando executado ou artefato gerado;
2. inferencia forte: exige evidencia tecnica direta e impacto plausivel;
3. risco potencial: entra como backlog de validacao, nao como defeito fechado.
