# Mapa Real do Sistema - Desk Imperial

Data: 2026-04-01  
Base: leitura direta do codigo-fonte (API, Web, contratos, workflows e schema Prisma)

---

## 1. Escopo e metodo

Este mapa foi montado com leitura tecnica completa do monorepo, priorizando comportamento implementado no codigo em vez de documentos antigos.

Fontes principais usadas:

- apps/api/src/\*\*
- apps/api/prisma/schema.prisma
- apps/web/app/\*\*
- apps/web/components/\*\*
- apps/web/lib/\*\*
- .github/workflows/\*\*

---

## 2. Arquitetura real atual

## 2.1 Monorepo

- apps/api: NestJS 11 + Prisma + PostgreSQL + Redis + Socket.IO
- apps/web: Next.js 16 + React 19 + TanStack Query + Vitest + Playwright
- packages/types: contratos compartilhados API <-> Web

## 2.2 Componentes de plataforma

- Banco: PostgreSQL (schema com dominios de auth, operacao, comercial e consentimento)
- Cache: Redis via CacheService (rate limit, cache de resumo financeiro, cache de insight IA, invalidador por prefixo)
- Realtime: gateway Socket.IO em namespace /operations com canais por workspace
- Observabilidade: pino/nestjs-pino, request-id, audit log em tabela dedicada

## 2.3 Topologia funcional

- Entrada publica: landing, login, cadastro, recuperacao e verificacao de email
- Nucleo operacional mobile: /app com shells dedicados para owner e staff
- Nucleo executivo desktop: /dashboard com ambientes por dominio (overview, vendas, portfolio, PDV, calendario, folha, mapa, configuracoes)

---

## 3. Modelo de permissao e identidade

## 3.1 Modelo de usuarios

- User role OWNER: dono do workspace
- User role STAFF: membro vinculado por companyOwnerId
- Employee: cadastro operacional ligado ao workspace e opcionalmente a loginUserId
- Session: token hash + expiracao + workspaceOwnerUserId + ip + user-agent

## 3.2 Regra estrutural de acesso

A API resolve escopo de dados por workspace do dono, inclusive para usuarios STAFF.

Impacto pratico:

- dado comercial e operacional sempre isolado por workspace
- owner enxerga visao consolidada da empresa
- staff opera no mesmo workspace com restricao de permissao por regra de negocio

---

## 4. Mapa por modulo de backend

## 4.1 Auth

Maturidade: alta

Capacidades reais:

- sessao por cookie HttpOnly
- CSRF de duplo token (cookie + header)
- rate-limit por dominio em Redis
- registro com geocodificacao da empresa (modo estrito configuravel)
- OTP para verificacao de email e reset de senha
- conta demo com janela diaria de avaliacao
- trilha de auditoria para login, bloqueios e eventos sensiveis

## 4.2 Admin PIN

Maturidade: alta

Capacidades reais:

- setup/remocao de PIN com hash argon2id
- challenge efemero em Redis
- prova de verificacao via cookie HttpOnly
- lock por tentativas (anti brute force)
- validacao de prova em acoes sensiveis (ex.: descontos acima da politica)

## 4.3 Operations

Maturidade: alta

Capacidades reais:

- caixa: abertura, movimentos, fechamento de sessao e fechamento consolidado
- comandas: abertura, adicao de item, lote de itens, status, atribuicao, fechamento, cancelamento
- cozinha: fila por item com status QUEUED/IN_PREPARATION/READY/DELIVERED
- mesas: CRUD operacional com planta (posicao X/Y)
- snapshots live/kitchen/summary para consumo de painel

Invariantes importantes:

- regras por role (owner/staff)
- validacao de dia comercial
- emissao de eventos realtime por mutacao
- invalidacao de cache por prefixo de operacao

## 4.4 Orders

Maturidade: alta

Capacidades reais:

- criacao de pedido com itens e vendedor
- calculo de receita/custo/lucro
- transacao serializable para consistencia de estoque
- regra de desconto por role e PIN
- cancelamento owner-only com reversao de estoque
- geocodificacao de comprador quando aplicavel

## 4.5 Finance

Maturidade: alta

Capacidades reais:

- resumo executivo com agregacoes por moeda
- timeline e recortes por canal, cliente, funcionario, regiao
- conversao BRL/USD/EUR com snapshot de cotacao
- cache por usuario com TTL + invalidacao
- pilares semanais/mensais e recorte de eventos

Ponto de atencao:

- servico de pilares ainda carrega datasets em memoria para alguns calculos diarios; ha espaco para ampliar agregacao no banco em cenarios de alto volume.

## 4.6 Products

Maturidade: media-alta

Capacidades reais:

- CRUD owner-only
- logica de combo e componentes
- inferencia de necessidade de cozinha por categoria
- arquivamento/reativacao

Situacao atual:

- endpoint de importacao CSV esta ativo no controller, protegido por sessao + CSRF, e reutiliza a logica de importacao no service.

## 4.7 Employees

Maturidade: alta

Capacidades reais:

- cadastro/edicao/arquivamento/restauro
- login tecnico de staff associado
- hash de senha temporaria
- indicadores de equipe para dashboard

## 4.8 Consent

Maturidade: media-alta

Capacidades reais:

- documentos de consentimento versionados
- aceite legal obrigatorio
- preferencias de cookie analytics/marketing
- sincronizacao de consentimentos opcionais com revogacao

## 4.9 Currency

Maturidade: alta

Capacidades reais:

- cotacao live (AwesomeAPI)
- modo stale-cache em falha de API
- fallback de emergencia por taxa configuravel
- conversao com rota direta, inversa e via moeda base

