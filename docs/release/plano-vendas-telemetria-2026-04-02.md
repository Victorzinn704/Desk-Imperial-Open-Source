# Plano de Ataque — Gargalo de Vendas + Telemetria OSS

Data: 2026-04-02  
Objetivo: reduzir o custo dos fluxos de vendas sem “chutar” otimização, usando telemetria útil para decidir o que cortar e o que preservar.

---

## 1. Diagnóstico real

### V-1 — O gargalo de vendas hoje é composto, não único

**O que o código mostra**

- o dashboard executivo depende de `GET /finance/summary` em `apps/web/components/dashboard/hooks/useDashboardQueries.ts`
- esse endpoint cruza inventário, timeline, canais, clientes, equipe e geografia em um único payload em `apps/api/src/modules/finance/finance.service.ts`
- o overview ainda renderiza vários blocos pesados a partir dessa única resposta em `apps/web/components/dashboard/environments/overview-environment.tsx`
- o snapshot operacional de salão ainda é relevante para percepção de fluidez em `apps/api/src/modules/operations/operations-helpers.service.ts`

**Impacto de produto**

- o usuário sente “vendas lentas” de duas formas diferentes:
  - demora no shell/overview financeiro
  - demora no snapshot operacional do salão/PDV

**Conclusão**

- não é hora de sair metendo `memo` ou `lazy` aleatoriamente
- primeiro precisamos medir:
  - tempo de `finance/summary`
  - tempo de `operations/live`
  - taxa de cache hit
  - tamanho/forma do payload retornado

---

## 2. O que já atacamos agora

### Fase 0 — Instrumentação de backend para enxergar o gargalo

**Implementado**

- métricas OTel para resumo financeiro em `apps/api/src/common/observability/business-telemetry.util.ts`
- métricas OTel para snapshot `operations/live` em `apps/api/src/common/observability/business-telemetry.util.ts`
- métricas OTel para `operations/kitchen` em `apps/api/src/common/observability/business-telemetry.util.ts`
- enriquecimento do span ativo HTTP com atributos de cache e shape do payload em:
  - `apps/api/src/modules/finance/finance.service.ts`
  - `apps/api/src/modules/operations/operations-helpers.service.ts`

**Por que isso é importante**

- antes: a gente sabia que estava lento
- agora: o backend passa a expor quais caminhos estão lentos, com quantos produtos/regiões/comandas/mesas vieram no payload e se a resposta veio de cache ou não

---

### Fase 0.5 — Corte de peso no caminho quente de operação

**Implementado**

- `GET /operations/live` agora aceita `includeClosed=false` no backend em:
  - `apps/api/src/modules/operations/dto/get-operations-live.query.ts`
  - `apps/api/src/modules/operations/operations.service.ts`
  - `apps/api/src/modules/operations/operations-helpers.service.ts`
  - `apps/api/src/common/services/cache.service.ts`
- o snapshot quente para operação deixou de arrastar comandas fechadas em telas que não precisam de histórico:
  - staff mobile só inclui fechadas na aba `Histórico`
  - owner mobile só inclui fechadas na aba `Comandas`
  - salão desktop operacional usa `compactMode=true + includeClosed=false`
- o shell desktop parou de abrir socket globalmente em qualquer seção; realtime agora fica restrito aos ambientes realmente vivos (`pdv` e `salao`) em `apps/web/components/dashboard/dashboard-shell.tsx`
- o mobile parou de sofrer com socket duplicado herdado do shell pai; o ganho aqui é menos ruído, menos invalidação cruzada e menos reconexão desnecessária
- o `PdvBoard` desktop foi alinhado ao cache real que ele consome, evitando otimistas “mudos” por chave errada em `apps/web/components/pdv/pdv-board.tsx`
- o salão operacional trocou busca `find` por mapa local de comandas em `apps/web/components/dashboard/salao-environment.tsx`

**Impacto esperado**

- menos payload no hot path de operação
- menos trabalho do cliente para montar mesas/comandas ao vivo
- menos refetch/reconnect desnecessário
- menor chance de estado stale entre variantes de snapshot

**Validação**

- API: `688/688` testes verdes
- Web: `34/34` testes verdes
- build web ok

---

### Fase 0.6 — Pente fino pré-deploy do PDV e do shell

**O que verificamos de forma honesta**

- a passada anterior **não foi maquiagem**:
  - o shell desktop realmente parou de manter socket fora de `pdv` e `salao`
  - o mobile realmente parou de carregar comandas fechadas nas abas quentes
- mas ainda existiam dois desperdícios concretos:
  - `PdvEnvironment` mantinha um snapshot operacional amplo para alimentar o board, mesmo depois de o board ganhar query própria por aba
  - vários ambientes do dashboard chamavam `useDashboardQueries()` sem recorte, puxando `finance`, `employees`, `orders` e `consent` sem necessidade em telas quentes

**Implementado**

