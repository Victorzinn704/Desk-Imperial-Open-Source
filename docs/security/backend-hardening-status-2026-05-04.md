# Backend Security Hardening Status - 2026-05-04

## Objetivo

Registrar o que foi verificado e corrigido apos a auditoria de seguranca recebida em 2026-05-02, separando mitigacoes ja entregues de frentes planejadas que exigem decisao de produto, migracao de dados ou alteracao de UX.

Commit publicado:

- `a03fbf3 fix(security): harden webhook and session boundaries`

Status de entrega:

- branch `main` sincronizada com `origin/main`
- CI GitHub verde no commit `a03fbf3`
- `CI`: success
- `Quality Gate`: success
- `SonarQube`: success

## Escopo verificado

Esta frente revisou os achados da auditoria externa/local com foco em:

- webhook Telegram
- upload de CSV de produtos
- revogacao de sessao em realtime
- bootstrap/env de segredos
- CSP em producao
- race condition de cadastro
- scrubbing de PII em Sentry e Faro
- regressao de injecao/auth ja documentada em `docs/security/backend-injection-audit-2026-05-03.md`

## Correcoes entregues

### Webhook Telegram

Arquivo:

- `apps/api/src/modules/notifications/notifications.controller.ts`

Mudanca:

- substituiu comparacao direta de segredo por comparacao timing-safe
- usa digest SHA-256 e `crypto.timingSafeEqual`
- falha fechada quando segredo esperado ou recebido esta ausente

Risco reduzido:

- ataque de timing contra o segredo do webhook
- execucao indevida de comandos de bot por descoberta incremental do segredo

Teste:

- `apps/api/test/notifications.telegram.controller.spec.ts`

### Upload de produtos

Arquivo:

- `apps/api/src/modules/products/products.controller.ts`

Mudanca:

- `FileInterceptor('file')` agora define limite de upload
- `fileSize`: 10 MB
- `files`: 1

Risco reduzido:

- abuso autenticado para consumo excessivo de memoria/disco via upload massivo

### Realtime e revogacao de sessao

Arquivo:

- `apps/api/src/modules/operations-realtime/operations-realtime.gateway.ts`

Mudanca:

- cache local de autenticacao do socket agora invalida por `sessionId`
- revogacao via Redis cross-pod tambem remove a sessao do cache local
- reconnect com token revogado nao deve ser aceito durante a janela antiga de 60s

Risco reduzido:

- reutilizacao curta de sessao revogada em pods que ainda tinham cache quente

Teste:

- `apps/api/test/operations-realtime.gateway.spec.ts`

### Bootstrap e variaveis de ambiente

Arquivos:

- `apps/api/src/main.ts`
- `apps/api/src/main.bootstrap.ts`
- `apps/api/src/config/env.validation.ts`

Mudancas:

- `TELEGRAM_WEBHOOK_SECRET` passou a ser exigido quando o bot Telegram esta efetivamente ativo
- a ativacao considera token configurado e `TELEGRAM_BOT_ENABLED !== 'false'`
- validacao ocorre no bootstrap/env, antes de expor runtime inseguro

Risco reduzido:

- ambiente de producao subir com webhook falsamente protegido

Teste:

- `apps/api/test/env.validation.spec.ts`

### CSP de producao

Arquivo:

- `apps/api/src/main.ts`

Mudanca:

- `style-src 'unsafe-inline'` foi removido do CSP de producao
- o relaxamento permanece fora de producao para nao quebrar desenvolvimento e ferramentas locais

Risco reduzido:

- superficie de XSS por injecao de estilo em producao

### Race condition no cadastro

Arquivo:

- `apps/api/src/modules/auth/auth-registration.service.ts`

Mudanca:

- erro Prisma `P2002` em criacao concorrente de usuario agora vira `ConflictException`
- o segundo request concorrente retorna erro de dominio, nao erro bruto de infraestrutura

Risco reduzido:

- falha 500 em concorrencia de email unico
- vazamento de comportamento interno em fluxo publico de cadastro

Teste:

- `apps/api/test/auth.service.spec.ts`

### Scrubbing de PII e segredos

Arquivos:

- `apps/api/src/instrument.ts`
- `apps/web/lib/observability/faro.ts`

Mudancas:

- Sentry recebeu `beforeSend` com redacao de headers, cookies, query, body, breadcrumbs e extras sensiveis
- Faro recebeu chaves adicionais para scrub
- chaves cobertas incluem `authorization`, `cookie`, `password`, `token`, `secret`, `csrf`, `pin`, `email`, `cpf`, `cnpj`, `session`, `jwt`, `apiKey`, `api_key` e `bearer`

