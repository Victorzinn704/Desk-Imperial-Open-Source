# Scorecard de Maturidade — Desk Imperial (2026-04-26)

**Escala:** 0 = inexistente, 5 = excelência para dev solo, 10 = nível FAANG

---

| Eixo | Nota (0-10) | Evidência-chave |
|---|---|---|
| Arquitetura & modularidade | **5.0** | ARC: macroestrutura boa, mas 3 circular deps + god service 1377 linhas + 38 cross-module imports |
| Backend | **6.5** | BE: transactions fortes (Serializable), Zod validation, mas zero testes, TOCTOU gaps, sem idempotência |
| Frontend | **5.5** | FE: next/dynamic bom uso, ~25 lazy loads, TanStack Query, mas sem Suspense, sem error boundaries, sem next/image |
| Responsividade & mobile | **7.0** | MOB: mobile shells bem estruturados, PWA funcional, offline queue. Touch targets abaixo de 48px, focus-visible ausente |
| API & contratos | **6.0** | API: DTOs em packages/types/ (571 linhas), OpenAPI generation, 100 import type sites. Sem versionamento. |
| Banco & dados | **7.0** | DB: schema 22 modelos bem normalizado, Serializable isolation, audit trail parcial. 7 FKs sem índice, sem paginação em alguns endpoints |
| Segurança & LGPD | **7.5** | SEC: cookie HttpOnly+Secure+SameSite+__Host-, CSRF double-submit, Argon2id, CORS restritivo. Enumeração de usuário em 3 endpoints. Sem exclusão de conta. |
| DevOps & infra | **8.0** | OPS: multi-stage Dockerfiles, CI 8 jobs, backups criptografados c/ restore testado, 5-VM strategy. Rollback não documentado. Alertmanager sem canal. |
| Observabilidade | **5.5** | OBS: stack OTel+Pino+Prometheus+Grafana provisionada, mas Faro é stub, logs de negócio bypassam pino, sem trace propagation FE↔BE |
| Performance real | **5.0** | PERF: recalculateCashSession pesado, closeComanda 8+ ops sequenciais, sem paginação em snapshot, patching engine complexidade 90 |
| Performance percebida | **4.5** | PERF: waterfall loading na dashboard, render-blocking fonts, sem next/image na maioria, Framer Motion 150KB sync na landing |
| Testes & QA | **4.5** | TST: testes críticos passam, 781+ mocks duplicados, backend sem cobertura, coverage web 69% (16pp abaixo gate), E2E sem fluxo PDV |
| Documentação & DX | **6.5** | DOC: 131 .md files, docs/architecture/ completo, README funcional, scripts discoverability baixa, ROADMAP stale |
| UX / UI / Design | **6.0** | MOB+FE: consistência visual boa, dark/light mode, mas loading states bloqueantes, sem skeleton screens, acessibilidade WCAG abaixo |
| Dependências & supply chain | **8.0** | AUDIT: 0 vulnerabilidades npm, overrides de segurança (protobufjs, vite), dependências major disponíveis (Prisma 7, ESLint 10) |
| Produto & valor | **7.0** | Escopo forte e funcional, operação real de bar/restaurante coberta. Gaps: mobile owner offline fraco, sem relatórios avançados. |

---

## Média Ponderada

| Peso | Eixo | Nota |
|---|---|---|
| 2x | Segurança & LGPD | 7.5 |
| 2x | Performance real | 5.0 |
| 2x | Arquitetura | 5.0 |
| 2x | Produto | 7.0 |
| 1.5x | Backend | 6.5 |
| 1.5x | Banco & dados | 7.0 |
| 1.5x | DevOps & infra | 8.0 |
| 1x | Frontend | 5.5 |
| 1x | Observabilidade | 5.5 |
| 1x | Performance percebida | 4.5 |
| 1x | Testes & QA | 4.5 |
| 1x | Responsividade | 7.0 |
| 1x | Documentação & DX | 6.5 |
| 1x | Dependências | 8.0 |
| 1x | UX / UI | 6.0 |
| 1x | API & contratos | 6.0 |

**Média ponderada: 6.1 / 10**

---

## Leitura

O projeto está em **6.1/10** — acima da média para dev solo (que tipicamente entrega 3-4), mas com gaps críticos em áreas de alto peso:
- Performance (4.5-5.0) e Arquitetura (5.0) puxam a média para baixo
- Segurança (7.5) e Infra (8.0) são os pontos fortes
- O gap de testes (4.5) é o limitador principal para evoluir qualquer outro eixo

**Trajetória:** se os P0 e P1 forem atacados, a nota sobe para ~7.2 em 30 dias.