- o `PdvEnvironment` parou de disputar a mesma query quente do board:
  - o board agora fica dono do snapshot operacional quente por aba
  - a leitura executiva (`CaixaPanel` + grid + timeline) fica em uma query separada, só para `OWNER`
- `useDashboardQueries()` agora aceita escopo por ambiente em `apps/web/components/dashboard/hooks/useDashboardQueries.ts`
- os ambientes passaram a pedir só o que realmente usam:
  - `settings` → sessão + consentimento
  - `pdv` → sessão + produtos
  - `portfolio` → financeiro + produtos
  - `map` → financeiro + pedidos
  - `sales` → produtos e equipe quando necessário
- o `DashboardShell` deixou de puxar o bloco financeiro pesado em seções quentes do owner (`pdv`, `salao`, `settings`)
- o header do shell agora usa sinais operacionais leves nessas áreas quentes, preservando contexto sem forçar `finance/summary`

**Refino do PDV mobile**

- o builder mobile deixou de mostrar categorias e lista de produtos brigando pelo mesmo espaço
- agora o fluxo ficou em duas etapas:
  - primeiro escolhe a categoria
  - depois a tela vira uma lista focada só nos itens daquela classe
- isso reduz ruído visual, melhora toque/escaneabilidade e aproxima o comportamento da sensação de “app nativo”

**Validação**

- lint web ok
- typecheck web ok
- build web ok
- testes web: `35/35` verdes

**Leitura sênior**

- esse pente fino confirmou que parte do ganho anterior era real
- também mostrou que o maior risco de “maquiagem” estava no excesso de queries implícitas do dashboard, e esse ponto agora ficou bem mais controlado

---

### Fase 0.7 — Corte cirúrgico em `products`, `consent` e `finance/summary`

**O que o runtime mostrou**

- o hot path do owner ainda carregava `consent/me` fora do ambiente de conta
- o shell mobile ainda puxava `products` antes mesmo de abrir a aba de pedido
- o `overview` continuava buscando `products` só para contar itens ativos
- `finance/summary` ainda carregava e metabolizava produto demais para gerar métricas de inventário

**Implementado**

- `consent/me` agora ficou restrito ao ambiente de configurações:
  - o shell parou de prefetchar consentimento em `pdv`, `salao`, `overview` e afins
  - os sinais de governança fora de `settings` passaram a ser sob demanda
- a trilha de consentimento ganhou cache Redis por:
  - documentos ativos por versão
  - overview por usuário + versão
- a atualização de preferências/aceites invalida o cache do overview imediatamente
- `products` deixou de nascer como `includeInactive=true` por padrão no web:
  - `portfolio` continua pedindo o catálogo completo
  - fluxos quentes e operacionais passam a pedir só ativos
- `staff mobile` e `owner mobile` só buscam produtos quando a aba `pedido` realmente abre
- `owner mobile` só busca `orders` e `operations/summary` quando a aba `resumo` realmente abre
- `overview` parou de buscar `products` só para exibir a métrica de portfólio; agora usa `finance.totals.activeProducts`
- `finance/summary` trocou o caminho de produto full por uma trilha mínima focada em analytics:
  - select menor no Prisma
  - transformação local mais leve
  - menos payload e menos trabalho de CPU para categorias/top products/totais

**Impacto esperado**

- remoção do custo de `consent/me` do hot path do owner
- cold start mais limpo no mobile, especialmente em `mesas`
- menos payload e menos cache churn na rota de produtos
- redução do custo frio de `finance/summary` sem quebrar o contrato da resposta

**Validação**

- API: `690/690` testes verdes
- Web: `35/35` testes verdes
- lint, typecheck e build de API e web verdes
- deploy em produção:
  - API `f01a4825-14c7-4640-a81b-dfd85cfd1b5d`
  - Web `5d63b7bd-2369-4b3c-862a-fcebbe69ebd9`
- evidência pós-deploy via logs HTTP do Railway:
  - `GET /api/consent/me` caiu para ~`296–302ms` em chamadas quentes autenticadas
  - `GET /api/products` estabilizou em ~`445–451ms` nas chamadas quentes
  - `GET /api/finance/summary` ficou em ~`444ms` quente e ~`2315ms` frio
- evidência via navegador:
  - `dashboard?view=pdv` não puxou `consent/me` nem `finance/summary`
  - `app/owner` no estado inicial não puxou `products`, `orders` nem `operations/summary`
  - `dashboard?view=settings` continuou puxando `consent/me`, como esperado

**Leitura sênior**

- esse ataque foi de substância, não cosmético
- ele removeu chamadas que não agregavam valor nas rotas quentes e diminuiu o custo estrutural de duas rotas que ainda apareciam como vilãs na produção
- o próximo deploy vai nos mostrar o ganho real em `consent`, `products` e no cold path do `finance`

---

### Fase 0.8 — `finance/summary` com refresh-ahead seguro

**Problema real**

