# Caso: Migração de rate limiting do PostgreSQL para Redis

**Categoria:** decisão arquitetural
**Data:** 2026-03-23
**Área do sistema:** backend — auth, admin-pin, market-intelligence

## O que aconteceu

O rate limiting de autenticação (`AuthRateLimitService`) e do Admin PIN (`AdminPinService`) estava armazenando dados de controle de tentativas diretamente no PostgreSQL (Neon), usando a tabela `AuthRateLimit`.

O serviço de inteligência de mercado (`MarketIntelligenceService`) usava `Map` em memória para cache das respostas do Gemini e para controle de rate limiting da IA.

## Contexto

O projeto usa Neon como banco PostgreSQL (serverless) e Redis no Railway em rede privada. Ambos disponíveis, mas com características muito diferentes:

- **Neon:** cada conexão tem custo de cold start, recursos compartilhados no plano gratuito
- **Redis:** rede privada (<1ms de latência), zero egress cost, TTL nativo, ideal para dados efêmeros

O rate limiting de auth gerava queries ao Neon (`findUnique`, `upsert`, `deleteMany`) a cada tentativa de login, reset de senha e verificação de email — exatamente o workload mais frequente e mais sensível à latência do sistema.

## Impacto do problema

- Neon recebia queries desnecessárias em cada tentativa de autenticação
- O `Map` em memória do Gemini era perdido a cada restart/deploy, zerando cache e rate limits
- Após deploy, janela de vulnerabilidade onde rate limiting da IA estava desativado
- Cleanup manual de entradas expiradas (`cleanExpiredEntries` com timer de 2h) consumindo recursos

## Como foi resolvido

Migração completa do rate limiting para Redis usando o `CacheService` existente (já global):

- `AuthRateLimitService`: removida dependência de `PrismaService`, rate limiting via Redis com TTL automático
- `AdminPinService`: mesmo padrão, removidas queries diretas à tabela `AuthRateLimit`
- `MarketIntelligenceService`: cache do Gemini e rate limiting da IA migrados do `Map` para Redis
- Tabela `AuthRateLimit` removida do schema Prisma (migration: `remove-auth-rate-limit-table`)
- Novos key helpers adicionados ao `CacheService`: `ratelimitKey()` e `geminiKey()`

## Aprendizado

**Rate limiting é dado efêmero por natureza** — tem TTL natural, não precisa de persistência transacional e não precisa de queries complexas. Redis com `INCR + EXPIRE` é a ferramenta certa.

**`Map` em memória não é cache em produção** — sobrevive apenas enquanto o processo vive. Em ambiente com deploys frequentes (Railway auto-deploy), é equivalente a não ter cache.

**Graceful degradation continua funcionando** — se Redis ficar indisponível, rate limiting é silenciosamente desabilitado (comportamento de fallback intencional, mesmo do código anterior).

## Convenção de chaves Redis estabelecida

```
ratelimit:auth:{key}         — rate limit de autenticação
ratelimit:admin-pin:{key}    — rate limit de PIN administrativo
ratelimit:gemini:{key}       — rate limit de IA
gemini:insight:{userId}:{currency}:{focus}  — cache de insight
finance:summary:{userId}     — cache de dashboard financeiro
```

## Ação tomada

Migração executada. Schema atualizado. Necessário executar em cada ambiente:

```bash
npx prisma migrate dev --name remove-auth-rate-limit-table
# produção:
npx prisma migrate deploy
```
