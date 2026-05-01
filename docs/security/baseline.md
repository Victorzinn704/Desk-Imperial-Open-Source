# Security Baseline

Date: 2026-04-18

Artefato bruto de referência: `docs/security/audit-snapshot-2026-04-18.json`

Observação operacional:

- Nenhum `npm update`, `npm install` ou `npm audit fix` foi executado nesta rodada.
- O `npm audit` bruto reporta `14` package hits, mas a triagem abaixo consolida isso em `12` advisories únicos. Os outros `2` hits são pacotes-efeito (`@angular-devkit/*`, `inquirer`, `external-editor`) já cobertos pelos advisories raiz do mesmo grafo.
- Não há achados atuais em `jsonwebtoken`, `jose`, `@nestjs/jwt`, `cookie`, `cookie-parser`, `express-session`, `bcrypt`, `argon2`, `@prisma/client`, `@nestjs/core`, `express` ou `zod`.

## Resumo de ações

### Candidato a resolver antes da wave-0

- `GHSA-xq3m-2v4x-88gg` (`protobufjs`)  
  Motivo: única vulnerabilidade `critical`, em package transitivo presente no runtime de observabilidade da API e do web. A exposição efetiva é baixa e condicional, mas o fix parece não-breaking no lockfile atual.  
  Comandos propostos para hotfix, ainda não executados:
  - `npm update protobufjs`
  - `npm ls protobufjs`
  - `npm --workspace @partner/api run test -- test/otel.util.spec.ts`
  - `npm --workspace @partner/web run test -- lib/observability/faro-telemetry.test.ts`

### Aceitos com data de revisão

- Nenhum nesta rodada.

### Descartados

- Nenhum nesta rodada.

### Adiados para o bloco de remoções finais / atualização de toolchain

- `GHSA-5j98-mcp5-4vw2` (`glob`) via `@nestjs/cli`
- `GHSA-c2c7-rcm5-vvqj` (`picomatch`) via `@nestjs/cli`
- `GHSA-p9ff-h696-f583` (`vite`) via `vitest`
- `GHSA-v2wj-q39q-566r` (`vite`) via `vitest`
- `GHSA-4w7w-66w2-5vf9` (`vite`) via `vitest`
- `GHSA-2g4f-4pwh-qvx6` (`ajv`) via `@nestjs/cli`
- `GHSA-3v7f-55p6-f55p` (`picomatch`) via `@nestjs/cli`
- `GHSA-4vvj-4cpr-p986` (`webpack`) via `@nestjs/cli`
- `GHSA-38r7-794h-5758` (`webpack`) via `@nestjs/cli`
- `GHSA-8fgc-7cc6-rx7x` (`webpack`) via `@nestjs/cli`
- `GHSA-52f5-9888-hmc6` (`tmp`) via `@nestjs/cli -> inquirer -> external-editor`

Comandos candidatos para esse bloco, ainda não executados:

- `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`
- `npm --workspace @partner/api install -D vitest@4.1.4 vite@8.0.8`
- `npm --workspace @partner/web install -D vitest@4.1.4 @vitest/coverage-v8@4.1.4 vite@8.0.8`

## Política de resolução

- Crítica/alta em dep direta de auth/crypto/session → resolver antes da wave-0
- Crítica/alta em dep direta de core runtime → resolver antes da wave-0 se fix não tem breaking; senão escalar
- Crítica/alta em dep transitiva sem fix upstream → aceitar e documentar
- Média/baixa em direta runtime → resolver na wave aplicável ou no bloco de remoções finais
- Qualquer severidade em dev-only/tooling (`@types`, `eslint-*`, `vitest`, `jest`, `prettier`, `tsx`, CLI de scaffolding/build) → severidade efetiva rebaixada; resolver em lote no bloco de remoções finais
- `npm audit` severity não substitui investigação de exposição real em código

## Contagem

- Críticas: `1` (`1` candidato a resolver antes da wave-0, `0` aceitar)
- Altas: `4` (`0` antes da wave-0, `4` no bloco de remoções finais)
- Médias: `4`
- Baixas: `3`

Meta ao final do programa: zero `critical/high` não tratado, e `medium/low` documentados com plano de revisão/remoção.

## Triagem individual

### GHSA-xq3m-2v4x-88gg — protobufjs — arbitrary code execution

**Severidade:** Crítica  
**Pacote:** `protobufjs @ 7.5.4`  
**Tipo de dependência:** transitiva  
Via: `@opentelemetry/otlp-transformer <- @opentelemetry/exporter-logs-otlp-http / @opentelemetry/exporter-metrics-otlp-http / @opentelemetry/exporter-trace-otlp-http / @opentelemetry/sdk-node` na API e `@opentelemetry/otlp-transformer <- @grafana/faro-core <- @grafana/faro-web-sdk` no web  
**Área afetada:** observabilidade / runtime condicional  
**CVSS:** não informado no `npm audit`

**Natureza da vulnerabilidade:**  
Permite execução arbitrária de código no `protobufjs` afetado.

