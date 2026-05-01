# Log de Fortificacao Sonar e Refatoracao Segura

**Data:** 2026-04-13  
**Status:** ativo

---

## 1. Baseline Atual (rodada desta auditoria)

Fonte principal: `review_audit/102_quality_warning_map.md`.

| Indicador          |              Valor |
| ------------------ | -----------------: |
| Sonar Quality Gate |            `ERROR` |
| New coverage       | `71.7` (meta `90`) |
| New violations     |    `96` (meta `0`) |
| Code smells        |              `412` |
| Security hotspots  |                `0` |
| ESLint warnings    |              `466` |
| ESLint errors      |                `0` |

Comandos executados com resultado verde nesta rodada:

1. `npm run quality:scope:strict`
2. `npm run quality:contracts`
3. `npm run quality:preflight`
4. `npm run security:audit-runtime`
5. `npm run repo:scan-public`

---

## 2. Ganhos Confirmados Desde o Baseline Antigo

1. Hotspots Sonar reduzidos para `0`.
2. Build full-stack nao aparece mais como blocker tecnico no estado atual.
3. CI possui build gate e latency gate ativos.
4. Correcoes de hardening anteriores permanecem no codigo (CSRF/origin, redaction e padroes de saneamento).

---

## 3. Principais Frentes Abertas

### Frente A - Qualidade Sonar

1. subir `new_coverage` para >= 90;
2. reduzir `new_violations` para 0;
3. atacar clusters mecanicos com maior volume.

### Frente B - Complexidade/Lint

Regras dominantes:

1. `max-lines-per-function`
2. `@typescript-eslint/no-non-null-assertion`
3. `no-nested-ternary`
4. `complexity`
5. `max-lines`

Arquivos de maior concentracao:

1. `apps/api/src/modules/operations/comanda.service.ts`
2. `apps/api/src/modules/products/products.service.ts`
3. `apps/api/src/modules/orders/orders.service.ts`
4. `apps/web/components/dashboard/salao-environment.tsx`
5. `apps/web/components/owner-mobile/owner-mobile-shell.tsx`

### Frente C - Cobertura operacional

1. owner mobile continua excluido da cobertura padrao do web;
2. API E2E ainda nao esta integrada ao workflow CI principal.

---

## 4. Estrategia de Execucao Segura

1. sempre iniciar por arquivos com maior uncovered lines + alto churn;
2. separar refatoracao mecanica de mudanca funcional;
3. exigir teste de caracterizacao em qualquer mudanca de fluxo;
4. reexecutar `quality:warnings` ao final de cada mini-lote;
5. manter `quality:contracts` verde para evitar regressao de API publica.

---

## 5. Plano das Proximas Ondas

### Onda 1 (baixo risco / alto retorno)

1. reduzir `no-non-null-assertion` e `no-nested-ternary` em componentes de dashboard;
2. quebrar funcoes muito longas em helpers puros;
3. adicionar testes para blocos extraidos.

### Onda 2 (cobertura funcional)

1. ampliar cobertura de owner/staff mobile;
2. incluir fluxo operacional minimo em E2E;
3. reduzir uncovered lines dos top 8 arquivos Sonar.

### Onda 3 (acoplamento estrutural)

1. reduzir acoplamento entre auth/consent/geocoding;
2. diminuir invaldacoes cruzadas sincronas entre operations/products/finance;
3. manter comportamento com facade e testes de contrato.

---

## 6. Criterio de Saida desta Trilhas

A trilha de fortificacao e considerada estavel quando:

1. Sonar Gate ficar `OK` por 3 execucoes consecutivas;
2. warnings cairem abaixo de 300 sem abrir novos erros;
3. cobertura das superfices operacionais criticas ficar documentada e protegida por CI.
