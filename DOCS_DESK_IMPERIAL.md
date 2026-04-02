# DESK IMPERIAL - AUDITORIA TECNICA E DOCUMENTACAO CONSOLIDADA

Versao: 5.0  
Data de consolidacao: 2026-04-01  
Base: comportamento real do monorepo (API, Web, testes, CI e docs)

---

## 1. Diagnostico da Documentacao Atual

### 1.1 Estado encontrado

O projeto possui uma base documental ampla. Nesta rodada, os documentos de arquitetura, autenticacao, testes e troubleshooting foram revisados para alinhamento com o codigo atual.

### 1.2 Matriz de confiabilidade documental

- Alta confiabilidade (alinhada ao codigo atual):
  - README.md (recriado nesta rodada)
  - DOCS_DESK_IMPERIAL.md (este documento)
  - docs/release/\* (diagnosticos, plano de lapidacao, parecer final)
  - docs/architecture/overview.md
  - docs/architecture/authentication-flow.md
  - docs/testing/testing-guide.md
  - docs/troubleshooting.md
- Confiabilidade parcial (requer leitura critica):
  - docs/security/security-baseline.md
  - docs/operations/kpi-realtime-mapping.md

### 1.3 Diretriz canonica

Para decisoes de produto, arquitetura, release e contribuicao, considerar como fonte primaria:

1. README.md
2. DOCS_DESK_IMPERIAL.md
3. docs/release/\*

Demais arquivos devem ser interpretados como historico tecnico ate passarem por revisao formal.

---

## 2. Analise Geral do Projeto (Baseada em Codigo)

### 2.1 Proposta do sistema

Desk Imperial e uma plataforma de operacao de salao e gestao executiva integrada, com foco em:

- operacao em tempo real (caixa, mesa, comanda, cozinha)
- governanca de venda (desconto por role/PIN, estoque, auditoria)
- visao executiva (financeiro, comparativos, inteligencia assistida)

### 2.2 Stack e desenho de alto nivel

- Monorepo: npm workspaces + Turbo
- Backend: NestJS 11 + Prisma + PostgreSQL + Redis + Socket.IO
- Frontend: Next.js 16 + React 19 + TanStack Query
- Contratos compartilhados: packages/types

### 2.3 Maturidade por pilar

- Auth/sessao/csrf: alta
- Operacao realtime: alta funcional
- Executivo/financeiro: alta
- Offline/PWA: media
- Testes frontend: media-baixa relativa a superficie total
- CI full-stack para release: media

---

## 3. Requisitos Funcionais (RF)

### 3.1 RF de identidade e seguranca

- RF-01: cadastro com consentimento e versao de termo
- RF-02: verificacao de email por OTP
- RF-03: login owner e staff com sessao server-side
- RF-04: reset de senha com codigo temporario
- RF-05: gerenciamento de PIN administrativo com verificacao efemera

### 3.2 RF de operacao

- RF-06: abrir e fechar caixa por operador
- RF-07: abrir comanda, adicionar item, alterar status e fechar
- RF-08: gerenciar fila de cozinha por item
- RF-09: gerir mesas e planta operacional
- RF-10: transmitir eventos de operacao em realtime por workspace

### 3.3 RF de comercial e executivo

- RF-11: CRUD de produtos, combos e componentes
- RF-12: criar e cancelar pedidos com regras transacionais
- RF-13: aplicar politicas de desconto por role/PIN
- RF-14: consolidar indicadores financeiros por periodos e dimensoes
- RF-15: gerar insight assistido por IA com cache e limite de taxa

### 3.4 RF de conformidade e preferencias

- RF-16: versionar documentos de termos/privacidade
- RF-17: registrar aceite por usuario
- RF-18: permitir update de preferencias de cookies

---

## 4. Requisitos Nao Funcionais (RNF)

### 4.1 Seguranca

- RNF-01: cookies de sessao HttpOnly
- RNF-02: CSRF por token duplo e validacao de origem/referer
- RNF-03: CORS restrito por allowlist
- RNF-04: rate limiting em Redis para dominios de auth/PIN
- RNF-05: redacao de dados sensiveis em logs

### 4.2 Confiabilidade e consistencia

