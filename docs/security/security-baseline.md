# Security Baseline

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

## Eventos para audit log

- login com sucesso
- login com falha
- logout
- troca de senha
- aceite de termos
- alteracao de preferencia de cookies
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

## Cuidados com LGPD

- coletar apenas o necessario
- registrar base e contexto do consentimento
- facilitar revogacao
- permitir exportacao e exclusao
- definir retencao de logs e dados
