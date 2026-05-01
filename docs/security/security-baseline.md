# Security Baseline

**Versão:** 1.1  
**Última atualização:** 2026-05-01

> Aviso de status: baseline util e vivo, mas ainda resumido.
> Fontes canonicas atuais: `README.md`, `docs/INDEX.md`, `docs/architecture/authentication-flow.md`, `docs/security/security-testing-workflow-2026-04-30.md` e `docs/architecture/realtime.md`.

## Objetivo

Definir uma linha minima de seguranca desde o inicio do projeto.

## Regras base

1. usar HTTPS em producao
2. usar cookies `HttpOnly`, `Secure` e `SameSite`
3. nao salvar token sensivel em `localStorage`
4. usar hash de senha forte
5. mascarar dados pessoais em logs
6. ter trilha de auditoria para eventos sensiveis
7. versionar aceite de termos e consentimentos
8. separar cookies necessarios de cookies opcionais
9. recuperar senha com codigo temporario e uso unico
10. invalidar sessoes ativas apos redefinicao de senha
11. confirmar email antes de liberar o primeiro login
12. manter chaves de IA e Brevo somente no backend
13. manter o Admin PIN fora de tokens reutilizaveis no browser, usando apenas prova curta no servidor e hint nao sensivel no frontend
14. falhar bootstrap quando `COOKIE_SECRET` ou `CSRF_SECRET` estiver ausente, curto ou com placeholder inseguro
15. sanitizar campos textuais mutaveis de operacao (incluindo `section` de mesa em create/update) com bloqueio de HTML e formula injection
16. desconectar sockets realtime quando a sessao for revogada ou encerrada
17. limitar eventos financeiros do realtime apenas a clientes autorizados
18. proteger webhook do Telegram com segredo compartilhado validado no backend
19. manter `SENTRY_AUTH_TOKEN` e segredos de build fora do repositorio e fora de arquivos versionados
20. tratar `operations.error` como falha de sessao/realtime, nunca como sucesso silencioso no cliente

## Eventos para audit log

- login com sucesso
- login com falha
- logout
- troca de senha
- solicitacao de redefinicao de senha
- conclusao de redefinicao de senha
- verificacao do Admin PIN
- configuracao ou remocao do Admin PIN
- aceite de termos
- alteracao de preferencia de cookies
- alteracao de preferencia de notificacao por workspace
- alteracao de preferencia de notificacao por usuario
- vinculacao e desvinculacao de conta Telegram
- exportacao de dados
- solicitacao de exclusao de conta
- alteracao de cadastro sensivel

## Eventos para logs estruturados

- request recebida
- request concluida
- erro inesperado
- tempo de resposta
- health check
- degradacao de dependencia externa
- falha de autenticacao realtime
- rejeicao por origem/CORS no realtime
- degradacao do Redis adapter do Socket.IO
- webhook do Telegram rejeitado

## Cuidados com LGPD

- coletar apenas o necessario
- registrar base e contexto do consentimento
- facilitar revogacao
- permitir exportacao e exclusao
- definir retencao de logs e dados
- isolar preferencias e dados operacionais por workspace e por usuario

## Controles que hoje ja existem no runtime

- sessao server-side com cookie HttpOnly
- CSRF token duplo em mutacoes autenticadas
- rate limit por dominio de auth e Admin PIN
- rate limit basico no churn de conexao realtime
- audit log de eventos sensiveis
- redacao de campos sensiveis em logs
- reconnect controlado do realtime no cliente
- webhook do Telegram com validacao de segredo
- Sentry em `apps/api` e `apps/web`

## Riscos que ainda permanecem

- a malha realtime ainda depende de reconcile em alguns fluxos e ainda nao oferece replay/cursor
- parte da baseline de observabilidade ainda e hibrida entre stack OSS e Sentry
- a governanca de segredos depende de operacao disciplinada fora do repositorio
