# Plano de Melhorias — Desk Imperial

**Data:** 2026-04-09
**Baseado em:** Auditoria tecnica completa (Fases 1-5)

---

## 1. Resumo Executivo

### Estado Geral do Projeto

Desk Imperial e uma plataforma SaaS B2B de gestao comercial para micro/pequenos comerciantes brasileiros. O projeto demonstra maturidade tecnica acima da media para seu porte: CI pipeline com 7 jobs (incluindo k6 latency gate), stack de observabilidade enterprise (Grafana+Loki+Tempo+Prometheus), 122 arquivos de teste, schema Prisma bem modelado, e seguranca robusta (Argon2, JWT HTTP-only, CSRF, rate limiting, audit log, LGPD).

**Score medio: 3.5/5** — Bom+, com pontos de elite em observabilidade e CI.

### Pontos Fortes

1. Observabilidade de nivel enterprise (5/5)
2. CI pipeline com gates de qualidade, seguranca e performance (4/5)
3. Schema Prisma bem modelado com indices compostos
4. Seguranca robusta em auth (Argon2, JWT HTTP-only, CSRF, rate limiting)
5. 122 arquivos de teste com E2E e load testing
6. Documentacao extensa em `docs/` (9 subdiretorios)
7. `.env.example` extremamente bem documentado (80+ variaveis)
8. Migrations versionadas no repo

### Pontos Fracos

1. **God services/files** — auth.service.ts (2433 linhas), operations-helpers (1451), api.ts (1315), use-operations-realtime.ts (1258)
2. **Deploy manual** — `railway up` antes de `git push` sem automatizacao CI
3. **15+ arquivos frontend > 500 linhas**
4. **NPM_CONFIG_AUDIT desabilitado** no CI
5. **Credenciais em texto puro** em `.secrets/ops-credentials.txt` (nao versionado, mas existe)

### Riscos Criticos

1. Auth service com 2433 linhas — bug em auth = breach total
2. Operations helper com 1451 linhas — logica de caixa/comanda com risco de erro
3. Deploy sem rastreabilidade git — dificuldade de rollback
4. api.ts com 1315 linhas — erro em chamada de API = UX quebrada

---

## 2. Scorecard de Maturidade

| Dimensao        | Score | Trend                                     |
| --------------- | ----- | ----------------------------------------- |
| Arquitetura     | 3/5   | Estavel                                   |
| Backend         | 3/5   | Precisa refatorar god services            |
| Frontend        | 3/5   | Precisa decompor componentes grandes      |
| Seguranca       | 4/5   | Forte, mas precisa rotacionar credenciais |
| DevOps          | 4/5   | Excelente CI, deploy manual e gap         |
| Observabilidade | 5/5   | Elite                                     |
| Testes          | 4/5   | Forte cobertura                           |
| Documentacao    | 4/5   | Extensa e organizada                      |
| DX              | 4/5   | Bom setup                                 |
| UX/UI           | 3/5   | Nao auditado em profundidade              |
| Performance     | 4/5   | k6 gate no CI                             |
| Governanca      | 4/5   | Boa, exceto deploy manual                 |
| Produto         | 3/5   | Escopo coerente                           |

---

## 3. Mapa do Sistema

### Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   Railway (Web)                      │
│  Next.js 16 (Turbopack) → React 19 → Tailwind       │
│  Faro OTel → Grafana Cloud                          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│              Oracle Cloud VM (API)                    │
│  NestJS → Prisma → Neon PostgreSQL                  │
│  ioredis → Redis (cache + rate limit + Socket.IO)   │
│  OpenTelemetry → Alloy → Loki/Tempo/Prometheus      │
└─────────────────────────────────────────────────────┘
```

### Dominios Criticos

| Dominio            | Arquivo Principal               | Linhas | Risco   |
| ------------------ | ------------------------------- | ------ | ------- |
| Auth               | `auth.service.ts`               | 2433   | Critico |
| Comanda/Operacoes  | `comanda.service.ts`            | 1607   | Alto    |
| Operations Helpers | `operations-helpers.service.ts` | 1451   | Critico |
| API Client         | `lib/api.ts`                    | 1315   | Critico |
| Realtime Hook      | `use-operations-realtime.ts`    | 1258   | Alto    |
| Produtos           | `products.service.ts`           | 772    | Medio   |
| Pedidos            | `orders.service.ts`             | 726    | Medio   |
| Calendario         | `commercial-calendar.tsx`       | 833    | Alto    |
| Dashboard          | `dashboard-shell.tsx`           | 780    | Alto    |
| PDV                | `pdv-salao-unified.tsx`         | 763    | Alto    |

---

## 4. Achados Detalhados por Dominio

Ver `03_findings_log.md` para lista completa com 24 achados classificados.

### Resumo por Severidade

| Severidade      | Count | Top Items                                                       |
| --------------- | ----- | --------------------------------------------------------------- |
| P0 Critico      | 6     | God services, credenciais, api.ts, realtime hook                |
| P1 Alto         | 6     | Arquivos >500 linhas, senhas docker, audit CI, shell components |
| P2 Medio        | 5     | Contracts.ts, faro.ts, deploy manual, migrations, prototype     |
| P3 Evolutivo    | 4     | Observability cost, SonarQube local, design lab                 |
| P4 Oportunidade | 4     | CI excelente, Faro, k6 gate, schema Prisma                      |

---

## 5. Bugs, Quebras e Riscos Provaveis

### Confirmados

| ID  | Bug/Risco                             | Arquivo                        | Impacto                                          |
| --- | ------------------------------------- | ------------------------------ | ------------------------------------------------ |
| B01 | Credenciais em texto puro             | `.secrets/ops-credentials.txt` | Se vazado, acesso total a Grafana, SonarQube, CI |
| B02 | Senha default fraca no docker-compose | `docker-compose.yml:9`         | Banco local com senha `desk_imperial_change_me`  |
| B03 | NPM_CONFIG_AUDIT desabilitado         | `.github/workflows/ci.yml:19`  | Vulnerabilidades de dependencia silenciosas      |

### Altamente Provaveis

| ID  | Risco                             | Arquivo              | Impacto                           |
| --- | --------------------------------- | -------------------- | --------------------------------- |
| R01 | N+1 queries em Prisma             | Varios services      | Performance degradada sob carga   |
| R02 | Race condition em comanda         | `comanda.service.ts` | Dados corrompidos em concorrencia |
| R03 | God service auth — bug silencioso | `auth.service.ts`    | Brecha de autenticacao            |

### Potenciais Regressoes

| ID   | Risco                                                        | Causa                           |
| ---- | ------------------------------------------------------------ | ------------------------------- |
| RG01 | Refatorar auth.service pode quebrar sessoes existentes       | Tokens, cookies, CSRF           |
| RG02 | Decompor operations-helpers pode quebrar fechamento de caixa | Logica financeira sensivel      |
| RG03 | Separar api.ts pode quebrar imports no frontend              | 30+ arquivos importam de api.ts |

---

## 6. Lista de Refatoracoes

### Alto Impacto / Baixo Risco (Quick Wins)

| Refatoracao                              | Arquivo                        | Esforco  | Impacto |
| ---------------------------------------- | ------------------------------ | -------- | ------- |
| Rotacionar credenciais                   | `.secrets/ops-credentials.txt` | 2h       | Critico |
| Habilitar npm audit no CI                | `.github/workflows/ci.yml`     | 30min    | Alto    |
| Remover senha default do docker-compose  | `docker-compose.yml`           | 15min    | Medio   |
| Adicionar `.secrets/` ao pre-commit hook | `.husky/`                      | 1h       | Alto    |
| Extrair funcoes utilitarias de `api.ts`  | `lib/api.ts`                   | 1-2 dias | Alto    |

### Medio Prazo (1-2 semanas)

| Refatoracao                              | Arquivo(s)                                   | Esforco  | Impacto |
| ---------------------------------------- | -------------------------------------------- | -------- | ------- |
| Decompor `auth.service.ts`               | `auth.service.ts` → 5 servicos               | 3-5 dias | Critico |
| Decompor `operations-helpers.service.ts` | `operations-helpers.service.ts` → 3 servicos | 3-5 dias | Critico |
| Separar `api.ts` por dominio             | `lib/api.ts` → 6 arquivos                    | 2-3 dias | Alto    |
| Decompor `use-operations-realtime.ts`    | Hook → 4 hooks menores                       | 3-5 dias | Alto    |

### Simplificacao Estrutural (2-4 semanas)

| Refatoracao                                | Arquivo(s)                                        | Esforco  | Impacto |
| ------------------------------------------ | ------------------------------------------------- | -------- | ------- |
| Decompor `comanda.service.ts`              | `comanda.service.ts` → kitchen, assignments, core | 5-7 dias | Alto    |
| Decompor componentes frontend > 500 linhas | 15 arquivos                                       | 5-7 dias | Medio   |
| Automatizar deploy Railway via CI          | `.github/workflows/deploy.yml`                    | 2-3 dias | Alto    |
| Separar `contracts.ts` por dominio         | `packages/types/src/`                             | 1-2 dias | Medio   |

---

## 7. Plano de Acao Sequenciado

### Quick Wins (1-7 dias)

| Dia | Acao                                                              | Owner    | Metrica de Sucesso              |
| --- | ----------------------------------------------------------------- | -------- | ------------------------------- |
| 1   | Rotacionar TODAS as credenciais de `.secrets/ops-credentials.txt` | Security | Credenciais antigas invalidadas |
| 1   | Adotar password manager (Bitwarden/1Password)                     | Security | Credenciais removidas do disco  |
| 1   | Habilitar `NPM_CONFIG_AUDIT` no CI                                | DevOps   | Audit rodando no CI             |
| 1   | Remover senha default do docker-compose                           | DevOps   | Compose falha sem .env          |
| 2   | Extrair funcoes de auth para servicos menores                     | Backend  | `auth.service.ts` < 800 linhas  |
| 3   | Separar `api.ts` por dominio                                      | Frontend | Nenhum arquivo > 400 linhas     |
| 5   | Adicionar hook pre-commit para bloquear `.secrets/`               | DevOps   | Push de secrets bloqueado       |
| 7   | Rodar SonarQube scan e zerar criticals                            | QA       | 0 critical violations           |

### Plano de 30 Dias

| Semana | Acao                                       | Metrica de Sucesso                     |
| ------ | ------------------------------------------ | -------------------------------------- |
| 1-2    | Decompor `operations-helpers.service.ts`   | Arquivo < 500 linhas, testes passando  |
| 2-3    | Decompor `use-operations-realtime.ts`      | 4 hooks < 350 linhas cada              |
| 3-4    | Decompor componentes frontend > 500 linhas | Nenhum componente > 400 linhas         |
| 4      | Automatizar deploy Railway via CI          | `railway up` substituido por CI deploy |

### Plano de 60 Dias

| Semana | Acao                                       | Metrica de Sucesso             |
| ------ | ------------------------------------------ | ------------------------------ |
| 5-6    | Decompor `comanda.service.ts`              | Arquivo < 500 linhas           |
| 6-7    | Estabelecer limite de 400 linhas no ESLint | `max-lines` rule ativa         |
| 8      | Load test de regressao com k6              | P95 < 500ms em fluxos criticos |

### Plano de 90 Dias

| Semana | Acao                                                 | Metrica de Sucesso                    |
| ------ | ---------------------------------------------------- | ------------------------------------- |
| 9-10   | Migrar observabilidade para Grafana Cloud (opcional) | Custo operacional reduzido            |
| 11-12  | Auditoria de seguranca externa / pentest             | 0 vulnerabilidades criticas           |
| 12     | Review de arquitetura completo                       | Scorecard > 4/5 em todas as dimensoes |

---

## 8. Modelo de Acao Recomendado

### Como atacar o backlog

1. **Fase 1 (Semana 1):** Seguranca primeiro — rotacionar credenciais, habilitar audit, proteger secrets
2. **Fase 2 (Semanas 2-4):** Decomposicao de god services — auth, operations-helpers, api.ts, realtime hook
3. **Fase 3 (Semanas 5-8):** Decomposicao de componentes frontend e automatizacao de deploy
4. **Fase 4 (Semanas 9-12):** Refinamento — comanda service, ESLint rules, load tests, pentest

### Como reduzir risco de regressao

- **Testes antes de refatorar:** Rodar suite completa antes de cada refatoracao
- **Refatoracao incremental:** Extrair metodos pequenos, nao reescrever
- **Feature flags:** Usar para mudancas de comportamento
- **Deploy canary:** Validar em staging antes de producao

### Como organizar frentes paralelas

| Frente                              | Owner    | Independente de |
| ----------------------------------- | -------- | --------------- |
| Seguranca (credenciais, audit)      | Security | Nenhuma         |
| Backend (decomposicao services)     | Backend  | Seguranca       |
| Frontend (decomposicao componentes) | Frontend | Nenhuma         |
| DevOps (deploy automatizado)        | DevOps   | Backend         |

### Como validar melhorias

- SonarQube scan apos cada refatoracao
- CI pipeline deve passar sem regressao
- k6 latency gate deve manter ou melhorar P95
- Testes devem manter ou aumentar cobertura

### Como medir avanc

| Metrica                   | Atual       | Meta 30d      | Meta 90d           |
| ------------------------- | ----------- | ------------- | ------------------ |
| Maior arquivo backend     | 2433 linhas | < 1000 linhas | < 500 linhas       |
| Maior arquivo frontend    | 1315 linhas | < 600 linhas  | < 400 linhas       |
| Critical violations Sonar | Verificar   | 0             | 0                  |
| Coverage                  | Verificar   | > 70%         | > 80%              |
| Deploy automatizado       | Manual      | CI trigger    | CI + rollback auto |

---

## 9. Governanca Recomendada para Claude Code

### `CLAUDE.md` Ideal

O atual ja e excelente. Sugerimos adicionar:

- Regra de max-lines por arquivo (400 linhas)
- Checklist pre-commit: testes, lint, typecheck
- Procedimento de rotacao de credenciais
- Fluxo de deploy automatizado (quando implementado)

### `.claude/rules/` Sugerido

```
.claude/rules/
├── backend.md          # Regras para NestJS services
├── frontend.md         # Regras para componentes React
├── security.md         # Regras de seguranca (nunca commitar secrets)
├── testing.md          # Regras de testes (cobertura minima)
└── deploy.md           # Regras de deploy e CI/CD
```

### Subagentes Permanentes Sugeridos

| Agente              | Funcao                                   | Trigger                          |
| ------------------- | ---------------------------------------- | -------------------------------- |
| `sonarqube-scanner` | Rodar scan e reportar issues             | Apos mudancas em .ts/.tsx        |
| `test-runner`       | Rodar testes afetados                    | Apos mudancas em codigo          |
| `security-auditor`  | Verificar secrets e vulnerabilidades     | Apos mudancas em config          |
| `refactoring-guru`  | Sugerir decomposicao de arquivos grandes | Ao detectar arquivo > 400 linhas |

### `REVIEW.md` Ideal

Template para revisoes futuras:

```markdown
# Review — [Data]

## Mudancas

- [Lista de arquivos modificados]

## Testes

- [ ] Testes afetados rodaram
- [ ] Coverage nao regrediu
- [ ] SonarQube scan passou

## Seguranca

- [ ] Nenhum secret commitado
- [ ] Credenciais nao expostas

## Performance

- [ ] k6 latency gate passou
- [ ] Nenhum arquivo > 400 linhas adicionado
```
