# Plano Mestre de Melhoria — Desk Imperial

**Data:** 2026-04-10  
**Base:** inventário revalidado + 6 relatórios especializados + execução técnica local

---

## 1. Resumo Executivo

### Estado geral

O projeto já tem densidade técnica real: monorepo coerente, domínios claros, observabilidade implantada, migrations versionadas e uma pipeline que tenta cobrir qualidade, segurança e latência. O problema atual não é “falta de base”; é **desalinhamento entre runtime real, pipeline, documentação e pontos críticos de domínio**.

### Pontos fortes

1. Stack atual e consistente: Next.js 16, React 19, NestJS 11, Prisma, Redis, Socket.IO.
2. Observabilidade de verdade no código: OTel no backend e Faro no frontend.
3. Domínio de produto claro, com valor concreto para operação de salão/PDV/financeiro.
4. Migrations Prisma versionadas e health endpoints implementados.
5. Boa quantidade de testes e presença de gates de segurança/performance na CI.

### Pontos fracos

1. O frontend está com **build quebrado** no estado atual do branch.
2. Segredos operacionais permanecem em texto puro no workspace e em runbooks.
3. Há falhas reais de integridade/autorização no backend:
   cancelamento concorrente de pedido, sessão de staff arquivado e caches monetários inconsistentes.
4. Rollback, backup/DR e verificação de host SSH ainda não estão em nível aceitável.
5. A documentação principal contém drift suficiente para induzir decisão técnica errada.

### Riscos críticos

| ID | Risco | Tipo |
| --- | --- | --- |
| `AUD-001` | `next build` quebrado | Release blocker |
| `AUD-003` | cancelamento de pedido pode restaurar estoque duas vezes | Integridade de dados |
| `AUD-004` | segredos operacionais em plaintext | Segurança operacional |

### Nível geral de maturidade

**2.8/5**.  
Leitura prática: o projeto já passou da fase de protótipo, mas ainda não está em nível de excelência operacional. O próximo salto de maturidade depende menos de novas features e mais de **fechar o ciclo entre código, pipeline, docs e operação real**.

---

## 2. Scorecard de Maturidade

| Dimensão | Score |
| --- | ---: |
| Arquitetura | 2.5/5 |
| Backend | 3.0/5 |
| Frontend | 2.5/5 |
| Segurança | 2.5/5 |
| DevOps | 2.5/5 |
| Observabilidade | 3.5/5 |
| Testes | 2.5/5 |
| Documentação | 2.5/5 |
| DX | 3.0/5 |
| UX/UI | 3.0/5 |
| Performance | 3.0/5 |
| Governança técnica | 2.5/5 |
| Produto | 3.5/5 |

Referência detalhada: [05_maturity_scorecard.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/05_maturity_scorecard.md).

---

## 3. Mapa do Sistema

### Macroarquitetura

```text
apps/api      -> NestJS, Prisma, Redis, Socket.IO, OTel
apps/web      -> Next.js App Router, React Query, Faro
packages/types-> contratos compartilhados
infra/        -> compose local, observability OSS, runtime Oracle, scripts de deploy
```

### Fluxos críticos

1. Registro → consentimento → geocoding → verificação de email
2. Login → sessão por cookie → CSRF → autorização por role
3. Operação ao vivo → caixa/comanda/cozinha/mesa → realtime → invalidação de cache
4. Pedido → baixa de estoque → financeiro → cancelamento/reversão
5. Dashboard financeiro → summary + pillars + export CSV

### Hotspots técnicos

- `apps/web/app/page.tsx`
- `apps/web/components/dashboard/dashboard-shell.tsx`
- `apps/web/components/operations/use-operations-realtime.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/operations/comanda.service.ts`
- `apps/api/src/modules/operations/operations-helpers.service.ts`

Referência detalhada: [01_repo_map.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/01_repo_map.md).

---

## 4. Achados Mais Importantes por Domínio

### Release / CI

| ID | Título | Severidade | Evidência principal |
| --- | --- | --- | --- |
| `AUD-001` | build do web quebrado | Crítico | execução `npm run build` + [apps/web/app/page.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/page.tsx:3) |
| `AUD-008` | backend E2E fora da CI | Alto | [apps/api/package.json](C:/Users/Desktop/Documents/desk-imperial/apps/api/package.json:17) + [ci.yml](C:/Users/Desktop/Documents/desk-imperial/.github/workflows/ci.yml:73) |

### Backend / Dados

| ID | Título | Severidade | Evidência principal |
| --- | --- | --- | --- |
| `AUD-003` | cancelamento com corrida de estoque | Crítico | [orders.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/orders.service.ts:494) |
| `AUD-005` | sessão de staff arquivado continua válida | Alto | [auth.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:1508) |
| `AUD-016` | mudança de moeda não invalida caches monetários | Médio | [auth.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:1438) |
| `AUD-017` | KPI semanal começa no domingo | Médio | [pillars.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/pillars.service.ts:198) |

### Segurança

