# SonarQube — plano de auditoria contínua e sprints de remediação

Data: `2026-04-03`

---

## Objetivo

Usar o SonarQube como trilho permanente de auditoria estática do Desk Imperial para:

- identificar bugs, vulnerabilidades e code smells de forma contínua
- transformar o baseline técnico em backlog executável
- endurecer o CI com um gate de qualidade rastreável
- reduzir regressão sem depender só de revisão manual

---

## Estado real hoje

O repositório **ainda não tinha integração SonarQube**. Nesta passada, o que ficou pronto foi:

- configuração do projeto em `sonar-project.properties`
- workflow dedicado em `.github/workflows/sonarqube.yml`
- cobertura local validada para API e web, pronta para alimentar o scanner

### Bloqueadores para o primeiro scan real

Hoje ainda faltam dois insumos externos para a primeira análise oficial:

- variável de repositório `SONAR_HOST_URL`
- secret de repositório `SONAR_TOKEN`

Sem isso, o workflow novo **não falha**; ele entra em modo de preflight e registra no resumo do job que o scan foi pulado.

> Leitura honesta: a estrutura está pronta, mas ainda não existe “achado do SonarQube” até o servidor e o token serem configurados.

---

## Primeiro scan oficial local — `2026-04-03`

O primeiro scan oficial foi executado **localmente**, contra o código da working tree, em uma instância local do SonarQube Community Build.

### Evidência bruta

- resumo do scan: `docs/release/sonarqube-local-scan-2026-04-03.json`
- issues exportadas: `docs/release/sonarqube-local-issues-2026-04-03.json`
- security hotspots exportados: `docs/release/sonarqube-local-hotspots-2026-04-03.json`

### Resultado inicial do Quality Gate

- Quality Gate: `OK`
- Leitura sênior: isso **não significava** que o projeto estava “limpo”; significava apenas que o gate padrão do servidor local ainda estava permissivo para o volume atual de dívida.

### Números reais do primeiro scan

| Métrica | Valor |
| --- | ---: |
| Issues abertas | `658` |
| Code Smells | `630` |
| Bugs | `28` |
| Vulnerabilities | `0` |
| Security Hotspots | `47` |
| Severidade `BLOCKER` | `2` |
| Severidade `CRITICAL` | `48` |
| Severidade `MAJOR` | `232` |
| Severidade `MINOR` | `376` |
| Cobertura consolidada no Sonar | `55.8%` |
| Duplicação | `2.6%` |
| NCLOC | `49,257` |
| Complexidade | `7,696` |
| Cognitive Complexity | `4,128` |

### O que mais apareceu

**Regras mais frequentes**

| Regra | Ocorrências | Leitura |
| --- | ---: | --- |
| `typescript:S3358` | `102` | ternário aninhado e leitura confusa |
| `typescript:S7764` | `83` | uso de `window` em vez de `globalThis` |
| `typescript:S6759` | `61` | acessibilidade/semântica de JSX |
| `typescript:S7735` | `58` | padrões de JSX/atributos redundantes |
| `typescript:S1874` | `40` | APIs/de símbolos depreciados |
| `typescript:S3776` | `31` | funções com complexidade cognitiva excessiva |

**Arquivos com mais issues**

| Arquivo | Issues |
| --- | ---: |
| `apps/web/components/dashboard/caixa-panel.tsx` | `28` |
| `apps/web/components/dashboard/salao-environment.tsx` | `21` |
| `apps/api/src/modules/products/products.service.ts` | `21` |
| `apps/api/src/modules/operations/comanda.service.ts` | `20` |
| `apps/web/components/staff-mobile/mobile-comanda-list.tsx` | `19` |
| `apps/web/components/pdv/pdv-comanda-modal.tsx` | `18` |
| `apps/web/lib/validation.ts` | `17` |
| `apps/api/src/modules/auth/auth.service.ts` | `16` |

### Achados mais importantes para atacar primeiro

**Blockers**

