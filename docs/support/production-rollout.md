# Developer Support Production Rollout

**Objetivo:** colocar o Developer Support Kit em fluxo de produção sem abrir superfície desnecessária, sem publicar segredo e sem rodar testes mutáveis contra dados reais.

## 1. Decisão de arquitetura

O kit tem três camadas diferentes:

| Camada                   | Vai para produção? | Como usar                                                                     |
| ------------------------ | ------------------ | ----------------------------------------------------------------------------- |
| Documentação GitHub      | Sim                | `docs/support`, `docs/operations/developer-support-*`, `docs/api`, `examples` |
| OpenAPI runtime          | Condicional        | `GET /api/v1/openapi.json`, controlado por `ENABLE_API_DOCS`                  |
| Smoke mutável da coleção | Não em produção    | usar só em local, lab ou staging controlado                                   |

O servidor de produção não precisa instalar PHP ou Composer. Os exemplos PHP/Laravel são artefatos de integração para consumidores e validação local/lab, não dependência runtime do Desk Imperial.

## 2. Política de exposição da OpenAPI

Por padrão, produção deve manter `ENABLE_API_DOCS=false`.

Habilitar `ENABLE_API_DOCS=true` em produção somente quando pelo menos uma proteção estiver ativa:

- rota protegida por túnel/VPN/Tailscale;
- allowlist de IP no proxy;
- Cloudflare Access ou equivalente;
- basic auth no proxy;
- ambiente staging/lab com dados não sensíveis.

Sem essa proteção, prefira publicar o contrato no GitHub como artefato versionado, não como endpoint público.

## 3. Variáveis de produção

No host/container da API:

```env
ENABLE_API_DOCS=false
```

Para staging/lab controlado:

```env
ENABLE_API_DOCS=true
```

Para validar readiness a partir da máquina de operação:

```powershell
$env:DESK_SUPPORT_BASE_URL='https://api.seudominio.com/api/v1'
$env:DESK_SUPPORT_EXPECT_OPENAPI='false' # quando ENABLE_API_DOCS=false em produção
npm run support:smoke:readiness
```

Se OpenAPI estiver habilitada no ambiente protegido:

```powershell
$env:DESK_SUPPORT_BASE_URL='https://api.seudominio.com/api/v1'
$env:DESK_SUPPORT_EXPECT_OPENAPI='true'
npm run support:smoke:readiness
```

## 4. O que pode rodar em produção

Permitido:

- `GET /api/v1/health`;
- `GET /api/v1/openapi.json`, se docs estiverem habilitadas de forma protegida;
- validação de headers, status code e `x-request-id`;
- consulta manual de logs/Sentry/Faro/Grafana;
- SQL read-only com usuário de menor privilégio.

Bloqueado:

- `npm run support:smoke:local` contra produção;
- criar comanda de teste em produção;
- criar intent Point de teste em produção;
- rodar SQL de escrita para investigar suporte;
- versionar cookie, token, senha, PIN, certificado, terminal ID ou payload real de cliente.

## 5. Rollout Oracle

Checklist antes de subir:

```powershell
npm run support:validate
npm run quality:scope:strict
npm run lint:secrets
npm --workspace @partner/api run typecheck
```

Depois do deploy no Oracle:

```powershell
$env:DESK_SUPPORT_BASE_URL='https://api.seudominio.com/api/v1'
$env:DESK_SUPPORT_EXPECT_OPENAPI='false'
npm run support:smoke:readiness
```

Se o ambiente for staging/lab com OpenAPI protegida:

```powershell
$env:DESK_SUPPORT_EXPECT_OPENAPI='true'
npm run support:smoke:readiness
```

Critério de aceite:

- health `200`;
- se `DESK_SUPPORT_EXPECT_OPENAPI=true`, OpenAPI `200` com `openapi: 3.1.0`;
- se `DESK_SUPPORT_EXPECT_OPENAPI=false`, OpenAPI pode retornar `404` sem falhar;
- nenhuma credencial apareceu em log, doc ou commit.

## 6. Publicação nos dois Desk Imperial

### Privado

O repositório privado deve manter:

- documentação completa;
- scripts de validação;
- exemplos PHP/Laravel;
- collection Postman com placeholders;
- runbook Oracle;
- detalhes operacionais internos que não exponham segredo.

### Open source

O repositório open source pode receber:

- `docs/support/**`;
- `docs/api/desk-imperial-support.postman_collection.json`;
- `examples/php-api-client/**`;
- `examples/laravel-api-client/**`;
- `scripts/validate-developer-support-kit.mjs`;
- `scripts/run-developer-support-readiness-smoke.mjs`;
- documentação de uso com domínios genéricos.

O open source não deve receber:

- `.cache/**`;
- relatórios locais com request id real, se referenciarem dados internos;
- IPs, hostnames e topologia real de Oracle;
- secrets, tokens, certificados, chaves privadas ou senhas;
- arquivos `.env`;
- logs brutos de produção.

Antes de publicar no open source:

```powershell
npm run repo:open-source:review
npm run lint:secrets
npm run support:validate
```

Se o snapshot público não tiver todos os módulos/contratos do privado, manter o texto como "exemplo de integração" e não como promessa de endpoint público disponível.

## 7. Evidência para GitHub

Ao fechar a entrega, registrar no PR/commit:

```text
Developer Support Kit:
- docs e exemplos publicados com placeholders;
- OpenAPI runtime com fallback versionado;
- smoke local validado em ambiente controlado;
- smoke de readiness criado para servidor;
- produção não executa fluxo mutável de comanda/Point;
- open source recebe apenas material sanitizado.
```

## 8. Próximo passo recomendado

Criar uma proteção de proxy para `/api/v1/openapi.json` e `/api/v1/docs` antes de expor docs em produção pública. Enquanto isso não existir, produção deve manter `ENABLE_API_DOCS=false` e a validação de contrato deve acontecer por artefato versionado ou em staging/lab.
