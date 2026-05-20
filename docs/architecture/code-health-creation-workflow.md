# Workflow De Criação Com Code Health

Este documento transforma o padrão de saúde de código em parte obrigatória do PRD, do desenho técnico e do review. A referência conceitual é a documentação pública do CodeScene sobre Code Health: https://codescene.io/docs/guides/technical/code-health.html

O Desk Imperial usa esse padrão como política interna: toda mudança deve preservar ou melhorar a capacidade do código de ser entendido, revisado, testado e evoluído.

## Regra Central

Nenhuma feature, refatoração ou ajuste operacional deve criar um novo hotspot para resolver outro. Se uma extração apenas move complexidade para um arquivo novo, a mudança ainda está incompleta.

## Como Interpretamos Code Health

CodeScene organiza os riscos em três níveis que adotamos internamente:

- **Módulo**: arquivo grande, baixa coesão, concentração de responsabilidades e gargalo de mudança.
- **Função**: método grande, método complexo, repetição estrutural e obsessão por primitivos.
- **Implementação**: aninhamento profundo, bumpy road, condicional complexa e blocos de assertion grandes em testes.

A regra prática é simples: quanto mais um arquivo muda e mais difícil ele é de entender, maior é o custo futuro da próxima mudança.

## Orçamento De Saúde Para PRD

Todo PRD ou plano técnico que gera código deve declarar:

| Campo                  | Obrigatório                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| Superfície afetada     | API, Web, contratos, banco, realtime, pagamento, impressão, infra    |
| Arquivos prováveis     | Lista inicial de arquivos que devem ser tocados                      |
| Contratos públicos     | Rotas, DTOs, payload realtime, eventos, env vars, schemas            |
| Risco operacional      | Baixo, médio, alto, crítico                                          |
| Hotspots existentes    | Arquivos já marcados por CodeScene/Sonar/ESLint                      |
| Orçamento de arquivo   | Nenhum arquivo novo acima de 300 linhas                              |
| Orçamento de função    | Nenhuma função nova acima de 50 linhas                               |
| Estratégia de extração | Facade, controller, content, view, service interno, builder, adapter |
| Validação              | Testes, typecheck, contratos, smoke, screenshot, performance         |
| Exceções               | Justificativa explícita e plano de remoção                           |

Sem esses campos, a implementação deve parar no desenho.

## Checklist De Criação

Antes de escrever código:

- O problema do usuário está claro em uma frase?
- O fluxo crítico foi mapeado do início ao fim?
- Os contratos que não podem mudar estão listados?
- O módulo atual foi lido antes de propor extração?
- O arquivo original pode virar facade fina?
- Há regra de negócio escondida em condicional composta?
- Há grupos de primitivos que devem virar objeto de parâmetro?
- Há tabela de casos que deve sair do `it`, `beforeEach` ou JSX?
- A validação mínima está definida antes da edição?

Durante a implementação:

- Preserve o comportamento primeiro.
- Extraia por responsabilidade, não por número de linhas.
- Mantenha a ordem de contrato quando registrar rotas, OpenAPI, eventos ou menus.
- Não deixe `*.content.ts`, `*.model.ts`, `*.helpers.ts` ou `*.test.ts` virarem novo arquivo grande.
- Prefira builders pequenos e declarativos a arrays gigantes dentro de funções.
- Testes com muitas linhas devem mover casos para fixtures ou case tables nomeadas.
- Hooks React devem delegar cálculo e efeitos para hooks/modelos internos quando passarem de uma responsabilidade.

Antes do review:

- O arquivo original ficou mais simples?
- Arquivos novos nasceram abaixo de 300 linhas?
- Funções novas ficaram abaixo de 50 linhas?
- Nenhum smell crítico foi escondido por renomeação?
- O contrato público foi preservado?
- O diff reduz o custo da próxima mudança?

## Limites Obrigatórios