| Arquivo | Regra | Achado |
| --- | --- | --- |
| `apps/web/lib/observability/faro.ts` | `typescript:S3516` | função sempre retorna o mesmo valor |
| `apps/web/lib/printing/qz-tray.client.ts` | `typescript:S3516` | função sempre retorna o mesmo valor |

**Críticos de maior valor**

| Arquivo | Regra | Achado |
| --- | --- | --- |
| `apps/web/components/dashboard/dashboard-shell.tsx` | `typescript:S3776` | complexidade cognitiva `45` |
| `apps/api/src/config/env.validation.ts` | `typescript:S3776` | complexidade cognitiva `53` |
| `apps/web/components/operations/operations-executive-grid.tsx` | `typescript:S3776` | complexidade cognitiva `23` |
| `apps/web/components/dashboard/environments/portfolio-environment.tsx` | `typescript:S3776` | complexidade cognitiva `22` |
| `apps/web/components/staff-mobile/mobile-order-builder.tsx` | `typescript:S3776` | complexidade cognitiva `22` |
| `apps/api/src/modules/auth/auth.service.ts` | `typescript:S3776` | múltiplos pontos com complexidade crítica |
| `apps/api/src/modules/operations/comanda.service.ts` | `typescript:S3776` | complexidade crítica em fluxo operacional |
| `apps/api/src/common/utils/otel.util.ts` | `typescript:S4123` | `await` inesperado em valor não-Promise |

**Bugs reais detectados**

| Arquivo | Regra | Achado |
| --- | --- | --- |
| `apps/api/src/common/services/period-classifier.service.ts` | `typescript:S3923` | condicionais que devolvem o mesmo valor |
| `apps/api/src/modules/auth/auth.service.ts` | `typescript:S6959` | `reduce()` sem valor inicial |
| `apps/web/components/pdv/comanda-modal/hooks/use-product-filter.ts` | `typescript:S2871` | ordenação alfabética sem `localeCompare` |
| `apps/web/components/staff-mobile/mobile-order-builder.tsx` | `typescript:S2871` | ordenação sem comparação local confiável |
| múltiplos componentes interativos | `typescript:S1082` | clique visível sem listener de teclado |

**Security hotspots que exigem revisão humana**

| Grupo | Exemplos | Leitura |
| --- | --- | --- |
| senha hard-coded potencial | `apps/api/src/common/constants/password.ts:3`, `apps/api/src/modules/auth/auth.service.ts:597`, `packages/types/src/validation-patterns.ts:20` | revisar se são constantes legítimas de política ou segredos indevidos |
| regex potencialmente cara | `apps/api/src/common/utils/otel.util.ts:136`, `apps/api/src/modules/currency/currency.service.ts:140` | confirmar ausência de risco de backtracking explosivo |
| PRNG não criptográfico | `apps/web/components/marketing/space-background.tsx`, `apps/web/lib/api.ts:1264`, `apps/web/lib/operations/operations-optimistic.ts:170` | muitos serão benignos, mas precisam de triagem para não mascarar uso indevido |

> Leitura sênior: o scan mostrou pouca evidência de vulnerabilidade concreta, mas mostrou bastante dívida de **clareza, acessibilidade, complexidade e revisão de hotspots**.

---

## Atualização após Sprint 1 — `2026-04-03`

Depois do baseline local, atacamos o bloco mais importante para o gate: blockers, bugs reais e cobertura do código novo.

### O que foi corrigido

- `apps/web/lib/observability/faro.ts`
  - removido o padrão que o Sonar lia como retorno invariável
  - adicionados testes cobrindo `beforeSend`, sanitização e sampling
- `apps/web/lib/printing/qz-tray.client.ts`
  - fluxo de conexão simplificado para eliminar o blocker
- `apps/api/src/common/services/period-classifier.service.ts`
  - removidas condicionais redundantes marcadas como bug
- `apps/api/src/modules/auth/auth.service.ts`
  - corrigido `reduce()` sem valor inicial
  - removido placeholder fixo do ator demo em favor de hash determinístico