- RNF-06: transacoes serializable para fluxos criticos de pedido
- RNF-07: isolamento de dados por workspaceOwnerUserId
- RNF-08: fallback de invalidação de cache quando patch realtime nao basta

### 4.3 Operabilidade

- RNF-09: health endpoint com estado de banco e redis
- RNF-10: auditoria de eventos sensiveis
- RNF-11: comandos de dev e build reproduziveis no monorepo

### 4.4 UX e desempenho

- RNF-12: shells mobile dedicados para operacao owner/staff
- RNF-13: suporte PWA com service worker proprio
- RNF-14: fila offline para operacoes no modulo app

---

## 5. Arquitetura e Sistema

### 5.1 Camadas da API

- Controller: contrato HTTP e guardas
- Service: regra de negocio e orquestracao transacional
- Prisma: persistencia em PostgreSQL
- Cache/Redis: rate limit, cache e suporte ao fanout realtime

### 5.2 Camadas do frontend

- App Router do Next.js
- Camada de dados por hooks TanStack Query
- Modulos de negocio por dominio (operations, owner-mobile, staff-mobile)
- Sincronizacao realtime com patch local + invalidacao seletiva

### 5.3 Limites arquiteturais atuais

- `use-operations-realtime` no frontend concentra muita logica de sincronizacao
- alguns shells mobile agregam muitas responsabilidades
- parte da documentacao ainda nao reflete esse desenho atual

---

## 6. Ciclo de Requisicao e Fluxos Tecnicos

### 6.1 Fluxo HTTP autenticado

1. Usuario autentica via endpoint de auth.
2. API grava sessao e cookies de controle.
3. SessionGuard valida identidade em requests protegidos.
4. CsrfGuard valida requests mutaveis.
5. Service aplica regra de negocio, persiste, audita e invalida cache quando aplicavel.

### 6.2 Fluxo realtime operacional

1. Cliente conecta em namespace `/operations` com sessao valida.
2. Gateway associa socket ao workspace do usuario.
3. Mutacoes operacionais disparam envelopes de evento.
4. Cliente aplica patch local no cache e usa fallback por invalidacao debounce.

### 6.3 Fluxo offline no modulo app

1. Mutacao falha por conectividade e entra em fila local IndexedDB.
2. Service worker tenta sincronizacao (Background Sync quando suportado).
3. Ao restaurar conectividade, fila e drenada e estado e reconciliado.

---

## 7. Modulos de Dominio (Auditoria de Implementacao)

### 7.1 Auth

Status: alta maturidade

- cadastro, verificacao OTP, login owner/staff, demo controlada
- reset de senha com controles de tentativa e janela temporal
- eventos de auditoria de seguranca

### 7.2 Admin PIN

Status: alta maturidade

- setup/disable, challenge efemero, verificacao com lockout por tentativa
- prova de autorizacao curta e nao reutilizavel no cliente

### 7.3 Operations

Status: alta maturidade funcional

- live snapshot operacional
- comanda e cozinha com transicoes de status
- caixa, resumo operacional e gestao de mesas

### 7.4 Orders

Status: alta maturidade

- criacao de pedido com consistencia de estoque
- transacao serializable
- cancelamento owner-only com reversao

### 7.5 Products

Status: media-alta

- CRUD e gerenciamento de combos
- importacao CSV desativada no controller (410), com logica ainda presente no service

### 7.6 Employees

Status: alta maturidade

- CRUD de equipe
- vinculo de usuario staff e senha temporaria hash

### 7.7 Finance

Status: alta maturidade

- agregacoes por periodo e dimensao de negocio
- consolidacao por moeda e cache com invalidação de dominio

### 7.8 Consent

Status: media-alta

- documentos versionados e aceite legal
- preferencias de cookies por usuario autenticado

### 7.9 Currency, Geocoding e Market Intelligence

Status:

- Currency: alta
- Geocoding: media-alta
- Market intelligence: media

Notas:

- currency com fallback e stale-cache
- geocoding com integracao externa e timeout
- insight IA com schema estruturado e limites de chamada

---

## 8. Integracoes Externas

### 8.1 Infra e plataforma

- PostgreSQL (persistencia)
- Redis (cache, rate limit, realtime adapter)

### 8.2 Servicos terceiros

