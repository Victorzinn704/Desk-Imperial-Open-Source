# Auditoria QA/Testes

Data: 2026-04-10
Escopo: `apps/api/test`, `apps/web`, `tests`, CI e tooling.

## Resumo do domínio

A suíte tem boa quantidade de testes unitários e alguns smokes úteis, incluindo k6 para latência e Playwright para navegação básica. O problema central não é ausência total de testes, e sim desbalanceamento: a pipeline protege bem autenticação e contratos locais, mas protege pouco os fluxos end-to-end reais, principalmente depois do login e na integração de backend com banco/Redis/realtime.

## Principais riscos

- O backend tem um `test:e2e` definido, mas a CI não o executa, então a camada de integração real não entra como gate.
- A cobertura do web é calibrada com exclusões e com specs explicitamente voltadas a "coverage boost", o que pode inflar confiança sem medir os arquivos mais arriscados.
- O E2E do web cobre quase só login/cadastro/redirects; os fluxos operacionais críticos ficam restritos a unit tests e mocks.
- Os testes do browser reduzem flakiness com fixtures e mocks globais, mas isso também reduz realismo e pode esconder regressões de integração e de build.

## Achados detalhados

### 1. Backend E2E existe, mas não entra na CI

- **Fato confirmado:** `apps/api/package.json:15-17` define `test:e2e`, porém `.github/workflows/ci.yml:56-75` roda apenas `npm --workspace @partner/api run test -- --coverage --ci --forceExit`. Não há job chamando `test:e2e`.
- **Fato confirmado:** o spec `apps/api/test/http-smoke.e2e-spec.ts:44-68` monta um `TestingModule` com `AppController`, `AuthController` e providers mockados (`PrismaService`, `CacheService`, `AuthService`, `AuditLogService`, `ConfigService`). Isso valida wiring e payloads, mas não integra banco, Redis e auth reais.
- **Fato confirmado:** o smoke mais próximo de integração real é `apps/api/test/be-01-operational-smoke.spec.ts:92-166`, que depende de Redis e de um servidor Socket.IO local criado no próprio teste; ele também não aparece em `.github/workflows/ci.yml`.
- **Inferência forte:** regressões de integração no backend podem passar pelo CI sem tocar a stack real que a aplicação usa em produção.
- **Hipótese:** se não houver uma validação manual fora do GitHub Actions, essa é a única linha de defesa funcional para o backend em merge.
- **Severidade:** Alta.
- **Impacto:** Quebras em auth, health, Redis, websocket e comportamento de controllers podem ser liberadas sem gate funcional real.
- **Confiança:** Alta.
- **Recomendação concreta:** adicionar um job de API E2E na CI usando o `apps/api/test/jest-e2e.json` existente, contra Postgres/Redis efêmeros, e manter o smoke operacional como complemento, não como substituto.

### 2. A cobertura do web é parcialmente cosmética e não mede os arquivos mais arriscados

- **Fato confirmado:** `apps/web/vitest.config.ts:8-21` exclui `components/staff-mobile/**` e `components/operations/use-operations-realtime.ts` no modo normal, e `apps/web/vitest.config.ts:35-48` usa `all: false`, então arquivos sem testes não entram no cálculo global.
- **Fato confirmado:** `apps/web/package.json:12-15` oferece `test:coverage` e `test:coverage:sonar`, mas `.github/workflows/ci.yml:86-101` executa só `npm --workspace @partner/web run test`, sem cobertura.
- **Fato confirmado:** existem specs explicitamente nomeados para inflar cobertura, como `apps/api/test/auth.service.coverage-boost.spec.ts:1-23`, `apps/web/components/pdv/pdv-operations.coverage.test.ts:1-18` e `apps/web/components/pdv/pdv-types.coverage.test.ts:1-7`.
- **Inferência forte:** a métrica de cobertura pode ficar visualmente saudável enquanto superfícies críticas continuam fora do gate diário de CI.
- **Risco potencial:** mudanças em staff mobile, realtime e PDV podem escapar porque parte relevante do código nem participa do cálculo padrão de cobertura.
- **Severidade:** Alta.
- **Impacto:** A equipe pode acreditar que tem proteção ampla quando, na prática, os módulos com maior valor de negócio estão parcial ou totalmente fora da medição corrente.
- **Confiança:** Alta.
- **Recomendação concreta:** remover o uso de `all: false` para o cálculo principal ou, no mínimo, criar thresholds por diretório crítico; também vale revisar as exclusões fixas e parar de tratar `coverage-boost` como estratégia principal de confiança.

