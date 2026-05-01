# Auditoria QA / Testes - Desk Imperial (Deep Dive)

**Data:** 2026-04-26
**Escopo:** Estrategia de teste, cobertura de fluxos criticos, flaky tests, mock quality, arquitetura de teste, E2E coverage
**Auditor:** Agente QA especializado (read-only)

---

## Resumo

A base de testes e funcional e extensa (57 spec API + 114 test web + 5 E2E), mas sofre de tres fragilidades estruturais: (1) desacoplamento total dos testes API das pastas de modulo (0 arquivos em src/modules/), mascarando gaps de cobertura em utils nao testadas; (2) a cobertura web (69.11%) esta 16pp abaixo do gate de 85%, com arquivos criticos como verify-email-form.tsx e use-admin-pin.ts em ~0%; e (3) o E2E cobre apenas auth/navegacao, deixando todo o fluxo PDV/comanda/cozinha sem validacao ponta a ponta. O Redis smoke test (be-01-operational-smoke.spec.ts) quebra o suite completo quando Redis nao esta disponivel, e os mocks sao de boa qualidade mas repetitivos (780+ chamadas jest.fn() duplicadas entre specs).

---

## Evidencia Quantitativa

| Metrica                | API (Jest 30)                                               | Web (Vitest 4)                                           | E2E (Playwright)                    |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------- |
| Arquivos de teste      | 57 \*.spec.ts                                               | 114 _.test._                                             | 5 \*.spec.ts                        |
| Linhas de teste        | ~11,200                                                     | ~15,464                                                  | ~486                                |
| Cobertura lines        | 90.54%                                                      | 69.11%                                                   | N/A                                 |
| Cobertura branches     | 75.21%                                                      | 60.00%                                                   | N/A                                 |
| Cobertura functions    | 91.96%                                                      | 66.18%                                                   | N/A                                 |
| Gate configurado       | 90% lines / 70% branches                                    | 85% lines / 65% branches                                 | N/A                                 |
| Gate atingido          | SIM                                                         | NAO (69.11% < 85%)                                       | N/A                                 |
| Arqs. com 0% coverage  | 2 (comanda-realtime.utils.ts, operations-snapshot.utils.ts) | 2+ (verify-email-form.tsx 3.84%, use-admin-pin.ts 9.09%) | N/A                                 |
| Maior arquivo de teste | products.service.spec.ts (1,411 linhas)                     | staff-mobile-shell.test.tsx (832 linhas)                 | critical-flows.spec.ts (129 linhas) |
| Testes co-localizados  | NAO (todos em api/test/)                                    | SIM (junto ao source)                                    | NAO (pasta e2e/)                    |
| Mocks de servicos      | 780+ jest.fn() invocacoes                                   | vi.mock() para API modules                               | Route interception                  |

---

## Achados

### TST-001 (P1) - Backend nao possui testes co-localizados com modulos

- **Severidade:** ALTA
- **Confianca:** MUITO ALTA
- **Evidencia:** apps/api/src/modules/ contem 0 arquivos _.spec.ts. Todos os 57 specs estao em apps/api/test/. O jest.config.ts:6 define testRegex: '._\.spec\.ts$' (sem restricao de diretorio), mas nenhum teste foi colocado nos modulos.
- **Impacto:** Desenvolvedores nao tem visibilidade imediata de quais modulos tem/nao tem cobertura. Arquivos como operations-snapshot.utils.ts (0% coverage, apps/api/coverage/coverage-summary.json:74) e comanda-realtime.utils.ts (0% coverage, linha 63) passam despercebidos. A distancia entre teste e source inibe o habito de escrever testes durante o desenvolvimento.
- **Recomendacao:** Migrar gradualmente para co-localizacao (src/modules/_/**tests**/) ou adotar convencao de _.spec.ts ao lado do source. Comecar pelos 2 arquivos com 0% coverage.
- **Esforco:** Medio (requer refatoracao de imports e CI pipeline)

### TST-002 (P1) - Suite completo falha por dependencia de Redis real

