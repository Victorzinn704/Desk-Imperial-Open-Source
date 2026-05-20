# Central de Review, Escalabilidade e Manutenção

Data: 2026-04-29

## Objetivo

Transformar o Desk Imperial em um monorepo auditável sem depender de feeling. O foco aqui é:

- código morto
- exports e tipos sem uso
- duplicação
- hotspots de complexidade
- boundaries entre camadas
- rotas fracas e contratos frágeis
- regressão de performance

## Decisão de stack

### O que fica

- `quality:scope`
- `quality:contracts`
- `quality:warnings`
- `quality:preflight`
- `test:critical`
- `k6`
- SonarQube local como leitura parcial e histórica

### O que entra como trilho principal

| Problema                                     | Ferramenta           | Papel no Desk Imperial                        | Situação                      |
| -------------------------------------------- | -------------------- | --------------------------------------------- | ----------------------------- |
| Código morto / unused exports / types / deps | `Knip`               | baseline de limpeza estrutural do monorepo    | adotado em baseline local     |
| Hotspots / complexidade / duplicação / drift | `Fallow`             | mapa rápido de hotspots e dívida concentrada  | adotado em baseline local     |
| Grafo de dependências / boundaries           | `Dependency Cruiser` | leitura do grafo e futura regra de importação | baseline sem config já gerado |
| SAST                                         | `Semgrep`            | padrões inseguros e code smells de segurança  | fase seguinte                 |
| Vulnerabilidades de dependência              | `OSV-Scanner`        | SCA leve para repo e lockfiles                | fase seguinte                 |
| Contrato e robustez de API                   | `Schemathesis`       | descobrir endpoints fracos via OpenAPI        | fase seguinte                 |
| Performance em endpoint                      | `k6`                 | latência e throughput em fluxos críticos      | já em uso                     |

## Leitura honesta sobre SonarQube

O SonarQube Community não deve ser tratado como a fonte principal de arquitetura do Desk Imperial. Ele continua útil para:

- histórico de smells
- leitura parcial de bugs/code smells
- trilho visual de cobertura e backlog técnico

Mas o suporte de monorepo do SonarQube Server é documentado a partir de `Enterprise Edition`. Portanto, no Desk Imperial ele deve ser tratado como dashboard complementar, não como guardião central da arquitetura do monorepo.

## Baseline local desta rodada

Comando reproduzível:

```bash
npm run quality:tooling:baseline
```

Saída:

- `artifacts/quality/tooling-baseline/fallow-health.json`
- `artifacts/quality/tooling-baseline/knip.json`
- `artifacts/quality/tooling-baseline/depcruise.json`
- `artifacts/quality/tooling-baseline/summary.json`
- `artifacts/quality/tooling-baseline/summary.md`

Resumo desta execução:

- `Fallow`
  - `252` findings
  - `54 critical`
  - `64 high`
  - `134 moderate`
- `Knip`
  - `174` arquivos com issue
  - `68` unused files
  - `125` unused exports
  - `163` unused types
  - `6` dependencies
  - `6` devDependencies
  - `3` unlisted deps
- `Dependency Cruiser`
  - `3544` módulos
  - `0` ciclos detectados no baseline sem config
  - `3452` órfãos no baseline sem config

## Interpretação do baseline

### Fallow

O Fallow já mostra onde o cleanup rende mais:

- `apps/web/components/dashboard/product-form.tsx`
- `apps/web/components/dashboard/environments/sales-environment.tsx`
- `apps/web/components/dashboard/environments/overview-environment.tsx`
- `apps/web/components/dashboard/environments/financeiro-environment.tsx`
- `apps/web/components/dashboard/salao-environment.tsx`
- `apps/api/src/modules/auth/auth-registration.service.ts`

Isso confirma a leitura que já vinha aparecendo manualmente: a dívida mais cara está concentrada em superfícies desktop grandes e alguns fluxos sensíveis de auth/backend.

### Knip

O Knip não está dizendo “pode apagar tudo”. Ele está mostrando onde o monorepo tem ruído estrutural:

- `apps/web/lib/api.ts`
- `apps/web/components/design-lab/lab-primitives.tsx`
- `apps/web/components/dashboard/salao/index.ts`
- `apps/web/components/pdv/comanda-modal/index.ts`
- `apps/api/src/modules/operations/operations.types.ts`

Primeiro uso correto:

1. confirmar falsos positivos
2. limpar exports mortos
3. só depois remover arquivos

### Dependency Cruiser

O baseline sem config serviu para uma coisa: provar que o monorepo responde ao grafo.

Ainda não serve como gate duro porque:

- está rodando sem boundaries customizadas
- o número de órfãos fica artificialmente alto
- ainda falta traduzir a arquitetura real do repo em regras de importação

## Política de adoção

### Fase 1 — só baseline, sem falhar CI

- `quality:tooling:baseline`
- guardar artefatos locais
- usar para priorização de cleanup

### Fase 2 — gates leves

- `Knip`: bloquear só `unlisted dependencies` e `duplicates`
- `Dependency Cruiser`: bloquear ciclos e imports proibidos depois da config
- `Fallow`: alertar em `critical` e `high`, sem bloquear merge ainda

### Fase 3 — gates reais

- `Semgrep` para segurança
- `OSV-Scanner` para dependências
- `Schemathesis` em subset de endpoints críticos
- `k6` mantido como gate de latência

## Ordem correta de ataque

1. fechar regressões de runtime/UI
2. reduzir hotspots apontados por `Fallow`
3. limpar exports/tipos mortos com `Knip`
4. configurar boundaries reais no `Dependency Cruiser`
5. só então endurecer CI

## Referências oficiais usadas nesta decisão

- Fallow docs: https://docs.fallow.tools/
- Fallow quickstart: https://docs.fallow.tools/quickstart
- Fallow boundaries: https://docs.fallow.tools/analysis/boundaries
- Knip issue types: https://knip.dev/reference/issue-types
- Knip monorepos/workspaces: https://knip.dev/features/monorepos-and-workspaces
- SonarQube monorepos: https://docs.sonarsource.com/sonarqube-server/2025.5/project-administration/monorepos
- Semgrep pricing: https://semgrep.dev/pricing
- OSV / OSV-Scanner: https://osv.dev/ and https://google.github.io/osv-scanner/usage/license-scanning/
- Schemathesis: https://schemathesis.io/ and https://schemathesis.readthedocs.io/en/stable/
- Dependency Cruiser package/docs: https://www.npmjs.com/package/dependency-cruiser
