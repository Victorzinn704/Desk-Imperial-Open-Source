# Log Cumulativo de Achados — Desk Imperial Audit

**Data:** 2026-04-09
**Projeto:** `C:\Users\Desktop\Documents\desk-imperial`

---

## P0 — Critico / Imediato

### ACH-025: Modelo User monolitico no Prisma (50+ campos, 25+ relacoes)

- **Dominio:** Arquitetura / Dados
- **Severidade:** Critico
- **Evidencia:** `apps/api/prisma/schema.prisma:88-146` — User contem dados de usuario + empresa + workspace + endereco tudo junto
- **Impacto:** Impede evoluir entidades independentemente, migrations complexas, acoplamento total
- **Recomendacao:** Extrair `Company`/`Workspace` como modelos separados com relacao 1:N para User
- **Esforco:** Alto (5-7 dias, requer migration cuidadosa)
- **Confianca:** 100%

### ACH-026: `getWeekStart` no PillarsService usa domingo como inicio de semana

- **Dominio:** Backend / Logica de Negocio
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/finance/pillars.service.ts:199-204` — `Date.getDay()` retorna 0 para domingo
- **Impacto:** Comparacoes week-over-week distorcidas para contexto comercial brasileiro (segunda = inicio)
- **Recomendacao:** Usar ISO 8601 (segunda = dia 1) ou tornar configuravel
- **Esforco:** Baixo (1h)
- **Confianca:** 100%

### ACH-027: CSRF token derivado deterministicamente do sessionId via HMAC

- **Dominio:** Seguranca
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/auth/auth.service.ts:139` — `createHmac('sha256', secret).update('csrf:${sessionId}')`
- **Impacto:** Se atacante obter CSRF_SECRET + sessionId valido, pode forjar tokens CSRF para qualquer sessao
- **Recomendacao:** Usar token aleatorio armazenado em Redis, nao derivado do sessionId
- **Esforco:** Medio (1-2 dias)
- **Confianca:** 100%

### ACH-028: Cancelamento de order restaura estoque sem protecao de concorrencia

- **Dominio:** Backend / Dados
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/orders/orders.service.ts:515-554` — `updateMany` sem condicao `where` de seguranca
- **Impacto:** Race condition pode corromper estoque sob concorrencia
- **Recomendacao:** Usar `updateMany` com condicao `where` ou transacao Serializable
- **Esforco:** Medio (1-2 dias)
- **Confianca:** 100%

### ACH-029: FinanceService faz queries groupBy sem limite

- **Dominio:** Backend / Performance
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/finance/finance.service.ts:189-257` — 10 queries paralelas sem `take`
- **Impacto:** Para tenants com milhares de clientes/regiones, queries retornam milhares de linhas, travando memoria
- **Recomendacao:** Adicionar `take: 50` ou cursor-based pagination
- **Esforco:** Baixo (2h)
- **Confianca:** 100%

### ACH-030: CSP desabilitado no Helmet

