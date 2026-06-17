# Common API Errors

Este documento resume erros comuns. A leitura completa fica em `docs/operations/developer-support-playbook.md`.

| Status | Causa provável                                     | Ação de suporte                                              |
| ------ | -------------------------------------------------- | ------------------------------------------------------------ |
| `400`  | payload, query ou formato inválido                 | comparar com OpenAPI e payload mínimo                        |
| `401`  | sessão ausente, expirada ou inválida               | validar login, cookies e `/auth/me`                          |
| `403`  | permissão, workspace, CSRF ou Admin PIN            | validar role, vínculo staff/owner, header CSRF e ação        |
| `404`  | rota/recurso inexistente no escopo                 | validar id, workspace, soft-delete e endpoint                |
| `409`  | conflito de regra de negócio                       | consultar estado da entidade e orientar correção de fluxo    |
| `422`  | validação semântica quando a rota usar esse padrão | confirmar comportamento real no OpenAPI e resposta           |
| `429`  | rate limit                                         | reduzir retry automático e conferir janela de limite         |
| `500`  | falha não tratada ou dependência                   | coletar `x-request-id`, logs, Sentry e estado da dependência |

## Observação sobre `400/422`

Não trate `422` como garantia global. O Desk usa NestJS, DTOs, schemas e filtros; algumas validações aparecem como `400`. O correto é validar a rota no contrato vigente e no corpo da resposta.

## Erros de negócio comuns

| Fluxo            | Erro típico       | Leitura                                     |
| ---------------- | ----------------- | ------------------------------------------- |
| Abrir comanda    | `409`             | mesa/comanda/caixa em estado incompatível   |
| Adicionar item   | `404` ou `409`    | produto inexistente, inativo ou regra local |
| Staff em owner   | `403`             | autorização correta                         |
| Point            | `409` ou pendente | intent já existe, provider/webhook/fila     |
| Barcode          | sem dado          | provider externo sem resposta confiável     |
| Mutação sem CSRF | `403`             | proteção correta                            |

## O que anexar ao diagnóstico

- status code;
- `x-request-id`;
- payload sanitizado;
- resposta sanitizada;
- endpoint e método;
- usuário/role sem PII;
- SQL read-only, se houver estado persistido envolvido.