### 3. O E2E do web cobre só a borda de autenticação e navegação

- **Fato confirmado:** há 4 arquivos de E2E em `apps/web/e2e` e o conjunto total gira em torno de 20 testes, todos concentrados em login, cadastro, redirecionamento e UX da tela inicial.
- **Fato confirmado:** `apps/web/e2e/auth.spec.ts:11-97` cobre formulário, alternância empresa/funcionário, validação vazia, CTA demo, toggle de senha, link de cadastro e erro de login.
- **Fato confirmado:** `apps/web/e2e/navigation.spec.ts:5-48` cobre login, cadastro, redirects sem sessão, 404 e back/forward; `apps/web/e2e/ui-ux.spec.ts:3-45` só verifica login, inclusive em viewport móvel.
- **Fato confirmado:** `apps/web/e2e/critical-flows.spec.ts:13-58` valida login sem falhas silenciosas, erro 401 e redirect protegido, mas não entra em fluxos pós-auth.
- **Inferência forte:** os fluxos que realmente diferenciam o produto, como PDV, operações, staff mobile, realtime e mudanças de estado depois do login, estão muito mais dependentes de unit tests do que de E2E.
- **Severidade:** Médio-alta.
- **Impacto:** regressões caras para operação diária podem chegar à produção mesmo com CI verde, porque a suíte browser não atravessa as jornadas críticas do negócio.
- **Confiança:** Alta.
- **Recomendação concreta:** adicionar pelo menos um fluxo E2E por área crítica pós-auth: operações, PDV, staff mobile e uma mutação feliz/negativa por papel de usuário.

### 4. Fixtures e mocks reduzem flakiness, mas também reduzem realismo e podem esconder regressões

- **Fato confirmado:** `apps/web/e2e/fixtures/auth-fixtures.ts:7-40` injeta consentimento em `localStorage` e cookie antes de cada teste, ou seja, a suíte já começa com o banner efetivamente resolvido.
- **Fato confirmado:** `apps/web/e2e/auth.spec.ts:81-97` e `apps/web/e2e/critical-flows.spec.ts:29-47` interceptam `**/auth/login` para forçar 401; o teste valida a UI de erro, não a integração real com o backend.
- **Fato confirmado:** `apps/web/playwright.config.ts:35-43` sobe `npm run dev` como web server do Playwright, não um build de produção com `next start`.
- **Fato confirmado:** `apps/web/test/setup.ts:4-37` aplica mocks globais de `matchMedia`, `next/navigation` e `sonner` para toda a suíte Vitest.
- **Inferência forte:** a suíte fica mais estável localmente, mas perde capacidade de detectar regressões de cookie/consent, roteamento real, toasts reais e diferenças entre dev server e runtime de produção.
- **Risco potencial:** bugs de build, middleware, cookie policy ou integração visual podem só aparecer depois do deploy, não no CI.
- **Severidade:** Média.
- **Impacto:** a suíte tende a passar mais facilmente, mas com menor poder de detecção de regressões de integração e de comportamento real do browser.
- **Confiança:** Alta.
- **Recomendação concreta:** manter esses mocks apenas onde forem indispensáveis, criar ao menos um E2E sem interceptação para login feliz e outro em produção-build, e revisar se os mocks globais do Vitest precisam ser limitados por arquivo.

## Conclusão curta

A base de testes é grande, mas a proteção real está concentrada em unidade e autenticação. O maior gap é a ausência de API E2E na CI e a pouca profundidade dos E2E do web em fluxos operacionais críticos. O segundo maior problema é a combinação de exclusões de cobertura com specs explícitas de "coverage boost", que pode mascarar risco real.