- **Dominio:** Seguranca
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/main.ts:94-105` — `contentSecurityPolicy: false`
- **Impacto:** Sem protecao contra XSS via CSP header
- **Recomendacao:** Habilitar CSP com `default-src: 'none'` como minimo
- **Esforco:** Baixo (1h)
- **Confianca:** 100%

---

## P0 — Critico / Imediato

### ACH-000: Credenciais de operacao em texto puro no disco

- **Dominio:** Seguranca / Infra
- **Severidade:** Critico
- **Evidencia:** `.secrets/ops-credentials.txt` — senhas do Grafana, SonarQube, CI token em texto puro
- **Impacto:** Qualquer pessoa com acesso ao diretorio do projeto ve credenciais de producao. Se o `.gitignore` falhar ou alguem fizer push acidental, credenciais vazam publicamente.
- **Status:** Nao versionado pelo git (`.secrets/` no `.gitignore`) — mas arquivo existe em texto puro
- **Recomendacao:** Usar 1Password, Bitwarden, Vault, ou GitHub Secrets. Destruir arquivo local. Rotacionar todas as credenciais listadas.
- **Esforco:** Baixo (1 dia para rotacionar + adotar password manager)
- **Risco:** Baixo (apenas melhora seguranca)
- **Confianca:** 100% (fato confirmado)

---

## P0 — Critico / Imediato

### ACH-001: `auth.service.ts` — God Service (2433 linhas)

- **Dominio:** Backend / Arquitetura
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/auth/auth.service.ts` — 2433 linhas
- **Impacto:** Manutenibilidade, testabilidade, onboarding de devs
- **Recomendacao:** Extrair em servicos menores: `password.service.ts`, `session.service.ts`, `email-verification.service.ts`, `demo-access.service.ts`, `profile.service.ts`
- **Esforco:** Medio (3-5 dias)
- **Risco:** Baixo (extracao pura, sem mudanca de comportamento)
- **Confianca:** 100% (fato confirmado)

### ACH-002: `comanda.service.ts` — Cognitive Complexity (1607 linhas)

- **Dominio:** Backend / Code Quality
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/operations/comanda.service.ts` — 1607 linhas
- **Impacto:** SonarQube S3776, manutenibilidade, risco de bugs
- **Recomendacao:** Extrair metodos: `buildComandaResponse`, `validateComandaOperation`, `emitComandaEvent`. Extrair sub-services para kitchen, assignments
- **Esforco:** Medio (3-5 dias)
- **Confianca:** 100%

### ACH-003: `operations-helpers.service.ts` — God Helper (1451 linhas)

- **Dominio:** Backend / Code Quality
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/operations/operations-helpers.service.ts` — 1451 linhas
- **Impacto:** "Helper" nao deveria ter 1451 linhas — indica vazamento de responsabilidade de dominio
- **Recomendacao:** Renomear e decompor em `kitchen.service.ts`, `cash-calculator.ts`, `operations-reporter.ts`
- **Esforco:** Medio-Alto (5-7 dias, requer cuidado com dependencias)
- **Confianca:** 100%

### ACH-004: `api.ts` — God File Frontend (1315 linhas)

- **Dominio:** Frontend / Arquitetura
- **Severidade:** Critico
- **Evidencia:** `apps/web/lib/api.ts` — 1315 linhas
- **Impacto:** Todas as chamadas de API em um unico arquivo, dificil manutencao
- **Recomendacao:** Separar por dominio: `api/products.ts`, `api/orders.ts`, `api/auth.ts`, `api/finance.ts`, `api/employees.ts`
- **Esforco:** Baixo-Medio (2-3 dias)
- **Confianca:** 100%

### ACH-005: `use-operations-realtime.ts` — Hook gigante (1258 linhas)

- **Dominio:** Frontend / Code Quality
- **Severidade:** Critico
- **Evidencia:** `apps/web/components/operations/use-operations-realtime.ts` — 1258 linhas
- **Impacto:** Hook com logica excessiva, dificil de testar e manter
- **Recomendacao:** Decompor em hooks menores: `useComandaSocket`, `useKitchenState`, `useCashSessionEvents`, `useOperationsTelemetry`
- **Esforco:** Medio (3-5 dias)
- **Confianca:** 100%

---

## P1 — Alto / Prioritario

### ACH-006: Arquivos > 500 linhas (15+ arquivos)

- **Dominio:** Code Quality
- **Severidade:** Alto
- **Evidencia:** 8 arquivos backend + 15 arquivos frontend acima de 500 linhas
- **Impacto:** Manutenibilidade geral do projeto
- **Recomendacao:** Estabelecer limite de 400 linhas por arquivo no ESLint (`max-lines`)
- **Confianca:** 100%

### ACH-007: Docker Compose — Senhas default fracas