| ID | Título | Severidade | Evidência principal |
| --- | --- | --- | --- |
| `AUD-004` | segredos operacionais em plaintext | Crítico | [.env](C:/Users/Desktop/Documents/desk-imperial/.env:11) |
| `AUD-006` | dependências de runtime vulneráveis | Alto | `npm audit --omit=dev --json` |
| `AUD-013` | dados sensíveis vazam em logs | Alto | [app.module.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/app.module.ts:79), [mailer.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/mailer/mailer.service.ts:50) |
| `AUD-018` | CSRF por `Referer` usa prefixo | Médio | [csrf.guard.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/guards/csrf.guard.ts:50) |

### Infra / Operação

| ID | Título | Severidade | Evidência principal |
| --- | --- | --- | --- |
| `AUD-010` | rollback fraco por migration no boot | Alto | [oracle-builder-deploy.ps1](C:/Users/Desktop/Documents/desk-imperial/infra/scripts/oracle-builder-deploy.ps1:264) |
| `AUD-011` | backup/DR ausente | Alto | [infra/oracle/README.md](C:/Users/Desktop/Documents/desk-imperial/infra/oracle/README.md:29) |
| `AUD-012` | SSH sem verificação de host | Alto | [oracle-ops-tunnel.ps1](C:/Users/Desktop/Documents/desk-imperial/infra/scripts/oracle-ops-tunnel.ps1:16) |

### Frontend / UX

| ID | Título | Severidade | Evidência principal |
| --- | --- | --- | --- |
| `AUD-007` | CSV export vulnerável a formula injection | Alto | [finance-orders-table.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/finance-orders-table.tsx:44) |
| `AUD-019` | rotas `/app` resolvidas no cliente | Médio | [apps/web/app/app/page.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/app/page.tsx:1) |
| `AUD-022` | shell/realtime centralizados demais | P3 | [dashboard-shell.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/dashboard-shell.tsx) |

### Arquitetura / Governança

| ID | Título | Severidade | Evidência principal |
| --- | --- | --- | --- |
| `AUD-014` | ciclo `auth`/`consent`/`geocoding` | Alto | [architecture-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/architecture-reviewer.md) |
| `AUD-015` | corredor acoplado `operations`/`products`/`finance` | Alto | [architecture-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/architecture-reviewer.md) |
| `AUD-021` | documentação principal em drift | Médio | [README.md](C:/Users/Desktop/Documents/desk-imperial/README.md:200) |

Referência detalhada: [03_findings_log.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/03_findings_log.md).

---

## 5. Bugs, Quebras e Riscos Prováveis

### Confirmados por execução

1. `next build` falha no web por `ssr: false` em Server Component.
2. `test:e2e:critical` do web falha porque o web server não sobe com esse mesmo erro.
3. `repo:scan-public` acusa referências sensíveis em `infra/oracle/.env.example`.
4. `security:audit-runtime` acusa vulnerabilidades `high/critical` fora do allowlist.
5. `npm audit --omit=dev` confirma 8 vulnerabilidades em dependências de produção.

### Altamente prováveis por leitura de código

1. cancelamento concorrente de pedido pode inflar estoque
2. sessão de staff arquivado pode sobreviver ao cache
3. CSV export pode disparar fórmula em planilha
4. troca de moeda pode servir dados cacheados na moeda errada
5. weekly KPI pode refletir semana começando no domingo

### Potenciais regressões

1. qualquer refactor em `auth.service.ts` sem suíte de regressão adequada
2. reorganização de `DashboardShell` e `use-operations-realtime`
3. endurecimento de deploy/migration sem plano de rollout/rollback

---

## 6. Lista de Refatorações Prioritárias

### Alto impacto / baixo risco

1. Corrigir a home pública para voltar a compilar no `next build`.
2. Adicionar gate de build na CI.
3. Redigir `buyerDocument` e remover OTP de logs.
4. Endurecer encoder CSV.
5. Bloquear `EMAIL_PROVIDER=log` em produção.

### Alto impacto / médio risco

1. Tornar cancelamento de pedido idempotente e concorrência-seguro.
2. Revogar cache/sessões ao arquivar `STAFF`.
3. Separar migração do boot da aplicação.
4. Introduzir API E2E na pipeline.
5. Reorganizar invalidação entre `operations`/`products`/`finance`.

### Estruturais de médio prazo

1. Quebrar o ciclo `auth`/`consent`/`geocoding`.
2. Decompor `DashboardShell` e `use-operations-realtime`.
3. Particionar `packages/types` por subdomínio.
4. Formalizar observabilidade com correlação e alertas de segurança/SLO.

---

## 7. Plano Sequenciado

### Quick wins — 1 a 7 dias

