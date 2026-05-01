# Changelog

Todas as mudancas relevantes do projeto sao documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).  
Versioning segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Nao lancado]

### Adicionado

- Documentacao publica do rollout de Telegram em [docs/operations/telegram-bot-rollout.md](./docs/operations/telegram-bot-rollout.md)
- Documentacao publica do rollout de Sentry em [docs/operations/sentry-rollout-2026-05-01.md](./docs/operations/sentry-rollout-2026-05-01.md)
- Workflow publico de testes de seguranca em [docs/security/security-testing-workflow-2026-04-30.md](./docs/security/security-testing-workflow-2026-04-30.md)
- Trilha publica de recovery do realtime em:
  - [docs/waves/realtime-wave-0-inventory-2026-05-01.md](./docs/waves/realtime-wave-0-inventory-2026-05-01.md)
  - [docs/waves/realtime-recovery-plan-2026-05-01.md](./docs/waves/realtime-recovery-plan-2026-05-01.md)
  - [docs/waves/realtime-validation-checklist-2026-05-01.md](./docs/waves/realtime-validation-checklist-2026-05-01.md)
- Politica explicita de sync por waves entre monorepo principal e mirror aberto
- Documentacao publica do estoque inteligente em [docs/product/stock-management.md](./docs/product/stock-management.md)
- `docs/DEMO.md` - guia de acesso ao ambiente de demonstracao
- `SECURITY.md` - politica de seguranca e processo de reporte
- `CONTRIBUTING.md` - guia de contribuicao

### Alterado

- `README.md`, `docs/README.md`, `docs/INDEX.md`, `docs/product/overview.md` e `DOCS_DESK_IMPERIAL.md` foram atualizados para refletir:
  - Telegram como trilha empresarial documentada
  - Sentry em web e API
  - recovery do realtime em waves
  - seguranca por ordem correta de ferramentas
  - diferenca entre mirror aberto e monorepo principal
- `README.md` agora aponta para as trilhas publicas mais novas de Telegram, Sentry, security workflow e realtime recovery
- `package.json` raiz renomeado de `partner-portal-monorepo` para `desk-imperial`

### Documentado

- Producao atual em Oracle Cloud com Docker Compose e observabilidade em waves
- Rollout de Sentry em web e API com release + sourcemaps
- Rollout do bot Telegram como trilha empresarial do produto
- Recovery do realtime tratado como programa tecnico por waves, nao como ajuste isolado

### Removido

- `packages/ui` - scaffold vazio sem codigo implementado
- `packages/config` - scaffold vazio sem codigo implementado
- `apps/api/src/modules/users/` - diretorio vazio
- arquivos de scaffold sem implementacao real na arvore publica

---

## [0.1.0] - 2026-03-14

### Adicionado

- PDV / Comandas com kanban 4 colunas
- Operacoes em tempo real via Socket.IO
- Financeiro com KPIs por periodo
- Folha de pagamento automatica
- Gestao de equipe com ranking
- Calendario comercial
- Mapa de vendas via geocodificacao
- Export CSV de pedidos
- Admin PIN com rate limit e challenge efemero
- Mobile dedicado para dono e funcionario
- Autenticacao segura com cookies HttpOnly, CSRF duplo e rate limit
- Insight executivo com IA via Gemini
- Conformidade LGPD
- CI com 6 estagios
- Testes E2E com Playwright
- Scripts de load test com K6

---

[Nao lancado]: https://github.com/Victorzinn704/desk-imperial/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Victorzinn704/desk-imperial/releases/tag/v0.1.0