- `apps/web/components/pdv/comanda-modal/hooks/use-product-filter.ts`
  - ordenação com `Intl.Collator`
  - busca acento-insensível
- `apps/web/components/staff-mobile/mobile-order-builder.tsx`
  - ordenação com `Intl.Collator`
  - busca acento-insensível
- `apps/web/lib/normalize-text-for-search.ts`
  - helper extraído e coberto por teste
- `apps/web/vitest.config.ts` + `apps/web/package.json`
  - trilho dedicado `test:coverage:sonar` para alimentar o Sonar sem quebrar o gate normal de cobertura do frontend

### Resultado real após a Sprint 1

| Métrica | Antes | Depois | Delta |
| --- | ---: | ---: | ---: |
| Quality Gate | `OK` permissivo | `PASSED` | — |
| Issues abertas | `658` | `649` | `-9` |
| Code Smells | `630` | `627` | `-3` |
| Bugs | `28` | `22` | `-6` |
| Vulnerabilities | `0` | `0` | `0` |
| Security Hotspots | `47` | `46` | `-1` |
| Severidade `BLOCKER` | `2` | `0` | `-2` |
| Severidade `CRITICAL` | `48` | `45` | `-3` |
| Severidade `MAJOR` | `232` | `228` | `-4` |
| Severidade `MINOR` | `376` | `376` | `0` |
| Cobertura consolidada no Sonar | `55.8%` | `57.8%` | `+2.0 pp` |
| `new_coverage` | — | `84.2%` | gate verde |
| `new_violations` | — | `0` | gate verde |

### O que realmente derrubava o gate

No scan intermediário, o gate caiu por dois fatores concretos:

- `1` smell novo em `apps/web/lib/normalize-text-for-search.ts`
- cobertura nova abaixo de `80%` em linhas alteradas de `apps/web/lib/observability/faro.ts` e `apps/web/components/staff-mobile/mobile-order-builder.tsx`

Fechamos isso sem maquiagem:

- corrigimos o smell novo
- cobrimos as linhas novas com teste real
- criamos um caminho de coverage específico para o Sonar (`test:coverage:sonar`) em vez de afrouxar o gate padrão

> Leitura sênior: o gate voltou a passar porque o código novo ficou melhor coberto e sem violações novas — não porque a régua foi diminuída.

### Hotspots que seguem válidos para a próxima passada

Os hotspots ainda não foram “varridos para debaixo do tapete”. Os grupos prioritários agora são:

- constantes de política marcadas como senha hard-coded potencial:
  - `apps/api/src/common/constants/password.ts`
  - `packages/types/src/validation-patterns.ts`
- regex que merecem revisão formal de risco:
  - `apps/api/src/common/utils/otel.util.ts`
  - `apps/api/src/modules/currency/currency.service.ts`
- uso de PRNG não criptográfico em contexto provavelmente benigno:
  - `apps/web/components/marketing/space-background.tsx`
  - `apps/web/lib/api.ts`
  - `apps/web/lib/operations/operations-optimistic.ts`

---

## Atualização após Sprint 2 + Sonar mais duro — `2026-04-03`

Depois da Sprint 1, atacamos os hotspots mais seguros de complexidade e rodamos um **gate local mais duro** para medir o projeto com menos complacência.

### O que foi refatorado na Sprint 2

- `apps/api/src/config/env.validation.ts`
  - validação quebrada em helpers menores por grupo (`URL`, `boolean`, `number`, `cookie`, `produção`)
- `apps/web/components/operations/operations-executive-grid.tsx`
  - estado derivado e painéis executivos extraídos para componentes menores
- `apps/web/components/dashboard/environments/portfolio-environment.tsx`
  - payload, filtro, confirmação de exclusão e rendering principal quebrados em helpers/painéis menores
- `apps/web/components/staff-mobile/mobile-order-builder.tsx`
  - fluxo móvel dividido entre header, seleção de categoria, carrinho e helpers de cart
- `apps/web/components/dashboard/dashboard-shell.tsx`
  - sinais do dashboard e header principal separados da orchestration do shell

