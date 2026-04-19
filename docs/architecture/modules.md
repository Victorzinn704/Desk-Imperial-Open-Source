# Módulos de Domínio — Desk Imperial API

**Versão:** 1.1  
**Última atualização:** 2026-04-17  
**Localização:** `apps/api/src/modules/`

---

## Visão geral

A API do Desk Imperial é organizada em módulos de domínio com responsabilidade clara e isolada.

Estado atual da borda HTTP:

- prefixo global ativo: `/api/v1`
- modulos migrados usam `ZodValidationPipe` + schemas Zod
- modulos ainda nao migrados permanecem em modo legado durante a transicao
- contratos compartilhados entre workspaces vivem em `packages/types`
- a superficie documentada gera `packages/api-contract/openapi.json`

Princípio central: **todo acesso a dado de negócio filtra por `companyOwnerId`**. Nenhum módulo retorna dados de outro workspace.

---

## Mapa de módulos

```
modules/
├── auth/                  # Autenticação, sessão, CSRF, recuperação de senha
├── admin-pin/             # PIN de 4 dígitos para ações sensíveis
├── operations/            # Comandas, caixa, mesas — core operacional
├── operations-realtime/   # Gateway Socket.IO para propagação de eventos
├── orders/                # Pedidos com validação de estoque
├── products/              # Portfólio de produtos e combos
├── finance/               # KPIs financeiros e analytics
├── employees/             # Gestão de equipe e folha de pagamento
├── users/                 # Perfil de usuário e workspace
├── consent/               # LGPD — consentimento e documentos legais
├── currency/              # Cotações de moeda com cache e fallback
├── geocoding/             # Geocodificação de endereços via Nominatim
├── mailer/                # E-mails transacionais via Brevo
├── market-intelligence/   # Insight executivo com Gemini AI
├── monitoring/            # Health check e observabilidade
└── cache/                 # Serviço Redis compartilhado
```

---

## Módulo: auth

**Responsabilidade:** autenticação, sessão, CSRF e ciclo completo de identidade do usuário.

**Arquivos principais:**

- `auth.service.ts` — orquestrador; delega para os 5 serviços especializados
- `auth-session.service.ts` — sessao, cache, cookies, CSRF, validacao de token
- `auth-login.service.ts` — login owner/staff, login demo, resolucao de atores
- `auth-registration.service.ts` — cadastro de usuario, geocodificacao, consentimento
- `auth-password.service.ts` — solicitacao e execucao de reset de senha
- `auth-email-verification.service.ts` — emissao e validacao de codigo OTP de email
- `auth-shared.util.ts` — selects, helpers e utilitarios compartilhados
- `auth.controller.ts` — endpoints HTTP de autenticacao
- `auth-rate-limit.service.ts` — controle de taxa por dominio de operacao
- `demo-access.service.ts` — conta demo com limite de tempo
- `guards/session.guard.ts` — guard obrigatorio em todas as rotas privadas
- `guards/csrf.guard.ts` — guard obrigatorio em todas as mutacoes autenticadas
- `decorators/current-auth.decorator.ts` — injeta sessao atual nos controllers

**Endpoints relevantes:**

- `POST /auth/register` — cadastro de novo usuário
- `POST /auth/login` — autenticação
- `POST /auth/logout` — encerrar sessão
- `POST /auth/verify-email` — verificar e-mail com código
- `POST /auth/forgot-password` — solicitar reset de senha
- `POST /auth/reset-password` — redefinir senha com token
- `GET /auth/me` — dados da sessão atual

**Segurança:**

- Cookies emitidos com `HttpOnly`, `Secure`, `SameSite`
- CSRF token duplo: cookie `csrf-token` + header `x-csrf-token`
- Senhas com `argon2id`
- Rate limit em todos os endpoints sensíveis via Redis

---

## Módulo: admin-pin

**Responsabilidade:** proteger ações sensíveis com PIN de 4 dígitos verificado server-side.

**Arquivos principais:**

- `admin-pin.service.ts` — setup, verificação, remoção do PIN; challenge efêmero
- `admin-pin.guard.ts` — guard que verifica prova de PIN nos endpoints protegidos
- `admin-pin.controller.ts` — endpoints de gestão do PIN

**Endpoints relevantes:**

- `POST /admin-pin/setup` — configurar PIN
- `POST /admin-pin/verify` — verificar PIN e emitir prova
- `POST /admin-pin/remove` — remover PIN configurado

