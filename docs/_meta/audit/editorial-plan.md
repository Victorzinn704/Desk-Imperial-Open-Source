# Plano Editorial - Auditoria de Documentacao

- Data: 2026-05-01
- Base: `docs/_meta/audit/recon.md` + `docs/_meta/audit/drift-matrix.md`
- Regra desta passada: **corrigir governanca e docs canonicos primeiro; nao fazer big-bang de 130+ arquivos.**

## 1. Objetivo editorial

Transformar a documentacao do Desk Imperial em uma estrutura confiavel para:

- onboarding tecnico
- contribuicao
- operacao
- auditoria de seguranca
- manutencao de waves

Sem apagar historico util e sem rebatizar metade do repositorio por vaidade.

## 2. Estrutura final-alvo recomendada

Em vez de reestruturar todo o `docs/` de uma vez, a estrutura-alvo deve **preservar a arvore atual** e fortalecer os pontos de entrada:

```text
docs/
├── README.md                     # como navegar e o que é canonico
├── INDEX.md                      # indice navegavel do acervo atual
├── product/                      # contrato de produto atual
├── architecture/                 # arquitetura atual
├── operations/                   # runbooks e operacao
├── security/                     # baseline, hardening e testing
├── testing/                      # estrategia e cobertura
├── waves/                        # recovery plans ativos e checklists
├── release/                      # historico tecnico, nao canonico
├── case-studies/                 # historico tecnico, nao canonico
├── agents/                       # material de apoio interno, nao canonico
└── _meta/
    ├── style-guide.md
    ├── contribution.md
    └── audit/
        ├── recon.md
        ├── drift-matrix.md
        ├── editorial-plan.md
        └── validation-report.md
```

## 3. Canon de documentacao recomendado

### 3.1 Canonicos

Estes arquivos devem refletir o estado atual do sistema e ser atualizados junto com mudancas relevantes:

1. `README.md`
2. `docs/README.md`
3. `docs/INDEX.md`
4. `docs/product/overview.md`
5. `docs/product/requirements.md`
6. `docs/product/risks-and-limitations.md`
7. `docs/architecture/overview.md`
8. `docs/architecture/authentication-flow.md`
9. `docs/architecture/local-development.md`
10. `docs/architecture/modules.md`
11. `docs/architecture/realtime.md`
12. `docs/architecture/database.md`
13. `docs/operations/flows.md`
14. `docs/security/security-baseline.md`
15. `docs/security/deploy-checklist.md`
16. `docs/testing/testing-guide.md`

### 3.2 Operacionais ativos

Estes arquivos sao datados, mas continuam validos como runbooks ativos:

- `docs/operations/telegram-bot-rollout.md`
- `docs/operations/realtime-performance-runbook.md`
- `docs/security/security-testing-workflow-2026-04-30.md`
- `docs/waves/realtime-wave-0-inventory-2026-05-01.md`
- `docs/waves/realtime-recovery-plan-2026-05-01.md`
- `docs/waves/realtime-validation-checklist-2026-05-01.md`
- `docs/waves/dead-code-verification-2026-05-01.md`

### 3.3 Historicos

Estes arquivos devem ser preservados, mas explicitamente tratados como historico:

- `docs/release/*`
- `docs/case-studies/*`
- `review_audit/*`
- `docs/agents/*`
- `DOCS_DESK_IMPERIAL.md`

## 4. Sequencia de execucao recomendada

### Etapa A - Governanca e portas de entrada

Corrigir primeiro:

1. `README.md`
2. `docs/README.md`
3. `docs/INDEX.md`
4. `DOCS_DESK_IMPERIAL.md`

Motivo: enquanto esses arquivos continuarem apontando para a fonte errada, todo o resto do acervo vai parecer mais desatualizado do que realmente esta.

### Etapa B - Produto e arquitetura nuclear

Corrigir em seguida:

1. `docs/product/overview.md`
2. `docs/product/requirements.md`
3. `docs/product/risks-and-limitations.md`
4. `docs/architecture/modules.md`
5. `docs/architecture/realtime.md`
6. `docs/architecture/database.md`

### Etapa C - Operacao e seguranca

Corrigir depois:

1. `docs/operations/flows.md`
2. `docs/security/deploy-checklist.md`
3. `docs/security/security-baseline.md`
4. `docs/operations/realtime-performance-runbook.md`
5. `docs/operations/telegram-bot-rollout.md`

### Etapa D - Completar lacunas novas

Criar docs especificas para o que hoje ja existe e ainda nao aparece de forma canonica:

1. Sentry web/api
2. Telegram integration + notification preferences
3. smart product draft / cadastro inteligente
4. barcode + catalog enrichment
5. style guide e contribution guide de docs

## 5. Delta plan