- **Severidade:** ALTA
- **Confianca:** MUITO ALTA
- **Evidencia:** apps/api/test/be-01-operational-smoke.spec.ts:14-17 usa describe.skip condicional baseado em resolveRedisAvailability(). Quando Redis esta disponivel (ex.: CI), o teste cria servidores HTTP reais, clients Redis (ioredis), e Socket.IO com Redis adapter (apps/api/test/be-01-operational-smoke.spec.ts:52-97). Sem Redis, o teste e pulado, mas o jest.setTimeout(60_000) na linha 19 ainda e aplicado globalmente. O problema reportado e que npm run test:coverage falha quando Redis nao esta presente.
- **Impacto:** Desenvolvedores locais e CI sem Redis nao conseguem rodar o suite completo de coverage. A governanca de qualidade fica refem de infraestrutura externa.
- **Recomendacao:** Mover be-01-operational-smoke.spec.ts para um comando separado (ex.: test:smoke), configura-lo como passWithNoTests: true no vitest.config.ts da API, ou usar @testcontainers/redis para garantir Redis efemero no CI.
- **Esforco:** Baixo (mover arquivo ou adicionar flag condicional)

### TST-003 (P1) - E2E cobre apenas auth/navegacao; fluxo operacional completo ausente

- **Severidade:** ALTA
- **Confianca:** MUITO ALTA
- **Evidencia:** Os 5 specs E2E (apps/web/e2e/) cobrem:
  - auth.spec.ts (98 linhas): login, alternancia empresa/funcionario, validacao, demo CTA, visibilidade de senha, cadastro, credenciais invalidas
  - critical-flows.spec.ts (129 linhas): deteccao de falhas silenciosas (unhandled rejections, page errors)
  - navigation.spec.ts (49 linhas): rotas protegidas, 404, back/forward
  - mobile-entry.spec.ts (64 linhas): owner mobile com mock de sessao
  - ui-ux.spec.ts (46 linhas): layout, acessibilidade, tab order
  - NENHUM spec cobre: abrir PDV, criar comanda, adicionar itens, enviar para cozinha, fechar comanda, fechar caixa, ou dashboard financeiro.
- **Impacto:** O fluxo operacional core (PDV -> comanda -> cozinha -> pagamento -> fechamento) nao tem protecao de regressao E2E. Bugs criticos de integracao so seriam detectados em producao.
- **Recomendacao:** Adicionar ao menos 1 spec E2E de fluxo operacional ponta a ponta: login -> abrir PDV -> criar comanda -> adicionar item -> enviar para cozinha -> marcar como pronto -> fechar comanda -> verificar financeiro. Priorizar com fullyParallel: false e workers: 1 (ja configurado em playwright.config.ts:13-14).
- **Esforco:** Alto (requer seed data, mocks de API ou ambiente staging)

### TST-004 (P2) - Cobertura web 16pp abaixo do gate com exclusoes que mascaram risco

- **Severidade:** MEDIA
- **Confianca:** MUITO ALTA
- **Evidencia:** apps/web/vitest.config.ts:22-28 define coverage.thresholds como 85% lines / 65% branches / 85% functions. O coverage report (apps/web/coverage/coverage-summary.json:1) mostra 69.11% lines / 60% branches / 66.18% functions. As exclusoes em coverageExclude (linhas 6-13) incluem components/shared/\*\* e lib/operations/index.ts, removendo da metrica areas de risco.
- **Impacto:** O gate de 85% nunca sera atingido com a cobertura atual, mas o sonarCoverageMode desabilita thresholds (linha 28-29), criando uma situacao onde o Sonar reporta coverage sem gate local. Arquivos criticos como verify-email-form.tsx (3.84% lines, apps/web/coverage/coverage-summary.json:5) e use-admin-pin.ts (9.09% lines, linha 3) tem cobertura quase nula.
- **Recomendacao:** (1) Remover components/shared/\*\* da exclusao e adicionar testes para os componentes shared (alguns ja tem: button, input-field, select-field, skeleton, product-thumb); (2) Priorizar testes para os 5 arquivos com menor cobertura; (3) Reduzir o gate para 75% temporariamente e subir gradualmente.
- **Esforco:** Medio (adicionar ~15-20 testes incrementais)

