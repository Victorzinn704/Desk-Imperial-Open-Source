# Central de Code Review — Desk Imperial

## Visão geral

Esta central cobre todo o ciclo de qualidade do monorepo: formatação, linting, fronteiras arquiteturais, detecção de segredos, SAST, SCA, cobertura de testes, análise estática avançada e performance de frontend. Tudo gratuito, sem IA do dev, self-hosted onde possível.

---

## Mapa das ferramentas

| Camada                     | Ferramenta              | Onde roda                | Como ver o resultado                 |
| -------------------------- | ----------------------- | ------------------------ | ------------------------------------ |
| Formatter                  | Prettier                | pre-commit + CI          | `npm run format:check`               |
| Linter rápido              | Biome                   | pre-commit + CI          | `npm run lint:biome`                 |
| Lint type-aware por camada | ESLint                  | CI (root + workspaces)   | `npm run lint:repo` / `npm run lint` |
| TypeCheck                  | tsc                     | CI (por workspace)       | `npm run typecheck`                  |
| Fronteiras                 | dependency-cruiser      | CI                       | `npm run lint:deps`                  |
| Ciclos                     | Madge                   | CI                       | `npm run lint:cycles`                |
| Código morto               | Knip                    | CI                       | `npm run lint:dead`                  |
| Duplicação                 | jscpd                   | CI                       | `npm run lint:dup`                   |
| Segredos                   | Gitleaks                | pre-commit + CI + weekly | Security tab do GitHub               |
| SAST                       | Semgrep CE              | CI + weekly              | Security > Code scanning             |
| SCA deps                   | npm audit + OSV + Trivy | CI + weekly              | Security tab + step summary          |
| Qualidade histórica        | SonarQube Community     | self-hosted local + CI   | http://localhost:9000                |
| Inspeção IDE-grade         | Qodana Community JS     | CI                       | Qodana Cloud                         |
| Review com IA              | CodeRabbit Free         | automático em PRs        | Comentários no PR                    |
| Performance                | Lighthouse CI           | CI (PRs web)             | Comentário no PR + LHCI report       |

---

## Ferramentas fora do código

Nem toda verificacao de seguranca vem do monorepo. Para o Desk Imperial, o corte correto e este:

| Ferramenta  | Papel                                                 | Entrar agora?           |
| ----------- | ----------------------------------------------------- | ----------------------- |
| **Nmap**    | varrer portas e identificar servicos/versoes expostos | **Sim**                 |
| **Snort**   | IDS/IPS com analise de trafego em tempo real          | **Depois**              |
| **Wazuh**   | SIEM/XDR open source para correlacao e agentes        | **Depois**              |
| **NetFlow** | estatistica e visibilidade de fluxo de rede           | **Nao como prioridade** |

Documentacao operacional desta trilha:

- [Security Testing Workflow — 2026-04-30](C:/Users/Desktop/Documents/desk-imperial/docs/security/security-testing-workflow-2026-04-30.md:1)

---

## Pré-requisitos locais

### Obrigatórios (npm install os instala automaticamente)

- Node.js 22+, npm 11+

### Bootstrap recomendado

```bash
npm run quality:bootstrap
```

Esse bootstrap instala as dependências npm do monorepo e tenta provisionar os binários externos suportados neste host.
No Windows sem shell elevada, o `Semgrep` consegue ser instalado em modo user, mas o `Gitleaks` pode continuar manual se `winget/choco` não tiverem permissão.

### Binários externos (instalar manualmente se o bootstrap não conseguir)

