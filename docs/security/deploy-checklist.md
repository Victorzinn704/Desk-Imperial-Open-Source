# Checklist de Deploy Seguro

Use esta lista antes de publicar o projeto em ambiente publico.

## 1. Rotacione todos os segredos expostos

- gere uma nova senha do banco no Neon
- gere uma nova `SMTP key` no Brevo
- gere ou rotacione a `API key` da Brevo para envio transacional
- revogue as credenciais antigas
- atualize os segredos no provedor de deploy

Observacao:
- qualquer segredo compartilhado fora do sistema deve ser tratado como comprometido

## 2. Proteja a conta e o projeto no Neon

- ative `2FA` na conta Neon
- use somente `DATABASE_URL` e `DIRECT_URL` no servidor
- mantenha `sslmode=require` nas connection strings
- nao use a Data API do Neon no frontend
- se o plano permitir, ative `IP Allow`
- se o plano permitir, use branch protegida para producao

## 3. Segredos e variaveis de ambiente

Somente no servidor:

- `DATABASE_URL`
- `DIRECT_URL`
- `COOKIE_SECRET`
- `CSRF_SECRET`
- `ENCRYPTION_KEY`
- `BREVO_API_URL`
- `BREVO_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_REQUIRE_TLS`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_NAME`
- `SMTP_FROM_EMAIL`
- `EMAIL_REPLY_TO`
- `EMAIL_SUPPORT_ADDRESS`
- `LOGIN_ALERT_EMAILS_ENABLED`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

Observacao:
- se a API continuar na Railway em plano `Free`, `Trial` ou `Hobby`, nao dependa de `SMTP_*`
- para email transacional funcionando em producao, configure `BREVO_API_KEY`
- `GEMINI_API_URL`

Podem ser publicas:

- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_MAP_STYLE_URL`

Regras:

- nunca usar `NEXT_PUBLIC_` para segredos
- nunca commitar `.env`
- configure os segredos diretamente no host de deploy

## 4. GitHub

- confirme que `.env` nao esta versionado
- habilite `push protection` e `secret scanning`
- revise `git status` antes de cada push
- mantenha o repositorio privado ate terminar a limpeza final

## 5. Auth e sessoes

- valide login, logout e cadastro em producao
- valide confirmacao de email antes do primeiro login
- valide recuperacao e redefinicao de senha com email real
- valide reenvio de codigo de confirmacao
- valide o aviso de senha alterada
- confirme que cookies estao `HttpOnly`, `SameSite` e `Secure` em producao
- confirme que o modo demo continua limitado por IP e tempo

## 6. Banco e dados

- rode `prisma migrate deploy`
- rode o seed apenas se quiser ambiente demo pronto
- valide se a conta demo e os dados seedados fazem sentido para avaliacao
- nao use dados reais de clientes em ambiente publico de portfolio

## 7. Observabilidade

- mantenha logs do backend ativos
- configure alerta para excesso de 401, 403 e 429
- monitore falhas de login e abuso de `forgot-password`
- mantenha `health check` exposto apenas para uso operacional

## 8. Frontend e exposicao publica

- confirme que nenhum segredo aparece em `next.config`
- confirme que o bundle do frontend usa apenas variaveis `NEXT_PUBLIC_*`
- revise textos de demo, onboarding e branding antes do deploy
- teste desktop e mobile

## 9. Validacao final

Fluxos minimos:

- abrir landing page
- abrir cadastro
- criar conta
- confirmar email
- fazer login
- abrir dashboard
- criar produto
- criar pedido
- ver mapa e graficos
- testar recuperar senha
- conferir se os emails chegam fora do spam com sender verificado
- testar consultor com IA, se `GEMINI_API_KEY` estiver ativo
- testar banner de cookies

## 10. Go live

- publique primeiro em ambiente de teste
- valide tudo com dominio real
- so depois publique o link final no curriculo e no GitHub

## Fontes oficiais

- Neon 2FA: https://neon.com/docs/changelog/2026-03-06
- Neon IP Allow: https://neon.com/blog/restrict-access-to-your-neon-database-with-ip-allow
- Neon API keys e endpoints: https://neon.com/docs/manage/endpoints/
- Next.js variaveis de ambiente: https://nextjs.org/docs/pages/guides/environment-variables
- GitHub push protection: https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection
- GitHub secret scanning: https://docs.github.com/code-security/secret-scanning/working-with-secret-scanning-and-push-protection
