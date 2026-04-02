# Realtime Refinement - 2026-03-28

## Objetivo

Refinar a malha operacional do Desk Imperial para ficar mais leve, mais coerente entre web e mobile e mais segura para evolucao publica sem cair em efeitos "bonitos por fora e inconsistentes por dentro".

## Avancos desta fase

### 1. Identidade operacional de staff alinhada ao dominio

- A sessao de `STAFF` passou a carregar `workspaceOwnerUserId`, `employeeId` e `employeeCode`.
- A operacao deixou de depender do `loginUserId` como lookup indireto para descobrir o funcionario autenticado.
- Novos funcionarios agora podem nascer com credencial no proprio `Employee`, reduzindo dependencia estrutural de `User STAFF`.

Impacto:

- menos quebra silenciosa entre login, pedidos e caixa
- menos lookup redundante no backend
- base mais fiel ao modelo "empresa pai + funcionario operacional limitado"

### 2. Mutações operacionais mais leves

- As mutacoes principais de operacao passaram a aceitar `includeSnapshot=false`.
- Mobile deixou de depender de snapshot completo no retorno de toda acao operacional.
- O socket passou a ter mais responsabilidade na distribuicao do estado entre aparelhos.

Impacto:

- menos payload HTTP
- resposta mais rapida na ponta
- menos custo de CPU para reconstruir snapshot completo em toda mutacao

### 3. Realtime mais util e menos dependente de refetch

- O frontend passou a aplicar eventos do socket diretamente no cache de `operations/live`.
- O hook de realtime foi ajustado para sincronizar mais de uma variante de snapshot em cache.
- O fluxo ao vivo continua preservando o servidor como fonte de verdade: persiste primeiro, emite depois.

Impacto:

- outro celular passa a refletir alteracoes com menos delay
- empresa web/mobile enxerga o salao mais proximo do estado real
- menos invalidação em cascata

### 4. Snapshot compacto para telas ao vivo

- `GET /operations/live` agora aceita `includeCashMovements=false`.
- `staff mobile`, `owner mobile` e o ambiente de salao usam a variante compacta.
- O painel executivo continua livre para usar o snapshot completo quando precisar de leitura detalhada de caixa.

Impacto:

- menos carga desnecessaria no mobile
- menos trafego entre backend e dispositivos
- operacao ao vivo mais fluida sem amputar dados essenciais de mesas, comandas, cozinha e fechamento

### 5. Contrato unico para mutacoes operacionais

- `createCashMovement`, `closeCashSession`, `replaceComanda` e `assignComanda` passaram a respeitar `includeSnapshot`.
- O client web ficou alinhado ao mesmo contrato, sem caminhos especiais escondidos para essas mutacoes.
- A borda entre controller, service e API client agora segue a mesma regra das outras acoes operacionais.

Impacto:

- menos excecoes semanticas no backend
- menos snapshot pesado por acidente
- manutencao mais previsivel para web, mobile e realtime

### 6. Realtime com contrato mais honesto

- `cash.updated` deixou de anunciar estados que nao eram emitidos na pratica.
- `cash.closure.updated` perdeu um campo morto que nao carregava valor operacional real.
- A camada de patch no frontend foi mantida coerente com esse contrato mais enxuto.
- `openComanda` deixou de sincronizar fechamento consolidado quando a acao ainda nao gera impacto financeiro real.

Impacto:

- menos ambiguidade na conversa entre backend e frontend
- menos ruido de tipo e menos carga cognitiva para evoluir a malha ao vivo
- eventos mais proximos do estado real do dominio

### 7. Revisao semantica de `cashSession`

- Os `syncCashClosure()` restantes em `cash-session.service.ts` foram revisados com criterio de dominio.
- Abertura de caixa continua sincronizando fechamento porque altera `openSessionsCount`.
- Movimentacao de caixa continua sincronizando fechamento porque altera `expectedCashAmount` consolidado.
- Fechamento de caixa continua sincronizando fechamento porque altera contadores e consolidado real.
- Fechamento consolidado continua sincronizando antes de consolidar o dia, para validar pre-condicoes e persistir o estado final correto.