| Ferramenta      | Instalação                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Gitleaks**    | `brew install gitleaks` / [releases](https://github.com/gitleaks/gitleaks/releases)                                            |
| **Semgrep**     | `pip install semgrep` ou `brew install semgrep`                                                                                |
| **OSV-Scanner** | `go install github.com/google/osv-scanner/cmd/osv-scanner@latest` / [releases](https://github.com/google/osv-scanner/releases) |
| **Trivy**       | `brew install aquasecurity/trivy/trivy` / [releases](https://github.com/aquasecurity/trivy/releases)                           |

Para Docker (SonarQube local): Docker Desktop ou Docker Engine 24+.

---

## Como rodar local

### Checagem rápida (pré-commit equivalente)

```bash
npm run lint:biome       # Biome lint (segundos)
npm run format:check     # Prettier check
npm run lint:repo        # ESLint root: regras cruzadas do monorepo
npm run lint             # ESLint type-aware via Turbo
npm run typecheck        # tsc --noEmit via Turbo
```

### Pipeline completa sem binários externos

```bash
npm run quality:local
# Executa: biome → prettier → eslint(root + workspaces) → typecheck → dep-cruiser → madge → knip → jscpd
```

### Pipeline completa com todos os binários

```bash
npm run quality:all
# Adiciona: gitleaks → semgrep → npm audit
```

### SonarQube local

```bash
# Subir SonarQube + Postgres
npm run sonar:up
# ou
docker compose -f infra/docker/docker-compose.quality.yml up -d

# Aguardar (≈2 min): http://localhost:9000
# Login padrão: admin / admin → trocar na primeira vez

# Configurar no SonarQube:
# 1. Administration > Projects > Create Project Manually
#    - Project key: desk-imperial
# 2. Gerar token em My Account > Security
# 3. Exportar: export SONAR_TOKEN=<token>
# 4. Rodar scanner (requer cobertura gerada antes):
npm run test:coverage
npx sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.token=$SONAR_TOKEN

# Parar SonarQube
npm run sonar:down
```

> Neste host, se `docker info` falhar com `dockerDesktopLinuxEngine`, o Docker Desktop esta instalado mas o daemon ainda nao foi iniciado.

### Nmap local

Wrapper padronizado no repo:

```bash
npm run security:nmap -- -Target api.deskimperial.online -Mode quick
```

Modos disponiveis:

- `quick`
- `top1000`
- `full`

O relatorio fica salvo em `.cache/security/nmap/`.

> **Nota sobre Linux/WSL:** O SonarQube requer:
>
> ```bash
> sudo sysctl -w vm.max_map_count=524288
> sudo sysctl -w fs.file-max=131072
> ```

---

## Como ler cada relatório

### ESLint

Erros bloqueiam o CI; warnings são acumulados no `quality-warning-map`. Para ver só warnings de um arquivo:

```bash
npx eslint apps/api/src/modules/auth/auth.service.ts
```

### dependency-cruiser

Saída em texto no CI. Para visualizar o grafo de dependências localmente:

```bash
# Grafo de módulos da API
npx depcruise apps/api/src --config .dependency-cruiser.cjs --ts-config tsconfig.depcruise.api.json --output-type dot | dot -T svg > dep-graph.svg
```

Abrir `dep-graph.svg` no browser.

### Knip

Lista exports/imports/arquivos não utilizados. Falsos positivos comuns:

- Decorators NestJS (`@Module`, `@Injectable`) são usados via metadata, não import direto
- Adicionar ao `ignoreDependencies` em `knip.json` se for legítimo

### jscpd

Relatório JSON em `coverage/jscpd/jscpd-report.json`. Threshold: 3% de duplicação em TypeScript.
Duplicação legítima (ex.: DTOs muito similares) pode ser suprimida com comentário:

```typescript
// jscpd:ignore-start
... código duplicado justificado ...
// jscpd:ignore-end
```

### Semgrep

Resultados no SARIF enviados ao GitHub Security > Code scanning. Para rodar localmente:

```bash
semgrep scan --config .semgrep/desk-imperial.yml apps/api/src
```

Para ignorar um trecho específico:

```typescript
// nosemgrep: desk-imperial.bcrypt-outside-auth-layer
```

### SonarQube

- **Quality Gate:** verde = pode fazer merge. Vermelho = bloqueia.
- **Issues:** filtrar por "New Code" para ver apenas o que o PR introduziu.
- **Coverage:** agrega API + Web num único projeto local. SonarQube Community não entrega monorepo nativo por módulo.
- **Hotspots:** requerem revisão manual — marcar como "Safe" ou "Fixed".

### Gitleaks

Se disparar no pre-commit:

```bash
gitleaks protect --staged --config .gitleaks.toml --verbose
```

Para adicionar um falso positivo ao allowlist, editar `.gitleaks.toml` na seção `[allowlist].paths`.

### Lighthouse CI

Resultados como comentário no PR. Para rodar localmente:

```bash
npm --workspace @partner/web run build
npx @lhci/cli autorun
```

---

## Como adicionar regras

### Nova regra ESLint

Editar `eslint.config.mjs` (root) ou o config específico do workspace em `apps/api/eslint.config.mjs` / `apps/web/eslint.config.mjs`. Documentar o motivo da regra em comentário.

### Nova regra Semgrep

Adicionar bloco em `.semgrep/desk-imperial.yml`. Estrutura mínima:

```yaml
- id: minha-nova-regra
  message: 'Descrição do problema e como corrigir.'
  severity: WARNING # ou ERROR
  languages: [typescript]
  pattern: |
    <padrão semgrep>
  paths:
    include:
      - 'apps/api/src/**/*.ts'
```

Testar localmente antes de commitar:

```bash
semgrep scan --config .semgrep/desk-imperial.yml --test
```

### Nova regra dependency-cruiser

Adicionar objeto ao array `forbidden` em `.dependency-cruiser.cjs`. Exemplo para proibir importação de um módulo específico:

```js
{
  name: 'no-X-in-Y',
  severity: 'error',
  from: { path: '^apps/api/src/modules/Y/' },
  to: { path: '^apps/api/src/modules/X/' },
}
```

### Nova regra Gitleaks

Adicionar `[[rules]]` em `.gitleaks.toml`.

---

## Quality Gates definidos no SonarQube

Aplicados **apenas em código novo** (não exige corrigir as 178k linhas de uma vez):

| Métrica                             | Threshold |
| ----------------------------------- | --------- |
| Bugs novos                          | 0         |
| Vulnerabilidades novas              | 0         |
| Security Hotspots não revisados     | 0         |
| Duplicação em código novo           | < 3%      |
| Cobertura em código novo            | ≥ 80%     |
| Complexidade ciclomática por função | ≤ 15      |
| Complexidade cognitiva por função   | ≤ 15      |
| Funções com > 50 linhas             | 0         |

---

## Segredos e variáveis necessárias no GitHub

Configurar em Settings > Secrets and variables > Actions:

| Nome                    | Tipo     | Descrição                                                                |
| ----------------------- | -------- | ------------------------------------------------------------------------ |
| `SONAR_TOKEN`           | Secret   | Token de autenticação do SonarQube                                       |
| `QODANA_TOKEN`          | Secret   | Token do Qodana Cloud (gratuito em [qodana.cloud](https://qodana.cloud)) |
| `SEMGREP_APP_TOKEN`     | Secret   | Opcional — para salvar resultados no Semgrep Cloud                       |
| `LHCI_GITHUB_APP_TOKEN` | Secret   | GitHub App token do LHCI para comentar no PR                             |
| `SONAR_HOST_URL`        | Variable | URL do SonarQube (ex.: `http://seu-servidor:9000`)                       |
| `TURBO_TOKEN`           | Secret   | Opcional — para cache remoto do Turbo                                    |
| `TURBO_TEAM`            | Variable | Opcional — team ID do Turbo Remote Cache                                 |

> Jobs que dependem de variáveis não definidas são pulados automaticamente (condição `if: vars.X != ''`).

---

## Roadmap de 8 semanas para as 178k linhas

O quality gate aplica regras apenas ao código novo. Para eliminar a dívida técnica existente de forma controlada:

### Semana 1-2: Inventário e baseline

- Rodar `npm run quality:all` e registrar contagem de issues existentes
- Executar CodeScene (trial) para priorizar hotspots por churn rate
- Rodar SonarQube local e definir custom quality gate "Legacy Baseline" (sem threshold)
- Identificar os 10 arquivos com maior complexidade via `npm run lint` + SonarQube

### Semana 3-4: Segurança e fronteiras críticas

- Resolver todas as violações das regras 1-3 do dependency-cruiser (domínio, controllers, services)
- Eliminar imports de `@prisma/client` em controllers
- Resolver findings do Semgrep de severity ERROR (bcrypt/jwt fora do auth)
- Corrigir todos os hotspots de segurança no SonarQube

### Semana 5-6: Qualidade de código

- Reduzir funções com complexidade > 20 (priorizar os maiores)
- Eliminar `console.log` remanescentes no API
- Resolver duplicações detectadas pelo jscpd acima de 10%
- Aumentar cobertura dos módulos críticos (auth, finance, operations) para ≥ 80%

### Semana 7-8: Frontend e documentação

- Resolver violations de Lighthouse CI (LCP, CLS, bundle size)
- Corrigir issues de jsx-a11y (alt em imagens, labels em forms)
- Resolver imports cruzados web↔api detectados pelo dep-cruiser
- Atualizar este README com os novos thresholds alcançados

---

## Troubleshooting

### SonarQube não sobe (`docker compose up`)

```bash
# Verificar se vm.max_map_count está correto (Linux/WSL):
sysctl vm.max_map_count  # Deve ser >= 524288
sudo sysctl -w vm.max_map_count=524288

# Ver logs do container:
docker logs desk-imperial-sonarqube
```

### `npm run lint:deps` falha com resolução de tsconfig

O comando usa `tsconfig.depcruise.api.json` e `tsconfig.depcruise.web.json` na raiz exatamente para evitar drift com `extends` de workspace. Se quebrar:

1. verificar se os aliases `@/*` e `@contracts/contracts` ainda batem com a estrutura atual;
2. atualizar os `paths` desses dois arquivos auxiliares;
3. rerodar `npm run lint:deps`.

### Knip reporta exports legítimos como "não usados"

Decorators NestJS e tipos exportados para o frontend via `packages/types` são frequentemente falsos positivos. Adicionar ao `ignoreDependencies` ou `ignoreExportsUsedInFile: true` em `knip.json`.

### Semgrep rule não bate nos arquivos esperados

Verificar a seção `paths.include`/`paths.exclude` da regra. Rodar com `--verbose` para ver quais arquivos foram analisados:

```bash
semgrep scan --config .semgrep/desk-imperial.yml --verbose apps/api/src
```

### Gitleaks disparou no pre-commit (falso positivo)

1. Verificar se é realmente um segredo ou um placeholder
2. Se for placeholder, adicionar padrão ao `[allowlist].regexes` em `.gitleaks.toml`
3. Se for string de teste em fixture, adicionar o path a `[allowlist].paths`

### Biome e Prettier em conflito de formatação

Biome está configurado com `"formatter": { "enabled": false }` — ele apenas linta, não formata. Se houver conflito, verificar se o `biome.json` não foi alterado por engano para habilitar o formatter.

### CodeRabbit não comenta no PR

Verificar se o app do CodeRabbit foi instalado no repositório GitHub (Settings > Integrations). O arquivo `.coderabbit.yaml` configura o comportamento mas não substitui a instalação do app.

### Lighthouse CI timeout

O `startServerReadyTimeout` está em 90s. Se o build do Next.js for lento em CI, aumentar para 120000 em `lighthouserc.json`.

---

## Adicionando uma nova ferramenta à stack

1. Verificar se é gratuita e não exige IA do dev
2. Adicionar o binário/pacote ao `package.json` (devDependencies ou como binário externo documentado aqui)
3. Criar o arquivo de config na raiz
4. Adicionar script em `package.json` (seguir o padrão `lint:X` ou `audit:X`)
5. Incluir no script `quality:local` ou `quality:all`
6. Adicionar step ao `.github/workflows/quality.yml`
7. Documentar neste arquivo: mapa de ferramentas, como ler o relatório, como adicionar regras