| Item                    |                          Limite padrão | Ação se passar                        |
| ----------------------- | -------------------------------------: | ------------------------------------- |
| Arquivo novo            |                             300 linhas | Dividir antes do commit               |
| Arquivo alterado        | 300 linhas alvo, 450 máximo temporário | Criar plano de extração no mesmo PR   |
| Função nova             |                              50 linhas | Extrair responsabilidade              |
| Função existente tocada |                             Não piorar | Se piorar, refatorar antes de fechar  |
| Argumentos              |                                  Até 4 | Introduzir objeto de parâmetro        |
| Aninhamento             |                           Até 2 níveis | Usar guard clauses e helpers          |
| Complexidade React      |                           Menor que 10 | Controller/content/view               |
| Complexidade TS backend |                            Menor que 9 | Service interno, builder ou strategy  |
| Teste individual        |                          Até 70 linhas | Extrair fixtures/cases/assert helpers |

## Padrões De Arquitetura

### Facade + Content

Use quando o arquivo público precisa manter export/contrato, mas não deve carregar detalhes.

```text
operations.openapi.ts                 # registra ordem e expõe facade
operations.openapi.comanda.routes.ts  # facade de grupo
operations.openapi.comanda.content.ts # ordem declarativa
operations.openapi.comanda-open.content.ts
operations.openapi.comanda-payment.content.ts
```

### Controller + Model + Events

Use em hooks e componentes de UI:

```text
use-mesa-drag.ts              # API pública do hook
use-mesa-drag.model.ts        # cálculo puro
use-mesa-drag-events.ts       # listeners e requestAnimationFrame
use-mesa-drag.model.test.ts   # regras puras
```

### Service Facade + Commands

Use em backend:

```text
products.service.ts           # métodos públicos e delegação
products-create.service.ts    # comando de criação
products-import.service.ts    # importação
products-query.service.ts     # listagem/filtros
products.types.ts             # linguagem do domínio
```

### Test Case Table

Use quando um teste cobre muitos wrappers ou variações:

```text
api.test.ts                         # loop e assertions
api.standard-endpoint-cases.ts      # tabela de casos
api.standard-endpoint-fixtures.ts   # fixtures pesadas, se necessário
```

## Política De Diretivas E Exceções

Diretivas do CodeScene para ignorar smells só podem ser usadas quando:

- a função é gerada ou forçada por contrato externo;
- o risco foi documentado no PR;
- existe plano com data ou condição para remover a exceção;
- a exceção não esconde risco de segurança, dinheiro, autorização ou dados.

Não usamos diretivas para mascarar pressa, arquivo grande, método complexo ou teste mal estruturado.

## Gates Por Tipo De Mudança

| Mudança                    | Gates mínimos                                                             |
| -------------------------- | ------------------------------------------------------------------------- |
| Docs apenas                | `npm run format:check` quando aplicável                                   |
| UI isolada                 | ESLint focado, `npm --workspace @partner/web run typecheck`, teste focado |
| API isolada                | ESLint focado, `npm --workspace @partner/api run typecheck`, teste focado |
| Contrato/OpenAPI           | `npm run openapi:check`, teste focado, typecheck API                      |
| Realtime/PDV/comanda       | testes focados, typecheck API/Web, smoke quando local estiver pronto      |
| Pagamento/caixa/financeiro | SLDD completo, testes de erro, contratos, segurança e smoke               |
| Refatoração grande         | `quality:scope`, `quality:contracts`, typechecks e testes do slice        |

## Template De PRD Com Code Health

Use este bloco em qualquer PRD novo:

```markdown
## Code Health Budget

- Arquivos esperados:
- Arquivos que devem virar facade:
- Arquivos que não podem piorar:
- Contratos públicos preservados:
- Funções com risco de passar de 50 linhas:
- Estratégia para testes grandes:
- Smells proibidos nesta mudança:
  - Complex Method
  - Large Method
  - Bumpy Road
  - Complex Conditional
  - Primitive Obsession
  - Excess Number of Function Arguments
  - Duplicated Function Blocks
- Gates obrigatórios:
- Exceções aceitas:
```

## Definition Of Done

Uma mudança só está pronta quando:

- resolve o problema funcional;
- não cria hotspot novo;
- não degrada arquivo que estava saudável;
- mantém contrato público;
- tem validação proporcional ao risco;
- deixa o próximo engenheiro com menos carga cognitiva que antes.

## Documentos Relacionados

- `docs/architecture/code-health-engineering-guide.md`
- `docs/architecture/code-health-refactoring-standard.md`
- `docs/architecture/code-health-file-size-policy.md`
- `docs/architecture/sldd-working-agreement.md`
- `docs/architecture/module-template.md`