- o `finance/summary` já estava rápido quando quente, mas a cada expiração do Redis o próximo request voltava a pagar o custo frio inteiro
- isso gerava uma sensação de “engasgo periódico” no dashboard executivo, mesmo depois da redução de payload

**Implementado**

- o cache do `finance/summary` agora usa janela dupla:
  - **janela fresca** de `120s`
  - **janela stale servível** de `300s`
- em cache hit antigo o serviço:
  - devolve a resposta imediatamente
  - dispara um refresh assíncrono com proteção `warmInFlight`
- a telemetria agora diferencia cache `fresh` vs `stale` por atributo, sem quebrar o contrato da rota

**Por que isso é seguro**

- o shape da resposta não muda
- a invalidação explícita continua funcionando nos pontos que já limpam `finance:summary`
- evitamos “thundering herd” porque só um warm por chave roda ao mesmo tempo
- o dashboard continua consistente, só que com muito menos chance de cair em request frio depois de períodos curtos de ociosidade

**Validação local**

- `npm --workspace @partner/api run typecheck` ✅
- `npm --workspace @partner/api run test -- finance.service.spec.ts` ✅ `28/28`
- `npm --workspace @partner/api run test` ✅ `690/690`

**Leitura sênior**

- isso não é “mágica de framework”; é uma política de cache madura para endpoint caro
- o próximo passo é medir em produção quantos hits passam a sair como `stale -> warm` e quanto isso derruba o frio percebido do owner

---

### Fase 0.9 — prewarm em background após mutações críticas

**Problema real**

- mesmo com `stale-while-revalidate`, qualquer mutação forte de catálogo ou venda invalidava o cache e deixava o próximo acesso do owner pagar reconstrução completa
- isso afetava justamente os momentos mais sensíveis: criação/edição de produto, criação/cancelamento de pedido e fechamento de comanda

**Implementado**

- o `FinanceService` agora expõe:
  - `warmSummaryForWorkspace(workspaceUserId)`
  - `invalidateAndWarmSummary(workspaceUserId)`
- `products`, `orders` e `comandas` passaram a usar esse fluxo em background após invalidar o resumo financeiro
- o prewarm resolve a moeda preferida do owner antes de aquecer, evitando poluir o cache com preferência de `STAFF`

**Por que isso é seguro**

- o request que muta catálogo/venda não passa a depender do custo do `finance/summary`
- o aquecimento continua `fire-and-forget`, protegido por `warmInFlight`
- se o workspace não existir ou o prewarm falhar, a mutação principal continua íntegra e o sistema só volta ao comportamento anterior

**Validação local**

- `npm --workspace @partner/api run typecheck` ✅
- `npm --workspace @partner/api run lint` ✅
- `npm --workspace @partner/api run test -- products.service.spec.ts orders.service.spec.ts comanda.service.branches.spec.ts finance.service.spec.ts` ✅ `123/123`
- `npm --workspace @partner/api run test` ✅ `690/690`

**Leitura sênior**

- agora o `finance` tem duas proteções complementares:
  - **refresh-ahead em leitura**
  - **prewarm em escrita**
- esse é o melhor custo-benefício neste estágio, antes de partir para agregados materializados ou jobs dedicados

---

### Fase 0.10 — prova de produção para `fresh → stale → cold`

**Objetivo**

- confirmar em produção se o comportamento novo do `finance/summary` é real ou só “parece rápido” por cache oportunista

**Implementado**

- criamos um probe reutilizável em `scripts/probe-finance-cache.mjs`
- o comando oficial ficou em `package.json`:
  - `npm run perf:probe:finance-cache`
- o probe:
  - autentica
  - mede `baseline`
  - mede repetição quente
  - espera a janela pós-`fresh`
  - mede leitura após refresh em background
  - espera expirar a janela `stale`
  - mede o comportamento pós-expiração
- o relatório bruto da rodada atual ficou em `docs/release/finance-cache-probe-2026-04-03.json`

**Como rodamos**

- produção real em `https://api.deskimperial.online/api`
- login demo com `OWNER`
- `User-Agent` técnico dedicado para não reutilizar o fingerprint já esgotado do navegador local
- esperas reais:
  - `125s` para passar a janela `fresh`
  - `5s` para observar o refresh em background
  - `305s` para atravessar a janela `stale`

**Resultados**

- `baseline`: `686ms`
- `warm-repeat`: `659ms`
- `after-fresh-window`: `904ms`
- `post-background-refresh`: `871ms`
- `after-stale-expiry`: `5559ms`

**Leitura do resultado**

- o request continuou rápido depois de `125s`, então o caminho `fresh/stale-while-revalidate` está funcionando de verdade
- a leitura `5s` depois permaneceu quente, reforçando que o refresh em background não está travando o caller
- quando deixamos passar `305s`, a rota voltou para `~5.6s`, o que mostra que o custo frio **ainda existe** quando a janela stale acaba

**Conclusão sênior**