**Exposição real no Desk Imperial:**  
O package está presente em runtime, mas somente por wrappers de observabilidade. Na API, `bootstrap()` chama `initializeApiOpenTelemetry()`, porém o util retorna cedo se nenhum endpoint OTLP estiver configurado em `OTEL_EXPORTER_OTLP_*` (`apps/api/src/main.ts:227`, `apps/api/src/common/utils/otel.util.ts:34`, `.env.example:90`). No web, `initializeFrontendFaro()` só ativa se `NEXT_PUBLIC_FARO_COLLECTOR_URL` estiver presente (`apps/web/instrumentation-client.ts:1`, `apps/web/lib/observability/faro.ts:50`, `.env.example:103`). Não encontrei uso direto de `protobufjs.parse`, `load`, `loadSync`, `Root.fromJSON`, `.proto` files ou APIs de reflection no código do projeto; o uso é apenas transitivo via OTLP/Faro. O input que chega nesses caminhos é payload de telemetria produzido pela própria aplicação, não request público direto.

**Fix disponível:**

- Versão segura: `7.5.5+`
- Breaking change: não aparente no range atual; os dependentes usam ranges compatíveis com `7.5.5`
- Comando: `npm update protobufjs`

**Decisão:**

- [x] Resolver antes da wave-0 (hotfix recomendado)
- [ ] Resolver na wave <X>
- [ ] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
É o único advisory `critical` e aparece em runtime, mesmo que em trilha condicional de observabilidade. A exposição efetiva é baixa, mas o custo esperado do hotfix parece pequeno. O update ainda não foi executado porque o operador pediu aprovação prévia antes de qualquer mudança de dependência.