- Brevo (email transacional)
- Gemini (insight IA)
- AwesomeAPI (cotacao de moedas)
- ViaCEP (consulta por CEP)
- Nominatim/OpenStreetMap (geocodificacao)

### 8.3 Confiabilidade de integracoes

- timeout, fallback e cache existem em partes criticas
- ainda e recomendada trilha de resiliência mais uniforme (circuit breaker/retry policy padronizada)

---

## 9. Testes, Qualidade e CI

### 9.1 Backend

- cobertura de testes relevante em dominios criticos
- suites e2e e de servico para auth, orders, operations, finance e seguranca

### 9.2 Frontend

- vitest para hooks e componentes criticos
- playwright para auth, navegacao e UX base

### 9.3 Lacunas objetivas

- cobertura frontend ainda nao acompanha toda a superficie de negocio
- ausencia de smoke automatizado de fluxo operacional ponta a ponta no CI principal

### 9.4 Pipeline

- `.github/workflows/ci.yml`: quality + backend-tests + frontend-unit + frontend-e2e + security + build
- `.github/workflows/dependency-review.yml`: governanca de dependencia
- `.github/workflows/ci-release-proposal.yml`: referencia historica da proposta que foi promovida

---

## 10. Observabilidade e Seguranca

### 10.1 Observabilidade

- health endpoint com sinais de db/redis
- request id e logging estruturado
- auditoria de eventos sensiveis

### 10.2 Seguranca aplicada

- sessao por cookie HttpOnly
- CSRF, CORS restritivo e validacao de origem/referer
- rate limit em Redis
- admin pin com challenge/prova efemera

### 10.3 Hardening prioritario

- endpoint de insight IA migrado para POST com CSRF
- revisar CSP para reduzir dependencia de `unsafe-inline` quando tecnicamente viavel

---

## 11. Riscos, Limitacoes e Divida Tecnica

### 11.1 Riscos de release

- regressao em sincronizacao realtime devido a concentracao de logica no hook principal
- cobertura e2e ainda parcial para todos os fluxos web de negocio

### 11.2 Limitacoes conhecidas

- CSV import de produtos desativado na camada HTTP
- PWA com escopo operacional em `/app`, nao full-site
- parte do fluxo offline depende de capacidade do browser para sync

### 11.3 Divida tecnica priorizada

1. modularizar hook de realtime no frontend
2. evoluir suites de smoke/e2e para fluxos de negocio core
3. consolidar politica de resiliencia para integracoes externas

---

## 12. Plano de Evolucao (Docs + Produto)

### 12.1 Governanca documental imediata

1. manter README.md e DOCS_DESK_IMPERIAL.md como fonte canonica
2. manter docs/README.md como indice de confiabilidade
3. revisar documentos parciais em ciclos curtos

### 12.2 Evolucao tecnica de curto prazo

1. manter gate CI full-stack estavel em PR/main
2. ampliar smoke automatizado para fluxo operacional critico
3. reduzir acoplamento de sincronizacao realtime no frontend
4. reforcar hardening de CSP e observabilidade de seguranca

### 12.3 Criterio de pronto para release ampliado

- docs canonicas alinhadas ao codigo
- gate de testes full-stack obrigatorio em PR/main
- riscos de seguranca residual com plano e owner definidos
- trilha de observabilidade validada em ambiente de homologacao

---

## Apendice A - Evidencias de Codigo Auditadas

Arquivos-chave usados nesta consolidacao (amostragem representativa):

- API bootstrap e seguranca: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Auth e guards: `apps/api/src/modules/auth/*`, `apps/api/src/modules/admin-pin/*`
- Operacao e realtime: `apps/api/src/modules/operations/*`, `apps/api/src/modules/operations-realtime/*`
- Comercial/executivo: `apps/api/src/modules/orders/*`, `apps/api/src/modules/finance/*`, `apps/api/src/modules/market-intelligence/*`
- Web shells e dados: `apps/web/app/*`, `apps/web/components/operations/*`, `apps/web/components/shared/*`
- PWA/offline: `apps/web/public/sw.js`, `apps/web/public/manifest.json`
- Testes e CI: `apps/api/test/*`, `apps/web/e2e/*`, `.github/workflows/*`