- a melhoria é **real**, não cosmética
- o refresh-ahead derruba o engasgo periódico de curta duração
- o problema remanescente agora ficou bem delimitado:
  - quando o cache expira de verdade, o rebuild ainda é caro
- então a próxima decisão madura não é “mais cache genérico”, e sim:
  1. levar essa métrica para Alloy/Prometheus/Grafana
  2. decidir com número na mão se vale:
     - quebrar `finance/summary` em slices
     - pré-computar partes do resumo
     - ou manter a rota única e só endurecer a política de aquecimento

**Caveat**

- essa rodada usa o workspace demo compartilhado, então tráfego externo ainda pode influenciar baseline/temperatura do cache
- apesar disso, o salto de `~0.9s` para `~5.6s` após a janela stale é forte o bastante para servir como evidência operacional

---

## 3. Próximos ataques em ordem madura

### Fase 1 — Medição real no stack OSS

### Fase 1.1 — trilha local validada de ponta a ponta

**O que estava quebrando de verdade**

- a API local nao estava “morrendo sem motivo”; ela estava subindo com `.env` apontando para a Neon, o que mascarava o bootstrap local e deixava a experiencia parecendo aleatoria
- mesmo quando a API subia, as metricas de negocio nao apareciam no Prometheus porque o OpenTelemetry era inicializado tarde demais, depois do carregamento do app

**O que corrigimos**

- criamos um banco dedicado de observabilidade local: `partner_portal_observability`
- adicionamos `scripts/prepare-local-observability-db.mjs` para provisionar banco/role de forma idempotente
- centralizamos as variaveis em `scripts/with-local-observability-env.mjs`
- a API passou a carregar env antes e inicializar OTel antes de importar o `AppModule`
- o smoke local ficou alinhado ao contrato real do snapshot operacional

**Comandos oficiais**

- `npm run obs:up`
- `npm run obs:api:prepare`
- `npm run obs:api:build`
- `npm run obs:api:start`
- `npm run obs:smoke:local`

**Evidencia validada**

- a API local sobe em `http://localhost:4000/api/health`
- o Prometheus passa a listar:
  - `desk_finance_summary_duration_milliseconds_*`
  - `desk_operations_live_duration_milliseconds_*`
  - `desk_operations_kitchen_duration_milliseconds_*`
- os labels uteis ja aparecem nas series:
  - `desk_finance_cache_hit`
  - `desk_finance_cache_state`
  - `desk_operations_cache_hit`
  - `desk_operations_compact_mode`

**Leitura sênior**

- agora a trilha `API -> Alloy -> Prometheus -> Grafana` saiu do estado “infra de laboratorio” e virou validacao reproduzivel
- isso nos da base segura para o proximo passo: dashboards e alertas mais precisos sem adivinhar comportamento

**Objetivo**

- levar essas métricas para Alloy → Prometheus → Grafana

**Checklist**

- confirmar export OTLP da API para Alloy
- validar que as métricas novas aparecem no collector
- criar um dashboard técnico mínimo com:
  - `desk.finance.summary.duration`
  - `desk.finance.summary.active_products`
  - `desk.finance.summary.sales_map_regions`
  - `desk.operations.live.duration`
  - `desk.operations.live.comandas`
  - `desk.operations.live.mesas`

**Critério de aceite**

- conseguimos responder com dados:
  - o que pesa mais, `finance/summary` ou `operations/live`
  - quanto do custo vem de cache miss
  - qual shape de payload piora mais o tempo

**Pré-condição prática**

- o gargalo já precisa chegar instrumentado e com recortes de payload reais, senão o dashboard só “desenha o problema” sem ajudar a resolver
- com o `includeClosed=false` e o scoping de realtime já no código, a leitura em Grafana passa a refletir um caminho quente mais honesto

**Ataque inicial já entregue**

- dashboard novo provisionado em `infra/docker/observability/grafana/dashboards/business-performance.json`
- foco do dashboard:
  - `finance p95 (fresh)`
  - `finance p95 (cache miss)`
  - `operations/live p95`
  - `kitchen p95`
  - shape médio de `finance/summary`
  - shape médio de `operations/live`
- alertas reais adicionados em `infra/docker/observability/prometheus/alert.rules.yml`:
  - `FinanceSummaryCacheMissSlowP95`
  - `OperationsLiveSlowP95`
- validação prática local:
  - Grafana provisionou o dashboard `Business Performance`
  - Prometheus carregou as regras com `health=ok`
  - stack local subiu com `alloy`, `prometheus`, `tempo`, `loki`, `alertmanager`, `grafana` e `blackbox`
  - fluxo local repetível documentado com:
    - `npm run obs:api:build`
    - `npm run obs:api:start`
    - `npm run obs:smoke:local`

**Leitura sênior**

- essa fase saiu do papel: agora o stack já responde perguntas de produto, não só de infra
- o próximo ganho vem de ligar a API local/staging ao OTLP e verificar o nome/volume real das séries em produção controlada

