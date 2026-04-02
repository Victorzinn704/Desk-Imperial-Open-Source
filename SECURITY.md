# Política de Segurança — Desk Imperial

---

## Versão suportada

| Branch           | Suporte de segurança |
| ---------------- | -------------------- |
| `main`           | ✅ Ativo             |
| branches antigas | ❌ Sem suporte       |

Apenas a branch `main` recebe correções de segurança.

---

## Como reportar uma vulnerabilidade

**Não abra uma issue pública com detalhes de vulnerabilidade.**

Issues públicas com informação de segurança sensível expõem outros usuários antes da correção estar disponível.

### Processo correto

1. Documente a vulnerabilidade com:
   - Descrição clara do problema
   - Passos para reproduzir
   - Impacto estimado (quais dados ou usuários são afetados)
   - Versão afetada (commit ou data)
   - Se possível, sugestão de correção

2. Envie as informações de forma privada ao mantenedor do projeto.
   - GitHub: use a aba **Security → Report a vulnerability** no repositório
   - Ou entre em contato direto com o mantenedor via perfil GitHub

3. Aguarde confirmação de recebimento em até 5 dias úteis.

4. A correção será desenvolvida e publicada antes de qualquer divulgação pública.

---

## O que está protegido

### Autenticação e sessão

- Sessão via cookie `HttpOnly` + `Secure` + `SameSite` — inacessível ao JavaScript do cliente
- CSRF token duplo em todas as mutações autenticadas: cookie + header validados por `CsrfGuard`
- Validação de `Origin` e `Referer` nas requisições mutáveis
- Senhas armazenadas com `argon2id`

### Rate limiting

- Rate limit por domínio em Redis para todos os endpoints sensíveis:
  - Login: 5 tentativas / 15 min → bloqueio de 15 min
  - Reset de senha: 3 tentativas / 15 min → bloqueio de 30 min
  - Verificação de e-mail: 3 tentativas / 15 min → bloqueio de 30 min
  - Admin PIN: 3 tentativas → bloqueio de 5 min

### Admin PIN

- PIN verificado server-side com challenge efêmero
- Prova de verificação armazenada em cookie `HttpOnly` — nunca exposta ao JavaScript
- Bloqueio automático após tentativas inválidas consecutivas
- Detalhes em [docs/security/admin-pin-hardening.md](./docs/security/admin-pin-hardening.md)

### Isolamento de dados

- Todos os dados são isolados por `companyOwnerId` (workspace)
- Nenhuma query retorna dados de outro tenant
- Guards validam identidade antes de qualquer acesso a dado de negócio

### Auditoria

- Audit log de eventos sensíveis: login, falhas de autenticação, operações administrativas
- Campos sensíveis são redigidos nos logs (senhas, tokens, PINs)
- Request ID rastreável por requisição

### Conformidade

- LGPD: consentimento explícito de cookies por usuário autenticado
- Versionamento de documentos legais com registro de aceite
- Dados pessoais não são expostos em logs ou respostas desnecessárias

---

## Checklist de deploy seguro

Antes de publicar em produção:

- [ ] `COOKIE_SECRET` e `CSRF_SECRET` definidos com valores únicos e longos
- [ ] `ENCRYPTION_KEY` definida com 32+ caracteres
- [ ] HTTPS habilitado (`COOKIE_SECURE=true`, `COOKIE_SAME_SITE=strict`)
- [ ] CORS configurado para o domínio oficial do frontend
- [ ] Swagger desabilitado em produção (`ENABLE_SWAGGER=false`)
- [ ] Redis configurado (rate limit não funciona em escala sem Redis)
- [ ] Brevo configurado para e-mails de recuperação de senha e verificação
- [ ] `TRUST_PROXY=true` se estiver atrás de proxy reverso (Railway, Nginx)
- [ ] Variáveis de ambiente não expostas em logs ou respostas de erro

Veja o checklist completo em [docs/security/deploy-checklist.md](./docs/security/deploy-checklist.md).

---

## Limitações de segurança conhecidas

- Stack OSS de observabilidade em rollout progressivo (OpenTelemetry + Alloy + Tempo + Loki + Prometheus)
- Cobertura de testes de segurança ainda parcial no frontend
- Service Worker limitado ao módulo `/app` — não cobre todas as rotas

Essas limitações estão documentadas em [docs/product/risks-and-limitations.md](./docs/product/risks-and-limitations.md).

---

## Documentação adicional

- [docs/security/security-baseline.md](./docs/security/security-baseline.md) — baseline de segurança do projeto
- [docs/security/admin-pin-hardening.md](./docs/security/admin-pin-hardening.md) — hardening do Admin PIN
- [docs/security/deploy-checklist.md](./docs/security/deploy-checklist.md) — checklist de deploy seguro
- [docs/security/observability-and-logs.md](./docs/security/observability-and-logs.md) — logs e observabilidade
- [docs/security/dependency-risk-acceptance-2026-04-01.md](./docs/security/dependency-risk-acceptance-2026-04-01.md) — aceite temporário de risco de dependências
