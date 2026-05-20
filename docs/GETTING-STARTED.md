# Dicas para novos desenvolvedores

**Por Joao Victor — criador do Desk Imperial**

Este arquivo nao e uma especificacao tecnica do produto. Ele e um ponto de entrada humano para quem chegou agora no projeto e quer entender as ferramentas que de fato ficaram de pe.

---

## Ferramentas que sustentam o Desk Imperial hoje

### Banco de dados — PostgreSQL + Prisma

Prisma continua sendo a camada principal de modelagem e migrations.

No ambiente local, a trilha simples ainda e:

- PostgreSQL via `npm run db:up`
- Prisma via `prisma migrate deploy`
- seed/demo via scripts do workspace da API

Em producao, o banco atual segue este desenho:

- PostgreSQL 17 na Ampere da Lohana
- PgBouncer no mesmo host
- acesso privado por WireGuard

### Runtime — Oracle + Docker Compose

Hoje o projeto roda com:

- `web`, `api`, `redis`, `nginx` e `certbot` na Oracle `vm-free-01`
- builder, observabilidade, SonarQube e Metabase na Oracle `vm-free-02`
- banco dedicado na Ampere

Referencias:

- [infra/oracle/README.md](../infra/oracle/README.md)
- [infra/oracle/db/README.md](../infra/oracle/db/README.md)

### Observabilidade — OpenTelemetry, Faro e Sentry

Hoje o projeto ja tem trilha real de observabilidade:

- OpenTelemetry na API
- Faro no frontend para sinais do browser
- Sentry na API e no web para erro, tracing e sourcemaps

Isso importa porque boa parte da manutencao do Desk Imperial ja depende de diagnostico de runtime, nao so de leitura estatica do codigo.

### DNS e borda — Cloudflare

Cloudflare continua relevante para:

- DNS
- borda publica
- protecao basica da superficie exposta

Mas ele nao substitui o endurecimento da malha Oracle/WireGuard nem a higiene de segredos.

---

## O que vale aprender aqui

O valor deste projeto nao esta em uma stack "bonita". Esta em aprender a segurar um sistema real com:

- auth de sessao
- realtime
- operacao de caixa/comanda/cozinha
- observabilidade
- banco transacional + BI
- deploy de verdade

Se voce estiver chegando agora, a sequencia que mais paga dividendo e:

1. entender `README.md`
2. entender `docs/README.md`
3. subir o backend local
4. abrir `/app/owner` e `/app/staff`
5. seguir os fluxos de produto e operacao

---

## Guardrail

Nao use este arquivo como fonte canonica de arquitetura ou deploy. Para isso, prefira:

- [README.md](../README.md)
- [docs/README.md](./README.md)
- [docs/architecture/local-development.md](./architecture/local-development.md)
- [docs/architecture/database.md](./architecture/database.md)
- [docs/operations/sentry-rollout-2026-05-01.md](./operations/sentry-rollout-2026-05-01.md)

---

_Se algo aqui divergir do runtime, o runtime vence._