**Comportamento:**

- PIN armazenado com hash
- Challenge efêmero gerado por requisição de verificação
- Prova de verificação emitida em cookie HttpOnly — nunca exposta ao JS
- Bloqueio após 3 tentativas incorretas (5 minutos)
- Rate limit via Redis

---

## Módulo: operations

**Responsabilidade:** core operacional — comandas, caixa e mesas. O módulo mais complexo da API.

**Arquivos principais:**

- `operations.service.ts` (via facade) — coordena todas as operações
- `operations-helpers.service.ts` — construção do snapshot ao vivo (`buildLiveSnapshot`)
- `comanda.service.ts` — ciclo de vida completo de comandas
- `cash-session.service.ts` — abertura e fechamento de sessão de caixa
- `operations-domain.utils.ts` — utilitários de domínio, invalidação de cache
- `operations.controller.ts` — endpoints REST de operações
- `operations.types.ts` — tipos de domínio operacional

**Endpoints relevantes:**

- `GET /operations/live` — snapshot ao vivo de comandas, caixa e mesas
- `POST /operations/comanda` — abrir comanda
- `PATCH /operations/comanda/:id/status` — mudar status da comanda
- `POST /operations/comanda/:id/item` — adicionar item à comanda
- `DELETE /operations/comanda/:id/item/:itemId` — remover item
- `POST /operations/cash-session/open` — abrir caixa
- `POST /operations/cash-session/close` — fechar caixa

**Cache:**

- Snapshot ao vivo: TTL 30s, invalidado por evento Socket.IO
- Kitchen e summary: invalidados em mutações

**Performance:**

- `buildLiveSnapshot` executa 5 queries em `Promise.all` (query unificada, não sequencial)
- `compactMode` reduz payload quando itens detalhados não são necessários

---

## Módulo: operations-realtime

**Responsabilidade:** gateway Socket.IO para propagação de eventos operacionais em tempo real.

**Namespace:** `/operations-realtime`

**Arquivos principais:**

- `operations-realtime.gateway.ts` — WebSocket gateway
- `operations-realtime.service.ts` — publicação de eventos por workspace
- `operations-realtime.auth.ts` — autenticação da conexão Socket.IO

**Comportamento:**

- Cada workspace tem seu próprio canal de eventos (isolamento por `companyOwnerId`)
- Conexão exige sessão válida — conexões não autenticadas são rejeitadas
- Eventos propagados: `comanda:updated`, `comanda:created`, `comanda:closed`, `cash:updated`
- Frontend aplica patches otimistas ao receber eventos sem recarregar o snapshot completo

---

## Módulo: orders

**Responsabilidade:** criação e cancelamento de pedidos com validação de estoque.

**Arquivos principais:**

- `orders.service.ts` — criação, validação de estoque, cálculo de lucro, cancelamento

**Comportamento crítico:**

- Criação de pedido usa transação `SERIALIZABLE` para evitar venda duplicada em concorrência
- Estoque decrementado automaticamente ao confirmar
- Cancelamento reverte o estoque
- Lucro calculado por item (preço de venda − custo)

---

## Módulo: products

**Responsabilidade:** portfólio de produtos, combos e componentes.

**Comportamento:**

- Produtos têm nome, preço, categoria, unidade, margem e flag de ativo/inativo
- Combos agrupam múltiplos produtos com preço único
- Produtos inativos não aparecem no PDV mas mantêm histórico
- Preço suporta múltiplas moedas (BRL, USD, EUR)
- Import CSV: endpoint ativo no controller, protegido por sessão + CSRF e apoiado pela lógica de importação no service

---

## Módulo: finance

**Responsabilidade:** analytics financeiro — KPIs, top produtos, top vendedores, recortes por período.

**Comportamento:**

- Calcula receita, custo, margem e lucro por período (dia, semana, mês, customizado)
- Ranking de top produtos por receita
- Ranking de top vendedores por volume de vendas
- Conversão de valores via módulo `currency`
- Cache Redis com TTL 120s

---

## Módulo: employees

**Responsabilidade:** gestão de equipe, folha de pagamento e login de funcionários.

**Comportamento:**

- Cadastro de funcionário com nome, cargo, salário base e percentual de comissão
- Folha calculada automaticamente: `salário_base + (total_vendas × percentual_comissão)`
- Histórico de vendas por funcionário
- Funcionários podem ter credenciais de login próprias (papel STAFF)
- Cache Redis com TTL 600s

