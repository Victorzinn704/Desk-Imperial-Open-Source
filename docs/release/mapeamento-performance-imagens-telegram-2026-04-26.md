# Mapeamento — Performance, Imagens e Telegram

Data: 2026-04-26
Status: ativo

## Objetivo

Mapear o estado real do Desk Imperial em tres frentes que hoje impactam produto e release:

1. performance e realtime/PWA
2. pipeline de imagens de catalogo, com foco em bebidas
3. encaixe minimo e seguro de Telegram

Este documento existe para reduzir trabalho difuso. Ele nao substitui os docs de arquitetura; ele consolida o que precisa virar execucao.

## Leitura executiva

- O projeto nao esta estruturalmente quebrado.
- O backend operacional principal esta bem montado, com Redis, cache, Socket.IO por workspace e observabilidade documentada.
- A principal divida estrutural hoje nao e stack. E concentracao de responsabilidade em alguns arquivos e coexistencia de varias superficies ao mesmo tempo.
- A principal divida de experiencia hoje esta em:
  - shells moveis e fluxo de operacao
  - imagem inconsistente de produtos embalados
  - falta de uma fronteira explicita para notificacoes externas como Telegram

## Estado atual do projeto

### Monorepo e superficie oficial

O mapa arquitetural atual esta coerente com um monorepo de duas apps e dois pacotes compartilhados:

- `apps/api` = NestJS + Prisma + Redis + Socket.IO
- `apps/web` = Next.js App Router + TanStack Query + realtime client
- `packages/types` = contratos Zod-first
- `packages/api-contract` = OpenAPI gerado

Referencias:

- `docs/architecture/system-map.md`
- `docs/architecture/multi-surface-platform-strategy.md`

### O que esta maduro

- backend com contratos compartilhados e rota publica em `/api/v1`
- realtime autenticado por workspace
- cache e invalidador por dominio
- PWA owner e staff ja existem como superficies reais
- base Oracle e observabilidade ja documentadas e parcialmente instrumentadas

## Frente 1 — Performance e realtime/PWA

### Estado atual

O runtime de realtime do frontend nao esta mais no nivel de hotspot antigo citado em docs velhos, mas continua sendo um ponto de acoplamento importante:

- `apps/web/components/operations/use-operations-realtime.ts`
- `apps/web/lib/operations/operations-realtime-patching.ts`

Hoje o hook faz:

- debounce operacional `200ms`
- debounce comercial `500ms`
- debounce de summary `1500ms`
- patch local do cache
- fallback para invalidacao de queries quando o patch nao fecha

Referencias:

- `apps/web/components/operations/use-operations-realtime.ts:22`
- `apps/web/components/operations/use-operations-realtime.ts:48`
- `apps/web/components/operations/use-operations-realtime.ts:99`
- `apps/web/lib/operations/operations-realtime-patching.ts`

O owner mobile ja esta melhor isolado do que antes porque o carregamento esta condicionado por aba:

- `products` carrega so quando PDV ou acao pendente
- `orders` e `summary` carregam em `today`
- `finance` carrega so em `financeiro`
- `kitchen` carrega so quando PDV esta em `cozinha`

Referencia:

- `apps/web/components/owner-mobile/use-owner-mobile-shell-queries.ts:23`
- `apps/web/components/owner-mobile/use-owner-mobile-shell-queries.ts:99`

O staff mobile segue a mesma linha, mas ainda concentra muita responsabilidade em um shell muito grande:

- `apps/web/components/staff-mobile/staff-mobile-shell.tsx:165`
- `apps/web/components/staff-mobile/staff-mobile-shell.tsx:243`

No backend, a borda operacional esta funcional, mas a comanda continua superconcentrada:

- `apps/api/src/modules/operations/comanda.service.ts:74`
- `apps/api/src/modules/operations/comanda.service.ts:253`
- `apps/api/src/modules/operations/comanda.service.ts:433`
- `apps/api/src/modules/operations/comanda.service.ts:555`
- `apps/api/src/modules/operations/comanda.service.ts:698`
- `apps/api/src/modules/operations/comanda.service.ts:930`
- `apps/api/src/modules/operations/comanda.service.ts:1014`
- `apps/api/src/modules/operations/comanda.service.ts:1214`

### Dividas reais desta frente

#### P1 — concentracao de dominio operacional em poucos arquivos

Hotspots atuais:

