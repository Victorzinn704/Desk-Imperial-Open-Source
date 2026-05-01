# Auditoria Frontend - Desk Imperial

**Data:** 2026-04-14
**Escopo:** dashboard, owner/staff mobile, realtime, offline queue e confiabilidade operacional da UI

---

## Resumo

O frontend operacional nao esta falhando por "layout" ou "acabamento". O problema central e de confiabilidade:

1. offline e reconnect podem perder, duplicar ou mascarar acoes;
2. estados vazios escondem erro/loading/offline;
3. a cobertura normal nao mede as areas que mais carregam risco operacional.

---

## Achados

### F-01 (P1) - Outbox offline inconsistente entre owner e staff

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/web/components/owner-mobile/owner-mobile-shell.tsx`, `apps/web/components/shared/use-offline-queue.ts`, `apps/web/components/staff-mobile/staff-mobile-shell.tsx`
- **Leitura:** owner mobile nao tem outbox; staff mobile usa fila com TTL de 10 minutos, sem idempotencia persistida e sem modelar dependencias operacionais.
- **Impacto:** owner perde acao em falha de rede; staff pode reenfileirar/reexecutar sem garantias.
- **Confianca:** alta
- **Recomendacao:** criar um contrato unico de outbox com `actionId`, estado explicito e replay seguro.

### F-02 (P1) - Reconnect do realtime nao invalida baseline

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/web/components/operations/hooks/use-operations-socket.ts`, `apps/web/components/operations/use-operations-realtime.ts`
- **Leitura:** ao reconectar, o status muda para `connected`, mas nao existe refresh obrigatorio se nenhum evento novo chegar.
- **Impacto:** a tela pode voltar "verde" e continuar stale.
- **Confianca:** alta
- **Recomendacao:** invalidar baseline de operations/kitchen/summary/commercial na transicao de reconnect.

### F-03 (P1) - Telas moveis tratam falha/ausencia como estado vazio

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/web/components/staff-mobile/mobile-comanda-list.tsx`, `apps/web/components/staff-mobile/kitchen-orders-view.tsx`, `apps/web/components/staff-mobile/mobile-order-builder.tsx`
- **Leitura:** mensagens como "Nenhuma comanda ativa" e "Cozinha livre" aparecem sem distinguir `loading`, `error` ou `offline`.
- **Impacto:** o operador recebe feedback enganoso e toma decisao operacional errada.
- **Confianca:** alta
- **Recomendacao:** separar `loading`, `error`, `empty` e `offline` em todos os shells/views criticos.

### F-04 (P1) - Toast de "pedido salvo offline" acontece antes da persistencia real

- **Tipo:** fato confirmado
- **Evidencia:** `apps/web/components/staff-mobile/staff-mobile-shell.tsx`, `apps/web/components/shared/use-offline-queue.ts`
- **Leitura:** `enqueueOfflineItems()` chama `enqueue()` sem `await`; o hook so persiste depois de `idbPut()` + `registerSync()`.
- **Impacto:** a UI confirma persistencia que talvez nao tenha acontecido.
- **Confianca:** muito alta
- **Recomendacao:** aguardar todas as promises de enqueue e surfacear erro real de persistencia.

### F-05 (P2) - `isBusy` do shell nao protege acoes destrutivas nos cards

- **Tipo:** fato confirmado + risco potencial
- **Evidencia:** `apps/web/components/staff-mobile/staff-mobile-shell.tsx`, `apps/web/components/staff-mobile/mobile-comanda-list.tsx`, `apps/web/components/owner-mobile/owner-comandas-view.tsx`
- **Leitura:** o shell sabe que ha mutacao pendente, mas os cards nao desabilitam sistematicamente os botoes criticos.
- **Impacto:** taps repetidos podem abrir mutacoes concorrentes.
- **Confianca:** media-alta
- **Recomendacao:** propagar busy state por card/acao.

### F-06 (P2) - Mobile paga fetch duplo antes da decisao de layout

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/web/components/dashboard/hooks/useMobileDetection.ts`, `apps/web/components/dashboard/dashboard-shell.tsx`
- **Leitura:** o detector comeca em desktop ate hidratar; o dashboard carrega queries desktop antes de trocar para shell mobile.
- **Impacto:** custo extra de rede/CPU e flicker em jornada movel.
- **Confianca:** alta
- **Recomendacao:** decidir viewport antes de montar queries pesadas, ou separar as entradas mobile/desktop.

### F-07 (P1) - Cobertura padrao nao representa o frontend operacional

- **Tipo:** fato confirmado
- **Evidencia:** `apps/web/vitest.config.ts`
- **Leitura:** `owner-mobile` e excluido; `staff-mobile` e `use-operations-realtime` saem do gate normal em modo padrao.
- **Impacto:** a equipe enxerga um percentual de coverage melhor do que o risco real.
- **Confianca:** alta
- **Recomendacao:** remover exclusoes fixas ou criar gate funcional explicito para mobile/realtime.

### F-08 (P2) - Patch de realtime pode subcontar comandas abertas

- **Tipo:** fato confirmado + risco potencial
- **Evidencia:** `apps/web/lib/operations/operations-realtime-patching.ts`
- **Leitura:** `closeComandaFromEvent()` decrementa `openComandasCount` mesmo quando a comanda nao existia no snapshot anterior.
- **Impacto:** KPI operacional e badges podem divergir da realidade.
- **Confianca:** alta
- **Recomendacao:** decrementar apenas quando havia estado aberto anterior, ou forcar refresh.

### F-09 (P2) - Mudanca de moeda no dashboard nao invalida resumo financeiro

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/web/components/dashboard/hooks/useDashboardMutations.ts`
- **Leitura:** `updateProfileMutation` invalida apenas `['auth','me']`, mas o dashboard exibe moeda a partir de `financeQuery.displayCurrency ?? preferredCurrency`.
- **Impacto:** dashboard pode mostrar moeda antiga mesmo apos salvar perfil.
- **Confianca:** alta
- **Recomendacao:** invalidar tambem `finance/summary` e todas as views que derivam moeda do perfil.

### F-10 (P3) - Campo de busca do dashboard e affordance falsa

- **Tipo:** fato confirmado
- **Evidencia:** `apps/web/components/dashboard/dashboard-topbar.tsx`
- **Leitura:** existe UI de "Buscar no app..." com atalho visual, sem fluxo funcional associado.
- **Impacto:** reduz confianca e aumenta ruido cognitivo.
- **Confianca:** alta
- **Recomendacao:** remover ate existir implementacao real, ou conectar handler funcional.

---

## Pontos Positivos Revalidados

1. O frontend nao reproduziu mais o antigo blocker de build da home nesta rodada.
2. O shell mobile ja tem instrumentacao de realtime, pull-to-refresh e optimistic updates bem encaminhada.
3. O problema principal nao e ausencia total de estrutura, e sim a confiabilidade do modelo operacional.

---

## Veredito Frontend

O frontend pode evoluir, mas nao deveria ganhar novas responsabilidades operacionais antes de fechar **offline/reconnect/states**. Hoje ele parece mais confiavel do que realmente e.