### Fase 2 — Separação cirúrgica do domínio de vendas

**Objetivo**

- parar de usar um único endpoint grande para tudo no overview

**Ataque técnico**

- separar `finance/summary` em camadas quando a métrica confirmar necessidade:
  - `finance/executive-summary`
  - `finance/sales-map`
  - `finance/top-rankings`
  - `finance/inventory-overview`

**Por que não fazer isso no escuro**

- se a latência maior vier de produto/inventário, quebrar mapa não resolve
- se a latência maior vier de geografia/top regions, mexer em inventário não resolve

### Fase 3 — Alertas e governança de performance

**Objetivo**

- transformar lentidão em sinal operacional, não em achismo

**Alertas que valem a pena**

- `finance/summary` acima do budget por 5 min
- `operations/live` acima do budget por 5 min
- queda de cache hit
- aumento brusco de comandas/mesas no payload com tempo degradando

---

## 4. O que não vamos fazer agora

- não vamos reescrever o dashboard inteiro
- não vamos inventar particionamento de estado sem medição
- não vamos usar Faro como se fosse issue tracking
- não vamos misturar telemetria de produto com trilha de auditoria

---

## 5. Hardening OSS / Grafana em paralelo

### O-1 — Fechar recepção do browser

**Gap real**

- o frontend já tem Faro no código, mas o caminho oficial de ingestão ainda não está fechado no stack local

**Decisão**

- primeiro fechar API/backend metrics + dashboards de gargalo
- depois fechar browser collector com desenho oficial

### O-2 — Alertmanager com destino real

**Gap real**

- a stack sobe, mas alerta sem destino não governa nada

**Decisão**

- ligar ao menos um canal real:
  - Slack
  - webhook
  - email técnico

### O-3 — Dashboards de produto antes de dashboards “bonitos”

**Painéis que importam**

- login/auth
- vendas/financeiro
- snapshot operacional
- kitchen
- collector/browser

---

## 6. Critério de sucesso

Consideramos essa frente madura quando:

- o badge do CI reflete `main` de forma confiável
- o pipeline fica mais simples de manter e menos repetitivo
- a divergência local/remota fica visível com script próprio
- `finance/summary` e `operations/live` ficam instrumentados com métricas úteis
- o stack OSS recebe essas métricas e mostra o gargalo real
- a próxima otimização acontece por evidência, não por sensação

---

## 7. Hardening operacional mobile/web — 2026-04-03

**Problemas reais atacados**

- mesas aparecendo livres para o staff enquanto já estavam ocupadas por outra equipe
- autoabertura de caixa disparando em qualquer `409`, inclusive em conflito de mesa
- abertura/fechamento de comanda demorando a refletir no estado da mesa
- fluxo mobile do PDV com categorias e lista de itens brigando pela mesma tela

**Correções aplicadas**

- `apps/api/src/modules/operations/operations-helpers.service.ts`
  - ocupação de mesa passou a vir de uma query mínima global de comandas abertas com `mesaId`, sem depender do recorte por funcionário
- `apps/web/lib/operations/operations-optimistic.ts`
  - otimista de comanda agora atualiza também `mesas.status`, `comandaId` e `currentEmployeeId`
- `apps/web/components/staff-mobile/staff-mobile-shell.tsx`
- `apps/web/components/owner-mobile/owner-mobile-shell.tsx`
  - retry automático de caixa ficou restrito a erros realmente relacionados a caixa
  - invalidação pós-mutation passou a usar o prefixo `['operations', 'live']` para autocura mais rápida do snapshot
- `apps/web/components/staff-mobile/mobile-order-builder.tsx`
  - o builder mobile virou fluxo em duas etapas: categoria primeiro, itens depois

**Validação**

- API: `689/689` testes verdes
- Web: `39/39` testes verdes
- `npm --workspace @partner/api run lint` ✅
- `npm --workspace @partner/api run typecheck` ✅
- `npm --workspace @partner/api run build` ✅
- `npm --workspace @partner/web run lint` ✅
- `npm --workspace @partner/web run typecheck` ✅
- `npm --workspace @partner/web run build` ✅

**Leitura**

- esse pacote reduz bug operacional real, não só latência percebida
- o próximo passo natural é medir em staging/produção o efeito no `operations/live` e no tempo de abertura de mesa/comanda antes de seguir para dashboards mais profundos no Grafana

---

## 8. Portfólio + combos + KPIs — 2026-04-03

**Problemas reais atacados**

- o portfólio ainda só permitia `editar + arquivar/restaurar`, sem saída definitiva para item aposentado
- o motor de venda não consumia componentes de combo; o cadastro existia, mas não impactava estoque/custo
- a leitura executiva do portfólio ainda estava muito presa em `und/caixa`, sem KPIs mais fortes de capital e retorno

**Correções aplicadas**