### Evidência bruta

- scan estrito: `docs/release/sonarqube-local-strict-scan-2026-04-03.json`

### Resultado real após a Sprint 2

| Métrica | Pós Sprint 1 | Pós Sprint 2 | Delta |
| --- | ---: | ---: | ---: |
| Issues abertas | `649` | `627` | `-22` |
| Code Smells | `627` | `606` | `-21` |
| Bugs | `22` | `20` | `-2` |
| Vulnerabilities | `0` | `0` | `0` |
| Severidade `BLOCKER` | `0` | `0` | `0` |
| Severidade `CRITICAL` | `45` | `29` | `-16` |
| Severidade `MAJOR` | `228` | `223` | `-5` |
| Severidade `MINOR` | `376` | `374` | `-2` |
| `new_violations` | `0` | `0` | manteve |
| `new_blocker_violations` | `0` | `0` | manteve |
| `new_critical_violations` | `0` | `0` | manteve |

### Como endurecemos o gate

Criamos um quality gate local dedicado: `Desk Imperial Strict Local 2026-04-03T1640`

Condições:

- `new_coverage >= 90%`
- `new_duplicated_lines_density <= 3%`
- `new_violations = 0`
- `new_blocker_violations = 0`
- `new_critical_violations = 0`

### Resultado do gate estrito — rodada inicial

- Status: `FAILED`
- Leitura honesta: **o código novo ficou limpo de novas violações**, mas **a cobertura do código novo ainda não atingiu a régua mais dura**

| Condição | Resultado |
| --- | --- |
| `new_coverage >= 90%` | `74.5%` ❌ |
| `new_duplicated_lines_density <= 3%` | `0.0%` ✅ |
| `new_violations = 0` | `0` ✅ |
| `new_blocker_violations = 0` | `0` ✅ |
| `new_critical_violations = 0` | `0` ✅ |

### Fechamento da força-tarefa Sonar — `2026-04-03`

Depois da rodada inicial, atacamos exatamente o que o gate estrito estava pedindo: **cobertura nova insuficiente** e o **último bug remanescente**.

### O que entrou nesta passada final

- cobertura adicional em:
  - `apps/web/components/staff-mobile/mobile-order-builder.test.tsx`
  - `apps/web/components/dashboard/environments/portfolio-environment.test.tsx`
  - `apps/web/components/operations/operations-executive-grid.test.tsx`
  - `apps/web/components/operations/use-operations-realtime.test.ts`
  - `apps/web/components/pdv/salao/components/garcom-selector.test.tsx`
  - `apps/web/lib/observability/faro.test.ts`
- correções de tipagem dos testes para manter `typecheck` confiável no web
- ajuste do trilho de coverage do Sonar em `apps/web/vitest.config.ts`, incluindo `use-operations-realtime.ts` no modo `SONAR_COVERAGE=true`
- exclusão explícita do arquivo de tooling `apps/web/vitest.config.ts` da cobertura do Sonar em `sonar-project.properties`
- fechamento do último bug aberto do Sonar em `apps/web/components/pdv/salao/components/mesa-card.tsx`

### Resultado real após a força-tarefa

- scan estrito atualizado: `docs/release/sonarqube-local-strict-scan-2026-04-03.json`
- resumo atualizado: `docs/release/sonarqube-local-scan-2026-04-03.json`

| Métrica | Pós Sprint 2 | Pós força-tarefa | Delta |
| --- | ---: | ---: | ---: |
| Quality Gate estrito | `FAILED` | `PASSED` | ✅ |
| Issues abertas | `627` | `573` | `-54` |
| Code Smells | `606` | `573` | `-33` |
| Bugs | `20` | `0` | `-20` |
| Vulnerabilities | `0` | `0` | `0` |
| Security Hotspots | `46` | `46` | `0` |
| Severidade `BLOCKER` | `0` | `0` | `0` |
| Severidade `CRITICAL` | `29` | `29` | `0` |
| Severidade `MAJOR` | `223` | `192` | `-31` |
| Severidade `MINOR` | `374` | `352` | `-22` |
| `new_coverage` | `74.5%` | `90.9%` | `+16.4 pp` |
| `new_violations` | `0` | `0` | manteve |
| `new_blocker_violations` | `0` | `0` | manteve |
| `new_critical_violations` | `0` | `0` | manteve |

