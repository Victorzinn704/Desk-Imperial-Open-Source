# Security Policy

## Supported branch

- `main`

## Reporting a vulnerability

Se voce encontrar uma vulnerabilidade:

1. nao abra um issue publico com detalhes sensiveis
2. documente impacto, passo de reproducao e versao afetada
3. compartilhe a informacao de forma privada com o mantenedor do projeto

## Security baseline

Este projeto ja considera:

- cookies de sessao protegidos
- CSRF em rotas mutaveis autenticadas
- senha com `argon2id`
- reset de senha com token temporario
- trilha de auditoria
- separacao entre cookies necessarios e opcionais

## Production checklist

Antes de publicar em ambiente real:

- definir `COOKIE_SECRET` e `CSRF_SECRET`
- usar HTTPS
- configurar Brevo para recuperacao de senha
- revisar CORS e dominio oficial do front
- proteger ou desabilitar Swagger em producao
- mover rate limit para `Redis` se houver mais de uma instancia
