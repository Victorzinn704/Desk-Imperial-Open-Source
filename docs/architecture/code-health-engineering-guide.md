# Guia De Engenharia Para Saúde Do Código

Este guia define o padrão interno para manter o Desk Imperial saudável sem depender de um painel externo para descobrir problemas básicos. Ele usa as mesmas ideias que aplicamos nas refatorações recentes de `comanda`, `operations-helpers`, `products`, `orders`, `dashboard`, `overview`, `portfolio`, `login`, `mailer` e scripts de smoke.

Referência conceitual externa: https://codescene.io/docs/guides/technical/code-health.html

Para usar este padrão como workflow de criação e PRD, veja `docs/architecture/code-health-creation-workflow.md`.

## Princípio Central

Código excelente é fácil de revisar, testar, mover e operar. A refatoração correta reduz carga cognitiva sem mudar contrato público, regra de negócio ou experiência do usuário.

Antes de escrever código novo ou alterar um hotspot, pergunte:

- qual responsabilidade este arquivo realmente deve ter?
- qual regra de negócio está escondida em condicionais?
- que dado composto está sendo passado como vários primitivos?
- que parte deste fluxo deve ser testada isoladamente?
- que contrato externo não pode mudar?

## Limites Internos

| Métrica                     |          Excelente |                       Atenção |     Refatoração obrigatória |
| --------------------------- | -----------------: | ----------------------------: | --------------------------: |
| Arquivo de código           |     até 300 linhas |                301-450 linhas |         acima de 450 linhas |
| Função nova                 |      até 50 linhas |                  51-70 linhas |          acima de 70 linhas |
| Componente React            |  complexidade < 10 |                         10-14 |                       >= 15 |
| Serviço/script TypeScript   |   complexidade < 9 |                          9-14 |                       >= 15 |
| Argumentos de função        |              até 3 |                             4 |                          5+ |
| Profundidade de aninhamento |              até 2 |                             3 |                          4+ |
| Duplicação estrutural       | zero em fluxo novo | duplicação temporária testada | duplicação entre 3+ funções |

Esses limites são guias de engenharia, não metas cosméticas. Se uma exceção for necessária, ela deve estar explícita no review com o motivo e a próxima extração prevista.

## Nosso Scorecard Local

Use este checklist como substituto prático para ferramentas de saúde de código:

1. **Tamanho de arquivo**: o arquivo alterado ficou abaixo de 300 linhas?
2. **Tamanho de função**: nenhuma função nova passou de 50 linhas?
3. **Complexidade ciclomática**: branches foram extraídos para regras nomeadas?
4. **Condicional complexa**: expressões com `&&`/`||` foram encapsuladas quando carregam regra de negócio?
5. **Bumpy road**: loops e `if` aninhados foram convertidos em coletores, filtros ou builders?
6. **Profundidade de aninhamento**: guard clauses substituíram blocos dentro de blocos?
7. **Excesso de argumentos**: grupos de parâmetros viraram objeto de parâmetro?
8. **Primitive obsession**: IDs, payloads e filtros ganharam tipos ou estruturas de domínio quando necessário?
9. **Duplicação**: blocos repetidos viraram builder, adapter, fixture ou tabela de casos?
10. **Acoplamento de mudança**: funções que mudam juntas foram reunidas no mesmo módulo coeso?
11. **Facade fina**: arquivo público grande virou entrypoint/delegador?
12. **Controller/hook separado**: estado, queries e mutations saíram do JSX principal?
13. **Content builders**: textos, métricas, tons e labels saíram de ternários inline?
14. **Serviço de domínio coeso**: comando de negócio tem uma razão clara para mudar?
15. **Side effects explícitos**: cache, realtime, auditoria, fila e e-mail ficam em fronteiras nomeadas?
16. **Transação preservada**: refatoração não moveu efeito para fora do limite atômico sem teste?
17. **Segurança preservada**: autorização, workspace ownership e validação continuam centrais?
18. **Performance preservada**: não foram adicionados loops, snapshots ou queries desnecessárias?
19. **Tipos fortes**: não houve `any` novo em produção?
20. **Tratamento de erro**: erro operacional tem mensagem útil e não vaza segredo?
21. **Observabilidade**: log/telemetria ficam em pontos de decisão relevantes, não em todo lugar?
22. **Responsividade**: UI alterada continua legível em mobile e desktop?
23. **Acessibilidade**: labels, botões e estados continuam alcançáveis por teclado/testes?
24. **Testabilidade**: a regra extraída pode ser testada sem renderizar o mundo?
25. **Contrato público**: rotas, DTOs, exports, payloads realtime e formato visual foram preservados?

Se três ou mais itens falharem, a mudança ainda não está pronta para review.

## Política De Não Regressão

O CodeScene alerta quando um arquivo começa a declinar. Internamente, tratamos qualquer queda em arquivo tocado como dívida criada no próprio PR, mesmo que o CI ainda passe.

Regras:

