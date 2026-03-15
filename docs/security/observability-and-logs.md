# Observability and Logs

## Objetivo

Definir uma camada simples e forte de observabilidade para o MVP.

## Pilhas sugeridas

- backend: Pino
- captura de erros: Sentry
- uptime e health: UptimeRobot ou Better Stack
- audit trail: PostgreSQL

## Tipos de logs

### Application logs

- metodo HTTP
- rota
- status code
- duracao
- requestId
- erro resumido

### Audit logs

- usuario
- acao
- recurso afetado
- timestamp
- IP mascarado ou tratado conforme politica
- user agent

### Security logs

- falha de login
- tentativa suspeita
- bloqueio de acesso
- aceite de termo
- troca de credencial

## Alertas minimos

- pico de `5xx`
- queda do health check
- aumento anormal de falhas de login
- tempo de resposta acima do esperado

## Cuidados

- sem senha em log
- sem token completo em log
- sem CPF completo em log
- retencao de logs com politica definida