- `apps/api/src/modules/operations/comanda.service.ts` ~1207 linhas
- `apps/api/src/modules/operations/operations-helpers.service.ts` ~661 linhas
- `apps/api/src/modules/orders/orders.service.ts` ~579 linhas
- `apps/api/src/modules/finance/finance.service.ts` ~559 linhas
- `apps/api/src/modules/products/products.service.ts` ~520 linhas

Impacto:

- manutencao cara
- maior risco de regressao em fluxos de comanda
- tempo de leitura alto para qualquer melhoria de PWA

#### P1 — shells e environments grandes demais no frontend

Hotspots atuais:

- `apps/web/components/dashboard/environments/pedidos-environment.tsx` ~1449 linhas
- `apps/web/components/dashboard/environments/overview-environment.tsx` ~1200 linhas
- `apps/web/components/dashboard/environments/portfolio-environment.tsx` ~1166 linhas
- `apps/web/components/dashboard/salao-environment.tsx` ~1003 linhas
- `apps/web/components/staff-mobile/staff-mobile-shell.tsx` ~953 linhas
- `apps/web/lib/operations/operations-realtime-patching.ts` ~946 linhas

Impacto:

- reuso ruim
- patches mais lentos
- bugs de superficie mais caros de fechar

#### P2 — convivio de multiplas superficies aumenta custo cognitivo

O repo hoje convive com:

- desktop legado `/dashboard`
- `design-lab`
- owner PWA
- staff PWA
- rotas alias (`/ai`, `/cozinha`, `/financeiro`, etc.)

Isso nao e fatal, mas aumenta custo de navegacao e de manutencao.

Referencias:

- `docs/architecture/multi-surface-platform-strategy.md`
- `apps/web/app/dashboard/*`
- `apps/web/app/design-lab/*`
- `apps/web/app/app/owner/*`
- `apps/web/app/app/staff/*`

### Conclusao da frente 1

Sim, da para deixar mais rapido sem quebrar o projeto.

O caminho seguro e:

1. reduzir acoplamento dos hotspots grandes
2. continuar movendo carregamento por aba/fluxo
3. evitar invalidacao ampla quando patch local ja resolve
4. separar melhor dominio de comanda, pagamento e cozinha no backend

Nao ha indicio aqui de que seja necessario reescrever stack.

## Frente 2 — Imagens de catalogo e bebidas

### Como o pipeline funciona hoje

Hoje uma thumb de produto pode nascer de quatro fontes principais:

1. `imageUrl` do proprio produto
2. fallback de combo
3. foto curada de bebida
4. packshot nacional SVG local

Referencia:

- `apps/web/lib/product-visuals.ts:40`

Para bebida curada de verdade, o sistema hoje cobre:

- Budweiser
- Corona
- Heineken
- Stella Artois
- Skol
- Spaten

Referencia:

- `apps/web/lib/product-visuals.ts:91`

Para bebida nacional empacotada com packshot local, o sistema cobre:

- Brahma
- Antarctica
- Heineken
- Budweiser
- Bohemia
- Stella Artois
- Spaten
- Corona
- Skol
- Coca-Cola
- Guarana Antarctica
- Fanta
- Sprite
- Pepsi
- Guaravita
- Agua Mineral

Referencia:

- `apps/web/lib/brazilian-packaged-beverage-catalog.ts:43`
- `apps/web/lib/brazilian-packaged-beverage-catalog.ts:50`
- `apps/web/lib/brazilian-packaged-beverage-catalog.ts:71`
- `apps/web/lib/brazilian-packaged-beverage-catalog.ts:148`
- `apps/web/lib/brazilian-packaged-beverage-catalog.ts:192`

Tambem ja existe:

- busca de imagem no Pexels para catalogo
- rota web para consulta
- script de backfill em lote

Referencias:

- `apps/web/lib/pexels.ts`
- `apps/web/app/api/media/pexels/search/route.ts`
- `apps/api/scripts/backfill-product-images-pexels.mjs`

### Auditoria objetiva de bebidas

#### Ja estao em foto curada

- Budweiser
- Corona
- Heineken
- Stella Artois
- Skol
- Spaten

#### Ainda estao em packshot/arte local

- Brahma
- Bohemia
- Antarctica
- Coca-Cola
- Agua Mineral
- Guarana Antarctica

#### Leitura pratica

