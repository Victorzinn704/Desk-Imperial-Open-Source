# Code Health Refactoring Standard

Este é o padrão usado nas refatorações recentes de `comanda`, `dashboard-shell`, smoke de notificações e `overview-environment`.

Para o guia completo de mentoria, scorecard local e checklist de review senior, use `docs/architecture/code-health-engineering-guide.md`.

Para planejar features e PRDs com orçamento de saúde antes de escrever código, use `docs/architecture/code-health-creation-workflow.md`.

## Objetivo

Transformar hotspots em módulos pequenos, nomeados por responsabilidade, mantendo contrato público, comportamento visual e testes.

A meta é Code Health 10/10. O mínimo aceitável por rodada é reduzir:

- arquivo grande;
- método grande;
- método complexo;
- condicional complexa;
- excesso de argumentos;
- duplicação;
- acoplamento de mudança.

## Estrutura Preferida

Use estas fronteiras quando o arquivo começar a concentrar mais de uma responsabilidade:

- `*.controller.ts`: hooks, queries, estado discriminado e seleção de dados.
- `*.content.ts`: builders puros de textos, métricas, ledgers, pills e regras de tom.
- `*-view.tsx`: componente visual declarativo por variante ou seção.
- `*.widgets.tsx`: componentes visuais reutilizáveis e pequenos.
- `*.lab.tsx` ou `*.desktop.tsx`: composição específica de superfície quando houver um contexto visual forte.
- arquivo original: facade/barrel/entrypoint fino, preservando exports públicos.

## Regras De Tamanho

- alvo: até 300 linhas por arquivo;
- 301-450: zona de atenção, exige justificativa e plano;
- acima de 450: refatoração obrigatória antes de novo escopo funcional;
- função nova: mirar até 50 linhas;
- componente React: complexidade abaixo de 10;
- serviço/script: complexidade abaixo de 15;
- função pública: até 4 argumentos, preferindo objeto de parâmetro.

## Padrão De Refatoração

1. Preserve o contrato externo primeiro.
2. Crie uma facade fina no arquivo original.
3. Extraia estado/queries para controller.
4. Extraia condicionais de negócio para funções com nomes explícitos.
5. Transforme blocos repetidos em builders de dados.
6. Transforme JSX grande em views por variante.
7. Mantenha widgets reutilizáveis fora das views.
8. Rode typecheck, testes focados e smoke quando houver fluxo operacional.
9. Confira line count dos arquivos tocados.
10. Não esconda dívida nova em arquivo recém-criado.

## Exemplos Recentes

### Comanda

`ComandaService` virou facade e a lógica foi distribuída por serviços internos:

- context/autorização;
- items;
- kitchen;
- lifecycle;
- settlement;
- realtime publisher.

Resultado esperado: o arquivo público deixa de ser o hotspot principal e os comandos ficam testáveis por responsabilidade.

### Dashboard Shell

`dashboard-shell.tsx` virou renderer de estado:

- `dashboard-shell.controller.ts` resolve sessão, mobile/desktop, realtime e props;
- `dashboard-shell.tsx` só renderiza `loading`, `unauthorized`, `email-verification`, mobile ou desktop;
- a condicional complexa virou regra nomeada.

Resultado esperado: componente principal com baixa complexidade e menos risco de regressão visual.

### Smoke De Notificações

`operations-status-notification-smoke.mjs` virou entrypoint fino:

- `api-session.mjs`;
- `realtime-probe.mjs`;
- `preferences.mjs`;
- `scenario.mjs`;
- `config.mjs`.

Resultado esperado: smoke continua validando API/socket real, mas cada parte é revisável e pequena.

### Overview Environment

`overview-environment.tsx` virou seletor de variante:

- `overview-environment.controller.ts`;
- `overview-*-view.tsx`;
- `overview-*.content.ts`;
- `overview-environment.widgets.tsx`;
- `overview-environment.lab.tsx`;
- `overview-locked-state.tsx`.

Resultado esperado: cada variante tem JSX curto, regras de tom/texto ficam em builders puros e nenhum arquivo novo nasce acima de 300 linhas.

## Anti-Padrões

- Extrair função com nome genérico como `renderSection` sem revelar regra.
- Mover bloco grande para outro arquivo e manter a mesma complexidade.
- Criar `*.content.ts`, `*.model.ts`, `*.helpers.ts` ou `*.test.ts` como novo hotspot.
- Criar arquivo novo acima de 300 linhas.
- Deixar ternários longos dentro de JSX principal.
- Repetir arrays de cards, pills ou ledgers em várias views.
- Usar comentários para explicar regra que deveria estar no nome da função.
- Mudar contrato público durante refatoração de saúde.

## Checklist Antes Do PR

- O arquivo original virou facade/entrypoint?
- Todos os arquivos novos estão abaixo de 300 linhas?
- As funções novas ficaram pequenas e nomeadas por intenção?
- Condicionais compostas viraram funções ou builders?
- Builders puros cobrem textos, tons, labels e métricas?
- Testes longos usam fixtures/case tables fora do `it`/`beforeEach`?
- O comportamento foi validado por teste ou smoke?
- O diff evita refatoração visual não pedida?
- O scorecard local do guia de engenharia foi aplicado antes do commit?