- **Dominio:** Infra / Seguranca
- **Severidade:** Alto
- **Evidencia:** `infra/docker/docker-compose.yml:9` — `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-desk_imperial_change_me}`
- **Impacto:** Se alguem subir o compose sem .env, banco fica com senha fraca
- **Recomendacao:** Remover default, exigir `.env` ou falhar no startup
- **Confianca:** 100%

### ACH-008: CI — `NPM_CONFIG_AUDIT: 'false'`

- **Dominio:** Seguranca / Supply Chain
- **Severidade:** Alto
- **Evidencia:** `.github/workflows/ci.yml:19` — `NPM_CONFIG_AUDIT: 'false'`
- **Impacto:** Vulnerabilidades de dependencias nao sao reportadas no CI
- **Recomendacao:** Habilitar audit no CI, ou rodar `npm audit` como step separado
- **Confianca:** 100%

### ACH-009: `dashboard-shell.tsx` — Componente grande (780 linhas)

- **Dominio:** Frontend / Arquitetura
- **Severidade:** Alto
- **Evidencia:** `apps/web/components/dashboard/dashboard-shell.tsx` — 780 linhas
- **Impacto:** Shell gerencia 5 queries, 12 mutations, 4 ambientes de UI
- **Recomendacao:** Extrair hooks de dados (`useDashboardData`), separar ambientes em componentes proprios
- **Confianca:** 100%

### ACH-010: `pdv-salao-unified.tsx` — 763 linhas

- **Dominio:** Frontend / Code Quality
- **Severidade:** Alto
- **Evidencia:** `apps/web/components/pdv/pdv-salao-unified.tsx` — 763 linhas
- **Recomendacao:** Separar PDV board, salao view, comanda modal em componentes independentes
- **Confianca:** 100%

### ACH-011: Testes — Cobertura desigual

- **Dominio:** QA / Tests
- **Severidade:** Alto
- **Evidencia:** 122 arquivos de teste, mas alguns servicos criticos tem testes enormes (1251 linhas para products.service.spec) indicando que um unico arquivo tenta cobrir tudo
- **Impacto:** Manutenibilidade dos testes, fragilidade
- **Recomendacao:** Dividir testes por caso de uso, nao por service file
- **Confianca:** 80% (inferencia forte)

---

## P2 — Importante / Nao Urgente

### ACH-012: Zero TODO/FIXME/HACK no codigo

- **Dominio:** Code Quality
- **Severidade:** Baixo (mas interessante)
- **Evidencia:** `grep -r "TODO|FIXME|HACK" --include="*.ts" --include="*.tsx"` retornou 0 resultados
- **Impacto:** Pode indicar boa disciplina OU divida tecnica nao documentada
- **Recomendacao:** Usar markers para divida tecnica conhecida
- **Confianca:** 100%

### ACH-013: `contracts.ts` — 465 linhas de contratos

- **Dominio:** Arquitetura / Dados
- **Severidade:** Medio
- **Evidencia:** `packages/types/src/contracts.ts` — 465 linhas
- **Impacto:** Arquivo unico de contratos pode crescer demais
- **Recomendacao:** Separar por dominio: `contracts/auth.ts`, `contracts/operations.ts`, `contracts/finance.ts`
- **Confianca:** 100%

### ACH-014: `faro.ts` — 456 linhas de observabilidade frontend

- **Dominio:** Frontend / Observabilidade
- **Severidade:** Medio
- **Evidencia:** `apps/web/lib/observability/faro.ts` — 456 linhas
- **Impacto:** Arquivo de observabilidade muito grande para uma lib
- **Recomendacao:** Separar configuracao, instrumentacao, e utilitarios
- **Confianca:** 100%

### ACH-015: Deploy — `railway up` antes do `git push`

- **Dominio:** DevOps / Governanca
- **Severidade:** Medio
- **Evidencia:** CLAUDE.md — "Sempre `railway up` ANTES do `git push`"
- **Impacto:** Risco de deploy sem rastreabilidade no git, dificuldade de rollback
- **Recomendacao:** Automatizar deploy via CI/CD apos merge no main
- **Confianca:** 100%

