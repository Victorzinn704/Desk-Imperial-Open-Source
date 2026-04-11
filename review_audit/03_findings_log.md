# Log Cumulativo de Achados — Desk Imperial

**Data:** 2026-04-10  
**Critério:** apenas achados revalidados nesta rodada

---

## Resumo

| Prioridade | Qtde |
| --- | ---: |
| `P0` | 3 |
| `P1` | 8 |
| `P2` | 6 |
| `P3` | 2 |

---

## P0 — Crítico / Imediato

### AUD-001 — Build de produção do web está quebrado

- **Domínio:** Frontend / Release
- **Severidade:** Crítico
- **Prioridade:** P0
- **Classificação:** confirmado por execução
- **Evidência:** `npm run build` falhou porque [apps/web/app/page.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/page.tsx:3) usa `dynamic(..., { ssr: false })` em Server Component; o mesmo erro derrubou `npm --workspace @partner/web run test:e2e:critical`
- **Impacto:** bloqueia release do frontend
- **Recomendação:** mover essa carga dinâmica para Client Component intermediário ou devolver a home para SSR
- **Esforço:** baixo
- **Confiança:** muito alta

### AUD-003 — Cancelamento de pedido pode restaurar estoque duas vezes sob concorrência

- **Domínio:** Backend / Integridade de dados
- **Severidade:** Crítico
- **Prioridade:** P0
- **Classificação:** fato confirmado + inferência forte
- **Evidência:** relatório [backend-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/backend-reviewer.md); fluxo em [apps/api/src/modules/orders/orders.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/orders.service.ts:494) e [apps/api/src/modules/orders/orders.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/orders.service.ts:543)
- **Impacto:** corrupção de estoque e divergência financeira
- **Recomendação:** tornar cancelamento idempotente e revalidar status dentro da transação
- **Esforço:** médio
- **Confiança:** alta

### AUD-004 — Segredos operacionais estão em texto puro no workspace

- **Domínio:** Segurança / Infra
- **Severidade:** Crítico
- **Prioridade:** P0
- **Classificação:** fato confirmado
- **Evidência:** [.env](C:/Users/Desktop/Documents/desk-imperial/.env:11), [.env](C:/Users/Desktop/Documents/desk-imperial/.env:12), [infra/oracle/ops/README.md](C:/Users/Desktop/Documents/desk-imperial/infra/oracle/ops/README.md:19), [infra/oracle/ops/README.md](C:/Users/Desktop/Documents/desk-imperial/infra/oracle/ops/README.md:95)
- **Impacto:** exposição direta de credenciais de banco, observabilidade, e-mail e tokens
- **Recomendação:** mover para secret manager, apagar cópias plaintext e rotacionar imediatamente
- **Esforço:** baixo-médio
- **Confiança:** muito alta

---

## P1 — Alto / Prioritário

### AUD-005 — `STAFF` arquivado pode continuar autenticado por cache de sessão

- **Domínio:** Backend / Autorização
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado + inferência forte
- **Evidência:** [backend-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/backend-reviewer.md), [apps/api/src/modules/auth/auth.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:1508), [apps/api/src/modules/employees/employees.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/employees/employees.service.ts:211)
- **Impacto:** conta revogada pode operar por até o TTL do cache
- **Recomendação:** revogar sessões e limpar `auth:session:*` ao desativar funcionário
- **Esforço:** médio
- **Confiança:** alta

### AUD-006 — Dependências de runtime têm 8 vulnerabilidades conhecidas

