# PRD — Developer Support Kit

**Estado:** operacional complementar  
**Dono técnico:** Desk Imperial  
**Escopo:** documentação, exemplos e workflow de investigação técnica para API e integrações.  
**Fora do escopo:** alterar runtime da API, mudar contrato, mexer em dados de produção ou substituir OpenAPI.

## 1. Problema

O Desk Imperial já possui API, PWA, integrações, logs, OpenAPI, Sentry/Faro, SQL transacional e fluxos críticos. Porém, antes desta frente, esse conhecimento estava espalhado entre documentação de arquitetura, segurança, operações e produto.

O problema a resolver é transformar esse acervo em uma camada prática de Developer Support:

- reproduzir erro reportado por cliente/desenvolvedor;
- entender status code, header, payload e autenticação;
- investigar `x-request-id` em logs/observabilidade;
- validar estado com SQL read-only;
- comunicar causa raiz sem vazar dados;
- escalar bug com evidência, não com palpite.

## 2. Tese

```text
Se o Desk Imperial expõe API, integrações e fluxos operacionais reais, então ele precisa de uma camada de suporte técnico que conecte contrato, logs, SQL e casos de uso. Essa camada melhora operação do produto e também torna o projeto mais forte para vagas de Developer Support Engineer.
```

## 3. Personas

| Persona                       | Necessidade                                    | Evidência que precisa produzir                       |
| ----------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Dev externo integrando API    | entender auth, payload, status e contrato      | request reproduzível, status code e payload válido   |
| Suporte técnico N1/N2         | classificar problema sem mexer em código       | template preenchido e hipótese inicial               |
| Dev mantenedor do Desk        | receber bug já estruturado                     | `x-request-id`, logs, SQL read-only e passos         |
| Recrutador técnico/entrevista | ver prática real de investigação e comunicação | docs, estudos de caso, Postman e exemplo PHP/Laravel |

## 4. Requisitos funcionais

| ID     | Requisito                                                          | Evidência criada                                                                    |
| ------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| RF-001 | Centralizar entrada de suporte técnico de API                      | `docs/support/README.md`                                                            |
| RF-002 | Explicar diagnóstico por status code e fluxo                       | `docs/support/common-api-errors.md`                                                 |
| RF-003 | Documentar debug de auth, sessão, CSRF, role e workspace           | `docs/support/auth-flow-debug.md`                                                   |
| RF-004 | Fornecer exemplos HTTP seguros                                     | `docs/support/http-request-examples.md`                                             |
| RF-005 | Fornecer template de diagnóstico para cliente/desenvolvedor        | `docs/support/customer-diagnostic-template.md`                                      |
| RF-006 | Fornecer laboratório de reprodução                                 | `docs/support/reproduction-lab.md`                                                  |
| RF-007 | Fornecer playbook SQL read-only                                    | `docs/support/sql-audit-playbook.md`                                                |
| RF-008 | Documentar logs, Sentry, Faro e correlação por `x-request-id`      | `docs/support/logs-and-observability-debug.md`                                      |
| RF-009 | Registrar casos recorrentes de suporte                             | `docs/case-studies/developer-support-cases.md`                                      |
| RF-010 | Oferecer coleção Postman/Insomnia inicial                          | `docs/api/desk-imperial-support.postman_collection.json`                            |
| RF-011 | Demonstrar cliente PHP simples                                     | `examples/php-api-client/`                                                          |
| RF-012 | Demonstrar adaptação para Laravel sem adicionar runtime ao projeto | `docs/support/laravel-integration.md`, `examples/laravel-api-client/`               |
| RF-013 | Definir matriz de teste/debug/aceite                               | `docs/support/developer-support-test-debug-matrix.md`                               |
| RF-014 | Validar a coleção e a estrutura do kit contra contrato e allowlist | `scripts/validate-developer-support-kit.mjs`, `npm run support:validate`            |
| RF-015 | Executar a coleção contra API local com sessão e CSRF reais        | `scripts/run-developer-support-collection-smoke.mjs`, `npm run support:smoke:local` |
| RF-016 | Documentar validação de ambiente com PHP, API local e smoke        | `docs/support/local-environment-validation.md`                                      |
| RF-017 | Documentar rollout seguro em servidor, produção e open source      | `docs/support/production-rollout.md`, `npm run support:smoke:readiness`             |

## 5. Requisitos não funcionais

| Área          | Requisito                                                                                 | Como validar                            |
| ------------- | ----------------------------------------------------------------------------------------- | --------------------------------------- |
| Segurança     | nenhum exemplo deve conter segredo, token, cookie real, PIN, terminal ID real ou PII      | `npm run lint:secrets`                  |
| Manutenção    | a fonte detalhada fica em `docs/operations/developer-support-*`; `docs/support` é entrada | revisão de links e escopo               |
| Contrato      | exemplos devem apontar para `/api/v1/openapi.json`                                        | leitura manual e coleção Postman        |
| Debug         | todo fluxo deve produzir `x-request-id` quando aplicável                                  | exemplos HTTP e template                |
| Dados         | SQL deve ser read-only                                                                    | revisão de queries                      |
| Portabilidade | PHP/Laravel são exemplos de consumidor, não dependência do Desk                           | pasta `examples/` sem import no runtime |
| Qualidade     | documentação deve passar Prettier, scope checker e secret scan                            | checks locais                           |