### ACH-016: `commercial-calendar.tsx` — 833 linhas

- **Dominio:** Frontend / Code Quality
- **Severidade:** Alto
- **Evidencia:** `apps/web/components/calendar/commercial-calendar.tsx` — 833 linhas
- **Recomendacao:** Separar calendario base, eventos, DnD, toolbar em componentes
- **Confianca:** 100%

---

## P3 — Melhorias Evolutivas

### ACH-017: Observability stack completo mas complexo

- **Dominio:** Infra / Observabilidade
- **Severidade:** Baixo
- **Evidencia:** 7 componentes de observabilidade (Grafana, Loki, Tempo, Prometheus, Alertmanager, Alloy, Blackbox)
- **Impacto:** Custo operacional alto para um projeto em fase inicial
- **Recomendacao:** Avaliar se todos os componentes sao necessarios agora; considerar hosted solution (Grafana Cloud)
- **Confianca:** 80%

### ACH-018: SonarQube local no repo (`.local-tools/`)

- **Dominio:** Infra / DX
- **Severidade:** Baixo
- **Evidencia:** `.local-tools/sonarqube-26.3.0.120487/` — instalacao local do SonarQube
- **Impacto:** Peso no repo, dificuldade de atualizacao
- **Recomendacao:** Usar SonarQube via Docker ou cloud
- **Confianca:** 100%

### ACH-019: `desk-command-center-prototype.tsx` — 730 linhas de "design lab"

- **Dominio:** Frontend / Code Quality
- **Severidade:** Baixo
- **Evidencia:** `apps/web/components/design-lab/desk-command-center-prototype.tsx` — 730 linhas
- **Impacto:** Parece ser codigo experimental/prototipo
- **Recomendacao:** Avaliar se deve ir para producao ou ser removido
- **Confianca:** 70% (hipotese)

### ACH-020: Prisma — Migrations existem e estao versionadas

- **Dominio:** Dados / DevOps
- **Severidade:** Baixo (resolvido)
- **Evidencia:** `apps/api/prisma/migrations/` — 19 migrations de 2026-03-14 a 2026-03-26
- **Status:** Resolvido — migrations estao no repo, bem nomeadas e datadas

---

## Novos achados dos subagentes (Fase 2)

### ACH-025: Modelo User monolitico no Prisma (50+ campos, 25+ relacoes)

- **Dominio:** Arquitetura / Dados
- **Severidade:** Critico
- **Evidencia:** `apps/api/prisma/schema.prisma:88-146` — User contem dados de usuario + empresa + workspace + endereco tudo junto
- **Impacto:** Impede evoluir entidades independentemente, migrations complexas, acoplamento total
- **Recomendacao:** Extrair `Company`/`Workspace` como modelos separados com relacao 1:N para User
- **Esforco:** Alto (5-7 dias, requer migration cuidadosa)
- **Confianca:** 100%

### ACH-026: `getWeekStart` no PillarsService usa domingo como inicio de semana

- **Dominio:** Backend / Logica de Negocio
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/finance/pillars.service.ts:199-204` — `Date.getDay()` retorna 0 para domingo
- **Impacto:** Comparacoes week-over-week distorcidas para contexto comercial brasileiro (segunda = inicio)
- **Recomendacao:** Usar ISO 8601 (segunda = dia 1) ou tornar configuravel
- **Esforco:** Baixo (1h)
- **Confianca:** 100%

### ACH-027: CSRF token derivado deterministicamente do sessionId via HMAC

- **Dominio:** Seguranca
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/auth/auth.service.ts:139` — `createHmac('sha256', secret).update('csrf:${sessionId}')`
- **Impacto:** Se atacante obter CSRF_SECRET + sessionId valido, pode forjar tokens CSRF para qualquer sessao
- **Recomendacao:** Usar token aleatorio armazenado em Redis, nao derivado do sessionId
- **Esforco:** Medio (1-2 dias)
- **Confianca:** 100%

