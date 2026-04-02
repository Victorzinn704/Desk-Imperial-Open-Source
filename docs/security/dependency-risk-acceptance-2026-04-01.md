# Dependency Risk Acceptance - 2026-04-01

## Contexto

Este documento registra o risco residual de vulnerabilidades de dependencias apos a rodada de hardening sem mudancas breaking.

Escopo da rodada:

- `npm audit fix` aplicado sem `--force`
- atualizacoes de tooling sem quebra (`@nestjs/cli`, `@swc/cli`)
- hardening de scripts de teste para ambiente estavel
- provisionamento local de Redis no compose para reduzir falhas operacionais de cache/realtime
- remocao completa de overrides customizados de transitive deps (nao mitigavam runtime de forma efetiva e um deles quebrava lint local por incompatibilidade `minimatch` x `brace-expansion`)

## Resultado objetivo

Estado atual de auditoria:

- runtime (`npm audit --omit=dev`): 8 vulnerabilidades high
- completo (`npm audit`): 15 vulnerabilidades (10 high, 5 moderate)

As vulnerabilidades de runtime restantes estao concentradas em cadeias fixadas upstream:

1. `lodash@4.17.23`
2. `path-to-regexp@8.3.0`

Evidencia de lock/arvore:

- `@nestjs/config@4.0.3` fixa `lodash@4.17.23`
- `@nestjs/core@11.1.17` e `@nestjs/platform-express@11.1.17` fixam `path-to-regexp@8.3.0`
- `@nestjs/swagger@11.2.6` tambem referencia `lodash@4.17.23` e `path-to-regexp@8.3.0`

Comprovacao manual executada:

- `npm ls lodash path-to-regexp --all`
- `npm explain lodash`
- `npm explain path-to-regexp`

## Mitigacoes aplicadas no runtime exposto

1. CSRF sem fallback previsivel

- removido fallback hardcoded `change-me` na resolucao de segredo CSRF no `AuthService`
- bootstrap da API agora falha fora de `NODE_ENV=test` quando `COOKIE_SECRET`/`CSRF_SECRET` estao ausentes, curtos ou com placeholder `change-me`

2. Sanitizacao consistente de entrada em mesa

- `updateMesa` passou a aplicar a mesma sanitizacao de `createMesa` para `section`
- bloqueio explicito de marcacao HTML e formula injection em updates de mesa

## Resultado da trilha breaking (branch isolada)

Branch de experimento:

- `hardening/breaking-upgrades-staging-2026-04-01`

Acao executada:

- `npm audit fix --force`

Resultado da validacao tecnica:

- typecheck: falhou (quebra de compatibilidade em `@nestjs/swagger` e tipos Nest)
- testes: falharam suites criticas por incompatibilidade de modulo (`swagger-ui-express`/`express`)
- auditoria runtime apos upgrade: piorou para 18 vulnerabilidades (15 high)

Decisao:

- **NO-GO para staging/main nesta rodada**
- manter esta trilha apenas como experimento controlado ate definicao de estrategia de upgrade de framework

## Risco aceito (temporario)

### R1 - lodash (high)

- Vetor reportado: code injection via `_.template` e prototype pollution.
- Exposicao no projeto: indireta, via framework/dependencias de terceiros.
- Justificativa para aceite temporario: sem upgrade breaking, a cadeia fixa de `@nestjs/config`/`@nestjs/swagger` impede substituicao efetiva no lock.

Controles compensatorios:

- nao usar `_.template` com entrada de usuario
- validacao de input por DTO + class-validator
- CSRF/session guard nos endpoints mutaveis
- logs e alertas ativos para comportamento anomalo

### R2 - path-to-regexp (high)

- Vetor reportado: ReDoS por padroes opcionais/wildcards em cenarios especificos.
- Exposicao no projeto: indireta, via roteamento do ecossistema Nest/Express.
- Justificativa para aceite temporario: versao esta fixada por dependencias principais do framework (sem caminho non-breaking imediato no lock atual).

Controles compensatorios:

- rotas da aplicacao sao estaticas e definidas no codigo
- rate limiting e throttling ativos
- budget de latencia monitorado por gate de performance
- observabilidade com alertas para degradacao

### R3 - Vulnerabilidades dev/toolchain (moderate/high)

- Pacotes afetados: principalmente cadeia Angular devkit/picomatch/brace-expansion.
- Impacto: ferramentas de desenvolvimento, nao runtime de producao.
- Justificativa para aceite temporario: atualizacao completa depende de stack CLI upstream com potencial impacto em comandos de scaffolding.

Controles compensatorios:

- CI principal valida runtime com `npm audit --omit=dev`
- jobs de qualidade e testes completos no pipeline
- branch de hardening dedicada para upgrades graduais

## Plano de remediacao

1. abrir issue de upgrade controlado do stack Nest para a primeira combinacao que remova pin de `path-to-regexp@8.3.0`
2. avaliar migracao/ajuste de uso de `@nestjs/config` caso upstream mantenha pin em `lodash@4.17.23`
3. reexecutar auditoria semanalmente e a cada bump de framework
4. remover este aceite quando runtime cair para zero high

## Criterio de saida do aceite

Este risco deixa de ser aceito quando:

- `npm audit --omit=dev` nao reportar vulnerabilidades high
- suite de testes e typecheck permanecerem verdes apos upgrades

## Comandos de verificacao usados

```bash
npm audit
npm audit --omit=dev
npm ls lodash path-to-regexp --all
npm run typecheck
npm run test -- --force
```