| Ação | Owner sugerido | Métrica de sucesso |
| --- | --- | --- |
| Corrigir `apps/web/app/page.tsx` para `next build` passar | Frontend | `npm run build` verde |
| Adicionar gate de build do web à CI | DevOps | PR falha quando `next build` falha |
| Rotacionar segredos e remover plaintext local | Security / Infra | nenhum segredo real em `.env`/`.secrets` |
| Redigir `buyerDocument` e retirar OTP dos logs | Backend / Security | logs sem CPF/CNPJ/OTP |
| Corrigir encoder de CSV | Frontend | export seguro e coberto por teste |
| Ajustar `getWeekStart` para semana ISO | Backend | KPI semanal coerente |

### Plano de 30 dias

1. Colocar API E2E real na CI.
2. Tornar cancelamento de pedido idempotente.
3. Revogar sessões/caches quando `STAFF` for arquivado.
4. Invalidar caches monetários ao trocar `preferredCurrency`.
5. Endurecer SSH operacional com `known_hosts`.
6. Remover defaults inseguros de Redis/Grafana local.

### Plano de 60 dias

1. Separar migration de boot e criar rollback por imagem/tag.
2. Definir e testar backup/restore.
3. Aumentar E2E web em fluxos owner/staff/PDV/operations.
4. Revisar estratégia de cobertura do web.
5. Reduzir acoplamento entre `operations`, `products` e `finance`.

### Plano de 90 dias

1. Quebrar ciclo `auth`/`consent`/`geocoding`.
2. Repartir `DashboardShell` e `use-operations-realtime`.
3. Formalizar correlação browser → API → audit log.
4. Criar SLOs e alertas de produto/segurança.
5. Revisar e alinhar documentação canônica do repositório inteiro.

### Iniciativas estruturais de médio/longo prazo

1. bounded contexts explícitos no backend
2. pipeline de release realmente promotável/reversível
3. governança de contratos compartilhados por domínio
4. baseline permanente de segurança operacional e supply chain

---

## 8. Modelo de Ação Recomendado

### Como atacar o backlog

1. Primeiro corrigir o **blocker de release** (`AUD-001`).
2. Em paralelo, resolver **segurança operacional imediata** (`AUD-004`, `AUD-013`).
3. Depois atacar **integridade do domínio** (`AUD-003`, `AUD-005`, `AUD-016`, `AUD-017`).
4. Só então abrir frentes estruturais maiores (`AUD-014`, `AUD-015`, `AUD-022`, `AUD-023`).

### Como reduzir regressão

- Toda correção de bug crítico deve vir com teste que falha antes e passa depois.
- Qualquer mudança em auth, orders, operations ou finance precisa de:
  - unit/integration da área
  - `test:critical`
  - build do web
  - smoke de health

### Como organizar frentes paralelas

- Frente 1: release safety e CI
- Frente 2: security/infra
- Frente 3: backend data integrity
- Frente 4: QA/reliability
- Frente 5: architecture cleanup

### Métricas de avanço

1. `npm run build` estável em todas as PRs
2. zero segredo real em workspace local
3. zero vulnerabilidade high em dependências de produção
4. API E2E rodando na CI
5. ao menos 1 E2E por fluxo operacional crítico
6. rollback documentado e backup/restore testado

---

## 9. Governança Recomendada para o Claude Code

### `CLAUDE.md` ideal

Deve conter apenas:

1. identidade do produto
2. stack e entrypoints reais
3. regras de negócio críticas
4. comandos oficiais de validação
5. regras de deploy vigentes
6. links para `review_audit/03_findings_log.md` e docs canônicas

Não deve conter:

1. achados de auditoria antigos como se fossem permanentes
2. claims operacionais não revalidadas
3. instruções contraditórias com CI/runtime atuais

### Estrutura sugerida de `.claude/rules/`

```text
.claude/rules/
├── backend.md
├── frontend.md
├── security.md
├── infra-devops.md
├── testing.md
├── observability.md
├── docs-governance.md
└── product-flows.md
```

### Subagentes permanentes úteis

1. `backend-reviewer`
2. `frontend-reviewer`
3. `security-reviewer`
4. `infra-devops-reviewer`
5. `qa-test-reviewer`
6. `architecture-reviewer`
7. `observability-sre-reviewer`
8. `documentation-dx-reviewer`

### `REVIEW.md` ideal para revisões futuras

Deve exigir, por padrão:

1. leitura de `review_audit/00_master_index.md`
2. consulta prévia a `review_audit/03_findings_log.md`
3. distinção explícita entre:
   fato confirmado, inferência forte, hipótese e risco potencial
4. registro de comandos executados e resultado
5. revisão por domínio, não por arquivo isolado
6. atualização obrigatória dos artefatos de `review_audit/`

---

## 10. Conclusão

O projeto não precisa de reescrita. Precisa de **sequenciamento técnico rigoroso**.

A ordem correta é:

1. restaurar segurança de release;
2. remover exposição operacional óbvia;
3. corrigir integridade do domínio;
4. fortalecer testes/gates;
5. só então refatorar arquitetura e documentação de forma ampla.

Se essa ordem for respeitada, o Desk Imperial consegue subir de um estado “bom, porém vulnerável em operação” para um estado realmente confiável sem perder velocidade de evolução.
