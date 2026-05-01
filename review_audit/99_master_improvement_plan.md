# Plano Mestre de Melhoria - Desk Imperial

**Data:** 2026-04-14
**Base:** auditoria aprofundada, correcoes dirigidas e validacao tecnica local

---

## 1. Resumo Executivo

O projeto saiu do estado em que defects profundos de authz, auditoria, estoque e operacao mobile atravessavam os gates sem resistencia. O branch atual voltou a ter `build`, `typecheck`, `test:critical` e `quality:preflight` verdes.

As frentes que mais influenciam a saude do projeto agora sao:

1. **Governanca de qualidade real:** Sonar ainda esta sem baseline atualizavel localmente, a cobertura web segue em `69.11%` e o lote full depende de Redis real no smoke backend.
2. **Observabilidade operacional:** dashboards de negocio e alertas basicos de latencia ja entraram no repo; falta validar entrega e ampliar erro/disponibilidade.
3. **Modelo offline/tempo real:** fechar a assimetria owner vs staff e reduzir hotspots de shell.
4. **Governanca de release e continuidade:** `release-criteria` e runbook base ja existem; falta exercicio em ambiente e restore formal.

---

## 2. Prioridades P1-P2

### P1 (curto prazo)

1. Fechar `AUD-301` e `AUD-308`: restaurar visibilidade do Sonar, tornar `test:coverage` reproduzivel e elevar cobertura dos hotspots web.
2. Fechar `AUD-305`: validar entrega real do Alertmanager e complementar SLO funcional com alertas de erro/disponibilidade.
3. Fechar `AUD-315`: decidir e implementar um contrato offline coerente para owner/staff.
4. Fechar `AUD-314`: reduzir ciclo `auth`/`consent`/`geocoding`.

### P2 (medio prazo)

1. Reduzir warnings por cluster de hotspot.
2. Atacar fetch duplo/hydration swap do mobile.
3. Quebrar `ComandaService`, `DashboardShell` e shells mobile.
4. Formalizar backup/restore e teste recorrente de recuperacao.

---

## 3. Roadmap 7/30/60/90 dias

## 7 dias

1. validar em runtime os dashboards `Desk Imperial - Business Observability` e os alertas de latencia funcional;
2. tornar `npm run test:coverage` executavel com Redis local ou isolar o smoke operacional do lote de coverage;
3. definir estrategia de outbox para owner mobile;
4. atacar o topo de uncovered lines e warnings dominantes em `owner-mobile`, `staff-mobile` e `operations`.

## 30 dias

1. colocar Sonar Gate em tendencia de recuperacao com `new_coverage >= 85` e queda real de `new_violations`;
2. adicionar alertas de erro/disponibilidade por dominio funcional;
3. subir cobertura de `staff-mobile-shell`, `owner-mobile-shell`, `pin-setup-card` e `order-form`;
4. reduzir acoplamento do onboarding/auth.

## 60 dias

1. levar Sonar Gate a `OK`;
2. reduzir warnings totais para abaixo de `300`;
3. estabilizar owner/staff mobile com contrato offline ou semantica explicita de operacao online-only;
4. publicar runbook de restore com simulacao executada.

## 90 dias

1. fatiar hotspots principais por caso de uso;
2. manter SLOs funcionais monitorados e alertados;
3. consolidar governanca tecnica para que novos `P0/P1` nao voltem a escapar dos gates.

---

## 4. Frentes Taticas Paralelas

### Frente A - Qualidade real

1. `quality:warnings`
2. Sonar Gate
3. coverage owner/staff mobile

### Frente B - Operacao e observabilidade

1. dashboards de negocio
2. alertas por SLO funcional
3. validacao sintetica de Alertmanager

### Frente C - Governanca de release

1. release criteria
2. staging/incidente/rollback
3. backup/restore

### Frente D - Sustentabilidade estrutural

1. onboarding/auth
2. `ComandaService`
3. shells mobile

---

## 5. Metricas de Sucesso

1. `quality:preflight` seguir verde por 5 ciclos locais/CI consecutivos.
2. Sonar Gate sair de `ERROR`.
3. owner/staff mobile entrarem em cobertura funcional explicita.
4. dashboards/alertas de negocio provisionados e revisados em ambiente.
5. runbooks de release, staging, incidente e restore publicados e exercitados.
6. warnings ESLint ficarem abaixo de `300`.

---

## 6. Modelo de Acao Recomendado

1. manter correcoes funcionais fechadas em um lote isolado;
2. atacar o backlog restante em quatro lanes: `quality`, `observability`, `release-governance`, `structural-refactor`;
3. toda melhoria de risco alto precisa nascer com teste, criterio de rollback e evidencia de comando;
4. nao reabrir shells/hotspots sem reduzir blast radius da mudanca.
