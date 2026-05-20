# Estado Atual do Projeto

**Data:** 2026-05-19
**Estado:** canonico
**Escopo:** retrato operacional e tecnico de retomada. Use este arquivo para saber o que e verdade agora antes de abrir nova frente.

## Resumo executivo

O Desk Imperial ja tem produto full-stack em producao com API, web, PWA owner/staff, realtime, Telegram, Mercado Pago Point, impressao termica, observabilidade, catalogo inteligente e Oracle Cloud. O risco principal deixou de ser falta de funcionalidade e passou a ser disciplina operacional: medir performance, manter CI confiavel, reduzir drift documental e provar rollback/backup/alertas.

## Runtime atual

| Area            | Estado atual                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------- |
| Backend         | NestJS 11, Prisma, PostgreSQL, Redis, Socket.IO e API versionada em `/api/v1`                 |
| Frontend        | Next.js 16, React 19, TanStack Query, PWA owner/staff e dashboards desktop                    |
| Banco/cache     | PostgreSQL + Redis; Oracle/Ampere e scripts de acesso/deploy versionados                      |
| Tempo real      | Namespace `/operations`, rooms por workspace/domínio e patches incrementais com fallback REST |
| Pagamentos      | Mercado Pago Point integrado ao fluxo de comanda por intent/webhook                           |
| Impressao       | QZ Tray e caminhos de impressao termica documentados em runbook proprio                       |
| Notificacoes    | Telegram, e-mail e preferencias por workspace/usuario                                         |
| Observabilidade | Sentry, OpenTelemetry, Grafana Faro e runbooks de rollout                                     |
| Qualidade       | CI, quality gates, scripts de escopo, contratos, segredos, performance e readiness            |

## Fontes canonicas

Leia nesta ordem quando houver duvida:

1. [README](../README.md)
2. [docs/INDEX.md](./INDEX.md)
3. Este arquivo
4. [architecture/overview.md](./architecture/overview.md)
5. [architecture/modules.md](./architecture/modules.md)
6. [architecture/realtime.md](./architecture/realtime.md)
7. [architecture/collaboration-evidence-workflow.md](./architecture/collaboration-evidence-workflow.md)
8. [operations/production-operational-readiness.md](./operations/production-operational-readiness.md)
9. [operations/open-source-sync-runbook.md](./operations/open-source-sync-runbook.md)
10. [operations/realtime-performance-runbook.md](./operations/realtime-performance-runbook.md)
11. [security/security-baseline.md](./security/security-baseline.md)
12. [security/threat-model-critical-flows.md](./security/threat-model-critical-flows.md)
13. [testing/testing-guide.md](./testing/testing-guide.md)

`docs/release/*` e `DOCS_DESK_IMPERIAL.md` sao historico tecnico. Eles ajudam a entender decisoes, mas nao substituem os documentos acima.

## Gates obrigatorios antes de release

```bash
npm run ops:readiness -- --strict --report .cache/operational-readiness.md
npm run quality:offline-release -- --profile standard
npm run quality:scope:strict
npm run quality:contracts
npm run lint:secrets
npm run repo:scan-public
```

Enquanto o GitHub Actions estiver bloqueado por billing, use `quality:offline-release` como evidencia local rastreavel. O resultado correto nesse periodo e "validado localmente, CI remoto bloqueado por billing", nao "CI verde".

Para performance operacional local:

```bash
npm run perf:operations:local
```

Esse comando prepara backend local, compila API/web, sobe servidores controlados, roda smoke REST + PWA/realtime em modo estrito, grava relatorios em `.cache/performance/local-suite/<data>/` e derruba processos no final.

## Bloqueios conhecidos

| Bloqueio                                                     | Impacto                                                                      | Acao                                                                                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions nao inicia jobs por billing/spending limit    | CI remoto fica vermelho mesmo com codigo local validado                      | Ate 2026-05-31, anexar `.cache/offline-release/latest.md` como evidencia local; regularizar billing antes de exigir CI verde |
| Docker Desktop precisa estar ativo para suite local completa | `perf:operations:local` nao consegue preparar Postgres/Redis local           | Abrir Docker Desktop/Linux engine antes de rodar a suite                                                                     |
| PWA Android ainda precisa de medicao em dispositivo real     | Local pode estar verde enquanto Android sofre por rede/device/service worker | Rodar smoke local primeiro; depois medir Android real com a mesma cadeia de eventos                                          |

## Ordem de trabalho atual

1. **Operacao e release:** manter readiness, CI, staging, rollback, backup e alertas como bloqueadores reais.
2. **Performance PWA/realtime:** medir abrir comanda, adicionar item, cozinha, fechar/pagar/imprimir e corrigir o maior gargalo provado.
3. **Documentacao sem drift:** manter README, `docs/INDEX.md`, este arquivo e os runbooks de dominio atualizados no mesmo commit da mudanca.
4. **Open source sem drift:** sincronizar o privado com o publico via [open-source-sync-runbook](./operations/open-source-sync-runbook.md), branch `public-sync/*`, scans e PR; nunca push direto em `public/main`.
5. **Seguranca comprovavel:** threat model, testes negativos por workspace, DAST em staging e plano de criptografia at-rest/Admin PIN.
6. **Evidencia de colaboracao:** PRs pequenos, RFCs curtas, issues com criterio de aceite e revisao externa quando possivel.
7. **Registro revisavel:** usar [collaboration-evidence-workflow](./architecture/collaboration-evidence-workflow.md) para mudancas com risco.

## Regra de atualizacao

Atualize este arquivo quando uma mudanca alterar:

- runtime principal;
- CI/readiness;
- deploy, Oracle ou staging;
- performance PWA/realtime;
- Mercado Pago, Telegram, impressao ou observabilidade;
- sincronizacao entre repositorio privado e open source;
- fonte canonica de documentacao.
