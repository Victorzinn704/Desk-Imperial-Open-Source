# Auditoria Arquitetural - Desk Imperial

**Data:** 2026-04-14
**Escopo:** modularidade backend/frontend, hotspots estruturais e corredores de acoplamento

---

## Resumo

A macroarquitetura do monorepo continua correta para o porte atual, mas existem corredores de risco claros:

1. onboarding com ciclo entre `auth`, `consent` e `geocoding`;
2. `ComandaService` e `OperationsHelpersService` como absorvedores de regra e side effect;
3. `DashboardShell`, `owner-mobile-shell` e `staff-mobile-shell` como controladores gigantes de UI e estado.

O problema nao e "precisar reescrever tudo". O problema e que os mesmos poucos arquivos seguem concentrando quase todo ajuste relevante.

---

## Achados Prioritarios

### A-01 (P1) - Ciclo entre `auth`, `consent` e `geocoding`

- **Tipo:** fato confirmado
- **Evidencia:** `apps/api/src/modules/auth/auth.module.ts`, `apps/api/src/modules/consent/consent.module.ts`, `apps/api/src/modules/geocoding/geocoding.module.ts`, `apps/api/src/modules/auth/auth-registration.service.ts`
- **Leitura:** os modulos dependem entre si via `forwardRef`; o servico de registro injeta consentimento, geocoding, mailer e verificacao.
- **Impacto:** onboarding tem boundary fraco e alto custo de evolucao.
- **Confianca:** alta
- **Recomendacao:** extrair um `RegistrationWorkflow`/camada de aplicacao para reduzir o acoplamento.

### A-02 (P2) - `ComandaService` virou um god service

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/api/src/modules/operations/comanda.service.ts`
- **Leitura:** o arquivo concentra transacoes, realtime, cache, mesa, cozinha e efeitos comerciais.
- **Impacto:** qualquer ajuste operacional relevante continua encostando no mesmo hotspot.
- **Confianca:** alta
- **Recomendacao:** quebrar por casos de uso (`open`, `add`, `replace`, `close`, `cancel`, `reassign`).

### A-03 (P2) - `OperationsHelpersService` mistura helper puro com infraestrutura

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/api/src/modules/operations/operations-helpers.service.ts`
- **Leitura:** o servico agrega Prisma, Cache e CurrencyService ao mesmo tempo em que expoe utilitarios quase puros.
- **Impacto:** o dominio operations perde fronteira clara entre regra e infra.
- **Confianca:** alta
- **Recomendacao:** extrair utilitarios puros para modulos comuns e deixar o servico injetavel apenas para trechos stateful.

### A-04 (P2) - Cache financeiro esta acoplado a varios writers

- **Tipo:** fato confirmado
- **Evidencia:** `apps/api/src/modules/finance/finance.service.ts`, `apps/api/src/modules/orders/orders.service.ts`, `apps/api/src/modules/products/products.service.ts`, `apps/api/src/modules/operations/comanda.service.ts`
- **Leitura:** a consistencia do read model financeiro depende de multiplos modulos lembrarem de invalidar/reaquecer cache.
- **Impacto:** risco alto de drift sempre que surgir novo fluxo de escrita.
- **Confianca:** alta
- **Recomendacao:** centralizar invalidacao em coordenador/evento de dominio.

### A-05 (P2) - `DashboardShell` centraliza shell, estado e navegacao

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/web/components/dashboard/dashboard-shell.tsx`
- **Leitura:** o componente acumula bootstrap de sessao, role routing, realtime, layout e variacoes de experiencia.
- **Impacto:** a tela principal virou um gargalo de evolucao e teste.
- **Confianca:** alta
- **Recomendacao:** separar controller hook, layout e adaptadores por role/surface.

### A-06 (P2) - Shells mobile duplicam orquestracao operacional

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `apps/web/components/owner-mobile/owner-mobile-shell.tsx`, `apps/web/components/staff-mobile/staff-mobile-shell.tsx`
- **Leitura:** ambos repetem queries, invalidacoes, realtime, nav e mutacoes com pequenas variacoes.
- **Impacto:** ajuste operacional simples tende a demandar alteracao paralela nos dois lados.
- **Confianca:** alta
- **Recomendacao:** extrair um `useOperationsWorkspace` comum e deixar cada shell apenas com politica de role/renderizacao.

### A-07 (P2) - `packages/types` funciona como schema global do monorepo

- **Tipo:** fato confirmado + inferencia forte
- **Evidencia:** `packages/types/src/contracts.ts`, `packages/types/src/index.ts`
- **Leitura:** contratos de finance, orders, operations e products ficam no mesmo arquivo/pacote reexportado globalmente.
- **Impacto:** pequenas mudancas de payload geram ripple amplo entre backend e frontend.
- **Confianca:** alta
- **Recomendacao:** quebrar tipos compartilhados por bounded context.

### A-08 (P2) - O warning map confirma concentracao estrutural, nao so estilo

- **Tipo:** confirmado por execucao
- **Evidencia:** `review_audit/102_quality_warning_map.md`
- **Leitura:** warnings e uncovered lines se concentram nos mesmos hotspots: `comanda.service`, `dashboard-shell`, `owner-mobile-shell`, `staff-mobile-shell`, `salao-environment`, `operations-helpers.service`.
- **Impacto:** cada mudanca importante continua com blast radius alto.
- **Confianca:** alta
- **Recomendacao:** usar os hotspots como ordem de ataque do refactor incremental.

---

## Pontos Positivos

1. A estrutura de monorepo com `apps` e `packages` continua adequada para crescer sem reescrita.
2. Os contratos publicos seguem protegidos por `quality:contracts`.
3. Os problemas atuais sao de acoplamento localizado, nao de ausencia total de arquitetura.

---

## Veredito Arquitetural

Nao ha indicacao de reescrita ampla. O caminho correto e **desacoplamento incremental guiado por risco**, atacando primeiro onboarding, operations e os shells principais.
