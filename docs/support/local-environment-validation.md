# Developer Support Local Environment Validation

**Objetivo:** documentar como validar o Developer Support Kit em ambiente local real, sem usar produção e sem versionar credenciais.

## Resultado validado

Rodada local validada em 2026-06-16/17:

- PHP portátil `8.4.22` executou `composer validate --strict`;
- exemplos PHP e Laravel passaram em `php -l`;
- API local respondeu `GET /api/v1/health` com `200`;
- API local respondeu `GET /api/v1/openapi.json` com documento OpenAPI;
- exemplos PHP executaram `health`, `login`/`auth/me` e erro controlado `401`;
- `npm run support:smoke:local` passou com owner e staff locais;
- staff recebeu `403` em `/employees`, validando o smoke de autorização;
- relatório local gerado em `.cache/support-api-smoke-report.json`.

As credenciais usadas ficam apenas em variáveis de ambiente locais e não devem ser copiadas para documentação, issue, chat ou commit.

## 1. Ambiente PHP/Composer

Foi usado PHP/Composer portátil em `.cache/tools`, fora do repositório versionado:

- PHP: `.cache/tools/php/php.exe`
- Composer: `.cache/tools/composer.phar`
- `php.ini`: `.cache/tools/php/php.ini`

Validação executada:

```powershell
$php = Join-Path (Get-Location) '.cache\tools\php\php.exe'
$composer = Join-Path (Get-Location) '.cache\tools\composer.phar'

& $php -v
Push-Location examples\php-api-client
& $php $composer validate --strict
Pop-Location

& $php -l examples/php-api-client/src/DeskImperialClient.php
& $php -l examples/php-api-client/examples/health.php
& $php -l examples/php-api-client/examples/login.php
& $php -l examples/php-api-client/examples/error-handling.php
& $php -l examples/laravel-api-client/app/Services/DeskImperialClient.php
& $php -l examples/laravel-api-client/config/desk-imperial.php
& $php -l examples/laravel-api-client/tests/Feature/DeskImperialClientContractTest.php
```

Critério de aceite:

- `composer.json` válido;
- todos os arquivos PHP sem erro de sintaxe;
- nenhuma senha, cookie ou token real versionado.

## 2. Base local e API

Preparar Postgres/Redis, migrations e demo local:

```powershell
$env:DEMO_OWNER_PASSWORD='<senha-local-owner>'
$env:DEMO_STAFF_PASSWORD='<senha-local-staff-8-digitos>'
npm run local:backend:prepare
```

Subir API local:

```powershell
$env:ENABLE_API_DOCS='true'
$env:NODE_ENV='development'
npm --workspace @partner/api run dev
```

Validar endpoints mínimos:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4000/api/v1/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4000/api/v1/openapi.json
```

Critério de aceite:

- `GET /api/v1/health` retorna `200`;
- `GET /api/v1/openapi.json` retorna JSON OpenAPI;
- Postgres e Redis ficam `healthy` no Docker local.

## 3. Exemplos PHP contra API real

Executar os exemplos usando variáveis locais:

```powershell
$php = Join-Path (Get-Location) '.cache\tools\php\php.exe'
$env:DESK_API_BASE_URL='http://127.0.0.1:4000/api/v1'
$env:DESK_OWNER_EMAIL='demo@deskimperial.online'
$env:DESK_OWNER_PASSWORD='<senha-local-owner>'

& $php examples/php-api-client/examples/health.php
& $php examples/php-api-client/examples/login.php
& $php examples/php-api-client/examples/error-handling.php
```

Critério de aceite:

- `health.php` retorna `200`;
- `login.php` faz login e consulta `/auth/me`;
- `error-handling.php` usa cookie jar isolado e retorna `401` controlado sem sessão.

## 4. Smoke funcional da coleção

O Postman/Newman é útil para importação e inspeção manual, mas a validação funcional automatizada usa `scripts/run-developer-support-collection-smoke.mjs` porque o fluxo precisa preservar cookies e CSRF entre requests.

Executar:

```powershell
$env:DESK_SUPPORT_OWNER_PASSWORD='<senha-local-owner>'
$env:DESK_SUPPORT_STAFF_PASSWORD='<senha-local-staff-8-digitos>'
npm run support:smoke:local
```

Fluxos cobertos:

- health;
- OpenAPI;
- login owner;
- `/auth/me`;
- produtos;
- snapshot operacional;
- cozinha;
- abrir comanda com mesa única por execução;
- adicionar item;
- criar intent Point sem receber `403`;
- login staff;
- staff recebe `403` em `/employees`.

Critério de aceite:

- todos os passos passam;
- mutações owner não falham por CSRF;
- rota owner-only com sessão staff retorna `403`;
- relatório gerado em `.cache/support-api-smoke-report.json`.

## 5. Cuidados

- Não usar produção para aprender ferramenta.
- Não versionar `.cache`.
- Não colocar senha local nos documentos.
- Se `openapi.json` retornar `404`, tratar como drift de contrato/runtime antes de validar a coleção.
- Se `Comanda - Open` retornar `409`, revisar se o teste está usando mesa fixa; o smoke local usa mesa única por execução para evitar esse falso negativo.

## 6. Limpeza pós-teste

Ao terminar a validação, pare a API local e derrube Postgres/Redis de desenvolvimento quando não forem mais necessários:

```powershell
# Parar processo que estiver escutando a API local
Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }

npm run db:down
```

Motivo: o compose local publica Postgres/Redis no host para DX. Isso é aceitável durante validação local, mas não deve ficar aberto sem necessidade.
