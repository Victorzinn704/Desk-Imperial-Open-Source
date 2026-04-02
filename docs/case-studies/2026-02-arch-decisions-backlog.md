# Registro: Decisões arquiteturais — histórico não documentado

**Categoria:** decisão arquitetural
**Data de registro:** 2026-03-23
**Período coberto:** sprints 1–4 e estabilização pós-redesign

Este arquivo documenta decisões tomadas durante o desenvolvimento que não foram registradas no momento — extraídas do histórico de commits.

---

## Decisão: PrismaService com resiliência a Neon cold start

**Commit:** `9f7364e fix(api): PrismaService startup resiliente a Neon cold start`

**Contexto:** Neon é PostgreSQL serverless — instâncias hibernam após período de inatividade e levam alguns segundos para acordar no primeiro request. O PrismaService foi adaptado para lidar com esse comportamento sem derrubar o servidor na inicialização.

**Aprendizado:** Em bancos serverless, cold start é previsível e deve ser tratado explicitamente no código de conexão, não suprimido com retry cego.

---

## Decisão: Redis cache no finance/summary com invalidação por evento

**Commit:** `86e99d9 feat(api): Redis cache global no finance/summary com invalidação por evento`

**Contexto:** O endpoint `/finance/summary` agrega dados de produtos, pedidos, funcionários e câmbio — query pesada que não precisa ser recalculada a cada request. Cache de 120 segundos por usuário, invalidado quando o usuário cria ou edita produto ou pedido.

**Aprendizado:** Invalidação por evento é mais eficiente que TTL puro para dados que mudam por ação explícita do usuário. O usuário sempre vê dados consistentes com suas próprias ações.

---

## Decisão: Admin PIN com rate limit server-side

**Commit:** `9947e07 feat(security): Phase 3 — Admin PIN server-side, rate limit PostgreSQL, hardening`

**Contexto:** Funcionalidade de PIN administrativo para operações sensíveis (acesso a configurações críticas). Rate limit implementado server-side para evitar brute force. Na época usava PostgreSQL — migrado para Redis em 2026-03.

**Aprendizado:** PIN de acesso rápido precisa de proteção contra brute force tão séria quanto senhas. 3 tentativas em 5 minutos com bloqueio de 5 minutos foi o critério escolhido por equilíbrio entre segurança e usabilidade operacional.

---

## Decisão: Centralização de queries do dashboard

**Commits:**
- `07014ca perf: centralize dashboard queries, throttle session lastSeenAt to 60s fire-and-forget`
- `e166d79 refactor: centralize dashboard queries in useDashboardQueries hook`

**Contexto:** O dashboard tinha queries dispersas em vários componentes, causando waterfalls de request e re-fetches desnecessários. Centralização em um hook (`useDashboardQueries`) com `staleTime` configurado reduziu chamadas ao backend.

O `lastSeenAt` de sessão foi throttled para 60 segundos com fire-and-forget para não bloquear navegação.

**Aprendizado:** Dashboard com múltiplos painéis precisa de estratégia de fetch centralizada. Cada componente buscar seus próprios dados independentemente gera N requests onde 1 (ou poucos) bastaria.

---

## Decisão: Correção de P0/P1 de performance

**Commit:** `0594f3c perf: fix P0/P1 bottlenecks (staleTime, orders aggregate, countdown isolate, finance TTL)`

**Contexto:** Identificados gargalos críticos de performance:
- `staleTime` não configurado causava refetch a cada navegação
- Query de aggregate de pedidos sem índice adequado
- Componente de countdown re-renderizando todo o dashboard a cada segundo
- TTL do cache financeiro muito curto

**Aprendizado:** Componentes com estado que muda frequentemente (timers, contadores em tempo real) devem ser isolados para não propagar re-renders para componentes estáticos acima na árvore.

---

## Decisão: Mudança de maplibre-gl para Leaflet

**Commits:**
- `a954a1f fix: replace maplibre-gl with leaflet + CARTO dark tiles`
- `2f17a39 fix: load leaflet CSS via DOM link instead of dynamic import`

**Contexto:** `maplibre-gl` causava problemas de SSR com Next.js e tinha bundle pesado. Substituído por Leaflet com tiles CARTO dark, que resolve os problemas de hidratação e tem bundle menor.

O CSS do Leaflet precisou ser carregado via DOM link ao invés de import dinâmico para evitar problema de hidratação.

**Aprendizado:** Bibliotecas de mapa com canvas/WebGL geralmente exigem tratamento especial em SSR. Verificar suporte a Next.js antes de adotar biblioteca de visualização pesada.

---

## Padrão identificado: ciclos de revert no redesign

**Commits relevantes:**
- `9cd3afb feat(ui): redesign SaaS premium`
- `2e369b7 revert(web): restore frontend state before 9cd3afb`
- `1b1adbc reverte(web): restaura frontend para o ponto 4187e5f`
- Vários commits de restauração e fix subsequentes

**Contexto:** A série de commits mostra ciclos de redesign → revert → restauração seletiva, indicando que mudanças de design em larga escala foram aplicadas sem estratégia de rollback granular.

**Aprendizado:** Redesigns de escopo amplo devem ser feitos em branches isoladas e mergeados com critério. Aplicar diretamente em main sem branch de feature cria histórico difícil de navegar e reverter parcialmente.

**Ação recomendada:** Para próximos redesigns, usar branch `feat/redesign-nome` e fazer merge apenas quando estabilizado.
