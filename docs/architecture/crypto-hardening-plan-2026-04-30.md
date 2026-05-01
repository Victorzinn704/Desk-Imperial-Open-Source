# Crypto Hardening Plan — 2026-04-30

## Objetivo

Reduzir exposicao de dados entre `web`, `api`, `redis` e `postgres`, sem vender seguranca ficticia.

O alvo correto e este:

1. criptografia **em transito**
2. criptografia **em repouso**
3. protecao de **segredos e cookies**
4. criptografia seletiva de **campos sensiveis**
5. trilha clara de **rotacao de chaves**

## Estado atual do projeto

### Ja protegido

- `web <-> api` em producao passa por `HTTPS` com certificado LetsEncrypt no Nginx da Oracle:
  - [deskimperial.conf](C:/Users/Desktop/Documents/desk-imperial/infra/oracle/nginx/conf.d/deskimperial.conf:1)
- A API sobe com `helmet`, `HSTS`, `referrerPolicy=no-referrer` e `frameguard=deny`:
  - [main.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/main.ts:82)
- Cookies de sessao e CSRF usam `HttpOnly`, `Secure` e `SameSite` controlado por ambiente:
  - [auth-session.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/auth/auth-session.service.ts:324)
  - [admin-pin.service.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/modules/admin-pin/admin-pin.service.ts:252)
- Segredos minimos de bootstrap ja sao validados em producao:
  - `COOKIE_SECRET`
  - `CSRF_SECRET`
  - `ENCRYPTION_KEY`
  - [env.validation.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/config/env.validation.ts:41)
- Senhas de login nao ficam em claro; o projeto usa hash, nao criptografia reversivel.

### Gap real

- `ENCRYPTION_KEY` existia no contrato, mas **nao estava sendo usada** para criptografia de campo.
- `DATABASE_URL` e `DIRECT_URL` da Oracle trafegam em rede privada/WireGuard, mas o exemplo nao forca `sslmode=require`.
- `REDIS_URL` usa `redis://`, nao `rediss://`.
- O projeto ainda nao tem uma lista fechada de colunas que exigem criptografia em repouso.

## Decisao tecnica

### 1. Transporte

#### Browser -> API

Continuar com:
- HTTPS obrigatorio
- HSTS
- cookies `Secure`

Ja esta correto.

#### API -> PostgreSQL

Existem dois cenarios aceitaveis:

1. **WireGuard privado + host privado**
   - protege o transporte entre VMs
   - hoje e o minimo real que ja temos
2. **WireGuard + TLS no Postgres/PgBouncer**
   - alvo mais forte
   - usar `sslmode=require` ou `verify-full` quando o stack suportar certificado de servidor

Regra pratica:
- se a conexao sair da malha privada, `sslmode=require` deixa de ser opcional

#### API -> Redis

Mesmo criterio:
- em malha privada/WireGuard, o risco cai
- fora disso, usar `rediss://`

### 2. Campo sensivel

Criado o primitivo reutilizavel:
- [field-encryption.util.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/src/common/utils/field-encryption.util.ts:1)
- algoritmo: `AES-256-GCM`
- payload versionado: `enc.v1.*`
- suporte a `AAD` para amarrar o payload ao contexto

Teste:
- [field-encryption.util.spec.ts](C:/Users/Desktop/Documents/desk-imperial/apps/api/test/field-encryption.util.spec.ts:1)

### 3. O que deve ser criptografado no banco

Nao faz sentido criptografar tudo. Isso quebraria busca, agregacao e manutencao sem aumentar seguranca de forma proporcional.

Prioridade de criptografia de campo:

1. segredos de integracao armazenados pelo usuario
   - tokens de terceiros
   - chaves de bot
   - credenciais externas
2. dados sensiveis de contato que nao precisam de busca direta
   - telefones secundario
   - e-mails de contingencia
3. payloads operacionais temporarios com PII
   - snapshots ou anexos sensiveis

### 4. O que deve ficar em hash, nao em criptografia reversivel

- senhas
- PINs
- tokens de redefinicao
- tokens de vinculo de uso unico
- tokens de sessao persistidos

Se a aplicacao so precisa **comparar**, o correto e hash.
Se a aplicacao precisa **ler de volta**, o correto e criptografia.

## Backlog objetivo

### Fase 1 — agora

1. manter `web <-> api` em HTTPS estrito
2. manter cookies seguros
3. usar `ENCRYPTION_KEY` real em producao
4. adotar `field-encryption.util.ts` nos primeiros campos sensiveis reais

### Fase 2 — transporte interno

1. revisar Oracle + Ampere:
   - Postgres com TLS
   - PgBouncer com TLS
   - Redis com TLS quando sair da malha privada
2. subir politica para:
   - `DATABASE_URL ... sslmode=require`
   - `DIRECT_URL ... sslmode=require`
   - `REDIS_URL=rediss://...` onde suportado

### Fase 3 — governanca de chave

1. rotacao versionada de `ENCRYPTION_KEY`
2. suporte a keyring (`active + previous`)
3. job de re-encrypt controlado

## Regras de engenharia

1. nao inventar criptografia caseira fora do util central
2. nao usar criptografia para esconder problema de autorizacao
3. nao usar criptografia reversivel para senha ou PIN
4. nao chamar de “projeto todo criptografado” enquanto Redis/Postgres interno nao estiverem auditados por transporte e campos

## Resultado esperado

Depois desse corte, o Desk Imperial passa a ter:

- transporte externo web/api ja endurecido
- primitivo oficial de criptografia de campo
- contrato de `ENCRYPTION_KEY` explicito no runtime Oracle
- backlog claro para fechar Postgres/Redis e colunas sensiveis