### ACH-028: Cancelamento de order restaura estoque sem protecao de concorrencia

- **Dominio:** Backend / Dados
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/orders/orders.service.ts:515-554` — `updateMany` sem condicao `where` de seguranca
- **Impacto:** Race condition pode corromper estoque sob concorrencia
- **Recomendacao:** Usar `updateMany` com condicao `where` ou transacao Serializable
- **Esforco:** Medio (1-2 dias)
- **Confianca:** 100%

### ACH-029: FinanceService faz queries groupBy sem limite

- **Dominio:** Backend / Performance
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/modules/finance/finance.service.ts:189-257` — 10 queries paralelas sem `take`
- **Impacto:** Para tenants com milhares de clientes/regiones, queries retornam milhares de linhas, travando memoria
- **Recomendacao:** Adicionar `take: 50` ou cursor-based pagination
- **Esforco:** Baixo (2h)
- **Confianca:** 100%

### ACH-030: CSP desabilitado no Helmet

- **Dominio:** Seguranca
- **Severidade:** Critico
- **Evidencia:** `apps/api/src/main.ts:94-105` — `contentSecurityPolicy: false`
- **Impacto:** Sem protecao contra XSS via CSP header
- **Recomendacao:** Habilitar CSP com `default-src: 'none'` como minimo
- **Esforco:** Baixo (1h)
- **Confianca:** 100%

### ACH-031: Admin PIN rate limiting depende exclusivamente de Redis

- **Dominio:** Seguranca
- **Severidade:** Alto
- **Evidencia:** `apps/api/src/modules/admin-pin/admin-pin.service.ts` — sem fallback se Redis indisponivel
- **Impacto:** Se Redis cair, PIN rate limiting desabilita silenciosamente
- **Recomendacao:** Adicionar fallback em memoria ou bloquear operacoes sensíveis sem Redis
- **Esforco:** Medio (1 dia)
- **Confianca:** 100%

### ACH-032: PrismaService nao implementa OnModuleDestroy

- **Dominio:** Backend / Infra
- **Severidade:** Alto
- **Evidencia:** `apps/api/src/database/prisma.service.ts` — sem `onModuleDestroy()` para fechar conexoes
- **Impacto:** Em graceful shutdown, conexoes Prisma podem ficar abertas, causando connection leak
- **Recomendacao:** Implementar `onModuleDestroy()` chamando `this.$disconnect()`
- **Esforco:** Baixo (15min)
- **Confianca:** 100%

### ACH-033: `buyerDocument` no CreateOrderDto valida apenas length, nao algoritmo

- **Dominio:** Backend / Validacao
- **Severidade:** Alto
- **Evidencia:** `apps/api/src/modules/orders/dto/create-order.dto.ts:59-62` — `@MinLength(11)`, `@MaxLength(14)` sem validacao de CPF/CNPJ
- **Impacto:** Documentos invalidos sao aceitos
- **Recomendacao:** Custom validator com algoritmo real de CPF/CNPJ
- **Esforco:** Baixo (2h)
- **Confianca:** 100%

### ACH-034: MarketIntelligenceService envia dados financeiros completos para Gemini

- **Dominio:** Seguranca / Privacidade
- **Severidade:** Alto
- **Evidencia:** `apps/api/src/modules/market-intelligence/market-intelligence.service.ts:107-133`
- **Impacto:** Dados financeiros sensíveis enviados para API externa (Google)
- **Recomendacao:** Anonimizar ou agregar dados antes de enviar para LLM externo
- **Esforco:** Medio (1-2 dias)
- **Confianca:** 100%

### ACH-035: `.dockerignore` inexistente

