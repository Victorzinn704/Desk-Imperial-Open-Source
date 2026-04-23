# Oracle runtime base

Este diretório contém a base de runtime da camada pública do Desk Imperial.

Serviços desta base:

- `compose.yaml`: `web`, `api`, `redis`, `nginx` e `certbot`
- `docker/api.Dockerfile`
- `docker/web.Dockerfile`
- `.env.example`
- `nginx/nginx.conf`
- `nginx/conf.d/deskimperial.conf`
- `infra/scripts/oracle-bootstrap.sh`

## O que esta base faz

- sobe `web` e `api` atrás de `nginx`
- mantém o `redis` local à `vm-free-01`
- usa `DATABASE_URL` externa, agora apontando para o **PgBouncer da Ampere da Lohana**
- usa `DIRECT_URL` externa, agora apontando para o **PostgreSQL direto da Ampere**
- expõe apenas `80` e `443` publicamente
- mantém `api`, `web` e `redis` sem bind direto em porta pública
- renova certificados com `certbot`
- continua executando migrations da API antes do processo principal

## Dependências externas desta base

- PostgreSQL primário na **Ampere da Lohana**
- `PgBouncer` na mesma Ampere
- conectividade privada por **WireGuard** entre:
  - `vm-free-01`
  - `vm-free-02`
  - Ampere da Lohana
- observabilidade e Metabase em `vm-free-02`

## O que ainda fica fora desta base

- banco de dados
- backup e restore
- `pgBackRest`
- exporter PostgreSQL
- Metabase
- configuração de WireGuard

Esses itens agora vivem em:

- `infra/oracle/db`
- `infra/oracle/ops`
- `infra/oracle/runner`

## Como usar

1. copie `.env.example` para `.env`
2. preencha os valores reais do runtime e os endpoints privados do banco
3. garanta que `app.deskimperial.online` e `api.deskimperial.online` apontam para o IP público da `vm-free-01`
4. garanta que a malha WireGuard já está funcional antes de subir a API
5. suba a base:

```bash
bash infra/scripts/oracle-bootstrap.sh up
```

## Primeira emissão de certificado

```bash
set -a
. ./infra/oracle/.env
set +a

docker run --rm \
  -v desk-imperial-oracle_certbot-www:/var/www/certbot \
  -v desk-imperial-oracle_certbot-certs:/etc/letsencrypt \
  certbot/certbot:latest certonly \
  --webroot --webroot-path /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos --no-eff-email \
  --non-interactive \
  -d api.deskimperial.online \
  -d app.deskimperial.online
```

## Verificação básica

- `curl https://api.deskimperial.online/api/v1/health`
- `curl https://app.deskimperial.online/`
- `bash infra/scripts/oracle-bootstrap.sh ps`
- `docker exec desk-api printenv DATABASE_URL`