- `apps/api/src/modules/products/products.service.ts`
- `apps/api/src/modules/products/products.controller.ts`
  - exclusão definitiva entrou como fluxo explícito e seguro
  - regra de segurança: só exclui produto já arquivado
  - proteção extra: bloqueia exclusão se o item ainda compõe outro combo
- `apps/web/lib/api.ts`
- `apps/web/components/dashboard/hooks/useDashboardMutations.ts`
- `apps/web/components/dashboard/product-card.tsx`
- `apps/web/components/dashboard/environments/portfolio-environment.tsx`
  - card do portfólio passou a oferecer `Excluir` só no estado arquivado
  - confirmação local evita exclusão acidental
  - os KPIs do topo migraram de volume físico genérico para leitura de capital, venda potencial, lucro potencial e itens em alerta
  - a quebra por categoria agora fala mais de capital e margem do que só de unidades
- `apps/api/src/modules/products/product-combo-consumption.util.ts`
- `apps/api/src/modules/orders/orders.service.ts`
- `apps/api/src/modules/operations/operations-helpers.service.ts`
  - combos agora consomem componentes no pedido direto e no fechamento de comanda
  - custo de linha e custo total passaram a refletir a composição real do combo
  - cancelamento de venda direta repõe os componentes consumidos pelo combo

**Validação**

- testes cirúrgicos:
  - `npm --workspace @partner/api run test -- products.service.spec.ts orders.service.spec.ts operations-helpers.branches.spec.ts` ✅
  - `npm --workspace @partner/web run test -- components/dashboard/product-card.test.tsx` ✅
- suíte ampla:
  - API: `695/695` testes verdes
  - Web: `41/41` testes verdes
  - `npm --workspace @partner/api run lint` ✅
  - `npm --workspace @partner/api run typecheck` ✅
  - `npm --workspace @partner/api run build` ✅
  - `npm --workspace @partner/web run lint` ✅
  - `npm --workspace @partner/web run typecheck` ✅
  - `npm --workspace @partner/web run build` ✅

**Leitura**

- agora o bloco de portfólio deixa de ser só cadastro e passa a governar venda real
- a exclusão definitiva ficou madura o bastante para limpar lixo do catálogo sem desmontar histórico consolidado
- o próximo refinamento natural aqui é revisar a experiência de edição/arquivamento ao vivo no dashboard para garantir que a sensação de resposta ficou tão boa quanto a lógica

---

## 9. Entrada + operação comercial + pulso manual — 2026-04-03

**Problemas reais atacados**

- a entrada no app ainda sofria com transição seca e lenta entre login e dashboard
- o shell do dashboard carregava blocos demais por padrão, mesmo quando a seção ativa não precisava deles
- a seção `Operação` do sidebar ainda parecia um SaaS genérico e não o centro comercial do Desk Imperial
- o painel lateral de atividades estava monótono, com sensação de congelamento e pouca leitura humana
- o manifest seguia apontando para ícones inexistentes, gerando ruído silencioso no navegador

**Correções aplicadas**

- `apps/web/components/auth/login-form.tsx`
  - entrada agora faz prewarm assíncrono do caminho mais provável após autenticação
  - owner pré-aquece `auth/me + finance/summary`
  - staff pré-aquece `auth/me + products + orders/summary`
  - navegação pós-login passou para `router.replace('/dashboard')`, reduzindo sensação de salto e histórico desnecessário
- `apps/web/components/dashboard/hooks/useDashboardQueries.ts`
- `apps/web/components/dashboard/dashboard-shell.tsx`
- `apps/web/components/dashboard/environments/*.tsx`
  - queries do dashboard foram escopadas por seção ativa
  - `settings` não carrega mais blocos comerciais que não vai usar
  - `pdv` deixa de herdar peso executivo por padrão
  - `sales` recebe somente o que importa para vender e ler a operação
- `apps/web/components/dashboard/environments/sales-environment.tsx`
  - a seção `Operação` foi redesenhada como central comercial real
  - KPIs do topo passaram a falar de receita, lucro, ticket e ritmo da equipe
  - o painel de categorias/cores do dashboard inicial foi reaproveitado no eixo lateral para leitura de mix
  - a lista de pedidos recentes saiu do padrão “card repetido” e virou trilho manual mais denso e mais próximo do caixa
- `apps/web/components/dashboard/activity-timeline.tsx`
  - o painel virou um `Pulso do workspace`
  - atualização automática a cada `15s`
  - leitura mais manual e menos “timeline de template”
- `apps/web/public/manifest.json`
  - removidos ícones inexistentes para parar o ruído de `404` e avisos de PWA
- `apps/web/eslint.config.mjs`
  - ignorado `coverage/**` para evitar lint em artefato gerado, não em código do produto