## 6. Funcionalidades entregues

| Funcionalidade              | O que resolve                                | Como resolve                                                                |
| --------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| Diagnóstico por status code | reduz respostas genéricas sobre erro HTTP    | mapeia `400/401/403/404/409/422/429/500` para hipótese e ação               |
| Debug de auth               | separa sessão, CSRF, role e workspace        | roteiro específico para `/auth/login`, `/auth/me` e mutações                |
| Reproduction lab            | tira investigação do "parece que"            | define ambiente, request, payload, logs e SQL                               |
| SQL audit playbook          | valida estado sem mexer no banco             | queries `SELECT` para usuário, sessão, comanda, Point e caixa               |
| Postman collection          | acelera teste manual de endpoints            | coleção com variáveis e placeholders                                        |
| PHP client                  | mostra integração backend simples            | cURL com cookie jar, status code e `x-request-id`                           |
| Laravel guide/example       | conversa com vaga que cita Laravel           | mostra `Http`, cookie jar, CSRF, `x-request-id` e teste fake                |
| Support validator           | evita documentação bonita com drift          | cruza Postman, OpenAPI, allowlist, arquivos obrigatórios e secrets literais |
| Local support smoke         | prova a coleção contra API real local        | executa health, OpenAPI, login, produtos, comanda e item com cookie/CSRF    |
| Server readiness smoke      | valida servidor sem alterar regra de negócio | consulta health/OpenAPI sem criar comanda, item ou intent                   |
| Case studies                | transforma incidentes comuns em aprendizado  | casos de auth, staff, payload, comanda, cozinha, Point, PWA                 |

## 7. Casos de uso

| Caso                           | Entrada                        | Saída esperada                           | Evidência mínima                                 |
| ------------------------------ | ------------------------------ | ---------------------------------------- | ------------------------------------------------ |
| CU-001 — `401` em `/auth/me`   | request sem sessão válida      | orientação de login/cookie               | status, cookie jar, sessão read-only             |
| CU-002 — `403` staff/owner     | staff chama rota de owner      | autorização explicada                    | role, endpoint, vínculo Employee                 |
| CU-003 — payload inválido      | body fora do contrato          | campo inválido identificado              | payload sanitizado e OpenAPI                     |
| CU-004 — `409` em comanda      | mesa/caixa/comanda em conflito | regra de negócio explicada               | query da comanda/caixa                           |
| CU-005 — cozinha não atualiza  | item criado não aparece        | separar backend, realtime e cache        | `ComandaItem`, `Product.requiresKitchen`, socket |
| CU-006 — Point pendente        | pagamento não fecha comanda    | separar intent, webhook, fila e provider | `PaymentTerminalIntent`, logs do worker          |
| CU-007 — barcode sem dado      | EAN não preenche               | fallback manual ou provider issue        | barcode, provider, produto local                 |
| CU-008 — PWA com estado antigo | API certa, UI errada           | cache/realtime/service worker isolado    | REST snapshot, evento, screenshot                |

## 8. Workflow

```text
Relato
  -> template curto para cliente/dev
  -> reprodução com HTTP/Postman/PHP/Laravel
  -> coleta de status, payload e x-request-id
  -> logs/Sentry/Faro
  -> SQL read-only se envolver estado persistido
  -> classificação da causa
  -> resposta técnica
  -> estudo de caso ou correção de documentação/código
```

## 9. Testes e aceite

Critério mínimo para considerar esta frente útil:

- [ ] docs passam Prettier;
- [ ] coleção Postman é JSON válido;
- [ ] exemplo PHP não contém segredo;
- [ ] lint de secrets passa;
- [ ] `npm run support:validate` passa;
- [ ] `npm run support:smoke:local` passa com API local ativa;
- [ ] `npm run support:smoke:readiness` passa contra servidor/lab;
- [ ] scope checker classifica os novos arquivos;
- [ ] matriz de testes cobre auth, permissão, payload, comanda, cozinha, Point, barcode e PWA;
- [ ] exemplo Laravel é copiável para app consumidor, tem teste fake e não acopla o Desk a Laravel.

## 10. Veredito arquitetural

Essa frente é coerente com o Desk Imperial porque não inventa uma camada artificial. Ela organiza capacidades que já existem:

- API versionada;
- OpenAPI;
- sessão/CSRF;
- workspace isolation;
- PostgreSQL;
- Redis/realtime;
- Mercado Pago Point;
- barcode/EAN;
- logs e observabilidade.

O ponto que ainda exige cuidado é manter exemplos sincronizados com o contrato real. Por isso, qualquer mudança de endpoint ou payload deve atualizar OpenAPI e revisar este kit.
