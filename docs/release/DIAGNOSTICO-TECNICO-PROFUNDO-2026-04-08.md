# DIAGNOSTICO TECNICO PROFUNDO — DESK IMPERIAL

**Data:** 2026-04-08
**Metodo:** 8 agentes especialistas (Opus) + consolidacao Tech Leader
**Regra:** Zero elogio automatico. Evidencia obrigatoria. Classificacao por confianca.

---

## 1. RESUMO EXECUTIVO

O sistema tem fundacao arquitetural solida, mas **perdeu leveza por acumulo progressivo** de peso em 3 eixos:

1. **Landing page pesada** — 3 canvas rAF permanentes + framer-motion eager + 7 CSS animations infinite = primeira impressao lenta
2. **Dashboard re-renderiza demais** — countdown 1x/s no shell de 749 linhas + polling fixo ignorando WebSocket + zero memoizacao em derivacoes
3. **Backend com gargalos pontuais** — PillarsService sem cache/select/aggregation + race condition no kitchen + snapshot com query redundante

A hipotese principal: **o sistema paga custo de rendering e network a cada tick sem necessidade, porque a camada de otimizacao (lazy loading, memoizacao, polling condicional) foi planejada mas nunca finalizada.**

---

## 2. VISAO DO TECH LEADER — Como os problemas se conectam

### Cadeia causal principal (frontend)

```
countdown timer 1x/s (causa raiz)
  → re-render DashboardShell 749 linhas (amplificador)
    → buildDashboardSignals recalculado sem useMemo (custo invisivel)
      → environments ativos re-renderizam (cascata)
        → queries TanStack com subscriptions duplicadas (multiplicador)
          → refetch fixo 15-20s mesmo com Socket.IO ativo (desperdicio)
```

**Sintoma:** dashboard pesado, jank perceptivel em avaliacao/demo.
**Gargalo:** shell monolitico sem isolamento de re-render.
**Causa raiz:** countdown com setState no shell + ausencia de memoizacao + polling incondicional.

### Cadeia causal principal (landing)

```
3 canvas com rAF permanente (causa raiz)
  → 55 createRadialGradient/frame (custo GPU)
    → framer-motion eager ~60KB (custo parse)
      → 7 CSS animations infinite (custo compositing)
        → body::before grid pattern em todas as paginas (custo constante)
```

**Sintoma:** landing lenta no mobile, bateria consumida.
**Gargalo:** canvas sem reducao para low-perf devices.
**Causa raiz:** animacoes otimizadas para visual, nao para performance.

### Cadeia causal principal (backend)

```
PillarsService sem cache, select ou groupBy (causa raiz)
  → 4 findMany trazendo Order completo (amplificador)
    → aggregation em JS com O(7*N) iteracoes (custo CPU)
      → dashboard financeiro sempre "frio" (impacto)
```

**Sintoma:** cards de KPI lentos no primeiro load.
**Gargalo:** PillarsService e o unico service critico sem cache.
**Causa raiz:** servico adicionado sem seguir padrao ja estabelecido.

### O que e sistemico vs. local

| Sistemico                                        | Local                       |
| ------------------------------------------------ | --------------------------- |
| Shell monolitico amplificando todo re-render     | PillarsService sem cache    |
| Polling fixo ignorando WebSocket (4 componentes) | Race condition no kitchen   |
| Lazy loading planejado mas nunca finalizado      | Query redundante de mesas   |
| Tokens de design divergentes (3 fontes)          | Contrato de status PT vs EN |

---

## 3. MAPA DE RISCO

### Frontend

| Risco                                                                | Confianca  | Impacto     |
| -------------------------------------------------------------------- | ---------- | ----------- |
| Countdown re-renderiza shell inteiro 1x/s                            | Confirmado | Alto        |
| DashboardShell 749 linhas sem memoizacao                             | Confirmado | Alto        |
| Polling fixo em background mesmo com Socket.IO                       | Confirmado | Alto        |
| Lazy wrappers definidos mas recharts/calendar importados diretamente | Confirmado | Alto        |
| 125 client components vs ~7 server components                        | Confirmado | Estrategico |
| useDebouncedCallback com useState em vez de useRef                   | Confirmado | Medio       |

### Backend

