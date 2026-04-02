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

## 3. Próximos ataques em ordem madura

### Fase 1 — Medição real no stack OSS

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
