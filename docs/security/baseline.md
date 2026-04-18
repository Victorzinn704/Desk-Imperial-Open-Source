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