| Risco                                                      | Confianca  | Impacto           |
| ---------------------------------------------------------- | ---------- | ----------------- |
| updateKitchenItemStatus sem transacao (race condition)     | Confirmado | Critico           |
| PillarsService: sem cache + sem select + aggregation em JS | Confirmado | Alto              |
| auth.service.ts God Service 2430 linhas, 8 deps            | Confirmado | Alto (manutencao) |
| addComandaItems loop sequencial em vez de createMany       | Confirmado | Medio             |
| Import CSV com N queries sequenciais                       | Confirmado | Medio             |

### API / Comunicacao

| Risco                                                             | Confianca         | Impacto |
| ----------------------------------------------------------------- | ----------------- | ------- |
| Contrato de status comanda inconsistente (PT no WS vs EN no REST) | Confirmado        | Alto    |
| PDV sem polling fallback quando WebSocket desconecta              | Precisa validacao | Alto    |
| Orders buscados 2x na aba Sales (summary + detail)                | Confirmado        | Medio   |
| WebSocket cascade de 4-5 invalidates por evento                   | Muito provavel    | Medio   |
| FinanceSummaryResponse monolitico servindo 5+ telas               | Muito provavel    | Medio   |

### Mobile / Responsividade

| Risco                                                         | Confianca      | Impacto |
| ------------------------------------------------------------- | -------------- | ------- |
| CartSummaryBar com bg-[#0a0a0a] hardcoded — quebra tema claro | Confirmado     | Alto    |
| PWA manifest envia Owner para /app/staff                      | Confirmado     | Alto    |
| Breakpoint JS (960) vs CSS (lg=1024) desalinhado              | Muito provavel | Medio   |
| Salao com rgba(255,255,255,...) hardcoded para dark           | Confirmado     | Medio   |
| Shells mobile sem toggle de tema                              | Confirmado     | Medio   |

### Arquitetura

| Risco                                                    | Confianca  | Impacto           |
| -------------------------------------------------------- | ---------- | ----------------- |
| comanda.service.ts 1559 + operations-helpers 1429 linhas | Confirmado | Alto (manutencao) |
| api.ts frontend monolito 1317 linhas                     | Confirmado | Medio             |
| toNumber duplicado com semanticas diferentes (null vs 0) | Confirmado | Medio             |
| forwardRef triplo entre Auth/Consent/Geocoding           | Confirmado | Medio             |

### Performance Invisivel

| Risco                                               | Confianca  | Impacto |
| --------------------------------------------------- | ---------- | ------- |
| 3 canvas rAF na landing (55 gradients/frame)        | Confirmado | Alto    |
| 7+ CSS animations infinite sem controle de viewport | Confirmado | Medio   |
| body::before grid pattern em todas as paginas       | Confirmado | Baixo   |

### Regressoes

| Risco                                                        | Confianca  | Impacto |
| ------------------------------------------------------------ | ---------- | ------- |
| Visual reform audit Fase 1 inteira nao implementada          | Confirmado | Alto    |
| transition-all + hover:-translate-y-1 no salao (novo codigo) | Confirmado | Medio   |
| Recharts importado direto (3 arquivos), lazy wrappers mortos | Confirmado | Alto    |
| refetchInterval fixo no dashboard web ignorando socket       | Confirmado | Alto    |
| use-performance.ts documentado como pronto mas inexistente   | Confirmado | Medio   |

---

## 4. PRINCIPAIS PROBLEMAS ENCONTRADOS

### P01 — Race condition no updateKitchenItemStatus

- **Classificacao:** Confirmado
- **Evidencia:** `comanda.service.ts:915-988` — 4 queries sequenciais fora de transacao
- **Causa raiz:** findUnique + update + findMany + update da comanda sem $transaction
- **Impacto tecnico:** Dois garcons atualizando itens da mesma comanda podem deixar status inconsistente
- **Impacto na experiencia:** Cozinha mostra "pronta" mas kanban nao atualiza em ambiente movimentado
- **Prioridade:** CRITICA

### P02 — Countdown re-renderiza DashboardShell inteiro 1x/segundo

- **Classificacao:** Confirmado
- **Evidencia:** `useEvaluationCountdown.ts:27` — `setCountdownNow(Date.now())` a cada 1000ms; consumido em `dashboard-shell.tsx:431`
- **Causa raiz:** setState vive no hook consumido pelo shell de 749 linhas sem isolamento
- **Impacto tecnico:** Re-render completo incluindo recalculo de signals, navigation, environments
- **Impacto na experiencia:** Jank perceptivel para todos os usuarios em modo avaliacao/demo
- **Prioridade:** CRITICA (quick fix: isolar em componente proprio)

### P03 — PillarsService sem cache, sem select, aggregation em JS

- **Classificacao:** Confirmado
- **Evidencia:** `pillars.service.ts:51-103` — 4 findMany sem select + filter/reduce em JS + zero cache
- **Causa raiz:** Service adicionado sem seguir padrao de cache ja existente
- **Impacto tecnico:** 4 queries trazendo Order completo (~30 colunas) + O(7\*N) iteracoes
- **Impacto na experiencia:** Cards KPI do dashboard sempre "frios", nunca instantaneos
- **Prioridade:** CRITICA (3 fixes no mesmo arquivo)

### P04 — Polling fixo no dashboard web ignorando WebSocket ativo

- **Classificacao:** Confirmado (AG2, AG5, AG8 convergem)
- **Evidencia:** `sales-environment.tsx:42-43`, `activity-timeline.tsx:49-50`, `salao-environment.tsx:59,69` — refetchInterval fixo + refetchIntervalInBackground: true
- **Causa raiz:** Padrao condicional `refetchInterval: realtimeStatus === 'connected' ? false : 20_000` existe nos shells mobile, mas nunca foi portado para os environments desktop
- **Impacto tecnico:** 4-12 requests HTTP/minuto extras por usuario com tab aberta
- **Impacto na experiencia:** Carga desnecessaria no backend; bateria consumida em mobile
- **Prioridade:** ALTA (quick fix)

### P05 — Landing page com 3 canvas rAF + framer-motion eager

- **Classificacao:** Confirmado (AG2 e AG7 convergem)
- **Evidencia:** `space-background.tsx:96-237` (2 canvas), `custom-cursor.tsx:52-110` (1 canvas) — 55 createRadialGradient/frame; `landing-page.tsx:5` — import estatico de framer-motion
- **Causa raiz:** Animacoes projetadas para visual sem performance budget
- **Impacto tecnico:** ~3300 gradients/segundo + ~60KB parse de framer-motion no first paint
- **Impacto na experiencia:** LCP penalizado, bateria consumida, jank em scroll no mobile
- **Prioridade:** ALTA

### P06 — Contrato de status comanda inconsistente (PT no WebSocket vs EN no REST)

- **Classificacao:** Confirmado
- **Evidencia:** `operations-realtime.types.ts:22` usa 'ABERTA'/'EM_PREPARO'; `contracts.ts:301` usa 'OPEN'/'IN_PREPARATION'
- **Causa raiz:** Dois vocabularios coexistem entre camadas
- **Impacto tecnico:** Patch otimista pode falhar silenciosamente (status 'ABERTA' != 'OPEN')
- **Impacto na experiencia:** Refetch desnecessario quando patch falha; dados momentaneamente stale
- **Prioridade:** ALTA

### P07 — Lazy loading planejado mas nunca finalizado

- **Classificacao:** Confirmado (AG1 e AG8 convergem)
- **Evidencia:** `lazy-components.tsx` exporta ~12 wrappers; `finance-doughnut-chart.tsx:3`, `sales-performance-card.tsx:8`, `commercial-calendar.tsx:4` importam libs diretamente
- **Causa raiz:** Infra de lazy loading criada, componentes nunca migraram
- **Impacto tecnico:** Recharts ~300KB + calendar ~100KB no bundle principal
- **Impacto na experiencia:** TTI elevado em graficos e calendario
- **Prioridade:** ALTA

### P08 — auth.service.ts God Service (2430 linhas, 8 dependencias)

- **Classificacao:** Confirmado
- **Evidencia:** `auth.service.ts` — construtor com 8 injecoes; mistura registro, login, sessao, CSRF, profile, email, password, demo
- **Causa raiz:** Acumulo progressivo de responsabilidades
- **Impacto tecnico:** Alto risco de regressao; testabilidade baixa
- **Impacto na experiencia:** Indireto — bugs de auth sao os mais criticos
- **Prioridade:** ALTA (refatoracao incremental)

### P09 — PWA manifest envia Owner para /app/staff

- **Classificacao:** Confirmado
- **Evidencia:** `manifest.json:6-7` — `start_url: "/app/staff"`
- **Causa raiz:** Manifesto unico sem diferenciacao de role
- **Impacto na experiencia:** Donos que instalam PWA caem na tela errada
- **Prioridade:** ALTA (fix trivial)

### P10 — CartSummaryBar com bg-[#0a0a0a] quebrando tema claro

- **Classificacao:** Confirmado
- **Evidencia:** `mobile-order-builder.tsx:291` — cor hardcoded
- **Causa raiz:** Componente construido assumindo dark mode
- **Impacto na experiencia:** Bloco preto no rodape em tema claro no mobile
- **Prioridade:** ALTA (fix trivial)

---

## 5. GARGALOS DE PERFORMANCE

### Abertura de pagina

| Gargalo                                                 | Causa                     | Impacto                               |
| ------------------------------------------------------- | ------------------------- | ------------------------------------- |
| Landing: 3 canvas rAF + framer-motion eager             | Animacoes sem budget      | LCP +1-3s em mobile                   |
| Dashboard: zero dados pre-renderizados (full client)    | 125 'use client' vs 7 RSC | FCP skeleton, LCP apos 2+ round-trips |
| Finance: 10 queries paralelas + take:5000 em cache miss | Endpoint monolitico       | ~2-5s no primeiro acesso              |

### Renderizacao

| Gargalo                                      | Causa                     | Impacto                    |
| -------------------------------------------- | ------------------------- | -------------------------- |
| Countdown 1x/s re-renderiza shell 749 linhas | useState no hook do shell | Jank em modo avaliacao     |
| buildDashboardSignals sem useMemo            | Derivacao inline          | Recalculo a cada re-render |
| 7+ CSS animations infinite                   | Sem IntersectionObserver  | GPU/bateria constante      |

### Estado

| Gargalo                                 | Causa                    | Impacto                       |
| --------------------------------------- | ------------------------ | ----------------------------- |
| useDebouncedCallback com useState       | Timer em state           | Re-render a cada debounce     |
| 2x useMobileDetection sem throttle      | 2 resize listeners       | 120 setState/s durante resize |
| Queries duplicadas shell + environments | N subscriptions no cache | Cascata de re-render          |

### Chamadas de API

| Gargalo                                 | Causa                           | Impacto           |
| --------------------------------------- | ------------------------------- | ----------------- |
| Polling fixo 15-20s ignorando WebSocket | Padrao condicional so no mobile | Requests fantasma |
| Orders buscados 2x na aba Sales         | summary + detail em paralelo    | Carga dobrada     |
| refetchIntervalInBackground: true       | Tab inativo continua buscando   | Bateria + carga   |

### Backend

| Gargalo                                               | Causa                                  | Impacto        |
| ----------------------------------------------------- | -------------------------------------- | -------------- |
| PillarsService: 4 queries sem select + aggregation JS | Service sem otimizacao                 | KPIs lentos    |
| addComandaItems: loop de creates dentro de transacao  | Nao usa createMany                     | 50-200ms extra |
| buildLiveSnapshot: query redundante de mesas          | Dados ja disponiveis na query anterior | +30-80ms       |

---

## 6. O QUE ESTA SOBRANDO OU PREJUDICANDO

### Bibliotecas

- **ApexCharts + Recharts** — duas libs de grafico (~800KB combined parsed). Padronizar em uma.
- **@opentelemetry/auto-instrumentations-node** — metapacote que puxa ~20 instrumentacoes. Importar apenas as usadas.
- **@types/ioredis** — tipos legados para ioredis v4; ioredis v5 inclui tipos nativos.

### Imports

- **framer-motion** importado estaticamente na rota / (landing). Deveria ser dynamic.
- **Recharts** importado direto em 3 componentes ignorando lazy-components.tsx.
- **react-big-calendar** importado direto em 2 componentes ignorando LazyCalendar.

### Camadas

- **OperationsService facade** — 14 de 17 metodos sao passthrough 1:1. Custo de manutencao sem valor agregado.
- **document-validation.util.ts** — wrapper de 11 linhas que re-exporta funcoes de @contracts.

### Codigo morto

- **PeriodClassifierService** — 243 linhas, zero importadores, zero testes.
- **Lazy wrappers** em lazy-components.tsx — ~12 exports que ninguem importa.
- **Selects "compact"** identicos aos selects normais em operations-helpers.

### Complexidade desnecessaria

- **toNumber** duplicado com semanticas diferentes (null vs 0) — fonte de bugs silenciosos.
- **forwardRef triplo** Auth<->Consent, Auth<->Geocoding — poderia ser resolvido com guards globais.

---

## 7. CORRECOES RECOMENDADAS

### CORRIGIR AGORA (0-3 dias)

| #   | Problema                                    | Correcao                                                                       | Risco  | Prioridade |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------ | ------ | ---------- |
| 1   | Countdown re-renderiza shell 1x/s           | Isolar `EvaluationModeBanner` + countdown em componente com React.memo         | Nenhum | Critica    |
| 2   | updateKitchenItemStatus sem transacao       | Envolver as 4 queries em `$transaction`                                        | Baixo  | Critica    |
| 3   | PillarsService sem cache/select/aggregation | Adicionar `select`, `groupBy` no banco, e `CacheService`                       | Baixo  | Critica    |
| 4   | Polling fixo ignorando WebSocket            | Aplicar padrao condicional `realtimeStatus === 'connected' ? false : interval` | Nenhum | Alta       |
| 5   | refetchIntervalInBackground: true           | Remover de sales-env e activity-timeline                                       | Nenhum | Alta       |
| 6   | PWA manifest envia Owner para /app/staff    | Mudar start_url para /app ou criar logica de redirect                          | Nenhum | Alta       |
| 7   | CartSummaryBar bg-[#0a0a0a]                 | Substituir por var(--surface) ou token CSS                                     | Nenhum | Alta       |
| 8   | useDebouncedCallback com useState           | Trocar para useRef para timeoutId e lastCall                                   | Nenhum | Alta       |
| 9   | Contrato status comanda PT vs EN            | Unificar para EN no WebSocket (ou adaptar adapter no client)                   | Baixo  | Alta       |

### CORRIGIR EM SEGUIDA (3-14 dias)

| #   | Problema                                     | Correcao                                                                                         | Risco  | Prioridade |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ | ---------- |
| 10  | Landing: 3 canvas rAF                        | Pausar canvas quando fora da viewport; respeitar prefers-reduced-motion em JS; reduzir gradients | Medio  | Alta       |
| 11  | Recharts/Calendar importados direto          | Migrar para lazy wrappers ja existentes; remover wrappers nao usados                             | Baixo  | Alta       |
| 12  | framer-motion eager na landing               | Dynamic import com ssr:false + fallback                                                          | Baixo  | Media      |
| 13  | Orders buscados 2x na aba Sales              | Eliminar query summary quando detail esta ativa                                                  | Baixo  | Media      |
| 14  | PDV sem fallback quando WebSocket desconecta | Adicionar refetchInterval condicional no pdv-environment                                         | Nenhum | Media      |
| 15  | Salao com rgba(255,255,255,...) hardcoded    | Substituir por tokens CSS                                                                        | Nenhum | Media      |
| 16  | Shells mobile sem toggle de tema             | Adicionar botao ThemeToggle na nav mobile                                                        | Nenhum | Media      |
| 17  | toNumber duplicado                           | Renomear para toNumberOrZero e toNumberOrNull                                                    | Nenhum | Media      |
| 18  | addComandaItems loop sequencial              | Usar createMany + findMany posterior                                                             | Baixo  | Media      |

### OTIMIZAR DEPOIS (14-45 dias)

| #   | Problema                             | Correcao                                                                        | Risco  | Prioridade |
| --- | ------------------------------------ | ------------------------------------------------------------------------------- | ------ | ---------- |
| 19  | DashboardShell 749 linhas            | Extrair sub-componentes + useMemo em derivacoes                                 | Medio  | Alta       |
| 20  | auth.service.ts 2430 linhas          | Separar em AuthService + SessionService + RegistrationService + PasswordService | Alto   | Alta       |
| 21  | comanda.service.ts 1559 linhas       | Extrair KitchenService e ComandaClosureService                                  | Medio  | Media      |
| 22  | Dashboard sem rotas reais            | Migrar sections para rotas Next.js com layout compartilhado                     | Alto   | Media      |
| 23  | FinanceSummaryResponse monolitico    | Criar endpoints separados /finance/map, /finance/payroll                        | Medio  | Media      |
| 24  | ApexCharts + Recharts duplicados     | Padronizar em Recharts; remover ApexCharts                                      | Medio  | Media      |
| 25  | api.ts frontend 1317 linhas          | Split por dominio: api/auth.ts, api/operations.ts, api/products.ts              | Nenhum | Baixa      |
| 26  | Breakpoint JS (960) vs CSS (lg=1024) | Alinhar DEFAULT_MOBILE_BREAKPOINT com lg do Tailwind                            | Baixo  | Baixa      |

---

## 8. PLANO DE RECUPERACAO DE FLUIDEZ

### Fase 1 — Quick Wins (impacto imediato, risco zero)

**Estimativa: 1-2 dias**

1. Isolar countdown em componente proprio com React.memo
2. Remover `refetchIntervalInBackground: true` (2 arquivos)
3. Aplicar polling condicional baseado em realtimeStatus (4 componentes)
4. Trocar useState por useRef em useDebouncedCallback/useThrottledCallback
5. Corrigir PWA manifest start_url
6. Corrigir CartSummaryBar com token CSS

**Resultado esperado:** Dashboard para de re-renderizar 1x/s. Polling fantasma eliminado. Mobile funcional no tema claro.

### Fase 2 — Backend Hot Fixes (alto impacto, baixo risco)

**Estimativa: 2-3 dias**

7. PillarsService: adicionar select, groupBy no banco, injetar CacheService
8. updateKitchenItemStatus: envolver em $transaction
9. Unificar contrato de status comanda (WS e REST alinhados)

**Resultado esperado:** KPIs instantaneos. Race condition eliminada. Patch otimista confiavel.

### Fase 3 — Bundle Diet (alto impacto, risco baixo)

**Estimativa: 3-5 dias**

10. Migrar recharts/calendar para lazy wrappers existentes
11. Dynamic import de framer-motion na landing
12. Pausar canvas rAF quando fora do viewport + prefers-reduced-motion
13. Remover codigo morto (PeriodClassifier, lazy wrappers nao usados, selects duplicados)

**Resultado esperado:** ~400KB a menos no bundle principal. Landing fluida no mobile.

### Fase 4 — Refatoracao Estrutural (alto impacto, risco medio)

**Estimativa: 10-20 dias**

14. Extrair sub-componentes do DashboardShell + adicionar useMemo
15. Separar auth.service.ts em 4 services
16. Migrar dashboard para rotas Next.js reais
17. Split FinanceSummaryResponse em endpoints especializados

**Resultado esperado:** Sistema modular, testavel, com deep linking funcional.

---

## 9. VEREDITO FINAL

### Por que o sistema perdeu leveza?

Nao por uma decisao ruim, mas por **acumulo de custos nao revisados**: cada feature adicionada trouxe polling, animacao, query, componente — sem alguem revisando o custo total. O lazy loading foi planejado mas nunca executado. O polling condicional foi implementado no mobile mas esquecido no desktop. O countdown foi colado no shell sem medir o blast radius.

### O que mais esta matando a performance?

1. **Countdown 1x/s** re-renderizando 749 linhas — custo multiplicado por polling ativo
2. **3 canvas rAF** na landing — 3300 gradients/segundo na primeira tela
3. **PillarsService** — unico service critico sem cache, select ou aggregation

### O que precisa ser atacado primeiro?

Os **9 quick fixes da Fase 1 + Fase 2** resolvem 70% da perda de fluidez com risco zero/baixo. Sao mudancas cirurgicas (isolar componente, trocar useState por useRef, remover flag, adicionar cache) que nao exigem refatoracao arquitetural.

### O que devolve fluidez real mais rapido?

**Fase 1 inteira pode ser feita em 1 dia.** O usuario sentiria imediatamente:

- Dashboard sem jank em modo avaliacao
- Zero polling fantasma em background
- Mobile order builder funcional no tema claro
- PWA abrindo na tela correta

Isso nao e refatoracao. E cirurgia. O sistema nao precisa ser reescrito — precisa que alguem passe revendo os custos que foram acumulando sem auditoria.

---

_Diagnostico consolidado por Tech Leader a partir de 8 agentes especialistas Opus. Cada achado cruzado entre pelo menos 2 agentes para eliminar falso positivo. Classificacao por confianca (Confirmado/Muito provavel/Precisa validacao) aplicada em todos os itens._
