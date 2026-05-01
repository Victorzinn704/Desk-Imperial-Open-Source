# Documentacao do Projeto

Este arquivo organiza a documentacao do Desk Imperial por prioridade de leitura, confiabilidade e status editorial.

## 1. Ordem Recomendada de Leitura

1. `../README.md`
2. `./INDEX.md`
3. trilhas canonicas de `product/`, `architecture/`, `operations/`, `security/` e `testing/`
4. `waves/` ativas para trabalhos em andamento
5. `release/` e `../DOCS_DESK_IMPERIAL.md` como material historico e de auditoria

## 2. Fontes Canonicas

As fontes canonicas para entendimento tecnico atual sao:

- `../README.md`
- `./INDEX.md`
- `architecture/overview.md`
- `architecture/modules.md`
- `architecture/authentication-flow.md`
- `architecture/local-development.md`
- `product/overview.md`
- `product/requirements.md`
- `operations/telegram-bot-rollout.md`
- `operations/sentry-rollout-2026-05-01.md`
- `operations/realtime-performance-runbook.md`
- `security/security-baseline.md`
- `security/security-testing-workflow-2026-04-30.md`
- `testing/testing-guide.md`
- `waves/realtime-recovery-plan-2026-05-01.md`

## 3. Fontes Historicas ou Secundarias

Estes grupos continuam uteis, mas nao sao a fonte primaria do estado atual:

- `../DOCS_DESK_IMPERIAL.md` — snapshot consolidado historico de auditoria
- `release/` — diagnosticos, pareceres e planos de momentos anteriores
- `case-studies/` — estudos e analises de mudanca
- `agents/`, `review_audit/` e `_meta/` — apoio interno de auditoria e governanca

## 4. Status da Documentacao

### 4.1 Atual e confiavel

- `../README.md`
- `./INDEX.md`
- `architecture/overview.md`
- `architecture/authentication-flow.md`
- `architecture/local-development.md`
- `testing/testing-guide.md`
- `operations/telegram-bot-rollout.md`
- `operations/sentry-rollout-2026-05-01.md`
- `security/security-testing-workflow-2026-04-30.md`
- `waves/realtime-*`

### 4.2 Parcialmente atual

- `architecture/realtime.md`
- `security/security-baseline.md`
- `operations/kpi-realtime-mapping.md`
- `product/overview.md`
- `product/requirements.md`

### 4.3 Historico, nao canonico

- `../DOCS_DESK_IMPERIAL.md`
- `release/`

## 5. Regras de Manutencao

- Toda mudanca de comportamento de API, auth, realtime, notificacao ou deploy deve atualizar documento canonico no mesmo commit.
- Documento parcialmente atual deve explicitar limites de cobertura.
- Documento historico nao pode ser promovido a fonte primaria sem revisao formal.
- Evitar texto de marketing tecnico; documentar comportamento observavel, risco residual e tradeoff.
- Para claims de seguranca, sempre ligar com implementacao real e limitacao conhecida.

## 6. Definicao de Pronto para Docs

Uma entrega de documentacao e considerada pronta quando:

1. esta alinhada ao comportamento atual do codigo
2. declara explicitamente lacunas e riscos
3. nao contradiz as fontes canonicas
4. permite onboarding tecnico sem dependencia de contexto oral
