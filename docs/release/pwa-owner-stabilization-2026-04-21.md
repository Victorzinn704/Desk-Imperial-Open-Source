# PWA Owner — Estabilizacao Estrutural 2026-04-21

Data: 2026-04-21
Escopo: reduzir arquivos-deus do Owner PWA sem mudar o comportamento funcional.

## Objetivo da rodada

Esta rodada nao foi de design novo.

Foi uma rodada de:

1. quebrar superficies grandes em fronteiras menores
2. preservar hooks, queries, mutacoes e navegacao existentes
3. manter o PWA Owner validado por testes focados
4. registrar a ordem de fechamento para nao reabrir divida tecnica sem perceber

## O que foi estabilizado

### 1. Cadastro rapido

Commit base:

- `59b5687 refactor(web): split owner quick register flow`

O fluxo foi quebrado em:

- `view` orquestradora
- hooks de form, submit, lookup e offline queue
- secoes visuais menores
- model/contrato dedicado

Resultado:

- menos acoplamento
- menor risco ao evoluir EAN, offline e enrichments
- teste focado da superficie mantido verde

### 2. Shell Owner

Commit base:

- `0095f23 refactor(web): split owner mobile shell`

O shell foi quebrado em:

- `owner-mobile-shell.tsx`
- `owner-mobile-shell-header.tsx`
- `owner-mobile-shell-bottom-nav.tsx`
- `owner-mobile-shell-content.tsx`
- `owner-mobile-pdv-tab.tsx`
- `owner-mobile-pdv-chrome.tsx`
- `use-owner-mobile-shell-queries.ts`
- `use-owner-mobile-shell-mutations.ts`
- `use-owner-mobile-shell-controller.ts`
- `owner-mobile-shell-model.ts`
- `owner-mobile-shell-types.ts`

Resultado:

- queries separadas da composicao visual
- mutacoes separadas da tela
- controller dedicado
- PDV movel isolado do shell
- navegacao inferior e header isolados do fluxo operacional

### 3. Hoje

Rodada atual da sessao.

O `OwnerTodayView` foi quebrado em:

- `owner-today-view.tsx`
- `owner-today-view-model.ts`
- `owner-today-view-sections.tsx`
- `owner-today-view-radar.tsx`

Resultado:

- prioridade do turno isolada em model puro
- hero, acoes, mapa rapido e radar separados
- ranking e top produtos tirados do componente principal
- superficie pronta para evoluir sem voltar ao arquivo monolitico

### 4. Comandas

Rodada atual de fechamento estrutural.

O `OwnerComandasView` foi quebrado em:

- `owner-comandas-view.tsx`
- `owner-comandas-view-model.ts`
- `owner-comandas-view-sections.tsx`
- `owner-comanda-card.tsx`
- `owner-comanda-card-sections.tsx`

Resultado:

- filtros e recorte por garcom sairam do arquivo principal
- leitura de status, hero e empty states ficaram isoladas
- card de comanda foi separado da composicao de totais/itens
- extrato detalhado e fechamento continuaram cobertos por teste focado
- superficie pronta para evoluir sem reabrir um arquivo unico grande

### 5. Financeiro

Rodada atual de fechamento estrutural.

O `OwnerFinanceView` foi quebrado em:

- `owner-finance-view.tsx`
- `owner-finance-view-model.ts`
- `owner-finance-view-sections.tsx`

Resultado:

- prioridade financeira virou model puro
- banner de erro/offline ficou isolado do restante da view
- hero e acoes sairam do arquivo principal
- teste focado e `typecheck` seguiram verdes

### 6. Conta

Rodada atual de fechamento estrutural.

O `OwnerAccountView` foi quebrado em:

- `owner-account-view.tsx`
- `owner-account-view-model.ts`
- `owner-account-view-sections.tsx`

Resultado:

- perfil do proprietario saiu do bloco de grupos
- agrupamento de atalhos virou model puro por dominio
- `Sistema` e `Operação` agora compartilham a mesma linha de ação
- teste focado e `typecheck` seguiram verdes

### 7. PDV

Rodada atual de fechamento estrutural.

O `OwnerPdvTab` foi estabilizado em:

- `owner-mobile-pdv-tab.tsx`
- `owner-mobile-pdv-tab-model.ts`
- `owner-mobile-pdv-tab-sections.tsx`
- `owner-mobile-pdv-chrome.tsx`

Resultado:

- o orquestrador ficou separado de `overview` e `builder`
- métricas de salão/cozinha e contexto de `pendingAction` viraram model puro
- a integração com `MobileTableGrid`, `KitchenOrdersView` e `MobileOrderBuilder` ficou coberta por teste focado
- a superfície central do Owner PWA saiu da zona de refactor implícito

### 8. Backend do cadastro rapido

Rodada atual de fechamento de contrato/persistencia.

O dominio `Product` passou a persistir os metadados uteis vindos do lookup por EAN:

- `quantityLabel`
- `servingSize`
- `imageUrl`
- `catalogSource`

Arquivos de base desta rodada:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260421224500_add_product_catalog_metadata/migration.sql`
- `apps/api/src/modules/products/dto/create-product.dto.ts`
- `apps/api/src/modules/products/dto/update-product.dto.ts`
- `apps/api/src/modules/products/products.service.ts`
- `apps/api/src/modules/products/products.types.ts`
- `packages/types/src/contracts.ts`
- `apps/web/lib/api-products.ts`
- `apps/web/components/owner-mobile/owner-quick-register-model.ts`

Resultado:

- o lookup do EAN nao se perde mais ao persistir o produto
- o Owner PWA ficou alinhado com o backend real do catalogo
- a base ficou pronta para futuras leituras visuais do produto sem inventar estado no frontend

## Testes e gates executados na rodada

### Testes focados

Executados com sucesso:

```bash
npm --workspace @partner/web run test -- components/owner-mobile/owner-quick-register-view.test.tsx
npm --workspace @partner/web run test -- components/owner-mobile/owner-mobile-shell.test.tsx
npm --workspace @partner/web run test -- components/owner-mobile/owner-today-view.test.tsx
npm --workspace @partner/web run test -- components/owner-mobile/owner-comandas-view.test.tsx
npm --workspace @partner/web run test -- components/owner-mobile/owner-finance-view.test.tsx
npm --workspace @partner/web run test -- components/owner-mobile/owner-account-view.test.tsx
npm --workspace @partner/web run test -- components/owner-mobile/owner-mobile-pdv-tab.test.tsx
npm --workspace @partner/api run test -- test/products.service.spec.ts
npm --workspace @partner/web run test -- components/owner-mobile/owner-quick-register-view.test.tsx lib/api.test.ts
```

### Typecheck

Executado com sucesso:

```bash
npm run typecheck
npm run verify:current-phase
```

### Lint focado

Executado com `--max-warnings 0` nos arquivos tocados antes de cada commit/refechamento.

## Boundary atual do Owner PWA

### Fechado estruturalmente

1. Shell Owner
2. Cadastro rapido
3. Hoje
4. Comandas
5. Financeiro
6. Conta
7. PDV

### Ja modelado, mas ainda pede lapidacao semelhante

1. passada final de integração do Owner PWA

## Regra de continuidade

Para as proximas superficies do Owner PWA:

1. nao crescer arquivo principal acima do necessario
2. mover logica derivada para `*-model.ts` ou hooks dedicados
3. manter testes focados por superficie
4. rodar `typecheck` no fechamento de cada bloco
5. documentar o bloco fechado antes de seguir para o proximo

## Proxima fila recomendada

1. passada final de integração do Owner PWA
2. congelamento do bloco antes da virada para backend