| Arquivo-alvo                                      | Ação     | Fontes de evidência                                                                                                                                                                                                                     |
| ------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                       | `UPDATE` | `apps/web/package.json`, `apps/api/package.json`, `apps/api/src/main.ts`, `infra/oracle/compose.yaml`, `infra/scripts/oracle-builder-deploy.ps1`, `apps/api/src/modules/notifications/*`, `apps/web/next.config.ts`                     |
| `docs/README.md`                                  | `UPDATE` | `docs/_meta/audit/drift-matrix.md`, `docs/waves/*`, `docs/operations/telegram-bot-rollout.md`, `docs/security/security-testing-workflow-2026-04-30.md`                                                                                  |
| `docs/INDEX.md`                                   | `UPDATE` | `docs/_meta/audit/drift-matrix.md`, inventario real de `docs/`, current modules/routes                                                                                                                                                  |
| `DOCS_DESK_IMPERIAL.md`                           | `MERGE`  | manter como snapshot historico, remover papel de fonte primaria                                                                                                                                                                         |
| `docs/product/overview.md`                        | `UPDATE` | `apps/api/src/modules/notifications/*`, `apps/api/src/modules/products/products-smart-draft.service.ts`, `apps/web/app/api/barcode/lookup/route.ts`, `apps/web/app/api/media/pexels/search/route.ts`                                    |
| `docs/product/requirements.md`                    | `UPDATE` | `apps/api/src/modules/products/products.controller.ts`, `apps/api/src/modules/notifications/*`, `apps/api/src/main.ts`, `infra/oracle/compose.yaml`                                                                                     |
| `docs/product/risks-and-limitations.md`           | `UPDATE` | `infra/oracle/compose.yaml`, `infra/scripts/oracle-builder-deploy.ps1`, `docs/waves/realtime-recovery-plan-2026-05-01.md`                                                                                                               |
| `docs/architecture/overview.md`                   | `UPDATE` | `apps/api/src/app.module.ts`, `apps/web/lib/observability/sentry.ts`, `apps/api/src/modules/notifications/*`, `apps/api/src/modules/operations-realtime/*`                                                                              |
| `docs/architecture/authentication-flow.md`        | `UPDATE` | `apps/api/src/modules/auth/auth.controller.ts`, `auth-session.service.ts`, `main.ts`                                                                                                                                                    |
| `docs/architecture/local-development.md`          | `UPDATE` | root `package.json`, `.env.example`, `apps/api/src/app.module.ts`, `apps/web/lib/observability/sentry.ts`, `scripts/*`                                                                                                                  |
| `docs/architecture/modules.md`                    | `UPDATE` | `apps/api/src/app.module.ts`, `apps/api/src/modules/*`, `apps/api/src/cache/cache.module.ts`                                                                                                                                            |
| `docs/architecture/realtime.md`                   | `UPDATE` | `apps/api/src/modules/operations-realtime/operations-realtime.types.ts`, `operations-realtime.gateway.ts`, `apps/web/components/operations/hooks/use-operations-socket.ts`, `apps/web/components/operations/use-operations-realtime.ts` |
| `docs/architecture/database.md`                   | `UPDATE` | `apps/api/prisma/schema.prisma`, auth session code, notification/telegram services                                                                                                                                                      |
| `docs/operations/flows.md`                        | `UPDATE` | `apps/api/src/modules/operations/operations.controller.ts`, `apps/api/src/modules/admin-pin/*`, `operations-realtime.socket-auth.ts`                                                                                                    |
| `docs/security/security-baseline.md`              | `UPDATE` | `apps/api/src/main.ts`, `auth-session.service.ts`, `field-encryption.util.ts`, `apps/api/src/instrument.ts`                                                                                                                             |
| `docs/security/deploy-checklist.md`               | `UPDATE` | `infra/oracle/compose.yaml`, `infra/scripts/oracle-builder-deploy.ps1`, `apps/web/next.config.ts`, `apps/api/src/instrument.ts`                                                                                                         |
| `docs/operations/realtime-performance-runbook.md` | `UPDATE` | `docs/waves/realtime-recovery-plan-2026-05-01.md`, `apps/api/src/common/observability/business-telemetry.util.ts`, `apps/web/lib/operations/operations-performance-diagnostics.ts`                                                      |
| `docs/operations/telegram-bot-rollout.md`         | `UPDATE` | `apps/api/src/modules/notifications/telegram-bot.service.ts`, `notification-preferences.controller.ts`, `scripts/configure-telegram-bot-profile.mjs`                                                                                    |
| `docs/operations/sentry-rollout-2026-05-01.md`    | `CREATE` | `apps/api/src/instrument.ts`, `apps/api/src/app.module.ts`, `apps/web/lib/observability/sentry.ts`, `apps/web/next.config.ts`, `apps/web/scripts/sentry-smoke.mjs`                                                                      |
| `docs/product/catalog-intelligence.md`            | `CREATE` | `apps/api/src/modules/products/products-smart-draft.service.ts`, `apps/web/app/api/barcode/lookup/route.ts`, `apps/web/app/api/media/pexels/search/route.ts`, `apps/web/lib/product-visuals.ts`                                         |
| `docs/_meta/style-guide.md`                       | `CREATE` | prompt de auditoria + locked terms do dominio extraidos do codigo                                                                                                                                                                       |
| `docs/_meta/contribution.md`                      | `CREATE` | processo real de manutencao docs, `.claude/napkin.md`, quality scripts, no-drift rules                                                                                                                                                  |

## 6. Regras de reescrita

1. **Nao contar modulo por numero fixo**.
   - Use lista nominal.
2. **Nao tratar `docs/release/*` como fonte primaria**.
   - Eles entram como referencia historica.
3. **Nao misturar historico com contrato atual**.
   - Documentos datados podem ficar; so precisam ser rotulados direito.
4. **Nao reescrever a arvore toda agora**.
   - Corrigir onboarding e docs canonicos primeiro.
5. **Sempre ligar claim a artefato real**.
   - rota, model Prisma, env var, modulo, workflow, script ou migration.

## 7. Critério de pronto desta trilha

Esta auditoria so vira "fechada" quando:

- `README.md`, `docs/README.md` e `docs/INDEX.md` apontarem para o conjunto certo de docs;
- nenhum doc canonico relevante tratar Railway/Neon como estado atual quando isso ja nao for verdade no repo;
- a arquitetura realtime estiver documentada com `/operations`, dot events e rooms segmentadas;
- auth/PIN pararem de falar em JWT/Bearer onde o fluxo real usa cookie/challenge opaco;
- Telegram, Sentry e cadastro inteligente aparecerem pelo menos uma vez no acervo canonico.
