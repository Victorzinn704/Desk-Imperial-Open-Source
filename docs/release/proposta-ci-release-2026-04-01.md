# Proposta de Pipeline CI para Release

Data: 2026-04-01

---

## 1. Diagnostico do pipeline atual

Estado atual:

- CI principal com quality + backend test + build
- dependency review em workflow separado

Pontos fortes:

- gate rapido de lint/typecheck
- build final condicionado a jobs anteriores
- controle de concorrencia e cache turbo

Lacunas para release:

- ausencia de gate frontend completo no pipeline principal
- ausencia de validacao de seguranca integrada no fluxo unico
- ausencia de artefatos de teste frontend em falha para triagem rapida

---

## 2. Objetivo da proposta

Transformar o CI de desenvolvimento em CI de release, sem perder velocidade de feedback para PR.

Principios:

- fail fast
- gates progressivos
- rastreabilidade de falha por artefato
- seguranca como gate, nao como auditoria opcional

---

## 3. Pipeline proposto (alto nivel)

## Fase A - PR Checks (obrigatorio para merge)

- Job A1: quality
  - lint
  - typecheck
- Job A2: backend-tests
  - api tests com coverage
- Job A3: frontend-tests-unit
  - vitest
- Job A4: frontend-tests-e2e-baseline
  - playwright chromium smoke
- Job A5: dependency-and-audit
  - dependency review
  - npm audit com threshold configurado
- Job A6: build
  - turbo build
  - depende de A1..A5

## Fase B - Main/Release Checks

- Job B1: publish test reports/artifacts
- Job B2: image/build artifact integrity (opcional)
- Job B3: release smoke checklist gate (manual approval + evidencias)

---

## 4. Regras de bloqueio de merge

Merge permitido somente com:

- todos os jobs PR green
- sem vulnerabilidade high/critical nao tratada
- sem falha de e2e baseline

---

## 5. Matriz minima de comandos

Quality:

- npm run lint
- npm run typecheck

Backend:

- npm --workspace @partner/api run test -- --coverage --ci --forceExit

Frontend unit:

- npm --workspace @partner/web run test

Frontend e2e baseline:

- npm --workspace @partner/web run test:e2e

Build:

- npm run build

Security:

- dependency-review-action
- npm audit --omit=dev --audit-level=high

---

## 6. Estrategia de performance do CI

- manter cache npm + turbo
- manter e2e apenas em chromium no gate baseline
- mover suites mais pesadas para job noturno agendado
- manter timeout por job para evitar filas mortas

---

## 7. Riscos e mitigacoes da proposta

Risco:

- aumento de tempo medio de CI em PR

Mitigacao:

- paralelizar jobs de backend/frontend
- separar baseline e suites estendidas

Risco:

- flakiness de E2E

Mitigacao:

- retries apenas em CI
- artefatos de trace/video em falha

---

## 8. Entrega incremental recomendada

Etapa 1:

- integrar frontend unit no CI principal

Etapa 2:

- integrar e2e baseline com artefatos

Etapa 3:

- adicionar gate de seguranca integrado

Etapa 4:

- formalizar fluxo de release com aprovacao manual no branch principal

---

## 9. Resultado esperado

Com essa proposta, o projeto passa de CI de desenvolvimento para CI de liberacao controlada, reduzindo risco de regressao em producao e elevando confiabilidade de merge.