- **Dominio:** Infra / Seguranca
- **Severidade:** Alto
- **Evidencia:** Nenhum `.dockerignore` encontrado no repo
- **Impacto:** `COPY . .` envia `.env`, `node_modules`, `.secrets/`, `.claude/` para contexto Docker
- **Recomendacao:** Criar `.dockerignore` excluindo `.env*`, `node_modules`, `.secrets/`, `.claude/`, `.local-tools/`
- **Esforco:** Baixo (30min)
- **Confianca:** 100%

### ACH-036: Prisma migrate deploy no CMD do container

- **Dominio:** Infra / DevOps
- **Severidade:** Alto
- **Evidencia:** `infra/oracle/docker/api.Dockerfile:69` — migrations rodando no CMD do container
- **Impacto:** Race condition em multiplas replicas
- **Recomendacao:** Separar migrations em initContainer ou job one-off
- **Esforco:** Medio (1 dia)
- **Confianca:** 100%

### ACH-037: Sem health check endpoint na API

- **Dominio:** Infra / DevOps
- **Severidade:** Alto
- **Evidencia:** Nenhum endpoint `/health`, `/healthz`, `/ready` encontrado
- **Impacto:** Railway nao consegue determinar saude da API, sem rolling restarts adequados
- **Recomendacao:** Implementar `/health` com checks de DB, Redis, e disco
- **Esforco:** Baixo (2h)
- **Confianca:** 100%

### ACH-038: OperationsService como facade puro (90% delegacao)

- **Dominio:** Arquitetura
- **Severidade:** Alto
- **Evidencia:** `apps/api/src/modules/operations/operations.service.ts:75-185` — metodos apenas delegam para CashSessionService e ComandaService
- **Impacto:** Camada desnecessaria de indirecao, acoplamento extra
- **Recomendacao:** Controller injeta servicos diretamente, eliminar OperationsService facade
- **Esforco:** Medio (1-2 dias)
- **Confianca:** 100%

### ACH-039: `common/utils/workspace-access.util.ts` importa de `modules/auth/auth.types`

- **Dominio:** Arquitetura
- **Severidade:** Alto
- **Evidencia:** `apps/api/src/common/utils/workspace-access.util.ts:2` — `common` depende de `modules/auth`
- **Impacto:** Viola hierarquia de camadas — `common` deveria ser a camada mais baixa
- **Recomendacao:** Mover `AuthContext` para `common/types/` ou `packages/types/`
- **Esforco:** Baixo (1h)
- **Confianca:** 100%

### ACH-040: `is-kitchen-category` duplicado frontend/backend

- **Dominio:** Code Quality
- **Severidade:** Medio
- **Evidencia:** `apps/api/src/common/utils/is-kitchen-category.util.ts` vs `apps/web/lib/is-kitchen-category.ts`
- **Impacto:** Duplicacao de logica, risco de divergencia
- **Recomendacao:** Mover para `packages/types/src/`
- **Esforco:** Baixo (30min)
- **Confianca:** 100%

### ACH-041: Sem versionamento de API (nenhum prefixo `/v1/`)

- **Dominio:** Arquitetura / API
- **Severidade:** Medio
- **Evidencia:** Nenhum prefixo de versao nos routes do NestJS
- **Impacto:** Breaking changes futuras sem caminho de migracao
- **Recomendacao:** Adicionar prefixo `/v1/` em todos os endpoints
- **Esforco:** Medio (1-2 dias)
- **Confianca:** 100%

### ACH-042: `LazyMotionDiv`, `LazyAnimatePresence` nao usados (codigo morto)

- **Dominio:** Frontend / Code Quality
- **Severidade:** Medio
- **Evidencia:** `apps/web/components/shared/lazy-components.tsx` — exports nao importados em nenhum lugar
- **Impacto:** Bundle size desnecessario
- **Recomendacao:** Remover exports nao usados ou deletar arquivo
- **Esforco:** Baixo (15min)
- **Confianca:** 100%