Conclusao:

- neste bloco, as sincronizacoes restantes nao sao ruido; elas representam mudanca real no consolidado.
- o proximo refinamento deve olhar mais para emissao redundante residual e para enriquecimento seletivo de payload, nao para remover `syncCashClosure()` desses pontos.

### 8. Poda de emissao redundante na abertura de caixa

- `openCashSession` deixou de emitir `cash.updated` logo apos `cash.opened` para o mesmo estado recem-criado.
- A abertura continua emitindo `cash.opened` para a sessao e `cash.closure.updated` para o consolidado.
- O contrato fica mais limpo: um evento anuncia a abertura da sessao, o outro anuncia a mudanca do fechamento consolidado.

Impacto:

- menos ruido no realtime
- menos trabalho desnecessario no cliente
- sem perda de sincronizacao entre web, mobile empresa e mobile staff

### 9. Historico operacional no PDV web

- O PDV web ganhou uma aba dedicada de historico de comandas abertas e fechadas.
- O extrato da comanda continua visivel com itens, subtotal, desconto, acrescimo, total, mesa, cliente e responsavel.
- A leitura foi mantida conectada a mesma fonte viva do PDV, preservando atualizacao em tempo real.
- O historico passou a aceitar busca por mesa, cliente, documento, item e responsavel.
- A tela tambem ganhou ordenacao por `mais recentes` e `maior valor`.

Impacto:

- mais rastreabilidade operacional para empresa e atendimento
- visibilidade web do que foi vendido, por quem e para qual mesa
- melhor leitura de gestao sem inflar a interface com filtros desnecessarios

### 10. Consolidacao estrutural de `operations` e `operations-realtime`

- `comanda.service.ts` e `cash-session.service.ts` passaram a compartilhar mais a mesma moldura de mutacao:
  snapshot opcional, invalidação live, resolucao do ator operacional e retorno final.
- A publicacao realtime de `comanda` foi encapsulada em helpers privados, reduzindo repeticao direta de eventos de comanda, cozinha e fechamento.
- A publicacao e o retorno de `cash-session` tambem foram encapsulados, deixando a leitura do service mais previsivel.
- `operations-realtime.auth.ts` ganhou uma resolucao unica de `workspaceOwnerUserId + channel`, evitando manter `workspace:${id}` manual em pontos diferentes.
- `operations-realtime.service.ts` passou a resolver o workspace por um ponto unico e perdeu log duplicado de bootstrap.
- `operations-realtime.gateway.ts` ficou com bootstrap mais limpo e removeu o caminho redundante de emissao `emitWorkspaceSync()`, que estava sem uso.

Impacto:

- menos divergencia semantica entre services criticos
- menos ruido estrutural em code review
- menos risco de evoluir `comanda`, `cash` e `realtime` por caminhos paralelos
- base mais madura para a proxima rodada de refinamento do socket e do auth

### 11. Segunda e terceira rodadas em passada unica

- A segunda rodada fechou a borda de `operations-realtime`:
  `operations-realtime.auth.ts`, `operations-realtime.socket-auth.ts`, `operations-realtime.service.ts` e `operations-realtime.gateway.ts`
  passaram a usar a mesma resolucao de workspace e canal.
- O gateway deixou de recalcular workspace ja autenticado e perdeu o caminho morto `emitWorkspaceSync()`.
- O bootstrap do namespace ficou mais limpo e com menos logging redundante.
- A terceira rodada entrou pelo eixo de menor risco em `auth`:
  `auth.service.ts` passou a centralizar as opcoes-base de cookie em um unico helper,
  e `auth-rate-limit.service.ts` passou a normalizar a construcao de chaves por um ponto unico.