**Validação**

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm test` ✅
  - API: `695/695`
  - Web: `88/88`
- `npm run build` ✅

**Leitura**

- não foi só maquiagem visual: o shell realmente deixou de pedir dados fora do contexto da seção ativa
- a seção `Operação` agora fica mais próxima do uso humano diário, com menos cara de componente genérico
- o próximo passo natural depois do deploy é medir no Railway se o ganho percebido da entrada confirma o prewarm e, se confirmar, atacar os pontos restantes de fricção no calendário e no bloco visual do salão

## 10. PWA sem manifest fantasma + calendários manuais — 2026-04-03

**Problemas reais atacados**

- o PWA continuava emitindo ruído silencioso por causa de manifest antigo e ícones inexistentes em clientes com cache anterior
- o service worker ainda podia segurar referência velha de manifest entre builds
- `react-big-calendar` continuava pesando e trazendo uma estética genérica demais para agenda comercial e timeline operacional
- o calendário comercial e a linha do tempo da operação estavam brigando com a identidade do produto em vez de reforçá-la

**Correções aplicadas**

- `apps/web/app/layout.tsx`
- `apps/web/app/app/layout.tsx`
- `apps/web/app/manifest.ts`
- `apps/web/public/manifest.json`
  - o app passou a anunciar `manifest.webmanifest` versionado (`?v=20260403`)
  - o manifest novo agora aponta apenas para ícones que existem no repositório
  - o fallback legado em `manifest.json` foi alinhado com a mesma verdade, para clientes antigos não continuarem pedindo assets fantasmas
- `apps/web/components/shared/sw-registrar.tsx`
- `apps/web/public/sw.js`
  - o registro do service worker agora força `registration.update()` após subir
  - o cache do SW foi rotacionado para `desk-imperial-v2-20260403`
  - `manifest.json` e `manifest.webmanifest` saíram do escopo de cache do SW para refletirem sempre o build atual
- `apps/web/components/calendar/commercial-calendar.tsx`
  - o calendário comercial deixou de depender de `react-big-calendar`
  - entrou uma agenda manual com visões `semana`, `mês` e `agenda`, cards editáveis e leitura mais humana do comercial
- `apps/web/components/operations/operations-timeline.tsx`
  - a timeline operacional também saiu da camada visual externa pesada
  - agora renderiza faixas manuais por recurso/mesa, com blocos absolutos leves e leitura de caixa/equipe mais próxima da operação real

**Validação**

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm test` ✅
  - API: `695/695`
  - Web: `88/88`
- `npm run build` ✅

**Leitura**

- esse lote ataca dois problemas diferentes, mas conectados: ruído silencioso de PWA e peso visual/mental de calendários genéricos
- a mudança de calendário é madura o bastante para teste em produção, mas ainda merece uma passada futura de refinamento fino de densidade e interação caso a equipe aprove a direção manual
- o ganho mais importante aqui não é só visual: é recuperar previsibilidade do PWA e tirar um ponto recorrente de estranheza da experiência operacional

## 11. Charts estáveis + salão mais fluido no toque — 2026-04-03

**Problemas reais atacados**

- o dashboard ainda emitia warning de `width(-1)/height(-1)` quando os gráficos renderizavam antes de o container ter tamanho válido
- o salão desktop continuava com sensação de atraso no arraste das mesas, especialmente em toque/pointer, e a leitura operacional seguia seca demais
- a camada `Operacional` do salão não ajudava o usuário a focar por setor; mostrava tudo de uma vez, mas com pouca prioridade visual
- o snapshot já trazia `section` da mesa, mas a modelagem do PDV não carregava esse campo até a superfície do salão

**Correções aplicadas**

- `apps/web/components/dashboard/chart-responsive-container.tsx`
- `apps/web/components/dashboard/finance-chart.tsx`
- `apps/web/components/dashboard/finance-doughnut-chart.tsx`
- `apps/web/components/dashboard/metric-card.tsx`
- `apps/web/components/dashboard/sales-performance-card.tsx`
  - os gráficos passaram a usar um container próprio que espera largura/altura reais antes de montar o `ResponsiveContainer`
  - isso reduz o warning silencioso dos gráficos sem trocar a biblioteca nem mascarar problema de layout
- `apps/web/eslint.config.mjs`
  - o allowlist de imports de `recharts` foi alinhado ao novo wrapper canônico do dashboard
- `apps/web/components/dashboard/salao/hooks/use-mesa-drag.ts`
- `apps/web/components/dashboard/salao/constants.ts`
  - o arraste de mesas migrou de mouse events soltos para pointer events com `pointerId`, `pointercapture` e flush por `requestAnimationFrame`
  - isso deixa o gesto mais previsível em toque e mouse, com menos jitter e menos risco de “perder” a mesa no meio do movimento
- `apps/web/components/dashboard/salao-environment.tsx`
  - a faixa de KPIs do operacional ficou mais útil (`Receita Circulante`, `Ticket Aberto`, `Equipe em giro`, `Ocupação`, `Livres`)
  - entrou um filtro visual por seção para o salão, permitindo focar em uma área específica sem poluir a leitura do restante
  - o empty state agora explica quando a seção escolhida não tem mesas visíveis
