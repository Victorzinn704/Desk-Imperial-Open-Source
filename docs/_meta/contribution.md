# Contribution e Manutencao de Docs

**Versao:** 1.0  
**Ultima atualizacao:** 2026-05-01  
**Estado:** operacional ativo

## Objetivo

Definir a regra de manutencao da documentacao para reduzir drift entre codigo, GitHub CI, seguranca e runbooks operacionais.

## TL;DR

- doc canonico muda no mesmo commit da mudanca de comportamento
- release note historica nao substitui doc de onboarding
- claim tecnica sem evidencia real nao entra
- segredo, token e DSN sensivel nunca entram em doc versionado

## O que e canonico hoje

Entram no ciclo obrigatorio de manutencao:

- `README.md`
- `docs/README.md`
- `docs/INDEX.md`
- `docs/product/*` de contrato atual
- `docs/architecture/*` de comportamento atual
- `docs/operations/*` operacionais ativos
- `docs/security/*` baselines e checklists vivos
- `docs/testing/testing-guide.md`
- `docs/waves/*` quando a wave ainda esta aberta

## O que e historico

Nao deve ser usado como fonte primaria sem revisao:

- `DOCS_DESK_IMPERIAL.md`
- `docs/release/*`
- `docs/case-studies/*`
- `docs/agents/*`
- `review_audit/*`

## Regra de evidencia

Toda afirmacao tecnica precisa apontar para pelo menos um destes artefatos:

- arquivo de codigo
- endpoint
- schema Prisma
- workflow CI
- env var
- script operacional
- migration

Se nao houver evidencia, o texto nao entra.

## Quando atualizar docs

Atualize no mesmo commit quando houver mudanca em:

- rota HTTP
- sessao/auth/CSRF/Admin PIN
- realtime
- deploy/infra
- observabilidade
- notificacoes/Telegram
- catalogo inteligente, barcode ou IA

## Checklist minimo por passada

1. revisar `README.md`, `docs/README.md` e `docs/INDEX.md` se a mudanca alterar onboarding
2. revisar doc canonico do dominio afetado
3. revisar runbook operacional se a mudanca afetar deploy, incidente, monitoracao ou smoke
4. rodar:
   - `npm run repo:scan-public`
   - `npm run lint:secrets`
   - `git diff --check`

## Guardrails de seguranca

- nao commitar tokens, chaves, DSNs sensiveis ou IPs privados sem necessidade operacional clara
- usar `.env.local`, secrets de CI ou integracoes dedicadas para build/runtime
- quando houver incidente de vazamento, rotacionar antes de normalizar a doc

## Guardrails de GitHub CI

- workflow que depende de token externo precisa ter preflight e skip limpo
- gate de qualidade nao deve falhar por segredo ausente quando o scan e opcional
- Sonar/Qodana/Sentry precisam de politica explicita de secret e fallback

## Guardrails editoriais

- nao usar numero fixo de modulos em doc de longa vida
- nao promover alias legado a endpoint principal
- nao descrever arquitetura por aspiracao; descrever runtime atual
- quando o comportamento ainda estiver em recuperacao, declarar a limitacao

## Links cruzados

- [style-guide](./style-guide.md)
- [editorial plan](./audit/editorial-plan.md)
- [drift matrix](./audit/drift-matrix.md)
- [guia de testes](../testing/testing-guide.md)