- **Domínio:** Segurança / Supply chain
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** confirmado por execução
- **Evidência:** `npm audit --omit=dev --json` retornou `8` vulnerabilidades de produção (`7 high`, `1 moderate`), incluindo `next`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger`, `@nestjs/config` e `nodemailer`
- **Impacto:** CVEs conhecidas permanecem em runtime
- **Recomendação:** atualizar dependências de produção e rerodar build/testes críticos
- **Esforço:** médio
- **Confiança:** muito alta

### AUD-007 — CSV export do financeiro aceita formula injection

- **Domínio:** Frontend / Segurança funcional
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado
- **Evidência:** [apps/web/components/dashboard/finance-orders-table.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/finance-orders-table.tsx:44), [apps/web/components/dashboard/finance-orders-table.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/finance-orders-table.tsx:72), relatório [frontend-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/frontend-reviewer.md)
- **Impacto:** export para Excel/Sheets pode carregar fórmulas executáveis ou corromper dados
- **Recomendação:** centralizar encoder CSV seguro com escape e prefixo para células de risco
- **Esforço:** baixo
- **Confiança:** alta

### AUD-008 — Backend E2E existe, mas não entra na CI

- **Domínio:** QA / CI
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado
- **Evidência:** [apps/api/package.json](C:/Users/Desktop/Documents/desk-imperial/apps/api/package.json:17), [ci.yml](C:/Users/Desktop/Documents/desk-imperial/.github/workflows/ci.yml:73), relatório [qa-test-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/qa-test-reviewer.md)
- **Impacto:** regressão de integração backend pode passar pelo merge sem gate funcional real
- **Recomendação:** adicionar job de API E2E contra Postgres/Redis efêmeros
- **Esforço:** médio
- **Confiança:** alta

### AUD-009 — Cobertura do web exclui áreas críticas e usa testes de “coverage boost”

- **Domínio:** QA / Governança
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado
- **Evidência:** [apps/web/vitest.config.ts](C:/Users/Desktop/Documents/desk-imperial/apps/web/vitest.config.ts:19), [apps/web/vitest.config.ts](C:/Users/Desktop/Documents/desk-imperial/apps/web/vitest.config.ts:20), [apps/web/vitest.config.ts](C:/Users/Desktop/Documents/desk-imperial/apps/web/vitest.config.ts:39), [apps/api/test/auth.service.coverage-boost.spec.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/test/auth.service.coverage-boost.spec.ts:4)
- **Impacto:** cobertura reportada superestima a proteção real
- **Recomendação:** revisar exclusões, abandonar `all: false` no gate principal ou criar threshold por diretório crítico
- **Esforço:** médio
- **Confiança:** alta

### AUD-010 — Rollback é fraco porque migração roda no boot e deploy força recriação

- **Domínio:** Infra / Release engineering
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado + inferência forte
- **Evidência:** [infra/scripts/oracle-builder-deploy.ps1](C:/Users/Desktop/Documents/desk-imperial/infra/scripts/oracle-builder-deploy.ps1:264), [infra/oracle/docker/api.Dockerfile](C:/Users/Desktop/Documents/desk-imperial/infra/oracle/docker/api.Dockerfile:69), [apps/api/package.json](C:/Users/Desktop/Documents/desk-imperial/apps/api/package.json:12), relatório [infra-devops-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/infra-devops-reviewer.md)
- **Impacto:** migration ruim pode travar boot e tornar reversão lenta/manual
- **Recomendação:** separar migração do boot e promover release por imagem/tag com rollback explícito
- **Esforço:** médio-alto
- **Confiança:** alta

### AUD-011 — Backup/DR não está formalizado

- **Domínio:** Infra / Continuidade
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado
- **Evidência:** [infra/oracle/README.md](C:/Users/Desktop/Documents/desk-imperial/infra/oracle/README.md:29), relatório [infra-devops-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/infra-devops-reviewer.md)
- **Impacto:** aumenta severamente RTO/RPO
- **Recomendação:** definir RPO/RTO, automatizar backup e testar restore
- **Esforço:** médio
- **Confiança:** alta

### AUD-012 — SSH operacional e de deploy desabilita verificação de host

- **Domínio:** Infra / Segurança
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado
- **Evidência:** [infra/scripts/oracle-ops-tunnel.ps1](C:/Users/Desktop/Documents/desk-imperial/infra/scripts/oracle-ops-tunnel.ps1:16), [infra/scripts/oracle-builder-deploy.ps1](C:/Users/Desktop/Documents/desk-imperial/infra/scripts/oracle-builder-deploy.ps1:25)
- **Impacto:** enfraquece confiança no alvo do deploy e do túnel operacional
- **Recomendação:** ativar `StrictHostKeyChecking=yes` e fixar fingerprints
- **Esforço:** baixo
- **Confiança:** alta

### AUD-013 — Dados sensíveis ainda vazam em logs

- **Domínio:** Segurança / Privacidade
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado
- **Evidência:** `buyerDocument` existe no DTO de pedido em [create-order.dto.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/orders/dto/create-order.dto.ts:62), mas a redaction atual não cobre esse alias em [app.module.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/app.module.ts:79); fallback de e-mail loga OTP em [mailer.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/mailer/mailer.service.ts:50), [mailer.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/mailer/mailer.service.ts:69) e [mailer.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/mailer/mailer.service.ts:178)
- **Impacto:** CPF/CNPJ e OTP podem parar em logs/observabilidade
- **Recomendação:** redigir `buyerDocument`, proibir `EMAIL_PROVIDER=log` em produção e nunca registrar OTP em texto puro
- **Esforço:** baixo
- **Confiança:** alta

### AUD-014 — Há ciclo explícito entre `auth`, `consent` e `geocoding`

- **Domínio:** Arquitetura backend
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado
- **Evidência:** relatório [architecture-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/architecture-reviewer.md)
- **Impacto:** reduz independência dos contextos de identidade/onboarding
- **Recomendação:** extrair onboarding e quebrar ciclo por eventos/serviços intermediários
- **Esforço:** médio-alto
- **Confiança:** alta

### AUD-015 — `operations`, `products` e `finance` formam corredor de invalidação acoplado

- **Domínio:** Arquitetura / Domínio
- **Severidade:** Alto
- **Prioridade:** P1
- **Classificação:** fato confirmado + inferência forte
- **Evidência:** relatório [architecture-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/architecture-reviewer.md)
- **Impacto:** blast radius grande para mudanças operacionais e financeiras
- **Recomendação:** mover warming/invalidação para handlers de aplicação/eventos e reduzir acoplamento síncrono
- **Esforço:** médio-alto
- **Confiança:** alta

---

## P2 — Importante / Não urgente

### AUD-016 — Mudança de moeda preferida não invalida caches monetários

- **Domínio:** Backend / Consistência funcional
- **Severidade:** Médio
- **Prioridade:** P2
- **Classificação:** fato confirmado + inferência forte
- **Evidência:** [backend-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/backend-reviewer.md), [apps/api/src/modules/auth/auth.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth.service.ts:1438), [apps/api/src/common/services/cache.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/common/services/cache.service.ts:128)
- **Impacto:** UI pode exibir moeda/totais antigos até expirar TTL
- **Recomendação:** incluir moeda nas chaves ou invalidar explicitamente todos os caches monetários no update de perfil
- **Esforço:** baixo-médio
- **Confiança:** alta

### AUD-017 — KPI semanal começa no domingo

- **Domínio:** Backend / Analytics
- **Severidade:** Médio
- **Prioridade:** P2
- **Classificação:** fato confirmado
- **Evidência:** [apps/api/src/modules/finance/pillars.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/pillars.service.ts:72), [apps/api/src/modules/finance/pillars.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/finance/pillars.service.ts:198)
- **Impacto:** distorce leitura semanal para contexto comercial brasileiro
- **Recomendação:** adotar semana ISO ou tornar configurável
- **Esforço:** baixo
- **Confiança:** alta

### AUD-018 — CSRF por `Referer` aceita prefixo em vez de origem exata

- **Domínio:** Segurança
- **Severidade:** Médio
- **Prioridade:** P2
- **Classificação:** fato confirmado
- **Evidência:** [apps/api/src/modules/auth/guards/csrf.guard.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/guards/csrf.guard.ts:50), relatório [security-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/security-reviewer.md)
- **Impacto:** enfraquece a defesa CSRF quando `Origin` está ausente
- **Recomendação:** parsear e comparar origem normalizada, não prefixo
- **Esforço:** baixo
- **Confiança:** alta

### AUD-019 — Rotas `/app` ainda resolvem autenticação e destino no cliente

- **Domínio:** Frontend / UX / Performance
- **Severidade:** Médio
- **Prioridade:** P2
- **Classificação:** fato confirmado + inferência forte
- **Evidência:** [apps/web/app/app/page.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/app/page.tsx:1), [apps/web/app/app/owner/page.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/app/owner/page.tsx:1), [apps/web/app/app/staff/page.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/app/app/staff/page.tsx:1)
- **Impacto:** adiciona spinner/redirect pós-hidratação em superfícies operacionais
- **Recomendação:** empurrar decisão de rota/autorização para server-side ou reduzir o número de passos client-only
- **Esforço:** médio
- **Confiança:** alta

### AUD-020 — E2E do web quase não atravessa fluxos operacionais pós-login

- **Domínio:** QA / Produto
- **Severidade:** Médio
- **Prioridade:** P2
- **Classificação:** fato confirmado
- **Evidência:** relatório [qa-test-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/qa-test-reviewer.md)
- **Impacto:** regressões em PDV, operations e mobile podem passar com CI verde
- **Recomendação:** adicionar ao menos um fluxo E2E owner/staff/PDV/operations
- **Esforço:** médio
- **Confiança:** alta

### AUD-021 — Documentação principal tem drift material

- **Domínio:** Documentação / DX
- **Severidade:** Médio
- **Prioridade:** P2
- **Classificação:** fato confirmado
- **Evidência:** [README.md](C:/Users/Desktop/Documents/desk-imperial/README.md:200) e [docs/testing/testing-guide.md](C:/Users/Desktop/Documents/desk-imperial/docs/testing/testing-guide.md:84) ainda descrevem build como gate da CI; [docs/product/requirements.md](C:/Users/Desktop/Documents/desk-imperial/docs/product/requirements.md:237) marca “Deploy contínuo via Railway com zero downtime” como implementado; [README.md](C:/Users/Desktop/Documents/desk-imperial/README.md:214) descreve pacotes inexistentes
- **Impacto:** onboarding e decisão técnica partem de premissas erradas
- **Recomendação:** alinhar README/docs/CLAUDE ao runtime e à pipeline reais
- **Esforço:** médio
- **Confiança:** muito alta

---

## P3 — Evolutivo

### AUD-022 — `DashboardShell` e `use-operations-realtime` concentram coordenação demais

- **Domínio:** Frontend / Arquitetura
- **Severidade:** Baixo-Médio
- **Prioridade:** P3
- **Classificação:** inferência forte
- **Evidência:** [apps/web/components/dashboard/dashboard-shell.tsx](C:/Users/Desktop/Documents/desk-imperial/apps/web/components/dashboard/dashboard-shell.tsx), [apps/web/components/operations/use-operations-realtime.ts](C:/Users/Desktop/Documents/desk-imperial/apps/web/components/operations/use-operations-realtime.ts), relatórios [frontend-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/frontend-reviewer.md) e [architecture-reviewer.md](C:/Users/Desktop/Documents/desk-imperial/review_audit/agents/architecture-reviewer.md)
- **Impacto:** reduz testabilidade e aumenta custo de mudança
- **Recomendação:** quebrar shell por responsabilidade e decompor patching de realtime
- **Esforço:** médio
- **Confiança:** alta

### AUD-023 — Observabilidade existe, mas alertas e correlação ainda são parciais

- **Domínio:** Observabilidade / SRE
- **Severidade:** Baixo-Médio
- **Prioridade:** P3
- **Classificação:** fato confirmado + risco potencial
- **Evidência:** [infra/docker/docker-compose.observability.yml](C:/Users/Desktop/Documents/desk-imperial/infra/docker/docker-compose.observability.yml), [infra/docker/observability/prometheus/alert.rules.yml](C:/Users/Desktop/Documents/desk-imperial/infra/docker/observability/prometheus/alert.rules.yml), [apps/web/lib/observability/faro.ts](C:/Users/Desktop/Documents/desk-imperial/apps/web/lib/observability/faro.ts), [apps/api/src/common/utils/otel.util.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/common/utils/otel.util.ts)
- **Impacto:** boa detecção de indisponibilidade, mas cobertura incompleta para incidentes de produto/segurança
- **Recomendação:** definir fluxo oficial browser → API → logs → audit log e ampliar alertas para SLO/security/business
- **Esforço:** médio
- **Confiança:** média-alta