### O que essa leitura significa agora

- o Sonar **parou de falhar “do nada”**; a falha agora volta a ser sinal útil, não ruído estrutural
- o código novo está passando na régua dura com:
  - cobertura nova suficiente
  - zero violações novas
  - zero bugs abertos
- a dívida que sobrou é **legado rastreável**, não regressão escondida

Em outras palavras:

- **governança nova**: forte
- **regressão nova**: controlada
- **barulho no gate**: reduzido
- **dívida histórica**: ainda existe e continua merecendo sprint própria

### Próxima prioridade recomendada após a força-tarefa

1. manter o gate estrito local como trilho de pré-PR
2. atacar os clusters de smell com melhor custo-benefício:
   - `typescript:S3358` — ternários aninhados
   - `typescript:S7764` — `window` em vez de `globalThis`
   - `typescript:S6759` / `typescript:S7735` — semântica e JSX redundante
3. revisar manualmente os `46` security hotspots restantes
4. quando essa rotina estabilizar, promover a régua dura para o CI do GitHub

> Leitura sênior: a virada importante aconteceu. O Sonar agora está servindo como guarda de regressão real. O projeto ainda tem dívida, mas deixou de estar “poluído sem controle”.

---

## Base técnica já confirmada antes do primeiro scan

Mesmo sem o servidor SonarQube configurado, já levantamos um baseline técnico real com cobertura e hotspots locais.

### Cobertura atual

| Área | Statements | Branches | Functions | Lines | Evidência |
| --- | ---: | ---: | ---: | ---: | --- |
| API (`apps/api`) | `90.20%` | `74.40%` | `92.58%` | `90.05%` | `apps/api/coverage/coverage-summary.json` |
| Web (`apps/web`) | `69.87%` | `57.70%` | `69.72%` | `70.43%` | `apps/web/coverage/coverage-summary.json` |

### Hotspots técnicos já visíveis

| Área | Evidência | Leitura |
| --- | --- | --- |
| `apps/api/src/modules/auth/auth.service.ts` | `71.97%` lines / `55.17%` branches | serviço grande demais e com muita lógica crítica concentrada |
| `apps/api/src/common/services/cache.service.ts` | `70.88%` lines | camada sensível para fail-open, invalidação e aquecimento |
| `apps/api/src/modules/finance/finance.service.ts` | `82.81%` lines / `61.11%` branches | hotspot do resumo financeiro e do cold rebuild |
| `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts` | `76.47%` lines / `56.66%` branches | peça central de socket, ainda com bordas pouco cobertas |
| `apps/api/src/modules/employees/employees.service.ts` | `75.34%` lines | domínio importante com cobertura ainda mediana |
| `apps/web/components/operations/use-operations-realtime.ts` | `59.36%` lines / `46.13%` branches | hook crítico e complexo, propenso a regressão silenciosa |
| `apps/web/components/staff-mobile/staff-mobile-shell.tsx` | `39.81%` lines | shell crítico do fluxo de atendimento, pouco protegido |
| `apps/web/components/owner-mobile/owner-mobile-shell.tsx` | `47.82%` lines | jornada do dono ainda sem cobertura confortável |
| `apps/web/components/staff-mobile/mobile-comanda-list.tsx` | `50.81%` lines / `30.10%` branches | lista crítica do PDV mobile ainda frágil |
| `apps/web/components/shared/use-pull-to-refresh.ts` | `48.88%` lines / `17.39%` branches | comportamento de gesto ainda pouco garantido |

---

## O que o SonarQube vai acrescentar

Quando o primeiro scan real rodar, esperamos complementar a visão atual com:

