# Auditoria — Developer Support Kit

**Data:** 2026-06-16  
**Escopo auditado:** `docs/support`, `docs/operations/developer-support-*`, `docs/api/desk-imperial-support.postman_collection.json`, `docs/case-studies/developer-support-cases.md`, `examples/php-api-client`, `examples/laravel-api-client`, `scripts/check-worktree-scope.mjs`, `scripts/validate-developer-support-kit.mjs`.  
**Critério:** comparar a frente criada com a arquitetura real do Desk Imperial, o PRD universal do projeto e a exigência de testes, debug, documentação, casos de uso, funcionalidades, requisitos, valor e integração PHP/Laravel.

## 1. Veredito

A frente é válida e coerente com o Desk Imperial. Ela não é só texto genérico, porque parte de capacidades reais do projeto:

- API versionada em `/api/v1`;
- OpenAPI em `/api/v1/openapi.json` e `/api/v1/docs`;
- sessão por cookie HttpOnly;
- CSRF double-submit;
- roles owner/staff;
- workspace isolation;
- `x-request-id`;
- logs/Sentry/Faro;
- PostgreSQL/Prisma;
- Mercado Pago Point;
- realtime/cozinha;
- barcode/EAN;
- smoke de IDOR documentado.

Antes dos ajustes desta auditoria, havia três lacunas que deixavam a frente menos forte:

1. não havia PRD próprio da frente;
2. não havia matriz explícita de testes/debug;
3. Laravel estava ausente, apesar de ser diferencial direto para a vaga alvo.

Essas lacunas foram fechadas com:

- `docs/support/developer-support-prd.md`;
- `docs/support/developer-support-test-debug-matrix.md`;
- `docs/support/laravel-integration.md`.
- `examples/laravel-api-client/`;
- `scripts/validate-developer-support-kit.mjs`;
- `npm run support:validate`.

## 2. Comparação com o PRD universal

| Critério do PRD universal | Evidência atual                                                                                    | Nota  | Leitura                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------- |
| Problema real             | `developer-support-prd.md` define o problema de conhecimento disperso e investigação sem evidência | 9/10  | objetivo claro                                          |
| Personas                  | dev externo, suporte N1/N2, mantenedor, entrevista/recrutador                                      | 9/10  | conversa com produto e mercado                          |
| Requisitos funcionais     | RF-001 a RF-014 mapeados para arquivos e validação local                                           | 10/10 | rastreável                                              |
| Requisitos não funcionais | segurança, manutenção, contrato, debug, dados, portabilidade, qualidade                            | 9/10  | bom para docs/exemplos                                  |
| Casos de uso              | CU-001 a CU-008 + case studies operacionais                                                        | 9/10  | cobre fluxos críticos                                   |
| Testes                    | matriz TD-001 a TD-017 e validador local                                                           | 9/10  | falta execução local real da API nesta rodada           |
| Debug                     | fluxo com HTTP, `x-request-id`, logs, SQL read-only                                                | 10/10 | forte e aplicável                                       |
| Segurança                 | sem segredo, SQL read-only, lint de secrets                                                        | 9/10  | bom para docs; runtime não foi alterado                 |
| Arquitetura               | `docs/support` como porta, `docs/operations` como fonte detalhada                                  | 9/10  | evita drift melhor que docs soltas                      |
| Laravel                   | guia específico e exemplo copiável sem acoplar runtime                                             | 9/10  | bom para integração; falta execução em app Laravel real |

## 3. O que resolve

| Dor                                   | Como a frente resolve                                              |
| ------------------------------------- | ------------------------------------------------------------------ |
| Erro reportado sem contexto           | template exige endpoint, status, `x-request-id`, payload e horário |
| Confusão entre `401` e `403`          | docs separam sessão, permissão, CSRF, role e workspace             |
| Debug sem reprodução                  | reproduction lab força request controlado                          |
| Dado divergente na UI/API             | SQL read-only valida estado persistido                             |
| Integração externa lenta ou duplicada | casos de Point/webhook orientam idempotência e provider            |
| Documentação dispersa                 | `docs/support/README.md` vira porta de entrada                     |
| Vaga pede PHP/Laravel                 | exemplo PHP e guia Laravel demonstram adaptação                    |

## 4. Como resolve