Impacto:

- menos ruido entre autenticacao de socket, service e gateway
- menos chance de divergencia entre `workspaceOwnerUserId` e `workspaceChannel`
- menos repeticao estrutural em cookies e rate-limit
- melhor leitura de compliance e seguranca sem mexer em regras sensiveis de login/demo

### 12. Passada unica de reconstrucao de ruido no frontend

- A camada compartilhada de `lib/operations` passou a concentrar melhor a logica de query e de metricas operacionais.
- `operations-query.ts` virou a base comum para invalidacao do workspace operacional no mobile e no PDV web.
- `operations-kpis.ts` passou a concentrar ranking, top produtos e contagem de cozinha pendente, reduzindo calculo artesanal dentro do shell mobile.
- `owner-mobile-shell.tsx` ficou mais enxuto, com menos logica operacional espalhada no componente.
- `pdv-board.tsx` deixou de manter um helper local proprio para invalidação de workspace e passou a reutilizar a base comum.

Impacto:

- menos ruido estrutural em code review no frontend
- menos logica derivada espalhada em shell de tela
- melhor coerencia entre PDV web, owner mobile e camada compartilhada de operacao
- manutencao mais segura para evoluir UX sem reabrir duplicidade funcional

### 13. Consolidacao do `staff-mobile` e alinhamento visual de baixo risco

- `operations-optimistic.ts` passou a concentrar a moldura otimista de operacao com helpers para:
  - append de comanda
  - append de item
  - rollback de snapshot
  - troca otimista de status
- `staff-mobile-shell.tsx` foi alinhado a essa base compartilhada, reduzindo patch manual e rollback espalhado nas mutacoes.
- `buildOptimisticComandaRecord()` passou a calcular subtotal e total do estado otimista inicial, evitando divergencia visual no shell de operacao.
- Os empty states de:
  - `owner-comandas-view.tsx`
  - `mobile-historico-view.tsx`
  - `mobile-comanda-list.tsx`
  - `pdv-historico-view.tsx`
    passaram a falar uma linguagem visual mais unica por meio de `operation-empty-state.tsx`.
- `owner-comandas-view.tsx` e `mobile-historico-view.tsx` tambem ficaram com derivacoes mais previsiveis via `useMemo`, reduzindo ruido no render.

Impacto:

- menos divergencia entre shells mobile
- rollback mais previsivel nas mutacoes otimistas
- extratos e estados vazios mais coerentes entre owner, staff e PDV
- melhor leitura visual para code review sem sacrificar a ergonomia operacional

## Principios preservados

- persistencia no banco antes de emitir evento
- guardas de sessao e CSRF mantidos
- isolamento por workspace mantido
- cache local apenas como acelerador de visualizacao, nunca como fonte de verdade

## Suites usadas para validar esta etapa

### Backend

```bash
npm --workspace @partner/api test -- --runInBand operations-service.spec.ts auth.service.spec.ts orders.service.spec.ts employees.service.spec.ts
```

Resultado validado nesta fase:

- 4 suites
- 99 testes passando

### Frontend

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
npm --workspace @partner/web test -- owner-mobile-shell
```

Resultado validado nesta fase:

- typecheck do web passando
- suite `owner-mobile-shell` passando

## Risco residual conhecido

- O typecheck e a fundacao principal de testes ja estao alinhados nesta branch.
- O risco residual agora esta mais concentrado em refinar a semantica dos eventos, reduzir wrappers triviais do realtime e atacar blocos maiores de `auth.service.ts` sem criar regressao.

## Proximo refinamento

1. Reduzir ruido residual de eventos realtime no backend.
2. Enxugar wrappers triviais e contratos restantes de `operations-realtime`.
3. Isolar mais bordas de `auth.service.ts` com foco em sessao, rate-limit e fluxo legado de staff.
4. Enriquecer payloads uteis para evitar `invalidateQueries` residuais.
