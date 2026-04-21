# Workflow de Fechamento — Web + PWA + Backend Local

Data de consolidação: 2026-04-21
Escopo da fase: fechar `web` e `PWA` antes de abrir Kotlin/React Native.

## Objetivo da fase

Nesta fase, o Desk Imperial precisa sair de um estado de evolução simultânea e entrar em um estado de fechamento controlado.

O alvo não é “fazer mais uma tela”.
O alvo é:

1. fechar o `Owner PWA`
2. fechar o `desktop web`
3. ligar tudo em dados reais
4. eliminar rota órfã, API órfã e schema órfão
5. garantir que o backend local suba e suporte o fluxo completo
6. congelar uma base confiável antes de qualquer frente Kotlin

## Fora de escopo agora

Não entra nesta fase:

1. Kotlin
2. React Native
3. hardware dedicado final
4. expansão cosmética sem impacto funcional
5. telas novas sem contrato/backend

## Fonte de verdade da fase

A ordem oficial de verdade é esta:

1. `Prisma schema` e migrations
2. contratos públicos e payloads de API
3. implementação do backend
4. superfícies `web` e `PWA`
5. testes e documentação de fechamento

Regra: nenhuma tela pode inventar estado que o backend não sustenta.

## Trilhas oficiais desta fase

### Trilha A — PWA

Fechar:

1. `Hoje`
2. `Comandas`
3. `PDV`
4. `Financeiro`
5. `Conta`
6. `Cadastro rápido` como fluxo de apoio

### Trilha B — Web

Fechar o desktop já em andamento sem reabrir `/dashboard` congelado.

### Trilha C — Backend local

Garantir que:

1. `Postgres` sobe localmente
2. `Redis` sobe localmente
3. API responde em `http://localhost:4000`
4. login demo funciona
5. health check responde

### Trilha D — Banco de dados

Toda mudança de dado persistido precisa sair com:

1. schema
2. migration
3. seed ou repair quando necessário
4. docs mínimas de impacto

## Workflow diário obrigatório

### 1. Subir a stack local

```bash
npm run local:backend:prepare
```

Esse comando agora faz:

1. subir Docker com `.env`
2. esperar Postgres e Redis ficarem saudáveis
3. gerar Prisma Client
4. aplicar migrations
5. seed do banco
6. normalizar o demo local com `repair-demo`

Observação operacional:

- este fluxo deve rodar com a API local parada
- se a API já estiver em `localhost:4000`, use `npm run local:backend:sync-demo` para reidratar o demo sem disputar o Prisma Client no Windows

### 2. Abrir ambiente de desenvolvimento

```bash
npm run dev
```

### 3. Trabalhar em uma única frente por vez

Ordem de execução recomendada:

1. corrigir rota/tela
2. ligar em dado real
3. validar role/guard
4. rodar teste focado
5. rodar typecheck
6. fazer auditoria visual

Nunca abrir duas frentes grandes ao mesmo tempo.

## Pipeline local de fechamento

### Gate rápido de PWA do owner

```bash
npm run verify:owner-pwa
```

Esse gate cobre:

1. shell do owner
2. visão de comandas
3. builder mobile

### Gate da fase atual

```bash
npm run verify:current-phase
```

Esse gate cobre:

1. `quality:scope`
2. `quality:contracts`
3. `test:critical`
4. `verify:owner-pwa`
5. `typecheck`
6. validação do schema Prisma + build da API
7. build do web

Decisão consciente:

- o gate local da fase não depende do lint global legado
- ele existe para fechar a fase atual sem mascarar problemas já conhecidos do repositório
- em Windows, a verificação da API usa `prisma validate` + `nest build`
- `prisma generate` continua no preparo local do backend, evitando disputa com o engine em uso pelo servidor dev

### Gate estrito

```bash
npm run verify:current-phase:strict
```

Esse gate cobre:

1. `quality:preflight`
2. `test:critical`
2. `verify:current-phase`

Regra: sem esse gate verde, a fase não avança.

### Smoke local de bootstrap

```bash
npm run smoke:local:bootstrap
```

Uso:

1. validar fresh-start com a API parada
2. provar que infra + migrations + seed + repair + auth demo continuam íntegros
3. fechar a base local antes de atacar novas APIs/superfícies

## Pipeline remoto

O pipeline remoto oficial continua sendo:

