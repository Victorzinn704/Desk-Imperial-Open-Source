# Known Bugs

## Baseline de Testes Aceita

Enquanto existirem entradas ativas neste arquivo com a decisão `Aceitar como falha conhecida durante o programa`, o gate de testes do programa fica redefinido como:

`suíte verde exceto pelos testes listados abaixo como falhas conhecidas`

Nenhum teste novo pode entrar nesta lista sem aprovação explícita do operador. Todo PR deve reduzir ou manter essa lista, nunca aumentar.

No estado atual, nenhuma falha foi aceita como exceção do gate. As ocorrências abaixo foram triadas durante a baseline da Fase 0, mas todas exigem correção antes da wave-0.

## Contagem atual

- 🔴 bloqueadores: 0 (se tiver 1, programa está pausado)
- 🟠 degradações: 2
- 🟡 cosméticos: 0
- **Total registrado neste arquivo: 2**
- **Total aceito como falha conhecida: 0**

Meta ao final do programa: `Z = 0`.

## Triagem da baseline atual

### WEB-LAYOUT-001 — Expectativa de largura desktop do dashboard-shell ficou desatualizada

**Classificação:** 🟠
**Módulo/área:** `web/dashboard`
**Arquivo:** `apps/web/components/dashboard/dashboard-shell.render.test.tsx:157`, `apps/web/components/dashboard/dashboard-shell.render.test.tsx:166`, `apps/web/components/dashboard/dashboard-shell.tsx:542`
**Descoberto em:** `2026-04-17` durante `Fase 0 baseline run`

**Sintoma observado:**
O teste `renderiza o layout desktop com header, sidebar e timeline` falhou em 5 de 5 execuções consecutivas com a mesma mensagem. A asserção espera `224px`, mas o componente renderiza `grid-template-columns: 232px minmax(0,1fr);`.

Evidência observada na execução:

```text
expected style to contain 224px
received: grid-template-columns: 232px minmax(0,1fr);
```

**Reprodução:**
Executar 5 vezes:

```powershell
npm --workspace @partner/web run test -- components/dashboard/dashboard-shell.render.test.tsx
```

O teste falhou nas 5 execuções com a mesma mensagem.

**Causa provável (hipótese, não confirmada):**
Hipótese forte de expectativa de teste desatualizada após mudança real de layout. O `git blame` mostra que a expectativa `224px` vem do commit `18bfd224` de `2026-04-08`, enquanto o componente passou a usar `232px` no commit `c8b1d6f` de `2026-04-17`.

**Impacto em usuário real:**
Não foi verificado em ambiente live nesta triagem se a largura `232px` gerou regressão visual percebida por usuário final. O impacto confirmado nesta etapa é de engenharia: a baseline de testes fica permanentemente vermelha e perde valor como gate do programa. Workaround operacional existe apenas para o time de desenvolvimento: corrigir a asserção para refletir o layout atual ou validar se o componente deveria mesmo ter voltado para `224px`.

**Decisão:**

- [x] Corrigir antes da wave-0 (hotfix)
- [ ] Aceitar como falha conhecida durante o programa
- [ ] Consertar dentro da wave <X> (qual)
- [ ] Resolver após o programa
      Justificativa: falha determinística de baseline que contamina o gate do programa. Não deve entrar na lista de exceções aceitas.

**Evidência de classificação:**

- Rodei 5x seguidas: falhou todas as 5.
- A mensagem de falha é específica e reproduzível.
- A falha é determinística; não há indício de timing, ordem ou estado externo não mockado.
- Não é 🔴 porque não há evidência de perda de dado, falha de segurança ou usuário bloqueado.
- Não pode ser 🟡 porque falha em toda execução da suíte desse arquivo, portanto não é cenário raro/edge case e degrada diretamente a qualidade percebida da baseline de engenharia.

### WEB-LAYOUT-002 — Expectativa de largura compacta do dashboard-shell ficou desatualizada

**Classificação:** 🟠
**Módulo/área:** `web/dashboard`
**Arquivo:** `apps/web/components/dashboard/dashboard-shell.render.test.tsx:178`, `apps/web/components/dashboard/dashboard-shell.render.test.tsx:185`, `apps/web/components/dashboard/dashboard-shell.tsx:624`
**Descoberto em:** `2026-04-17` durante `Fase 0 baseline run`

**Sintoma observado:**
O teste `encolhe o shell em notebooks compactos sem entrar no modo mobile` falhou em 5 de 5 execuções consecutivas com a mesma mensagem. A asserção espera `64px`, mas o componente renderiza `grid-template-columns: 68px minmax(0,1fr);`.

Evidência observada na execução:

```text
expected style to contain 64px
received: grid-template-columns: 68px minmax(0,1fr);
```

**Reprodução:**
Executar 5 vezes:

```powershell
npm --workspace @partner/web run test -- components/dashboard/dashboard-shell.render.test.tsx
```

O teste falhou nas 5 execuções com a mesma mensagem.

**Causa provável (hipótese, não confirmada):**
Hipótese forte de expectativa de teste desatualizada após ajuste intencional de largura compacta. O `git blame` mostra que a expectativa `64px` vem do commit `18bfd224` de `2026-04-08`, enquanto o componente passou a usar `68px` no commit `c8b1d6f` de `2026-04-17`.

**Impacto em usuário real:**
Não foi verificado em ambiente live nesta triagem se a largura `68px` gerou regressão visual percebida em produção. O impacto confirmado nesta etapa é no pipeline local: o teste sinaliza regressão mesmo quando o componente e a largura esperada pelo código já mudaram. O workaround real é técnico, não do usuário final: alinhar a asserção ao comportamento atual ou reverter a mudança de largura se ela foi indevida.

**Decisão:**

- [x] Corrigir antes da wave-0 (hotfix)
- [ ] Aceitar como falha conhecida durante o programa
- [ ] Consertar dentro da wave <X> (qual)
- [ ] Resolver após o programa
      Justificativa: é falha determinística da baseline e deve ser removida do caminho antes de usar a suíte como gate duro.

**Evidência de classificação:**

- Rodei 5x seguidas: falhou todas as 5.
- A mensagem de falha é específica e reproduzível.
- A falha é determinística; não há indício de flakiness.
- Não é 🔴 porque não há evidência de usuário bloqueado, perda de dado ou incidente de segurança.
- Não pode ser 🟡 porque não satisfaz a condição de cenário raro/edge case e degrada a confiabilidade do gate de testes em toda execução.