Risco reduzido:

- vazamento acidental de credenciais, sessao ou PII em telemetria

Teste:

- `apps/web/lib/observability/faro-telemetry.test.ts`

### Escopo de qualidade

Arquivo:

- `scripts/check-worktree-scope.mjs`

Mudanca:

- adicionado escopo `seguranca-backend-hardening`
- permite classificar esta frente defensiva sem enfraquecer `quality:scope:strict`

## Validacao executada

Gates locais executados e aprovados:

- `npm --workspace @partner/api run typecheck`
- `npm --workspace @partner/web run typecheck`
- `npm --workspace @partner/api run test -- notifications.telegram.controller operations-realtime.gateway env.validation auth.service.spec --runInBand`
- `npm --workspace @partner/web run test -- faro-telemetry`
- `npm --workspace @partner/api run lint`
- `npm run lint:deps`
- `npm run lint:cycles`
- `npm run quality:contracts`
- `npm run quality:scope:strict`
- `npm run format:check`
- `npm run lint:secrets:staged`
- `git diff --check`

Observacao:

- o lint da API passou com `0 errors`
- warnings antigos de code health/lint continuam sendo divida real, nao foram silenciados

## Itens verificados e mantidos como decisao posterior

### Field encryption at-rest

Estado atual:

- existe util central de criptografia de campo em `apps/api/src/common/utils/field-encryption.util.ts`
- o util usa AES-256-GCM com payload versionado
- ainda nao ha uma lista fechada de colunas sensiveis para aplicar criptografia reversivel

Por que nao foi alterado nesta rodada:

- criptografar campos existentes exige decisao de dominio
- pode quebrar busca, filtros, suporte, exportacao e relatorios
- exige migracao de dados, estrategia de chave e plano de rollback

Documento relacionado:

- `docs/architecture/crypto-hardening-plan-2026-04-30.md`

### Admin PIN de 4 digitos

Estado atual:

- PIN nao fica em claro
- validacao usa hash forte e lockout online
- prova curta fica server-side e vinculada a sessao/workspace

Risco remanescente:

- se o banco vazar, 4 digitos tem entropia baixa para ataque offline contra hash

Por que nao foi alterado nesta rodada:

- mudar para 6 digitos/TOTP afeta UX de operacao financeira
- ha PINs existentes no banco
- exige migracao compativel com usuarios atuais
- exige fluxo de comunicacao e recuperacao

Documento relacionado:

- `docs/security/admin-pin-hardening.md`

## Proxima frente planejada

### Frente A - Criptografia at-rest de campos sensiveis

Decisoes necessarias:

1. quais campos precisam ser lidos de volta e devem ser criptografados
2. quais campos so precisam de comparacao e devem permanecer como hash
3. quais buscas/relatorios seriam impactados
4. como sera feita a rotacao de `ENCRYPTION_KEY`
5. qual sera a estrategia de migracao e rollback

Candidatos iniciais:

- segredos de integracao armazenados por workspace
- tokens de terceiros
- dados de contato sensiveis que nao precisam de busca direta
- payloads operacionais temporarios com PII

Gate tecnico minimo:

- nenhum campo criptografado sem AAD de contexto
- nenhum segredo novo fora do util central
- testes de roundtrip, chave invalida e contexto incorreto
- migracao idempotente e reversivel por backup

### Frente B - Migracao do Admin PIN

Opcoes tecnicas:

1. elevar PIN novo para 6 digitos, mantendo validacao temporaria de PIN legado de 4 digitos
2. exigir reset de PIN no proximo uso administrativo
3. substituir PIN por TOTP para workspaces com maior risco
4. manter PIN com Argon2 mais caro e monitoramento reforcado, aceitando trade-off de UX

Recomendacao inicial:

- adotar 6 digitos para novos PINs
- manter validacao de PIN legado ate o usuario trocar
- forcar troca progressiva em acoes financeiras de maior risco
- registrar auditoria especifica para troca, falha e lockout

Gate tecnico minimo:

- nenhum PIN em storage do browser
- nenhum bearer token derivado do PIN no frontend
- lockout e rate limit preservados
- testes de compatibilidade entre PIN legado e PIN novo
- plano de reversao documentado antes da migracao

## Como usar este documento

Antes de mexer novamente em seguranca backend:

1. verificar se o achado e mitigacao simples, migracao de dados ou decisao de produto
2. se for mitigacao simples, aplicar com teste focado e gate local
3. se for migracao, criar plano de rollback antes de codigo
4. se afetar UX financeira, alinhar fluxo antes de mudar contrato
5. manter CI verde e nao silenciar warning real