- bugs de fluxo e nulidade que a cobertura não enxerga
- vulnerabilidades e hotspots de segurança
- code smells de tamanho, acoplamento, duplicação e complexidade
- duplicação de código e dívida de manutenibilidade
- quality gate automático em PR e `main`

Em outras palavras: cobertura nos diz **onde ainda testamos pouco**; SonarQube vai nos ajudar a ver **onde o código ainda está caro, arriscado ou frágil mesmo quando testado**.

---

## Plano em sprints

### Sprint 0 — Baseline SonarQube

**Objetivo**

Ligar o primeiro scan real sem quebrar o pipeline.

**Escopo**

- configurar `SONAR_HOST_URL` e `SONAR_TOKEN` no GitHub
- executar o workflow `SonarQube`
- gerar o baseline inicial no projeto SonarQube
- revisar Quality Profile e Quality Gate
- decidir se o projeto canônico será o repo privado, o público ou ambos

**Critério de aceite**

- workflow `SonarQube` rodando no GitHub
- primeira análise completa disponível no SonarQube
- findings exportados e triados nesta documentação

**Risco de não agir**

- continuamos sem linha oficial de dívida estática
- regressões de manutenibilidade seguem passando despercebidas

---

### Sprint 1 — Segurança e blocos críticos

**Objetivo**

Fechar o que o Sonar marcar como bug/vulnerabilidade nos fluxos críticos.

**Prioridade inicial**

- `auth.service.ts`
- `admin-pin.service.ts`
- `cache.service.ts`
- `operations-realtime.gateway.ts`

**Tipos de achado esperados**

- ramificações complexas demais
- risco de nulos/estado inválido
- tratamento incompleto de erro
- duplicação de regras de autenticação e sessão

**Critério de aceite**

- vulnerabilidades: `0` abertas
- bugs críticos: `0` abertos
- hotspots de segurança críticos triados

**Risco de não agir**

- a parte mais sensível do sistema continua cara de manter
- maior risco de incidente silencioso em auth, pin e cache

---

### Sprint 2 — Hot path de operação e tempo real

**Objetivo**

Atacar o que trava a sensação de fluidez do produto.

**Prioridade inicial**

- `finance.service.ts`
- `use-operations-realtime.ts`
- `staff-mobile-shell.tsx`
- `owner-mobile-shell.tsx`
- `mobile-comanda-list.tsx`

**Critério de aceite**

- queda dos smells de complexidade nos hot paths
- cobertura de branches melhor nas bordas críticas
- menos ruído e menos regressão nos fluxos ao vivo

**Risco de não agir**

- o produto segue com sensação de atraso mesmo com correções pontuais
- qualquer mudança no PDV/mobile continua de alto risco

---

### Sprint 3 — Manutenibilidade e quebra de serviços inchados

**Objetivo**

Reduzir acoplamento e custo de manutenção.

**Prioridade inicial**

- decompor `auth.service.ts`
- revisar `employees.service.ts`
- consolidar contratos e utilitários duplicados
- reduzir regra de negócio espalhada entre frontend e backend

**Critério de aceite**

- classes grandes quebradas em módulos menores
- menos duplicação apontada pelo Sonar
- menos arquivos críticos com baixa legibilidade

**Risco de não agir**

- o projeto continua funcional, mas cada evolução custa mais caro
- onboarding e revisão de PR seguem lentos

---

### Sprint 4 — Quality gate de verdade

**Objetivo**

Fazer o SonarQube virar guarda de merge, não só dashboard.

**Escopo**

- ativar gate por qualidade em PR
- definir limites mínimos para bugs, vulnerabilities e smells novos
- combinar SonarQube com o CI atual sem redundância tóxica
- revisar falsos positivos e calibrar o profile

**Critério de aceite**

- PR novo não entra com Quality Gate vermelho
- time consegue diferenciar dívida antiga de regressão nova

**Risco de não agir**

- Sonar vira painel bonito, mas sem efeito real na qualidade

---

## Como rodar o primeiro scan real

### 1. Configurar no GitHub