```text
Relato
  -> template de diagnóstico
  -> reprodução HTTP/Postman/PHP/Laravel
  -> x-request-id
  -> logs/Sentry/Faro
  -> SQL read-only
  -> causa raiz ou hipótese falsificável
  -> resposta técnica
  -> caso recorrente ou correção
```

Isso segue a lógica do Desk Imperial: não confirmar dinheiro pelo browser, não editar dado manualmente, não expor segredo, não confundir regra de negócio com bug e não escalar sem evidência.

## 5. Funcionalidades auditadas

| Funcionalidade          | Arquivo                                                              | Qualidade                                                                    |
| ----------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Playbook central        | `docs/operations/developer-support-playbook.md`                      | forte                                                                        |
| Porta de entrada        | `docs/support/README.md`                                             | forte                                                                        |
| Erros comuns            | `docs/support/common-api-errors.md`                                  | boa; alerta correto sobre `400/422`                                          |
| Auth debug              | `docs/support/auth-flow-debug.md`                                    | forte                                                                        |
| Exemplos HTTP           | `docs/operations/developer-support-http-examples.md`                 | bom; depende de contrato real                                                |
| Template de diagnóstico | `docs/operations/developer-support-diagnostic-template.md`           | forte                                                                        |
| SQL audit               | `docs/operations/developer-support-sql-audit-playbook.md`            | forte; somente read-only                                                     |
| Logs/observabilidade    | `docs/support/logs-and-observability-debug.md`                       | bom; aponta para doc canônica                                                |
| Case studies            | `docs/operations/developer-support-case-studies.md`                  | bom; precisa crescer com casos reais                                         |
| Postman                 | `docs/api/desk-imperial-support.postman_collection.json`             | útil; validado contra OpenAPI e allowlist explícita                          |
| PHP client              | `examples/php-api-client`                                            | útil; PHP não estava instalado para lint nesta máquina                       |
| Laravel                 | `docs/support/laravel-integration.md`, `examples/laravel-api-client` | útil como exemplo copiável; não roda dentro de app Laravel real nesta rodada |
| Support validator       | `scripts/validate-developer-support-kit.mjs`                         | forte; reduz drift entre docs, coleção, contrato e allowlist                 |

## 6. Pontos que ainda não são 10/10

| Gap                                                           | Risco                                       | Próxima ação                                                                              |
| ------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Coleção Postman manual pode driftar                           | endpoint/payload muda e exemplo fica velho  | manter `npm run support:validate` obrigatório antes de commit                             |
| PHP não foi lintado localmente                                | erro de sintaxe passaria despercebido       | rodar `php -l` quando PHP estiver instalado                                               |
| Laravel ainda não roda dentro de app real                     | não prova integração fim a fim em framework | copiar `examples/laravel-api-client` para app Laravel quando houver ambiente PHP/Composer |
| Status code real depende de rota                              | docs podem generalizar `400/422`            | manter frase "conforme rota/pipe/contrato"                                                |
| Case studies ainda são padrões, não incidentes reais fechados | pode parecer simulado                       | adicionar casos reais com evidência quando ocorrerem                                      |

## 7. Nota de qualidade

| Eixo                        | Nota  | Justificativa                                                                                    |
| --------------------------- | ----- | ------------------------------------------------------------------------------------------------ |
| Arquitetura da documentação | 9/10  | entrada clara em `docs/support`, fonte detalhada em `docs/operations`, links para docs canônicas |
| Aderência ao Desk Imperial  | 9/10  | usa auth, CSRF, Point, realtime, SQL e observabilidade reais                                     |
| Debug e investigação        | 10/10 | exige request, status, request id, logs e SQL                                                    |
| Testabilidade               | 9/10  | matriz e validador existem; falta execução real de API/PHP/Laravel nesta rodada                  |
| Mercado de trabalho         | 9/10  | conversa diretamente com Developer Support Engineer, API, SQL, logs, PHP/Laravel                 |
| Risco de genericidade       | baixo | textos citam fluxos e riscos reais do projeto                                                    |

**Nota final:** 9/10.

## 8. Decisão

```text
Decisão: manter e evoluir.
Motivo: a frente complementa o Desk Imperial com uma camada de suporte técnico rastreável e alinhada a arquitetura real.
Condição: revisar exemplos sempre que OpenAPI, auth, status codes ou fluxo de operações mudarem.
```