## 4.10 Geocoding

Maturidade: media-alta

Capacidades reais:

- lookup CEP via ViaCEP
- geocoding de cidade/endereco via Nominatim
- cache in-memory com throttling
- precision city/address para rastreabilidade

## 4.11 Market Intelligence (IA)

Maturidade: media

Capacidades reais:

- insight executivo via Gemini
- prompt com contexto financeiro real do workspace
- schema JSON para resposta estruturada
- cache de resposta e rate-limit por usuario/IP

Ponto de atencao:

- endpoint de insight usa GET e gera custo externo. Funciona, mas postura de hardening recomenda migrar para POST com CSRF para blindar acionamento involuntario por navegacao cruzada.

---

## 5. Mapa frontend real

## 5.1 Landing e aquisicao

- landing principal em componente marketing dedicado
- narrativa visual forte e orientada a operacao
- CTA para cadastro e login
- posicionamento comercial melhor que versoes anteriores, mas ainda pode reforcar provas concretas de ROI com dados comparativos e casos reais

## 5.2 Dashboard desktop

- shell unico com navegacao por ambientes
- carregamento dinamico de ambientes pesados
- fallback para shell mobile por deteccao de viewport
- blocos executivos integrando financeiro, mapa, equipe e atividade

## 5.3 Operacao mobile

- shell staff e shell owner dedicados
- fluxo rapido: mesas -> comanda -> cozinha -> fechamento
- pull-to-refresh, haptics e banners de conexao
- otimizacoes com dynamic import e memoizacao em pontos criticos

## 5.4 Data layer

- cliente de API centralizado
- persistencia de token CSRF em sessionStorage (fallback)
- query keys padronizadas para operations
- patch otimista + rollback em mutacoes de operacao

## 5.5 Realtime no cliente

- hook unico para conexao Socket.IO e patch local de snapshots
- debounce para invalidacoes de operacao e comercial
- fallback para refetch quando envelope nao for patchavel

Risco tecnico:

- arquivo de hook realtime concentrou muita responsabilidade (patch de live + kitchen + summary), elevando custo de manutencao e risco de regressao em mudancas futuras.

---

## 6. Realtime ponta a ponta

## 6.1 Servidor

- gateway /operations com CORS por origem permitida
- autenticacao por cookie de sessao ou bearer token
- sala por workspace owner
- redis adapter habilitado quando REDIS_URL existe

## 6.2 Cliente

- status: connecting/connected/disconnected
- patch local quando envelope traz dados suficientes
- invalidacao parcial com debounce quando nao ha base para patch
- invalidacao comercial (orders/finance) em eventos de fechamento

## 6.3 Maturidade

Maturidade: alta para operacao diaria, media para manutenibilidade de longo prazo.

---

## 7. Estado real de PWA/offline

## 7.1 O que existe

- manifest.json configurado para experiencia standalone
- service worker em public/sw.js
- registro de SW no layout mobile /app
- fila offline em IndexedDB + tentativa de Background Sync

## 7.2 Limitacoes atuais

- registro de SW restrito ao modulo /app (nao cobre experiencia completa de /dashboard)
- cache name fixo e versionamento manual
- estrategia de cache ainda simples (sem camada de invalidacao por release)
- Background Sync depende de suporte de navegador (fallback existe, mas nao garante mesmo comportamento em todos os dispositivos)

## 7.3 Diagnostico

PWA atual e funcional para base operacional mobile, mas ainda nao atinge nivel de robustez de release para offline-first amplo.

---

## 8. Estado real de seguranca

Fortalezas:

- sessao HttpOnly + CSRF robusto em rotas mutaveis autenticadas
- CORS e checagem de origem/referer
- rate limiting por dominio em Redis
- admin PIN server-side com prova efemera e lockout
- sanitizacao de texto e bloqueio de vetores HTML simples
- auditoria de eventos sensiveis

Gaps residuais de hardening:

- endpoint de insight IA por GET (custo sensivel) ainda sem CSRF
- CSP do frontend ainda inclui unsafe-inline por restricao pratica de framework
- ausencia de check automatico de seguranca de dependencias dentro do pipeline principal (hoje separado)

---

## 9. Estado real de qualidade e testes

## 9.1 API

- suite relevante em apps/api/test com cobertura de auth, operations, orders, products, finance, geocoding e cache
- gate atual de CI executa backend com cobertura

## 9.2 Web

- testes unitarios focados em operacao/realtime e alguns shells mobile
- E2E Playwright focado em auth, navegacao e UX basica

Gap objetivo:

- testes frontend ainda abaixo da superficie total do produto (ambientes executivos, fluxos de configuracao e cenarios owner/staff autenticados de ponta a ponta)

---

## 10. Maturidade por dominio

- Autenticacao e sessao: alta
- Seguranca operacional (PIN + CSRF + rate-limit): alta
- Operacao de salao (caixa/comanda/cozinha): alta
- Comercial (pedidos/produtos/equipe): media-alta
- Financeiro executivo: alta
- Realtime: alta (funcional) / media (manutenibilidade)
- PWA/offline: media
- Testes frontend: media-baixa
- Pipeline de qualidade para release: media

---

## 11. Conclusao do mapa real

O Desk Imperial nao e um prototipo. O sistema ja opera com arquitetura madura em auth, operacao, financeiro e realtime.

O principal trabalho antes de uma liberacao ampla nao e reescrever produto; e reduzir riscos residuais de release em quatro frentes:

- robustez de PWA/offline
- ampliacao de cobertura de testes frontend
- hardening de endpoints com custo externo
- gate de CI orientado a release com seguranca e evidencias.