**Status em 2026-04-18 (Passo 1):**  
Resolvido em `origin/main` no commit `d69c56b` (merge do PR #4 / branch `hotfix/protobufjs-cve`).

### GHSA-5j98-mcp5-4vw2 — glob — command injection via glob CLI `-c/--cmd`

**Severidade:** Alta  
**Pacote:** `glob @ 10.3.10`  
**Tipo de dependência:** transitiva  
Via: `@nestjs/cli -> glob`  
**Área afetada:** tooling / build-only  
**CVSS:** `7.5`

**Natureza da vulnerabilidade:**  
Permite command injection quando a CLI do `glob` usa `-c/--cmd` com `shell:true`.

**Exposição real no Desk Imperial:**  
O `glob` vulnerável entra pelo `@nestjs/cli`, que aqui é devDependency e serve para `nest start --watch` e `nest build --builder tsc` (`apps/api/package.json:6`, `apps/api/package.json:7`, `apps/api/package.json:63`). Em produção, a API sobe do JS já compilado e a imagem poda devDependencies (`apps/api/scripts/start-dist.mjs:1`, `infra/oracle/docker/api.Dockerfile:28`). Não há uso do CLI `glob` pelo código de produto nem request path público.

**Fix disponível:**

- Versão segura: via `@nestjs/cli @ 11.0.21`
- Breaking change: sim; major de CLI (`10.x -> 11.x`)
- Comando: `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
É alta no advisory original, mas a exposição efetiva é dev/build-only. O fix depende de major bump em toolchain; não entra na frente do runtime baseline.

### GHSA-c2c7-rcm5-vvqj — picomatch — ReDoS via extglob quantifiers

**Severidade:** Alta  
**Pacote:** `picomatch @ 3.0.1`  
**Tipo de dependência:** transitiva  
Via: `@nestjs/cli -> @angular-devkit/core -> picomatch` e `@nestjs/cli -> @nestjs/schematics -> @angular-devkit/core -> picomatch`  
**Área afetada:** tooling / build-only  
**CVSS:** `7.5`

**Natureza da vulnerabilidade:**  
Permite ReDoS em avaliação de padrões glob com quantificadores extglob maliciosos.

**Exposição real no Desk Imperial:**  
Não há import direto de `picomatch` no código do produto. Os padrões globs que exercitam essa árvore ficam em tooling do Nest CLI e schematics, não em rotas HTTP nem em input público de produção. O build da API usa `builder: tsc`, não webpack customizado (`apps/api/nest-cli.json:3`, `apps/api/package.json:7`).

**Fix disponível:**

- Versão segura: via cadeia atualizada para `picomatch >= 3.0.2 / 4.0.4`
- Breaking change: sim, porque o caminho prático é atualizar `@nestjs/cli` major
- Comando: `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
Alta nominal, mas sem caminho de exploração no runtime. Fica acoplada ao lote de atualização de toolchain.

### GHSA-p9ff-h696-f583 — vite — arbitrary file read via dev server WebSocket

**Severidade:** Alta  
**Pacote:** `vite @ 8.0.3`  
**Tipo de dependência:** transitiva  
Via: `vitest -> vite` nos workspaces `@partner/api` e `@partner/web`  
**Área afetada:** test-only / dev server  
**CVSS:** não informado no `npm audit`

**Natureza da vulnerabilidade:**  
Permite leitura arbitrária de arquivo via WebSocket do dev server do Vite.

**Exposição real no Desk Imperial:**  
O projeto usa `vite` apenas através do `vitest`; o web de produção usa `next start`, não `vite dev` (`apps/web/package.json:12`, `apps/api/package.json:17`, `apps/web/scripts/start.mjs:1`, `infra/oracle/docker/web.Dockerfile:40`). Não existe surface pública em produção baseada em Vite.

**Fix disponível:**

- Versão segura: `vite >= 8.0.5` (recomendado `8.0.8`)
- Breaking change: não aparente; exige revalidar Vitest após refresh de lockfile
- Comando: `npm --workspace @partner/api install -D vitest@4.1.4 vite@8.0.8` e `npm --workspace @partner/web install -D vitest@4.1.4 @vitest/coverage-v8@4.1.4 vite@8.0.8`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
Alta apenas no dev server de testes. Sem superfície de produção; atualiza junto do lote de toolchain.

### GHSA-v2wj-q39q-566r — vite — `server.fs.deny` bypass with queries

**Severidade:** Alta  
**Pacote:** `vite @ 8.0.3`  
**Tipo de dependência:** transitiva  
Via: `vitest -> vite` nos workspaces `@partner/api` e `@partner/web`  
**Área afetada:** test-only / dev server  
**CVSS:** não informado no `npm audit`

**Natureza da vulnerabilidade:**  
Permite bypass da proteção `server.fs.deny` via query strings no Vite.

**Exposição real no Desk Imperial:**  
Mesma trilha do advisory anterior: Vite só entra pelo `vitest`, não pelo runtime de produção. Não há `vite dev` exposto publicamente no ambiente operacional.

**Fix disponível:**

- Versão segura: `vite >= 8.0.5` (recomendado `8.0.8`)
- Breaking change: não aparente
- Comando: `npm --workspace @partner/api install -D vitest@4.1.4 vite@8.0.8` e `npm --workspace @partner/web install -D vitest@4.1.4 @vitest/coverage-v8@4.1.4 vite@8.0.8`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
Sem request path em produção. Mantém-se no lote de atualização de tooling.

### GHSA-4w7w-66w2-5vf9 — vite — path traversal in optimized deps `.map` handling

**Severidade:** Média  
**Pacote:** `vite @ 8.0.3`  
**Tipo de dependência:** transitiva  
Via: `vitest -> vite` nos workspaces `@partner/api` e `@partner/web`  
**Área afetada:** test-only / dev server  
**CVSS:** não informado no `npm audit`

**Natureza da vulnerabilidade:**  
Permite path traversal na manipulação de source maps dos deps otimizados do Vite.

**Exposição real no Desk Imperial:**  
Mesma trilha dos advisories altos do Vite: ambiente de teste/dev apenas. O web de produção segue em Next.js, sem Vite em runtime.

**Fix disponível:**

- Versão segura: `vite >= 8.0.5` (recomendado `8.0.8`)
- Breaking change: não aparente
- Comando: `npm --workspace @partner/api install -D vitest@4.1.4 vite@8.0.8` e `npm --workspace @partner/web install -D vitest@4.1.4 @vitest/coverage-v8@4.1.4 vite@8.0.8`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
É média e dev-only. Não justifica interromper o baseline runtime.

### GHSA-2g4f-4pwh-qvx6 — ajv — ReDoS when using `$data`

**Severidade:** Média  
**Pacote:** `ajv @ 8.12.0`  
**Tipo de dependência:** transitiva  
Via: `@nestjs/cli -> @angular-devkit/core -> ajv`  
**Área afetada:** tooling / build-only  
**CVSS:** não informado no `npm audit`

**Natureza da vulnerabilidade:**  
Permite ReDoS quando o Ajv usa a opção `$data` com payload malicioso.

**Exposição real no Desk Imperial:**  
O projeto não instancia `Ajv` diretamente nem aceita schemas JSON de usuário. O `ajv` vulnerável vem do Angular devkit embutido na CLI do Nest; não há path HTTP ou job runtime que alimente esse fluxo com input público.

**Fix disponível:**

- Versão segura: `ajv >= 8.18.0`
- Breaking change: sim, porque a rota prática aqui é atualizar o `@nestjs/cli` major
- Comando: `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
Sem uso direto de Ajv no produto e sem entrada de usuário no path vulnerável. Pode esperar o lote de toolchain.

### GHSA-3v7f-55p6-f55p — picomatch — method injection in POSIX character classes

**Severidade:** Média  
**Pacote:** `picomatch @ 3.0.1`  
**Tipo de dependência:** transitiva  
Via: `@nestjs/cli -> @angular-devkit/core -> picomatch`  
**Área afetada:** tooling / build-only  
**CVSS:** `5.3`

**Natureza da vulnerabilidade:**  
Permite method injection que causa matching incorreto de glob patterns.

**Exposição real no Desk Imperial:**  
Sem import direto no produto. O risco real aqui é tooling interpretar glob malicioso durante build/scaffold; não há consumo de glob pattern vindo de request público.

**Fix disponível:**

- Versão segura: `picomatch >= 3.0.2 / 4.0.4`
- Breaking change: sim, via atualização major do `@nestjs/cli`
- Comando: `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
Impacto real baixo e confinado a tooling. Mantido no lote de atualização do CLI.

### GHSA-4vvj-4cpr-p986 — webpack — DOM clobbering gadget leading to XSS

**Severidade:** Média  
**Pacote:** `webpack @ 5.90.1`  
**Tipo de dependência:** transitiva  
Via: `@nestjs/cli -> webpack`  
**Área afetada:** tooling / build-only  
**CVSS:** `6.4`

**Natureza da vulnerabilidade:**  
Permite gadget de DOM clobbering que pode levar a XSS em bundles afetados.

**Exposição real no Desk Imperial:**  
Apesar de o advisory mirar output de bundle, a API deste repo compila com `builder: tsc`, não com webpack (`apps/api/nest-cli.json:5`). O `webpack` vulnerável aparece como transitivo do Nest CLI, não do runtime da aplicação web nem da API em produção.

**Fix disponível:**

- Versão segura: `webpack >= 5.94.0`
- Breaking change: sim no caminho atual, pois depende de refresh do `@nestjs/cli`
- Comando: `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
Não há bundling webpack em produção dessa API. Severidade efetiva cai para tooling.

### GHSA-38r7-794h-5758 — webpack — `allowedUris` bypass via HTTP redirects

**Severidade:** Baixa  
**Pacote:** `webpack @ 5.90.1`  
**Tipo de dependência:** transitiva  
Via: `@nestjs/cli -> webpack`  
**Área afetada:** tooling / build-only  
**CVSS:** `3.7`

**Natureza da vulnerabilidade:**  
Permite bypass de `allowedUris` em `buildHttp` via redirect, com risco de SSRF/cache persistence em build-time.

**Exposição real no Desk Imperial:**  
O projeto não usa `buildHttp` com URLs controladas por usuário. O pacote só entra como transitivo de tooling do Nest CLI, e o build da API usa `tsc`.

**Fix disponível:**

- Versão segura: `webpack >= 5.104.0`
- Breaking change: sim no caminho atual, pois depende de refresh do CLI/dev tree
- Comando: `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
Baixa e build-only. Sem urgência para o programa de runtime.

### GHSA-8fgc-7cc6-rx7x — webpack — `allowedUris` bypass via URL userinfo

**Severidade:** Baixa  
**Pacote:** `webpack @ 5.90.1`  
**Tipo de dependência:** transitiva  
Via: `@nestjs/cli -> webpack`  
**Área afetada:** tooling / build-only  
**CVSS:** `3.7`

**Natureza da vulnerabilidade:**  
Permite bypass de allow-list `allowedUris` via URL com userinfo, resultando em comportamento de build-time SSRF.

**Exposição real no Desk Imperial:**  
Mesma análise do advisory anterior: o projeto não usa esse recurso de webpack em runtime ou com input de usuário. O pacote está apenas no grafo de tooling do CLI do Nest.

**Fix disponível:**

- Versão segura: `webpack >= 5.104.0`
- Breaking change: sim no caminho atual
- Comando: `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
Baixa, build-only e sem input de request.

### GHSA-52f5-9888-hmc6 — tmp — arbitrary temporary file/directory write via symlink `dir`

**Severidade:** Baixa  
**Pacote:** `tmp @ 0.0.33`  
**Tipo de dependência:** transitiva  
Via: `@nestjs/cli -> inquirer -> external-editor -> tmp`  
**Área afetada:** local dev / interactive CLI only  
**CVSS:** `2.5`

**Natureza da vulnerabilidade:**  
Permite escrita arbitrária em arquivo/diretório temporário por abuso de symlink no parâmetro `dir`.

**Exposição real no Desk Imperial:**  
O pacote só aparece na cadeia de prompts interativos do `@nestjs/cli`. Não há consumo de `tmp` no runtime da API ou do web. A exploração exigiria contexto local de desenvolvimento com CLI interativa, não request path público.

**Fix disponível:**

- Versão segura: `tmp > 0.2.3`
- Breaking change: sim no caminho atual, porque vem junto do refresh do CLI/dev tree
- Comando: `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`

**Decisão:**

- [ ] Resolver antes da wave-0 (hotfix)
- [ ] Resolver na wave <X>
- [x] Resolver no bloco de remoções finais
- [ ] Aceitar com revisão em <data>
- [ ] Descartar (falso positivo / não exposto)

**Justificativa:**  
Baixa, local-only e sem superfície de produção.

## Retriagem em 2026-04-18 (1c-retake)

### Evidência bruta executada

#### a) `git log --oneline origin/main -20`

```text
7f518e6 (HEAD, origin/main, origin/HEAD) feat(quality): stabilize workspace and refresh project profile (#3)
0f3c0db Merge pull request #2 from Victorzinn704/hardening/breaking-upgrades-staging-2026-04-01
1b55b9c (hardening/breaking-upgrades-staging-2026-04-01) feat(perf): prewarm finance summary and refine landing hero
...
284a3c7 feat(stock): desconto automático de estoque ao fechar comanda + alerta de estoque baixo configurável
8684afc feat(web): atualiza hero da landing page com identidade e gratuidade
```

#### b) No estado atual de `origin/main`

Comandos executados:

- `git checkout origin/main`
- `npm install`
- `npm audit --json > audit-origin-main-2026-04-18-retake.json`

Output relevante:

```text
22 vulnerabilities (3 low, 7 moderate, 11 high, 1 critical)
npm audit exit code: 1
counts={"info":0,"low":3,"moderate":7,"high":11,"critical":1,"total":22}
uniqueVulnObjects=22
```

#### c) `git log --all --oneline -- package-lock.json | head -20`

```text
6bf36e6 fix(deps): bump protobufjs to 7.5.5+ (GHSA-xq3m-2v4x-88gg)
f66b6bf chore: update docs, infra scripts, audit logs, and package-lock
9879bee feat: consolidate all changes from audit and refactoring sessions
...
904bd9d feat: evolve pdv salao workflow
e3e7917 feat(auth): login OWNER/STAFF, cadastro com endereço, operações integradas
```

#### d) Comparação do snapshot original vs retake de `origin/main`

Comparação automática entre `docs/security/audit-snapshot-2026-04-18.json` (triagem original) e `audit-origin-main-2026-04-18-retake.json`:

```text
original.counts={"info":0,"low":3,"moderate":6,"high":4,"critical":1,"total":14}
retake.counts={"info":0,"low":3,"moderate":7,"high":11,"critical":1,"total":22}
onlyRetake.packages=["@nestjs/config","@nestjs/core","@nestjs/platform-express","@nestjs/swagger","lodash","next","nodemailer","path-to-regexp"]
onlyRetake.ghsa=["GHSA-27V5-C462-WPQ7","GHSA-36XV-JGW5-4Q75","GHSA-F23M-R3PF-42RH","GHSA-J3Q9-MXJG-W52F","GHSA-Q4GF-8MX6-V5V3","GHSA-R5FR-RJXR-66JC","GHSA-VVJJ-XCJG-GR5G"]
```

Validação adicional da hipótese de lockfile:

- `git merge-base --is-ancestor 907023e origin/main` retornou exit code `1` (ou seja, `907023e` não está em `origin/main`).
- `npm audit` no commit `907023e` hoje continua reproduzindo o snapshot original (`14` hits: `1 critical`, `4 high`, `6 moderate`, `3 low`).
- Diferença de versões resolvidas no lockfile (`907023e` vs `origin/main`):
  - `@nestjs/config`: `4.0.4` vs `4.0.3`
  - `@nestjs/core`: `11.1.18` vs `11.1.17`
  - `@nestjs/platform-express`: `11.1.18` vs `11.1.17`
  - `@nestjs/swagger`: `11.2.7` vs `11.2.6`
  - `next`: `16.2.3` vs `16.1.7`
  - `nodemailer`: `8.0.5` vs `8.0.4`
  - `lodash`: `4.18.1` vs `4.17.23`
  - `path-to-regexp`: `8.4.2` vs `8.3.0`

### Classificação da causa da discrepância

- [x] **Cenário A**: triagem original foi feita contra lockfile local diferente do `origin/main`.
- [ ] **Cenário B**: `origin/main` mudou desde a triagem original.
- [ ] **Cenário C**: advisory database do `npm audit` mudou e sozinha explica a diferença.
- [ ] **Cenário D**: combinação dos anteriores.

Conclusão técnica: **A**.

### Contagem atualizada após retake

- `origin/main` (retake): `1 critical`, `11 high`, `7 moderate`, `3 low` (`22` package hits)
- `hotfix/protobufjs-cve` (retake): `0 critical`, `11 high`, `7 moderate`, `3 low` (`21` package hits)

Distribuição dos `11` highs reais de `origin/main`:

- **Pré-wave-0 (runtime direta / runtime transitiva acoplada):** `7` package hits
  - `@nestjs/config`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger`, `next`, `lodash`, `path-to-regexp`
- **Bloco de remoções finais/toolchain:** `4` package hits
  - `@nestjs/cli`, `glob`, `picomatch`, `vite`

Observação: `nodemailer` entrou no diff como **moderate** (`GHSA-vvjj-xcjg-gr5g`), não em high.

### Triagem individual dos 11 highs reais de `origin/main`

#### 1) `@nestjs/config` (high via `lodash`)

**Severidade:** Alta  
**Pacote:** `@nestjs/config @ 4.0.3`  
**Tipo de dependência:** direta (runtime)  
**Via:** `lodash` (`GHSA-r5fr-rjxr-66jc`, com `GHSA-f23m-r3pf-42rh` também presente no mesmo grafo)  
**Área afetada:** bootstrap/configuração da API

**Natureza da vulnerabilidade:**  
Code injection em `lodash` (`_.template`) no range vulnerável.

**Exposição real no Desk Imperial:**  
`@nestjs/config` é usado em runtime (ex.: `ConfigModule.forRoot`, `ConfigService`), mas os valores vêm de variáveis de ambiente controladas pelo operador/deploy, não de input HTTP de usuário. Mesmo assim, é dependência direta de runtime e precisa estar em versão corrigida.

**Fix disponível:**

- Versão segura observada: `4.0.4`
- Breaking change: não aparente (patch)
- Comando sugerido: `npm --workspace @partner/api install @nestjs/config@4.0.4`

**Decisão:**

- [x] Resolver antes da wave-0
- [ ] Resolver no bloco de remoções finais

**Justificativa:**  
É high em dependência direta de runtime e possui fix patch sem major.

#### 2) `@nestjs/core` (high via `path-to-regexp`)

**Severidade:** Alta  
**Pacote:** `@nestjs/core @ 11.1.17`  
**Tipo de dependência:** direta (runtime)  
**Via:** `path-to-regexp` (`GHSA-j3q9-mxjg-w52f`) + advisory moderado próprio (`GHSA-36xv-jgw5-4q75`)  
**Área afetada:** core HTTP/runtime da API

**Natureza da vulnerabilidade:**  
DoS por regex em `path-to-regexp` no matcher de rotas.

**Exposição real no Desk Imperial:**  
`@nestjs/core` está no caminho de todas as rotas públicas da API; entrada de path HTTP é controlada externamente. Mesmo sem PoC local, o risco é de disponibilidade no runtime principal.

**Fix disponível:**

- Versão segura observada: `11.1.19`
- Breaking change: não aparente (minor dentro de `11.x`)
- Comando sugerido: `npm --workspace @partner/api install @nestjs/core@11.1.19`

**Decisão:**

- [x] Resolver antes da wave-0
- [ ] Resolver no bloco de remoções finais

**Justificativa:**  
Dependência de core runtime com high e fix sem major.

#### 3) `@nestjs/platform-express` (high via `path-to-regexp`)

**Severidade:** Alta  
**Pacote:** `@nestjs/platform-express @ 11.1.17`  
**Tipo de dependência:** direta (runtime)  
**Via:** `path-to-regexp` (`GHSA-j3q9-mxjg-w52f`)  
**Área afetada:** adapter HTTP exposto publicamente

**Natureza da vulnerabilidade:**  
DoS por regex no pipeline de matching de rotas.

**Exposição real no Desk Imperial:**  
A API de produção roda via adapter Express do Nest, portanto esse pacote participa da borda pública.

**Fix disponível:**

- Versão segura observada: `11.1.19`
- Breaking change: não aparente (minor dentro de `11.x`)
- Comando sugerido: `npm --workspace @partner/api install @nestjs/platform-express@11.1.19`

**Decisão:**

- [x] Resolver antes da wave-0
- [ ] Resolver no bloco de remoções finais

**Justificativa:**  
Dependência direta de runtime HTTP e high com upgrade não-major.

#### 4) `@nestjs/swagger` (high via `lodash` e `path-to-regexp`)

**Severidade:** Alta  
**Pacote:** `@nestjs/swagger @ 11.2.6`  
**Tipo de dependência:** direta (runtime)  
**Via:** `lodash` (`GHSA-r5fr-rjxr-66jc`) e `path-to-regexp` (`GHSA-j3q9-mxjg-w52f`)  
**Área afetada:** camada de documentação OpenAPI/Swagger

**Natureza da vulnerabilidade:**  
Encadeia advisories high transitivos em libs de parsing/matching.

**Exposição real no Desk Imperial:**  
A docs API em produção está desabilitada por padrão (`ENABLE_API_DOCS=false`), reduzindo superfície. Ainda assim, o pacote integra o runtime da API e pode ser habilitado por configuração.

**Fix disponível:**

- Versão segura observada: `11.3.0`
- Breaking change: não aparente (minor dentro de `11.x`)
- Comando sugerido: `npm --workspace @partner/api install @nestjs/swagger@11.3.0`

**Decisão:**

- [x] Resolver antes da wave-0
- [ ] Resolver no bloco de remoções finais

**Justificativa:**  
Continua sendo dependência direta do runtime da API, com fix sem major.

#### 5) `next` (`GHSA-q4gf-8mx6-v5v3`)

**Severidade:** Alta  
**Pacote:** `next @ 16.1.7`  
**Tipo de dependência:** direta (runtime web)  
**Via:** advisory direto do próprio pacote (`DoS with Server Components`)  
**Área afetada:** servidor web de produção

**Natureza da vulnerabilidade:**  
DoS em runtime de Server Components.

**Exposição real no Desk Imperial:**  
O web de produção roda `next start` (`apps/web/scripts/start.mjs` + Dockerfile web), então a superfície é de runtime pública.

**Fix disponível:**

- Versão segura observada: `16.2.4`
- Breaking change: não aparente (patch/minor no major 16)
- Comando sugerido: `npm --workspace @partner/web install next@16.2.4 eslint-config-next@16.2.4`

**Decisão:**

- [x] Resolver antes da wave-0
- [ ] Resolver no bloco de remoções finais

**Justificativa:**  
High em framework de produção com correção sem major.

#### 6) `lodash` (high transitivo runtime)

**Severidade:** Alta  
**Pacote:** `lodash @ 4.17.23`  
**Tipo de dependência:** transitiva (runtime)  
**Via:** `GHSA-r5fr-rjxr-66jc` (high) + `GHSA-f23m-r3pf-42rh` (moderate)  
**Área afetada:** grafo de dependências da API

**Natureza da vulnerabilidade:**  
Code injection (template) e prototype pollution no range vulnerável.

**Exposição real no Desk Imperial:**  
Não há uso direto de `lodash` no código de produto, mas ele está no grafo de runtime por `@nestjs/config` e `@nestjs/swagger`.

**Fix disponível:**

- Correção prática: atualizar os pais diretos (`@nestjs/config` e `@nestjs/swagger`) para versões seguras
- Versão resolvida vista no lockfile não vulnerável: `4.18.1`
- Breaking change: não aparente no caminho de update dos pais

**Decisão:**

- [x] Resolver antes da wave-0 (junto do lote runtime Nest)
- [ ] Resolver no bloco de remoções finais

**Justificativa:**  
É high transitivo em runtime e some com update não-major dos pais diretos.

#### 7) `path-to-regexp` (high transitivo runtime)

**Severidade:** Alta  
**Pacote:** `path-to-regexp @ 8.3.0`  
**Tipo de dependência:** transitiva (runtime)  
**Via:** `GHSA-j3q9-mxjg-w52f` (high) + `GHSA-27v5-c462-wpq7` (moderate)  
**Área afetada:** matching de rotas HTTP

**Natureza da vulnerabilidade:**  
ReDoS/DoS por padrões regex específicos.

**Exposição real no Desk Imperial:**  
Está no grafo de `@nestjs/core` / `@nestjs/platform-express` / `@nestjs/swagger`, no caminho de runtime da API pública.

**Fix disponível:**

- Correção prática: atualizar os pacotes Nest diretos para versões que resolvem `path-to-regexp` >= `8.4.0`
- Versão resolvida vista no lockfile não vulnerável: `8.4.2`
- Breaking change: não aparente no caminho `11.x`

**Decisão:**

- [x] Resolver antes da wave-0 (junto do lote runtime Nest)
- [ ] Resolver no bloco de remoções finais

**Justificativa:**  
High transitivo no pipeline de roteamento da API.

#### 8) `@nestjs/cli` (high em tooling)

**Severidade:** Alta  
**Pacote:** `@nestjs/cli @ 10.3.2`  
**Tipo de dependência:** direta (dev/tooling)  
**Via:** `glob`, `picomatch`, `webpack`, `inquirer`  
**Área afetada:** desenvolvimento/build local

**Natureza da vulnerabilidade:**  
Pacote agregador de advisories de tooling.

**Exposição real no Desk Imperial:**  
Usado em `nest start --watch` e build local. Imagens de produção fazem `npm prune --omit=dev`, então não entra no runtime entregue.

**Fix disponível:**

- Versão segura: `11.0.21`
- Breaking change: sim (`10.x -> 11.x`)
- Comando sugerido: `npm --workspace @partner/api install -D @nestjs/cli@11.0.21`

**Decisão:**

- [ ] Resolver antes da wave-0
- [x] Resolver no bloco de remoções finais

**Justificativa:**  
High nominal em tooling, com major bump na toolchain.

#### 9) `glob` (`GHSA-5j98-mcp5-4vw2`)

**Severidade:** Alta  
**Pacote:** `glob @ 10.4.5`  
**Tipo de dependência:** transitiva (dev/tooling)  
**Via:** `@nestjs/cli -> glob`  
**Área afetada:** CLI de desenvolvimento

**Natureza da vulnerabilidade:**  
Command injection no CLI do `glob` via `-c/--cmd`.

**Exposição real no Desk Imperial:**  
Sem caminho de request público em produção; acoplado ao CLI local.

**Fix disponível:**

- Correção via `@nestjs/cli@11.0.21`
- Breaking change: sim (major da CLI)

**Decisão:**

- [ ] Resolver antes da wave-0
- [x] Resolver no bloco de remoções finais

**Justificativa:**  
Tooling/dev-only.

#### 10) `picomatch` (`GHSA-c2c7-rcm5-vvqj`)

**Severidade:** Alta  
**Pacote:** `picomatch @ 3.0.1`  
**Tipo de dependência:** transitiva (dev/tooling)  
**Via:** cadeia de `@nestjs/cli` / `@angular-devkit/*`  
**Área afetada:** tooling de build/scaffold

**Natureza da vulnerabilidade:**  
ReDoS em extglob quantifiers.

**Exposição real no Desk Imperial:**  
Sem import de produto e sem entrada pública de runtime; risco concentrado no tooling.

**Fix disponível:**

- Correção via atualização da cadeia de CLI (`@nestjs/cli@11.0.21`)
- Breaking change: sim (major da CLI)

**Decisão:**

- [ ] Resolver antes da wave-0
- [x] Resolver no bloco de remoções finais

**Justificativa:**  
Tooling/dev-only com fix acoplado a major de toolchain.

#### 11) `vite` (`GHSA-v2wj-q39q-566r`, `GHSA-p9ff-h696-f583`)

**Severidade:** Alta  
**Pacote:** `vite @ 8.0.3`  
**Tipo de dependência:** transitiva (dev/test)  
**Via:** `vitest -> vite`  
**Área afetada:** ambiente de teste/dev server

**Natureza da vulnerabilidade:**  
Bypass/arb file read no dev server do Vite.

**Exposição real no Desk Imperial:**  
O web de produção usa Next.js; Vite aparece no contexto de testes (`vitest`) e não na borda pública de produção.

**Fix disponível:**

- Versão segura recomendada: `vite@8.0.8` (+ alinhamento de `vitest`)
- Breaking change: não aparente, mas exige revalidação da suíte
- Comando sugerido:
  - `npm --workspace @partner/api install -D vitest@4.1.4 vite@8.0.8`
  - `npm --workspace @partner/web install -D vitest@4.1.4 @vitest/coverage-v8@4.1.4 vite@8.0.8`

**Decisão:**

- [ ] Resolver antes da wave-0
- [x] Resolver no bloco de remoções finais

**Justificativa:**  
High nominal restrito a test/dev tooling, sem superfície pública de runtime.

## Atualização em 2026-04-18 (Passo 1 - merge do PR #4)

### Evidência do merge

- `origin/main` atualizado para `d69c56b` com mensagem: `merge: hotfix/protobufjs-cve (PR #4)`
- Tag opcional criada para rastreabilidade: `phase-0-partial-protobufjs`

### Contagem pós-merge em `origin/main`

Comandos executados:

- `npm install`
- `npm audit --json > audit-origin-main-after-pr4.json`

Output relevante:

```text
auditExit=1
counts={"info":0,"low":3,"moderate":7,"high":11,"critical":0,"total":21}
```

Resumo:

- Críticas: `0`
- Altas: `11`
- Médias: `7`
- Baixas: `3`

## Retriagem - Classificação de Breaking (Passo 2)

Nota: este bloco preserva o estado inicial da triagem. A classificação final vigente para decisão operacional está na seção "Revalidação Prisma - Passo 3 (2026-04-18)".

Regra aplicada:

- Tudo verde (`typecheck`, `build`, `test`) => **sem breaking**
- Quebra total em validações-chave => **com breaking**
- Quebra parcial / inconclusiva => **parcialmente breaking**

### Lote A — Nest Core Runtime

- Branch: `investigation/nest-runtime-upgrade`
- Target: `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/swagger`

Resultado bruto (ordem solicitada):

- `install`: `0`
- `typecheck`: `2` (falhou)
- `build`: `0`
- `test`: `0`

Validação adicional:

- `typecheck` **após** `build` (que executa `prisma generate`) => `0`
- `typecheck --force` no `origin/main` pós-merge também falha com o mesmo padrão de erro Prisma quando executado antes de regenerar client

Classificação:

- **Parcialmente breaking**

Leitura técnica:

- Não há evidência de quebra funcional introduzida especificamente pelo upgrade Nest.
- O que apareceu foi fragilidade de ordem de pipeline (`typecheck` antes de regeneração do Prisma client) já reproduzível no baseline.

### Lote B — Next.js

- Branch: `investigation/next-upgrade`
- Target: `next@latest` + `eslint-config-next@latest`

Resultado bruto (ordem solicitada):

- `install`: `0`
- `typecheck`: `0`
- `build`: `0`
- `test`: `0`

Classificação:

- **Sem breaking** => candidato para resolver antes da wave-0

### Lote C — Nodemailer

- Branch: `investigation/nodemailer-patch`
- Target: `nodemailer@latest`

Resultado bruto (ordem solicitada):

- `install`: `0`
- `typecheck`: `2` (falhou)
- `build`: `0`
- `test`: `0`

Validação adicional:

- `typecheck` **após** `build` => `0`
- Padrão de falha inicial é o mesmo observado no baseline quando força execução sem cache antes de regenerar Prisma client

Classificação:

- **Parcialmente breaking**

Leitura técnica:

- Não há evidência de breaking funcional específico do patch de `nodemailer`; a quebra observada está acoplada à ordem de execução do pipeline de validação.

## Decisão operacional consolidada (Caminho C)

- `protobufjs`: resolvido agora (PR #4 mergeado em `d69c56b`)
- `next`: sem breaking na investigação => elegível para PR pré-wave-0
- `nest-runtime`: parcialmente breaking (indício de fragilidade de pipeline; sem quebra funcional direta comprovada)
- `nodemailer`: parcialmente breaking (mesmo padrão de pipeline)
- Itens com breaking/risco transversal permanecem candidatos a wave 6 até decisão final do operador

## Revalidação Prisma - Passo 3 (2026-04-18)

Objetivo desta etapa:

- validar a hipótese de falso positivo por client Prisma desatualizado usando a sequência explícita sem depender de build:
  - `npm --workspace @partner/api exec prisma generate`
  - `npm run typecheck`
  - `npm run typecheck -- --force`

### Lote A — `investigation/nest-runtime-upgrade`

Resultado da sequência solicitada:

- `prisma generate`: `0`
- `typecheck` (sem build): `0`
- `typecheck --force` (sem cache): `0`

Conclusão:

- hipótese Prisma confirmada
- **reclassificação: sem breaking**

### Lote C — `investigation/nodemailer-patch`

Resultado da sequência solicitada:

- `prisma generate`: `0`
- `typecheck` (sem build): `0`
- `typecheck --force` (sem cache): `0`

Conclusão:

- hipótese Prisma confirmada
- **reclassificação: sem breaking**

### Status consolidado atualizado

- `protobufjs`: resolvido em `origin/main` (PR #4)
- `next`: sem breaking
- `nest-runtime`: sem breaking (falso positivo de ordem de pipeline Prisma)
- `nodemailer`: sem breaking (falso positivo de ordem de pipeline Prisma)