- adicionar a variável `SONAR_HOST_URL`
- adicionar o secret `SONAR_TOKEN`
- opcional: `SONAR_ROOT_CERT` se o servidor exigir certificado próprio

### 2. Garantir cobertura local/CI

O workflow novo já usa:

- API: `npm --workspace @partner/api run test -- --coverage --ci --forceExit --coverageReporters=json-summary --coverageReporters=lcov --coverageReporters=text-summary`
- Web: `npm --workspace @partner/web run test:coverage:sonar`

### 3. Rodar o workflow

Executar `SonarQube` pelo GitHub Actions ou deixar o próximo PR para `main` disparar automaticamente.

### 4. Triar os achados

Na primeira rodada, documentar:

- bugs críticos
- vulnerabilities / security hotspots
- top 10 code smells por impacto
- top 10 arquivos por complexidade/dívida

---

## Como esta documentação deve ser atualizada depois do primeiro scan

O primeiro scan local já aconteceu. A partir daqui, este arquivo deve ser mantido com:

- comparação entre scans
- issues fechadas por sprint
- hotspots revisados e classificados
- delta de complexidade/cobertura nas áreas críticas

### Modelo de registro

| Key | Severidade | Arquivo | Regra | Sprint | Status |
| --- | --- | --- | --- | --- | --- |
| `SONAR-001` | Critical | `apps/api/src/modules/auth/auth.service.ts` | _preencher após scan_ | Sprint 1 | Aberto |

---

## Decisão de produto e engenharia

O Desk Imperial já está maduro demais para depender só de “feeling” em revisão manual.  
O SonarQube entra aqui como camada de governança técnica — não para burocratizar o projeto, mas para:

- proteger o que já funciona
- expor dívida invisível
- dar previsibilidade ao que vale refatorar primeiro

Leitura sênior: o melhor uso do SonarQube neste projeto é **como complemento da cobertura, dos testes e do CI atual**, não como substituto deles.

---

## Replanejamento das sprints após o scan real

### Sprint 1 — Bugs, blockers e hotspots de revisão

**Entraram imediatamente**

- `apps/web/lib/observability/faro.ts` ✅
- `apps/web/lib/printing/qz-tray.client.ts` ✅
- `apps/api/src/common/services/period-classifier.service.ts` ✅
- `apps/api/src/modules/auth/auth.service.ts` (`reduce` sem valor inicial) ✅
- `apps/web/components/pdv/comanda-modal/hooks/use-product-filter.ts` ✅
- `apps/web/components/staff-mobile/mobile-order-builder.tsx` ✅
- triagem dos hotspots `HIGH` ⏳ próxima passada

**Resultado**

- `BLOCKER = 0`
- `new_violations = 0`
- `new_coverage = 84.2%`
- hotspots seguem documentados para revisão manual

### Sprint 2 — Complexidade dos caminhos quentes

**Entram imediatamente**

- `apps/web/components/dashboard/dashboard-shell.tsx`
- `apps/web/components/operations/operations-executive-grid.tsx`
- `apps/web/components/dashboard/environments/portfolio-environment.tsx`
- `apps/web/components/staff-mobile/mobile-order-builder.tsx`
- `apps/api/src/config/env.validation.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/operations/comanda.service.ts`

**Objetivo**

- derrubar os `S3776` mais caros
- quebrar funções grandes sem mexer no contrato do produto

### Sprint 3 — Acessibilidade e semântica do front operacional

**Entram imediatamente**

- cluster de `S1082` em PDV, calendário, activity timeline, admin pin e salão
- cluster de `S6759`, `S6848`, `S6853`

**Objetivo**

- corrigir interações com clique sem teclado
- melhorar semântica sem quebrar layout

### Sprint 4 — Limpeza estrutural e ruído de manutenção

**Entram imediatamente**

- ternários aninhados (`S3358`)
- `window` para `globalThis` (`S7764`)
- APIs depreciadas (`S1874`)
- redundâncias de JSX e imports duplicados

**Objetivo**

- reduzir massa de smell barata
- preparar gate Sonar mais duro no CI
