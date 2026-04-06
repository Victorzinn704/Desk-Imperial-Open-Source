# Oracle runtime base

Este diretório contém a base mínima e executável da fase 1 para Oracle VM:

- `compose.yaml`: `web`, `api`, `redis`, `nginx` e `certbot`
- `docker/api.Dockerfile`
- `docker/web.Dockerfile`
- `.env.example`
- `nginx/nginx.conf`
- `nginx/conf.d/deskimperial.conf`
- `infra/scripts/oracle-bootstrap.sh`

## O que esta base faz

- mantém o PostgreSQL no Neon
- sobe `web` e `api` atrás de um reverse proxy `nginx`
- mantém o `redis` local à VM
- expõe apenas `80` e `443` publicamente no compose de runtime
- mantém `api`, `web` e `redis` sem bind direto em porta pública
- renova certificados pelo container `certbot`
- executa o deploy de migrations da API antes de iniciar o processo principal
- usa `corepack` para ativar `npm@11.8.0` e então roda `npm ci` com scripts habilitados e `HUSKY=0`
- copia os manifests do workspace antes da instalação para manter o lockfile e os workspaces consistentes
- faz um reparo mínimo e determinístico do binding nativo do Tailwind exigido pelo `next build` quando o `npm ci` não o materializa
- preserva o symlink de `next` no build do frontend para evitar que o Turbopack/workspace resolution quebre
- valida explicitamente a geração de `apps/web/.next` e a presença de `apps/web/scripts/start.mjs`
- valida explicitamente `apps/api/dist` e `apps/api/scripts/start-dist.mjs` no build da API

## O que ainda fica DADO AUSENTE

- IP público final ou hostname estável
- IAM / secret manager externo
- backup e DR
- observabilidade fase 2
- SonarQube como serviço persistente da Oracle

## Como usar

1. copie `.env.example` para `.env`
2. preencha os valores marcados como `replace-with-*` e os dados do Neon
3. garanta que `app.deskimperial.online` e `api.deskimperial.online` apontam para o IP público da VM
4. suba a base:

```bash
bash infra/scripts/oracle-bootstrap.sh up
```

5. em primeira emissão de certificado, rode o `certbot` com os volumes do compose:

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

- `curl https://api.deskimperial.online/api/health`
- `curl https://app.deskimperial.online/`
- `bash infra/scripts/oracle-bootstrap.sh ps`