### TST-005 (P2) - Repeticao massiva de mock setup entre specs da API

- **Severidade:** MEDIA
- **Confianca:** ALTA
- **Evidencia:** 780+ ocorrencias de jest.fn() em arquivos de teste da API (grep em apps/api/test/\*.spec.ts). Cada spec reimplementa seu proprio mock de Prisma (ex.: comanda.service.branches.spec.ts:59-91 define 11+ mocks do Prisma; orders.service.spec.ts:38-59 define 11+; auth.service.session-and-recovery.spec.ts:65-88 define 9+). Nao ha factory compartilhada de mocks. Os helpers em apps/api/test/helpers/ contem apenas 3 arquivos (auth-context, request-context, redis-availability).
- **Impacto:** DRY violation massivo. Adicionar uma nova tabela ao Prisma requer atualizar dezenas de specs. Manutencao de mock desatualizado e causa comum de falsos positivos.
- **Recomendacao:** Criar test/helpers/prisma-mock.factory.ts com um builder de mock de Prisma reutilizavel. Extrair mocks comuns de Cache, AuditLog, Realtime para factories compartilhadas.
- **Esforco:** Medio (refatoracao progressiva)

### TST-006 (P2) - Math.random() em fixtures de teste web causa ids nao deterministicos

- **Severidade:** BAIXA
- **Confianca:** ALTA
- **Evidencia:** apps/web/test/operations-fixtures.ts:77 e :98 usam Math.random().toString(36).slice(2, 8) para gerar IDs de comanda item e comanda. Embora esses ids nao sejam usados em assertions exatas (os testes usam expect.arrayContaining ou some()), a nao determinismo pode causar colisoes em suites grandes ou dificultar debug de falhas.
- **Impacto:** Risco baixo de colisao de IDs em suites paralelas (mas Vitest no web roda em single thread com jsdom). Dificulta reproducao de falhas.
- **Recomendacao:** Substituir Math.random() por contador sequencial (let nextId = 0) ou usar crypto.randomUUID() para unicidade garantida.
- **Esforco:** Baixo (trocar 2 linhas)

### TST-007 (P2) - Testes de API usam mock de argon2 via jest.mock() em 3 specs diferentes

- **Severidade:** BAIXA
- **Confianca:** ALTA
- **Evidencia:** O mock de argon2 e repetido em 3 specs: auth.service.spec.ts:40-50, auth.service.session-and-recovery.spec.ts:14-24, auth.service.coverage-boost.spec.ts:39-49, e employees.service.spec.ts:28-32. Todos contem a mesma estrutura de mock com ligeiras variacoes.
- **Impacto:** Duplicacao de codigo; mudancas no mock precisam ser propagadas manualmente.
- **Recomendacao:** Extrair para test/helpers/argon2.mock.ts com factory function parametrica.
- **Esforco:** Baixo

### TST-008 (P3) - Sem testes de integracao entre modulos da API

- **Severidade:** MEDIA
- **Confianca:** ALTA
- **Evidencia:** O unico teste que exercita NestJS TestModule e http-smoke.e2e-spec.ts (200 linhas), que testa apenas health check e auth basico com todos os servicos mockados. Nao ha teste que exercite a interacao real entre ComandaService + CashSessionService + FinanceService, ou OrdersService + ProductsService + ComandaService.
- **Impacto:** Bugs de integracao entre modulos (ex.: fluxo de fechamento de comanda que deve atualizar caixa e financeiro simultaneamente) nao sao capturados por testes unitarios isolados.
- **Recomendacao:** Adicionar 2-3 testes de integracao com NestJS TestModule usando banco SQLite em memoria (via Prisma datasourceUrl) para validar fluxos criticos multi-modulo.
- **Esforco:** Alto (requer setup de banco em memoria)
