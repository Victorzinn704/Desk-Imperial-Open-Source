# Authentication Flow

## 1. Visao geral

O Desk Imperial usa autenticacao por sessao server-side, cookies HttpOnly e protecao CSRF por token duplo.

Fluxo base:

1. login owner/staff
2. criacao de sessao no backend
3. emissao de cookie de sessao + cookie/token CSRF
4. SessionGuard para leitura protegida
5. SessionGuard + CsrfGuard para mutacoes

## 2. Login e sessao

- Endpoint de login cria sessao vinculada ao usuario e workspace.
- Sessao contem metadados de seguranca (IP, user agent, expiracao).
- Cookie de sessao e HttpOnly (controle no backend).

## 3. CSRF

O CsrfGuard valida:

- sessao autenticada
- origem/referer permitidos
- token CSRF no cookie
- token CSRF no header X-CSRF-Token
- comparacao segura entre token esperado e tokens recebidos

Sem token valido, mutacoes autenticadas retornam erro de autorizacao.

## 4. Rate limiting

A camada de rate limiting de auth e seguranca usa Redis por dominio, por exemplo:

- login
- reset de senha
- verificacao de email
- admin PIN

Isso garante consistencia entre instancias da API em escala horizontal.

## 5. OTP e recuperacao

- OTP para verificacao de email e reset de senha.
- Janela temporal e tentativa controladas por regra de dominio.
- Eventos sensiveis sao registrados em audit log.

## 6. Admin PIN

- PIN com hash server-side.
- Challenge efemero e prova curta para acoes sensiveis.
- Bloqueio por tentativas para mitigar brute force.

## 7. Endpoints de autenticacao (resumo)

- login / logout
- cadastro e verificacao de email
- recuperacao e redefinicao de senha
- perfil e sessao atual
- feed de atividade de autenticacao

## 8. Boas praticas para evolucao

- manter toda mutacao protegida por CSRF
- preservar allowlist de origem/referer
- ampliar cobertura de testes de auth em mudancas de contrato
- manter auditoria para eventos de risco elevado