---

## Módulo: users

**Responsabilidade:** perfil de usuário, configurações de workspace e ownership.

**Comportamento:**

- Cada usuário OWNER define o `companyOwnerId` do workspace
- Configurações de perfil (nome, endereço, cidade da empresa)
- Geocodificação do endereço disparada no cadastro/atualização

---

## Módulo: consent

**Responsabilidade:** conformidade com LGPD — consentimento de cookies e documentos legais.

**Comportamento:**

- Documentos legais são versionados (versão controlada por `CONSENT_VERSION` no `.env`)
- Aceite de documento registrado com data, versão e usuário
- Preferências de cookies armazenadas por usuário autenticado
- Bootstrap automatico: verifica e cria versão de documento na inicialização da API

---

## Módulo: currency

**Responsabilidade:** cotações de moeda em tempo real com cache e fallback.

**Integrações:**

- AwesomeAPI — cotações BRL/USD/EUR
- Cache Redis TTL 300s (5 minutos)
- Stale cache até 6 horas em caso de falha da API externa
- Valores de fallback configuráveis no `.env` (`EXCHANGE_RATES_FALLBACK_USD_BRL`, `EXCHANGE_RATES_FALLBACK_EUR_BRL`)

---

## Módulo: geocoding

**Responsabilidade:** geocodificar endereços para o mapa de vendas.

**Integração:** Nominatim (OpenStreetMap) — gratuito, sem API key obrigatória.

**Comportamento:**

- Cache Redis TTL 86400s (24 horas) — endereços não mudam frequentemente
- Timeout curto (1800ms) para não bloquear o fluxo de cadastro
- Falha na geocodificação não impede o cadastro (`REGISTRATION_GEOCODING_STRICT=false`)

---

## Módulo: mailer

**Responsabilidade:** envio de e-mails transacionais.

**Integração:** Brevo (ex-Sendinblue) — plano gratuito tem 300 e-mails/mês.

**E-mails enviados:**

- Verificação de e-mail no cadastro
- Código de recuperação de senha
- Alertas de login suspeito (configurável)

**Comportamento:**

- Templates HTML com fallback texto plano
- Timeout de dispatch configurável para não bloquear o fluxo principal
- Se Brevo não estiver configurado, e-mails falham silenciosamente em dev

---

## Módulo: market-intelligence

**Responsabilidade:** geração de insight executivo com Gemini AI.

**Integração:** Google Gemini 2.5 Flash.

**Comportamento:**

- Resumo estruturado gerado com base nos dados do workspace (financeiro, produtos, equipe)
- Cache Redis TTL 900s (15 minutos)
- Rate limit: 6 requisições por 60 minutos por workspace
- Endpoint protegido com CSRF e sessão
- Timeout configurável (`GEMINI_TIMEOUT_MS=15000`)

---

## Módulo: monitoring

**Responsabilidade:** health check e observabilidade básica.

**Endpoints:**

- `GET /health` — retorna estado de DB e Redis
  - `{ status: "ok", db: "ok", redis: "ok" }` quando tudo funciona
  - Estado degradado quando algum serviço está indisponível mas o sistema ainda responde

---

## Módulo: cache

**Responsabilidade:** abstração do Redis compartilhada por todos os módulos.

**Comportamento:**

- `CacheService` é global — injetável em qualquer módulo
- Graceful degradation: se Redis estiver indisponível, operações de cache são silenciosas
- Métodos principais: `get`, `set`, `del`, `delByPrefix`
- Prefixos de cache por domínio evitam colisões entre módulos

**Prefixos de cache:**

| Dado            | Prefixo                                      | TTL    |
| --------------- | -------------------------------------------- | ------ |
| Finance summary | `finance:summary:{userId}`                   | 120s   |
| Products list   | `products:list:{userId}`                     | 300s   |
| Employees list  | `employees:list:{userId}`                    | 600s   |
| Orders summary  | `orders:summary:{userId}`                    | 90s    |
| Operations live | `operations:live:{userId}:{date}`            | 30s    |
| Gemini insight  | `gemini:insight:{userId}:{currency}:{focus}` | 900s   |
| Exchange rates  | `currency:rates`                             | 300s   |
| Geocoding       | `geocoding:{query}`                          | 86400s |
