# Mapa do Repositorio - Desk Imperial

**Data:** 2026-04-13
**Escopo:** revalidacao tecnica local + artefatos de auditoria atualizados

---

## 1. Leitura Executiva

O repositorio esta organizado como monorepo de produto operacional (PDV, comanda, cozinha, financeiro e auth), com separacao clara entre API, Web, contratos compartilhados e infra.

A forma macro e boa. O gargalo atual nao e ausencia de modulo, e sim:

1. concentracao de complexidade em poucos arquivos;
2. cobertura insuficiente em superfices operacionais do web;
3. gaps de observabilidade operacional (alert delivery e retencao);
4. drift entre alguns runbooks e o pipeline real.

---

## 2. Topologia do Repositorio

```text
desk-imperial/
├── apps/
│   ├── api/        # NestJS + Prisma + Redis + OTel
│   └── web/        # Next.js + React + Vitest + Playwright + Faro
├── packages/
│   └── types/      # contratos compartilhados API/Web
├── infra/
│   ├── docker/     # stack local
│   └── oracle/     # runtime Oracle + ops observabilidade
├── docs/           # arquitetura, operacao, release, seguranca
├── scripts/        # guardrails e automacoes de qualidade
└── review_audit/   # artefatos desta auditoria
```

---

## 3. Stack Tecnico Confirmado

| Camada      | Stack                                                      | Evidencia                                                         |
| ----------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Backend     | NestJS 11, Prisma, Redis, Socket.IO, OTel                  | `apps/api/package.json`, `apps/api/src/common/utils/otel.util.ts` |
| Frontend    | Next.js 16, React 19, Vitest, Playwright, Faro             | `apps/web/package.json`, `apps/web/lib/observability/faro.ts`     |
| Contratos   | pacote compartilhado de tipos                              | `packages/types/src/contracts.ts`                                 |
| Infra local | Docker compose app + observabilidade                       | `infra/docker/*.yml`                                              |
| Infra ops   | Alloy, Loki, Tempo, Prometheus, Grafana, Alertmanager      | `infra/oracle/ops/compose.yaml`                                   |
| CI          | lint, typecheck, testes, seguranca, k6 latency gate, build | `.github/workflows/ci.yml`                                        |

---

## 4. Corredores de Arquitetura Criticos

### Backend

1. `auth` <-> `consent` <-> `geocoding` ainda usa `forwardRef` bilateral.
2. `operations`, `orders` e `products` chamam invaldacao de `finance` de forma direta.
3. Cache global por usuario ainda nao inclui moeda em algumas chaves (`finance`, `orders`, `products`).

### Frontend

1. `dashboard-shell` e `salao-environment` concentram muita orquestracao de UI.
2. `owner-mobile` continua fora da cobertura padrao do Vitest.
3. Fila offline usa TTL curto com descarte automatico de acoes antigas.

### Infra / Observabilidade

1. Alertmanager inicia mesmo sem webhook real.
2. Loki ja declara retencao nas stacks versionadas; o gap atual e garantir operacao/monitoramento dessa politica.
3. Alertas atuais sao majoritariamente de infraestrutura, nao de SLO de negocio.

---

## 5. Pipeline e Guardrails (Estado Atual)

Comandos reexecutados nesta rodada:

1. `npm run quality:scope:strict` -> PASS
2. `npm run quality:contracts` -> PASS
3. `npm run quality:preflight` -> FAIL (`diff whitespace`)
4. `npm run quality:warnings` -> ALERTA
5. `npm run security:audit-runtime` -> PASS
6. `npm run repo:scan-public` -> PASS

Leitura:

1. regressao funcional grave nao foi encontrada nesta rodada;
2. gate de qualidade ainda depende de cobertura nova, reducao de violacoes Sonar e limpeza de whitespace residual;
3. baseline atual pede ataque por clusters e nao por arquivo isolado.

---

## 6. Hotspots Prioritarios (Qualidade)

Fonte: `review_audit/102_quality_warning_map.md`.

### Arquivos com maior densidade de warnings

1. `apps/api/src/modules/operations/comanda.service.ts`
2. `apps/api/src/modules/products/products.service.ts`
3. `apps/api/src/modules/auth/auth-registration.service.ts`
4. `apps/api/src/modules/orders/orders.service.ts`
5. `apps/web/components/dashboard/salao-environment.tsx`
6. `apps/web/components/owner-mobile/owner-mobile-shell.tsx`

### Regras de maior volume

1. `max-lines-per-function`
2. `@typescript-eslint/no-non-null-assertion`
3. `no-nested-ternary`
4. `complexity`
5. `max-lines`

---

## 7. Delta vs Mapa Anterior

1. Build do web nao esta mais quebrado no estado atual.
2. Hotspots Sonar estao em `0` nesta rodada.
3. CI ja inclui stage de build full-stack, alem de latency gate.
4. Parte dos achados antigos de seguranca (CSRF prefix e redaction incompleta) foi corrigida.

---

## 8. Conclusao

O sistema esta tecnicamente funcional e com guardrails ativos. O proximo salto de maturidade exige foco em:

1. cobertura e violacoes novas do Sonar;
2. observabilidade de produto (nao so infraestrutura);
3. reducao de complexidade dos hotspots;
4. alinhamento documental do processo de release.
