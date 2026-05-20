# Backend Injection Audit - 2026-05-03

## Escopo

Incidente investigado: payload de login com tentativa de SQL injection usando variante de `OR 1=1` e risco de elevacao de perfil.

Arquivos e sinks varridos:

- `apps/api/src` para `$queryRawUnsafe`, `$executeRawUnsafe`, `$queryRaw`, `$executeRaw`, `Prisma.raw`, SQL literal e comandos dinamicos.
- Modulos com filtros dinamicos (`contains`, `orderBy`, `search`, `query.*`).
- Auth, session, admin-pin e resolucao de workspace/role.
- Uso de `child_process`, `eval`, `new Function` no backend.

## Achados

### SQL cru

Nao ha uso de SQL cru perigoso no backend atual.

Ocorrencias encontradas:

- `PrismaService` healthcheck: `$queryRaw\`SELECT 1\``.
- `HealthService` healthcheck: `$queryRaw\`SELECT 1\``.

Esses usos sao consultas estaticas, sem interpolacao de entrada do usuario.

### Filtros dinamicos

Os filtros de busca atuais usam Prisma Client (`where`, `contains`, `orderBy`) e nao concatenam SQL. Isso reduz o risco de SQL injection, mas ainda exige validacao de entrada para controlar abuso, cardinalidade e mensagens de erro.

Ponto observado:

- `products-list.query.ts` usa `contains` em varios campos. Nao e SQL injection por estar parametrizado pelo Prisma, mas deve continuar limitado por `limit` e por sanitizacao de busca em rodada propria.

### Auth

Antes desta correcao, algumas rotas tinham validacao DTO no controller, mas os servicos publicos de auth ainda aceitavam payload direto com strings maliciosas quando chamados fora do `ValidationPipe`. Isso nao criava SQL injection via Prisma, mas deixava a fronteira de seguranca dependente demais do controller.

Correcoes aplicadas:

- `normalizeAuthEmail` valida email dentro do dominio antes da consulta.
- `sanitizeEmployeeCodeForLogin` rejeita codigo de funcionario com caracteres fora do contrato.
- `normalizeOneTimeCode` rejeita codigo OTP fora de 6 digitos antes de buscar `oneTimeCode`.
- `LoginDto.companyEmail` agora exige `IsEmail`.
- `LoginDto.employeeCode` agora exige formato e tamanho.
- Testes de regressao cobrem `OR 1=1` em email de owner, `companyEmail`, `employeeCode` e codigo OTP.

## Resultado

O backend nao deve tratar payload de injection como busca valida. A entrada maliciosa e rejeitada antes de consultar `user` ou `oneTimeCode`.

## Proximos pontos de hardening

- Sanitizar `products-list.query.ts` para busca textual com limite de tamanho e normalizacao dedicada.
- Revisar `geocoding.service.ts` para limites de tamanho do endereco antes de montar URL externa.
- Adicionar teste e2e HTTP para garantir que `ValidationPipe` continua com `whitelist` e `forbidNonWhitelisted`.
- Manter proibido qualquer novo `$queryRawUnsafe` sem revisao de seguranca e teste de regressao.