- arquivo saudável tocado não pode piorar sem justificativa explícita;
- hotspot tocado deve melhorar ou ter uma redução mensurável de risco;
- extração não pode criar um novo arquivo com o mesmo cheiro;
- teste grande conta como dívida real, não como exceção automática;
- diretiva para ignorar smell é exceção rara e precisa de racional documentado.

Quando houver conflito entre entregar feature e preservar saúde, divida o PR: primeiro estabilize a fronteira, depois implemente a feature.

## Padrão De Extração

### Serviços Backend

Use uma facade quando o serviço acumular comandos diferentes:

```text
orders.service.ts              # API publica e delegação
orders-create.service.ts       # criação e transação
orders-cancel.service.ts       # cancelamento e side effects
orders-list.service.ts         # filtros e paginação
orders-cache.service.ts        # cache key e invalidação
orders.types.ts                # contratos internos do domínio
```

Regras:

- preserve métodos públicos no serviço original quando controllers dependem deles;
- mova fluxo transacional inteiro para o serviço que possui o comando;
- use objetos como `CreateOrderCommand`, `OrderListQuery`, `CacheKeyInput`;
- mantenha side effects em publishers/adapters nomeados;
- teste o serviço novo quando a regra for financeira, autorização ou estado.

### Componentes React

Use composição quando o componente mistura estado, dados e JSX:

```text
login-form.tsx                 # composição visual
login-form.controller.ts       # estado, mutations, redirects
login-form.sections.tsx        # blocos visuais pequenos
login-form.content.ts          # textos, labels e regras de tom
```

Regras:

- JSX principal deve ler como uma árvore de produto;
- hooks ficam em controller;
- ternários longos viram lookup table;
- condições de negócio viram funções com nome de regra;
- cada seção deve ser pequena o bastante para review visual rápido.

### Scripts

Use entrypoint fino quando o script combina parsing, validação e execução:

```text
run-with-sanitized-node-options.mjs  # CLI e spawn
lib/node-options-sanitizer.mjs       # parsing e normalização
```

Regras:

- o arquivo executável deve orquestrar;
- parsing deve ser função pura quando possível;
- decisões de fallback precisam de nomes explícitos;
- erros de ambiente devem ser reproduzíveis por smoke local.

## Como Corrigir Smells Comuns

### Complex Method

Não divida por número de linhas. Divida por responsabilidade:

- validação;
- autorização;
- montagem de dados;
- persistência;
- side effects;
- resposta.

### Complex Conditional

Troque:

```ts
if (error instanceof ApiError && error.status === 403 && payload.loginMode === 'OWNER') {
  // ...
}
```

por:

```ts
if (shouldRedirectOwnerToEmailVerification(error, payload)) {
  // ...
}
```

O nome da função deve explicar a regra que o reviewer precisa validar.

### Bumpy Road

Troque loops aninhados por etapas:

- `collect*` para juntar dados;
- `is*` para predicados;
- `summarize*` para agregações;
- `build*` para saída.

Cada etapa deve poder ser lida sem manter todo o fluxo na memória.

### Excess Arguments

Troque:

```ts
buildCacheKey(ownerId, status, page, pageSize, search)
```

por:

```ts
buildCacheKey({ ownerId, filters, pagination })
```

Argumentos primitivos soltos são baratos no começo e caros no crescimento.

### Duplication

Duplicação aceitável:

- dois blocos pequenos que não mudam juntos;
- teste que repete entrada para legibilidade.

Duplicação que deve ser extraída:

- três ou mais métodos com mesma estrutura;
- mensagens com mesmo envelope e variação mínima;
- queries com mesmo filtro base;
- JSX de cards/pills repetido.

## Gates Antes De Commit

Use validação proporcional ao risco:

- refatoração de UI: teste focado, typecheck web e ESLint focado;
- refatoração API: teste focado, typecheck API e ESLint focado;
- contratos públicos: `npm run quality:contracts`;
- dependências internas: `npm run lint:cycles`;
- commit: `npm run lint:secrets:staged`;
- escopo misto: `npm run quality:scope:strict`.

Quando o guard de escopo falhar por arquivo desconhecido, não silencie. Classifique o arquivo com padrão específico e rode o gate de novo.

Para mudanças planejadas por PRD, os gates e orçamento de saúde devem aparecer antes da implementação. Use o bloco `Code Health Budget` em `docs/architecture/code-health-creation-workflow.md`.

## Checklist De Review Senior

- O diff melhora o ponto de dor apontado?
- O arquivo original ficou mais simples?
- Os nomes explicam regras de negócio, não detalhes mecânicos?
- Há teste ou smoke cobrindo o fluxo crítico?
- O contrato público foi preservado?
- A segurança ficou no mesmo nível ou melhor?
- A mudança reduz o custo da próxima alteração?
- Não nasceu outro hotspot em arquivo novo?

Se a resposta for “não” em qualquer item crítico, a refatoração ainda está incompleta.

## Regra De Ouro Para Evolução

Não normalize dívida nova. Quando tocar em um arquivo ruim, deixe-o mensuravelmente melhor. Quando criar arquivo novo, ele já deve nascer no padrão que esperamos manter daqui a seis meses.
