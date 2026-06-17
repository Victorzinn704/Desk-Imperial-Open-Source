# Reproduction Lab

Use este roteiro para reproduzir falhas de API sem depender da UI.

## 1. Preparação

- escolher ambiente: local, staging, demo ou produção controlada;
- confirmar base URL;
- confirmar usuário e role;
- obter sessão válida;
- capturar `x-request-id` de cada request;
- criar dados mínimos quando o caso exigir.

## 2. Execução

1. Rodar health.
2. Consultar OpenAPI.
3. Fazer login.
4. Rodar `/auth/me`.
5. Executar request problemático.
6. Repetir request com payload mínimo válido.
7. Rodar query read-only para confirmar estado.
8. Conferir logs/Sentry/Faro.
9. Classificar causa.

## 3. Critério de reprodução válida

A reprodução é válida quando:

- usa o mesmo endpoint;
- usa o mesmo ator ou uma role equivalente;
- preserva cookies/CSRF quando necessário;
- gera `x-request-id`;
- tem payload sanitizado;
- deixa claro o resultado esperado e obtido.

## 4. Saída esperada

Preencher:

- `docs/operations/developer-support-diagnostic-template.md`

Se o caso for recorrente, registrar em:

- `docs/case-studies/developer-support-cases.md`
