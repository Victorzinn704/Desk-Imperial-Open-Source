# Changelog

Todas as mudanças relevantes do projeto são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).
Versioning segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Não lançado]

### Adicionado

- Documentação nível enterprise: requisitos, fluxos, riscos, arquitetura, segurança, testes
- `docs/DEMO.md` — guia de acesso ao ambiente de demonstração
- `docs/architecture/security.md` — arquitetura de segurança detalhada
- `docs/testing/testing-guide.md` — guia completo de testes
- `ROADMAP.md` — roadmap público com estado real do projeto
- `CONTRIBUTING.md` — guia de contribuição
- `SECURITY.md` — política de segurança e processo de reporte
- `CODE_OF_CONDUCT.md` — código de conduta
- `CHANGELOG.md` — este arquivo

### Alterado

- `README.md` reescrito com stack completa, funcionalidades, testes e links de documentação
- `package.json` raiz renomeado de `partner-portal-monorepo` para `desk-imperial`

### Removido

- `packages/ui` — scaffold vazio sem código implementado
- `packages/config` — scaffold vazio sem código implementado
- `apps/api/src/modules/users/` — diretório vazio
- Todos os arquivos `.gitkeep` em diretórios que já tinham conteúdo real
- Diretórios de scaffold NestJS sem implementação (`common/decorators`, `common/guards`, `common/interceptors`, `common/pipes`, `common/config`)

---

## [0.1.0] — 2026-03-14

### Adicionado

- PDV / Comandas com kanban 4 colunas (Aberta → Em Preparo → Pronta → Fechada)
- Operações em tempo real via Socket.IO com Redis Pub/Sub
- Financeiro com KPIs por período (dia, semana, mês)
- Folha de pagamento automática (salário fixo + comissão sobre vendas)
- Gestão de equipe com ranking de vendedores e metas
- Calendário comercial com eventos e correlação com vendas
- Mapa de vendas via geocodificação Nominatim
- Export CSV de pedidos
- Admin PIN com rate limit e challenge efêmero
- Mobile dedicado para dono (OWNER) e funcionário (STAFF)
- Autenticação segura: cookies HttpOnly, CSRF duplo, argon2id, rate limit
- Insight executivo com IA via Gemini com cache Redis
- Conformidade LGPD: consentimento explícito e versionamento de documentos legais
- CI com 6 estágios: lint, typecheck, testes, e2e, security audit, build
- 53+ testes no backend cobrindo todos os módulos críticos
- Testes E2E com Playwright
- Scripts de load test com K6

---

<!-- Links de comparação -->

[Não lançado]: https://github.com/Victorzinn704/desk-imperial/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Victorzinn704/desk-imperial/releases/tag/v0.1.0
