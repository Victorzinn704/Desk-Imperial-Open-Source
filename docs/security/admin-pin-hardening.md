# Admin PIN Hardening

## Objetivo

Reduzir a superficie de ataque do PIN administrativo e impedir que uma prova sensivel vire um bearer token reutilizavel no browser.

## Como funciona

1. o usuario digita o PIN no modal
2. o backend valida o PIN do dono da workspace
3. o backend emite um `challengeId` opaco e curto
4. o `challengeId` fica salvo no Redis, vinculado a `workspaceOwnerUserId`, `sessionId` e `verifiedByUserId`
5. o navegador recebe apenas um cookie `HttpOnly` com esse `challengeId`
6. as operacoes sensiveis leem a prova pelo cookie e validam o registro no servidor

## O que isso evita

- exfiltracao direta de uma credencial de autorizacao reutilizavel via `sessionStorage`
- reutilizacao fora da sessao autenticada atual
- reaproveitamento depois de troca ou remocao do PIN, porque o servidor compara o fingerprint do hash atual do PIN

## Detalhes de seguranca

- a prova e curta, expira em minutos
- a prova e amarrada a sessao, usuario e workspace
- o frontend pode manter apenas um `hint` local para UX, mas nao e mais a fonte de verdade
- se o Redis nao estiver disponivel, a validacao falha fechada

## Recomendacao

Sempre manter essa prova fora de `localStorage`, fora de `sessionStorage` e fora de tokens que o frontend consiga reutilizar como autorizacao real.