- a queixa sobre `coca cola` e `agua` procede
- `antarctica` tem mapeamento no codigo, mas ainda cai em packshot local
- isso explica o contraste entre algumas cervejas melhores e outras bebidas ainda artificiais

### Dividas reais desta frente

#### P1 — pipeline visual fragmentado demais

Hoje catalogo visual mistura:

- Open Food Facts
- `imageUrl` manual
- Pexels
- packshot SVG local
- fallback de combo

Impacto:

- inconsistencia visual
- auditoria manual mais lenta
- risco de produto importante continuar com imagem inferior

#### P1 — bebidas importantes ainda sem upgrade visual real

Prioridade comercial imediata:

1. Antarctica
2. Coca-Cola
3. Agua
4. Guarana Antarctica
5. Brahma e Bohemia, se quiser uniformidade total de embalagem real

### Conclusao da frente 2

O pipeline existe, mas ainda falta curadoria final por marca. Aqui a divida e de consistencia e percepcao de produto, nao de ausencia total de infraestrutura.

## Frente 3 — Telegram

### Estado atual

Nao existe implementacao de Telegram no runtime atual.

Nao foi encontrado modulo, rota, worker ou adapter Telegram em:

- `apps/api/src`
- `apps/web`
- `infra`
- `packages`

O que existe hoje e a base certa para suportar isso:

- eventos de auditoria
- eventos operacionais
- health e observabilidade
- Redis
- hardening de auth

Referencias de base:

- `apps/api/src/modules/monitoring/audit-log.service.ts`
- `apps/api/src/modules/operations-realtime/operations-realtime.service.ts`
- `apps/api/src/common/services/cache.service.ts`

### O que faz sentido agora

Telegram entra bem agora se for:

- outbound first
- owner-first
- assinado por workspace
- orientado a evento
- com poucos comandos

Escopo minimo recomendado:

1. vincular `workspace/user -> chat_id`
2. enviar resumo diario
3. enviar estoque baixo
4. enviar fechamento de caixa
5. permitir comandos minimos:
   - `/vendas_hoje`
   - `/fechar_caixa`
   - `/pausar_alertas`

### O que nao faz sentido agora

Nao iniciar por:

- chatbot geral
- LangChain/RAG
- fluxo conversacional profundo
- logica de negocio dentro do bot

Motivo:

- amplia superficie de erro
- mistura lapidacao operacional com automacao de comunicacao
- aumenta risco sem resolver gargalo primario do produto

### Dividas reais desta frente

#### P2 — notificacao externa ainda sem boundary formal

Hoje nao existe modulo claro de `notifications` ou `integrations/outbound`.

Impacto:

- se o Telegram nascer direto em `auth`, `operations` ou `finance`, vira acoplamento ruim

#### P2 — falta fila/worker dedicado para integracoes externas

Ja existe Redis, mas ainda nao existe um trilho visivel de jobs/outbound notifications no runtime.

Impacto:

- retry, backoff e entrega idempotente ficam mais dificeis de governar

### Conclusao da frente 3

Telegram pode entrar agora, mas so na forma enxuta e assíncrona. O sistema ja tem base suficiente para isso, desde que o bot nasca como adaptador e nao como novo centro de regra.

## Divida estrutural atual — resposta curta

Sim. Hoje existe divida estrutural, mas ela esta em nivel controlavel.

### O que e estrutural de verdade

- concentracao de logica operacional em poucos arquivos gigantes
- convivio de multiplas superficies aumentando custo cognitivo
- pipeline de imagem com muitas fontes concorrentes
- ausencia de boundary formal para integracoes outbound como Telegram

### O que nao e estrutural

- usar Next + Nest + Prisma + Redis
- usar PWA e desktop juntos
- manter Oracle + Postgres self-hosted

Essas partes sao plausiveis. O problema nao esta na pilha; esta no crescimento lateral do produto.

## Veredito

O Desk Imperial hoje nao precisa de reescrita. Precisa de consolidacao.

Prioridade correta:

1. modularizar hotspots grandes sem reabrir a arquitetura inteira
2. fechar a curadoria visual das bebidas importantes
3. criar o boundary de notificacoes externas antes de ligar Telegram
4. seguir com ganho de performance por superficie, nao por rework total

Se essas tres frentes forem fechadas nessa ordem, a base fica mais rapida, mais previsivel e muito mais segura para crescer.
