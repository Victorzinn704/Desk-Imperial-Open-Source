# Cutover Neon -> Ampere (Lohana)

## Status em 2026-04-22

**Concluído.**

- `vm1` agora usa `DATABASE_URL` privado via PgBouncer em `10.220.10.10:6432`.
- `vm1` agora usa `DIRECT_URL` privado direto no PostgreSQL em `10.220.10.10:5432`.
- API/web passaram no smoke real contra `vm4`.
- `vm4` está em PostgreSQL 17.9.
- `pgBackRest` usa o stanza `deskimperial_pg17`.
- backup full pós-cutover concluído: `20260422-234250F`.
- restore-check na `vm5` concluído com o backup real.
- Prometheus na `vm2` está com todos os targets `up`.

## Validações executadas

- `api-db=10.220.10.10:6432?schema=public&pgbouncer=true&connection_limit=1`
- `GET /api/v1/health` dentro do container `desk-api`: `200`
- `GET /api/v1/health/ready` dentro do container `desk-api`: `200`
- `GET /` dentro do container `desk-web`: `200`
- `GET https://app.deskimperial.online/`: `200`
- banco restaurado na Ampere:
  - tabelas públicas: `24`
  - usuários: `24`
  - produtos: `52`
- `pgBackRest check`: `ok`
- `restore-check` na `vm5`: concluído em `restore-check-20260422T235046Z.txt`

## Ajustes aplicados durante o corte

- O Neon estava em PostgreSQL 17.8; a Ampere foi ajustada para PostgreSQL 17 para evitar downgrade de major version.
- O dump do Neon continha a extensão `pg_session_jwt`; ela foi removida do restore list porque não existe no PostgreSQL Debian e não é dependência funcional do Desk Imperial.
- O dump do Neon trouxe Row Level Security ligado em tabelas públicas; RLS foi desabilitado nas tabelas `public` da Ampere porque a autorização do produto é feita na API.
- O bootstrap da API foi corrigido para aceitar builds onde o Nest compila em `apps/api/dist`.

## Objetivo

Trocar o banco primário do Desk Imperial do Neon para a Ampere da Lohana sem alterar a API pública.

## Pré-requisitos

- WireGuard operacional entre `vm-free-01`, `vm-free-02` e Ampere
- runner AMD micro preparado para `restore-check` e `pgBadger`
- stack de banco em `infra/oracle/db` subida e saudável
- `network guard` da Ampere aplicado e persistido
- `stanza-create`, `backup-full` e `backup-diff` validados
- `pgBackRest` com `check` e primeiro backup concluídos
- migration `20260422093000_add_bi_schema` aplicada
- Metabase e Prometheus já vendo a Ampere

## Ordem do corte

1. medir baseline do Neon:
   - tamanho do banco
   - total de conexões
   - latência dos fluxos críticos
2. exportar snapshot consistente do Neon
3. restaurar snapshot na Ampere
4. rodar `npm --workspace @partner/api run prisma:migrate:deploy`
5. rodar `npm --workspace @partner/api run prisma:refresh:bi`
6. rodar `bash infra/scripts/oracle-runner-bootstrap.sh restore-check`
7. gerar `pgBadger` com `bash infra/scripts/oracle-runner-bootstrap.sh pgbadger`
8. validar staging com:
   - `DATABASE_URL` -> `10.220.10.10:6432`
   - `DIRECT_URL` -> `10.220.10.10:5432`
9. congelar escrita no ambiente antigo
10. aplicar delta final
11. trocar `.env` da produção
12. reiniciar `api`
13. monitorar 24h:
    - health
    - conexões
    - locks
    - WAL
    - disco
    - staleness de backup
    - erro 5xx

## Strings finais

```env
DATABASE_URL=postgresql://desk_app:<APP_DB_PASSWORD>@10.220.10.10:6432/deskimperial?schema=public&pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://desk_migration:<MIGRATION_DB_PASSWORD>@10.220.10.10:5432/deskimperial?schema=public
```

## Smoke pós-corte

- login owner/staff
- abrir comanda
- adicionar item
- fechar/cobrar
- resumo financeiro
- portfólio / cadastro rápido
- Metabase carregando dashboards
- Prometheus coletando exporters da Ampere

## Rollback

O rollback só é válido se o Neon não tiver recebido escrita concorrente após o corte. Se houver rollback:

1. parar escrita na API
2. recolocar `DATABASE_URL`/`DIRECT_URL` do ambiente antigo
3. reiniciar `api`
4. abrir incidente de inconsistência para reconciliar delta

## Observação pós-cutover

Depois desta virada, o Neon deve ser tratado como origem antiga. Não fazer escrita manual nele sem registrar incidente, porque a produção já aponta para a Ampere.