- [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

Ele já cobre:

1. lint
2. typecheck
3. OpenAPI contract
4. testes backend
5. e2e backend
6. testes frontend
7. e2e frontend
8. segurança
9. gate de latência
10. build

Decisão desta fase:

- não criar workflow paralelo redundante agora
- usar `ci.yml` como pipeline remoto oficial
- usar `verify:current-phase` como pipeline local da fase
- usar `verify:current-phase:strict` quando a base de lint permitir

## Auditoria obrigatória de rotas

Matriz oficial desta fase:

- [route-closure-matrix-2026-04-21.md](./route-closure-matrix-2026-04-21.md)

Toda alteração em `web` ou `PWA` precisa passar por esta checagem:

1. a rota existe de fato?
2. a rota aparece em navegação real?
3. a rota depende de auth?
4. a rota depende de role?
5. sem sessão, ela redireciona corretamente?
6. com role errada, ela redireciona corretamente?
7. a rota tem tela funcional ou estado vazio explícito?
8. existe algum link para rota que não abre nada?

### Estado atual conhecido

Hoje, `/app`, `/app/owner` e `/app/staff` usam `fetchCurrentUser` e redirect por sessão/role.

Isso é funcional, mas ainda não é o hardening máximo.

Gap explícito desta fase:

- falta middleware/guard mais forte em nível de rota para a camada App Router

## Auditoria obrigatória de APIs

Toda feature visível em `web` ou `PWA` precisa estar em um destes estados:

1. já usa endpoint real
2. ainda não existe endpoint, então a superfície não entra como pronta

Proibido:

1. métrica demo em tela declarada como pronta
2. ação visual sem mutação real por trás
3. rota mostrar módulo que o backend não suporta

### Contrato operacional STAFF/OWNER

Decisão atual:

1. `OWNER` enxerga e opera o workspace inteiro.
2. `STAFF` enxerga mesas, cozinha e comandas abertas do workspace inteiro.
3. `STAFF` enxerga histórico encerrado apenas do próprio atendimento.
4. `STAFF` ativo pode apoiar comanda aberta de outro garçom: adicionar item, avançar status, cancelar ou fechar.
5. O responsável principal da comanda continua sendo `currentEmployeeId`; a ação de apoio entra no audit trail pelo ator autenticado.
6. Detalhe de comanda encerrada de outro funcionário deve ser bloqueado pela API.
7. Lookup de EAN no web exige sessão ativa antes de consultar fonte externa.

## Auditoria obrigatória de banco

Toda mudança de persistência precisa responder:

1. quais colunas/tabelas mudaram?
2. existe migration?
3. precisa backfill?
4. precisa seed?
5. a API já lê/escreve isso?
6. a UI já usa isso?

Proibido:

1. campo novo sem migration
2. migration sem validação local
3. UI depender de campo que só existe “na cabeça”

## Definition of Done da fase atual

Uma frente desta fase só fecha quando cumprir tudo:

1. usa dado real ou fallback explícito
2. a rota abre e tem navegação funcional
3. não existe rota fantasma ligada no menu
4. guard de sessão/role foi auditado
5. teste focado passa
6. typecheck passa
7. build passa
8. backend local sobe
9. banco local aplica migrations sem erro
10. documentação foi atualizada se contrato/schema mudou

## Ordem oficial de fechamento

1. `Owner PWA`
2. `Web`
3. APIs faltantes
4. hardening de rotas e auth
5. fechamento de schema e migrations
6. freeze da fase
7. só depois Kotlin

## Anti-drift

Se uma tarefa não couber em uma destas categorias, ela não entra agora:

1. fechar rota existente
2. substituir demo por real
3. corrigir segurança/autorização
4. corrigir backend local
5. fechar banco de dados
6. fortalecer teste/observabilidade da fase

## Checklist operacional de fechamento

### Antes de começar o dia

1. `npm run local:backend:prepare`
2. validar `GET /api/v1/health`
3. validar login demo
4. abrir a frente única do dia

### Antes de encerrar o dia

1. rodar `npm run verify:owner-pwa` se mexeu no PWA
2. rodar `npm run verify:current-phase` se a mudança fechou uma frente
3. atualizar docs se rota/API/schema mudou
4. só então preparar commit

## Próxima decisão travada

Quando esta fase estiver verde:

1. congelar `web` e `PWA`
2. abrir desenho da camada Android
3. manter a fonte de verdade de domínio no backend e nos contratos

Kotlin não entra antes disso.
