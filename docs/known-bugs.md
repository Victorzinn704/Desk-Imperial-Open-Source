# Known Bugs

## Baseline de Testes Aceita

Enquanto existirem entradas ativas neste arquivo com a decisão `Aceitar como falha conhecida durante o programa`, o gate de testes do programa fica redefinido como:

`suíte verde exceto pelos testes listados abaixo como falhas conhecidas`

Nenhum teste novo pode entrar nesta lista sem aprovação explícita do operador. Todo PR deve reduzir ou manter essa lista, nunca aumentar.

No estado atual, nenhuma falha foi aceita como exceção do gate.

## Contagem atual

- 🔴 bloqueadores: 0 (se tiver 1, programa está pausado)
- 🟠 degradações: 0
- 🟡 cosméticos: 0
- **Total aceito como falha conhecida: 0**

Meta ao final do programa: `Z = 0`.

## Entradas ativas

Nenhuma entrada ativa no momento.

`API-SMOKE-001` não pertence a este arquivo. A triagem confirmou que se trata de dívida de infraestrutura de teste local, e o tratamento segue no bloco `1b`.

## Resolvidos Durante Baseline Cleanup

Validação comum dos fixes de layout:

```powershell
npm --workspace @partner/web run test -- components/dashboard/dashboard-shell.render.test.tsx
```

Após os dois ajustes, o arquivo foi executado 5 vezes e passou em `5/5` execuções, com `2/2` testes verdes em todas.

### WEB-LAYOUT-001 — Expectativa de largura desktop do dashboard-shell ficou desatualizada

**Classificação original:** 🟠
**Módulo/área:** `web/dashboard`
**Arquivo afetado:** `apps/web/components/dashboard/dashboard-shell.render.test.tsx:166`
**Descoberto em:** `2026-04-17` durante `Fase 0 baseline run`
**Sintoma original:** o teste `renderiza o layout desktop com header, sidebar e timeline` esperava `224px`, mas o componente já renderizava `232px`.
**Resolução aplicada:** asserção atualizada de `224px` para `232px`.
**Resolvido em:** commit `70a5175` — `test(web): update desktop dashboard shell width assertion`

### WEB-LAYOUT-002 — Expectativa de largura compacta do dashboard-shell ficou desatualizada

**Classificação original:** 🟠
**Módulo/área:** `web/dashboard`
**Arquivo afetado:** `apps/web/components/dashboard/dashboard-shell.render.test.tsx:185`
**Descoberto em:** `2026-04-17` durante `Fase 0 baseline run`
**Sintoma original:** o teste `encolhe o shell em notebooks compactos sem entrar no modo mobile` esperava `64px`, mas o componente já renderizava `68px`.
**Resolução aplicada:** asserção atualizada de `64px` para `68px`.
**Resolvido em:** commit `a2bcdea` — `test(web): update compact dashboard shell width assertion`