### ACH-043: `--accent` token discrepancy

- **Dominio:** Frontend / Design System
- **Severidade:** Medio
- **Evidencia:** CLAUDE.md diz `--accent: #9b8460` (dourado), CSS tem `--accent: #008cff` (azul)
- **Impacto:** Inconsistencia visual entre documentacao e implementacao
- **Recomendacao:** Alinhar documentacao com implementacao ou vice-versa
- **Esforco:** Baixo (15min)
- **Confianca:** 100%

### ACH-044: `finance-categories-sidebar.tsx` usa cores hard-coded inline

- **Dominio:** Frontend / Design System
- **Severidade:** Medio
- **Evidencia:** `apps/web/components/dashboard/finance-categories-sidebar.tsx:24-30` — `#36f57c`, `#C9A84C`, `#f04438` inline
- **Impacto:** Sistema dual de cores (CSS tokens + inline), dificil manutencao
- **Recomendacao:** Usar CSS custom properties ou Tailwind tokens
- **Esforco:** Baixo (1h)
- **Confianca:** 100%

### ACH-045: Acessibilidade — aria-labels quase inexistentes

- **Dominio:** Frontend / Acessibilidade
- **Severidade:** Alto
- **Evidencia:** Apenas 1 `aria-label` encontrado em todo o frontend (`sales-map-canvas.tsx:134`)
- **Impacto:** Leitores de tela nao conseguem navegar pelo dashboard
- **Recomendacao:** Adicionar `aria-label`, `role`, `aria-live` em componentes interativos
- **Esforco:** Medio (2-3 dias)
- **Confianca:** 100%

### ACH-046: Portugues sem acentos no copy

- **Dominio:** Frontend / UX
- **Severidade:** Medio
- **Evidencia:** Todo copy usa portugues sem acentos: "formulario", "disponivel", "operacao"
- **Impacto:** Profissionalismo reduzido, acessibilidade de leitores de tela comprometida
- **Recomendacao:** Usar portugues com acentos corretos
- **Esforco:** Medio (1-2 dias)
- **Confianca:** 100%

### ACH-047: Textos abaixo do minimo recomendado (10px)

- **Dominio:** Frontend / Acessibilidade
- **Severidade:** Medio
- **Evidencia:** `finance-categories-sidebar.tsx:95, 132, 260` — `text-[10px]`
- **Impacto:** Ilegivel em alguns dispositivos, abaixo do minimo WCAG
- **Recomendacao:** Elevar para minimo 12px
- **Esforco:** Baixo (30min)
- **Confianca:** 100%

---

## P4 — Oportunidades

### ACH-021: CI pipeline excelente

- **Dominio:** DevOps
- **Severidade:** Oportunidade
- **Evidencia:** `.github/workflows/ci.yml` — 7 jobs com dependencias, k6 latency gate, security scan
- **Nota:** Pipeline muito madura para projeto deste porte. Ponto forte.

### ACH-022: Observabilidade frontend com Grafana Faro

- **Dominio:** Frontend / Observabilidade
- **Severidade:** Oportunidade
- **Evidencia:** `apps/web/lib/observability/faro.ts` — 456 linhas
- **Nota:** Raro ver observabilidade frontend em projetos deste porte. Ponto forte.

### ACH-023: Load testing com k6 integrado no CI

- **Dominio:** QA / Performance
- **Severidade:** Oportunidade
- **Evidencia:** `tests/load/k6/critical-flows.js`, job `performance-latency-gate` no CI
- **Nota:** Gate de latencia no CI e pratica de elite. Ponto forte.

### ACH-024: Schema Prisma bem modelado

- **Dominio:** Dados / Arquitetura
- **Severidade:** Oportunidade
- **Evidencia:** 15 models com indices compostos, relacoes bem definidas, enums tipados
- **Nota:** Schema demonstra maturidade de modelagem. Indices em campos de busca frequente.