- `apps/web/components/pdv/pdv-types.ts`
- `apps/web/components/pdv/pdv-operations.ts`
  - `Mesa.section` entrou de verdade no shape derivado do snapshot, permitindo que o filtro por área não dependa de dados fantasma

**Validação**

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm test` ✅
  - API: `695/695`
  - Web: `88/88`
- `npm run build` ✅

**Leitura**

- aqui não teve maquiagem: o warning dos charts foi tratado na origem da renderização, e não escondido por CSS ou delay artificial
- o salão ficou mais responsivo no gesto e mais claro para operação, mas sem recomeçar a tela do zero nem quebrar o fluxo atual
- o próximo passo depois do deploy é validar em produção se o warning do Recharts sumiu de vez e se o salão responde melhor no toque real

## 12. Rollback cirúrgico do calendário comercial — 2026-04-03

**Problema real reconhecido**

- o calendário da seção `Calendário` não era o alvo da correção anterior
- a troca para a agenda manual fez o produto perder uma interação que já estava boa: drag-and-drop e resize dos eventos comerciais
- o calendário de atendimento, por outro lado, era o ponto que realmente precisava sair da camada pesada/genérica

**Correção aplicada**

- `apps/web/components/calendar/commercial-calendar.tsx`
  - restaurado para a versão anterior com `react-big-calendar` + addon de drag-and-drop
  - mantidos os estilos visuais do Desk Imperial e o modal de criação/edição
  - retornaram os gestos de mover evento, redimensionar e navegar pelas views nativas do calendário comercial

**O que foi preservado**

- `apps/web/components/operations/operations-timeline.tsx`
  - continua manual e mais leve, porque esse sim era o calendário de atendimento que precisava mudar
- nenhuma mudança foi feita nesta passada em:
  - AG Grid
  - visão executiva por colaborador
  - mesas do atendimento
  - bloco `Pedro Alves`
  - movimentos
  - últimos registros

**Validação**

- `npm --workspace @partner/web run lint -- components/calendar/commercial-calendar.tsx` ✅
- `npm --workspace @partner/web run typecheck` ✅
- `npm --workspace @partner/web run build` ✅

**Leitura**

- aqui a decisão madura foi voltar um passo, não insistir numa mudança errada
- o calendário comercial recupera o comportamento que já funcionava bem, enquanto o atendimento mantém a melhora que realmente fez sentido

## 13. Bloco executivo do PDV com leitura menos genérica — 2026-04-03

**Problemas reais atacados**

- o bloco `AG Grid` do PDV estava funcional, mas ainda passava sensação de painel-placeholder: grid genérico, detalhe pobre e pouca leitura operacional no colaborador selecionado
- `Mesas do atendimento`, `Movimentos` e `Últimos registros` não estavam ajudando o dono a bater o olho e entender o turno
- a descrição da timeline ainda citava `FullCalendar`, mesmo depois da troca para a linha do tempo manual
- o adapter do operacional tratava `cashCurrentAmount` como espelho do `expectedCashAmount`, mesmo quando já existia leitura contada

**Correções aplicadas**

- `apps/web/components/operations/operations-executive-grid.tsx`
  - o topo do grid virou `Radar da equipe`, mantendo AG Grid como superfície principal de seleção
  - o colaborador selecionado ganhou um painel próprio com código, perfil, status do caixa e KPIs do turno
  - `Mesas do atendimento` saiu da tabela seca e virou lista manual com status, abertura, atualização, subtotal, desconto, total e notas
  - `Movimentos` virou resumo executivo com entradas, saídas e últimos lançamentos
  - `Últimos registros` agora mistura caixas e mesas em uma trilha manual, em vez de um bloco frio e pouco expressivo
- `apps/web/lib/operations/operations-adapters.ts`
  - `cashCurrentAmount` agora prefere `countedCashAmount` quando já existe leitura contada; se não existir, continua usando o esperado
- `apps/web/components/dashboard/environments/pdv-environment.tsx`
  - a descrição da timeline foi atualizada para refletir a camada manual real, sem mencionar `FullCalendar`

**Validação**

- `npm --workspace @partner/web run lint` ✅
- `npm --workspace @partner/web run typecheck` ✅
- `npm --workspace @partner/web run test -- components/operations/operations-executive-grid.test.tsx lib/operations/operations-adapters.test.ts` ✅
- `npm --workspace @partner/web run build` ✅

**Cobertura nova**

- `apps/web/components/operations/operations-executive-grid.test.tsx`
  - garante render do colaborador em foco
  - garante troca de seleção no grid
- `apps/web/lib/operations/operations-adapters.test.ts`
  - garante que `cashCurrentAmount` usa o valor contado quando disponível

**Leitura**

- aqui o objetivo não foi “embelezar o AG Grid”, e sim dar função real para ele dentro do fluxo executivo
- o grid continua sendo a superfície de seleção, mas a leitura importante agora acontece em painéis humanos, mais próximos do que um gestor realmente precisa enxergar durante o turno
