# Prontidao Operacional de Producao

Data: 2026-05-19

Este runbook transforma a evolucao do Desk Imperial em evidencia operacional. A regra e simples: o projeto so sobe de nivel quando a operacao fica repetivel, medida e recuperavel.

## Objetivo

Elevar o projeto de "produto amplo mantido por uma pessoa" para "produto operavel por um time", sem abrir feature nova antes de fechar os riscos que mais pesam em senioridade tecnica.

## Ordem oficial de ataque

1. CI, main, deploy, staging, rollback, backup e alerta.
2. Performance PWA/realtime do fluxo de comanda.
3. Documentacao canonica sem drift.
4. Sincronizacao open source sem drift e sem exposicao operacional.
5. Seguranca comprovavel por threat model e testes negativos.
6. Evidencia de colaboracao por PR, RFC, review e pos-incidente.

Nao inverter essa ordem sem registrar a decisao. Feature nova sem essa base aumenta escopo, mas nao aumenta confianca.

## Check automatizado

Use:

```powershell
npm run ops:readiness -- --report .cache/operational-readiness.md
```

Use modo bloqueante quando a intencao for promover release:

```powershell
npm run ops:readiness -- --strict --report .cache/operational-readiness.md
```

O check nao substitui CI. Ele responde rapidamente:

- worktree esta limpo;
- branch esta sincronizada com upstream;
- GitHub Actions recentes estao verdes;
- hosts Oracle de producao, lab/staging e runner/backup existem no inventario;
- runbooks de rollback, restore, alertas, Sentry, performance e seguranca existem.

## Gate 1 - Main verde

Estado aceitavel:

- `git status --short --branch` sem arquivos surpresa;
- branch local sem commits esquecidos antes do deploy;
- GitHub Actions verdes no SHA que sera promovido;
- `npm run quality:scope` sem arquivos fora de escopo;
- `npm run quality:contracts` sem quebra publica;
- `npm run repo:scan-public` sem risco obvio de publicacao;
- `npm run lint:secrets` sem vazamento em arquivos versionados;
- `npm run test:critical` passando;
- `npm run openapi:check` passando quando houver contrato.

Se o GitHub Actions estiver vermelho por billing/runner, isso continua sendo bloqueio operacional. O codigo pode estar correto, mas a evidencia publica de entrega nao existe.

### Excecao temporaria - GitHub Actions bloqueado por billing

Janela operacional: **2026-05-19 ate 2026-05-31**.

Enquanto o GitHub Actions nao iniciar jobs por billing/spending limit, a entrega nao pode ser descrita como "CI verde". O status correto e:

```text
validado localmente, CI remoto bloqueado por billing
```

Use o substituto local:

```powershell
npm run quality:offline-release -- --profile standard
```

Para mudanca em performance/PWA/realtime, acrescente a suite local controlada:

```powershell
npm run quality:offline-release -- --profile standard --performance
```

O comando gera relatorio em `.cache/offline-release/<data>/report.md` e copia o ultimo resultado para `.cache/offline-release/latest.md`.

Evidencia minima nesse periodo:

- escopo e hygiene: `quality:scope:strict` e `git diff --check`;
- contratos: `quality:contracts` e `openapi:check`;
- seguranca: `lint:secrets`, `lint:sast`, `audit:deps` e `security:audit-runtime`;
- qualidade: `lint`, `typecheck`, `test:critical` e `build`;
- readiness: snapshot de `ops:readiness`, aceitando apenas o bloqueio remoto conhecido de billing.

Limites da excecao:

- nao prova runner Linux, branch protection, upload de artifacts/SARIF ou status publico auditavel;
- nao substitui Sonar/GitHub Security quando dependem do ambiente remoto;
- release normal so volta depois de regularizar billing, rerodar Actions no mesmo SHA e obter todos os checks verdes.

## Gate 1.1 - Publicacao open source

O repositório publico `Victorzinn704/Desk-Imperial-Open-Source` é uma superficie de evidência técnica. Ele não pode receber push direto nem inventário operacional bruto.

Estado aceitavel:

- branch criada a partir de `public/main`, não de `origin/main`;
- backup de `public/main` preservado antes do sync;
- snapshot sanitizada do privado aplicada em branch `public-sync/*`;
- denylist operacional revisada;
- `repo:scan-public`, `lint:secrets`, `quality:contracts` e `git diff --check` passando;
- PR aberto no GitHub para revisão antes de qualquer merge.

Runbook canônico: [open-source-sync-runbook.md](./open-source-sync-runbook.md).

## Gate 2 - Staging/lab separado

Estado aceitavel:

- `lohana-lab-01` continua reservado para `lab-staging-performance`;
- staging usa secrets proprios, nunca copia completa dos secrets de producao por padrao;
- testes de carga rodam fora da VM de producao;
- smoke minimo passa antes de promover:
  - login owner;
  - login staff;
  - abrir comanda;
  - adicionar item;
  - item aparecer na cozinha;
  - fechar comanda;
  - atualizar owner/PWA sem refresh manual.

## Gate 3 - Deploy e rollback

Deploy padrao:

```powershell
infra/scripts/oracle-builder-deploy.ps1 -SourceMode head
```

Regra:

- deploy normal sempre parte de commit versionado;
- `working-tree` so e aceitavel em emergencia explicita;
- rollback precisa apontar para ultimo SHA saudavel;
- se login, comanda ou pagamento quebrar em producao, rollback vem antes de investigacao longa.

Checklist de rollback:

1. congelar novas promocoes;
2. identificar SHA atual e SHA anterior saudavel;
3. promover imagem anterior;
4. validar `/api/v1/health`;
5. executar smoke minimo;
6. registrar causa, horario, evidencia e proximo dono.

## Gate 4 - Backup e restore

Estado aceitavel:

- PostgreSQL primario separado da VM de aplicacao;
- `pgBackRest` configurado;
- restore drill executado em runner separado;
- alerta existe para backup full antigo e differential antigo;
- restore precisa ser testado, nao apenas backup criado.

Comandos de referencia:

```bash
bash infra/scripts/oracle-db-bootstrap.sh backup-full
bash infra/scripts/oracle-db-bootstrap.sh backup-diff
bash infra/scripts/oracle-runner-bootstrap.sh restore-check
```

## Gate 5 - Alertas reais

Dashboard sozinho nao basta. Estado aceitavel:

- Sentry ativo para erro aplicacional;
- Alertmanager com destino real quando a operacao for critica;
- Telegram ou outro canal operacional recebe alerta acionavel;
- alerta diferencia indisponibilidade total, degradacao parcial e erro externo;
- cada alerta tem runbook curto.

Alertas minimos:

- API down;
- Web down;
- Redis down;
- PostgreSQL down;
- backup atrasado;
- webhook Mercado Pago com falha;
- fila/worker de Telegram ou pagamento degradada.

## Gate 6 - Performance PWA/realtime

Fluxo critico:

```text
toque -> feedback visual -> mutacao -> commit -> evento realtime -> patch no PWA/web -> fallback REST se necessario
```

Metas:

- toque ate feedback visual: abaixo de 100ms;
- mutacao ate primeiro evento realtime visivel: abaixo de 300ms;
- fallback REST sem refresh manual;
- payload p95 medido;
- render count do PWA medido;
- item de comida nasce obrigatoriamente na cozinha.

Ordem de diagnostico:

1. medir REST;
2. medir payload;
3. medir Redis/cache;
4. medir publish Socket.IO;
5. medir patch/paint no PWA;
6. so considerar Go se Node estiver saturando no transporte realtime, nao por palpite.

## Gate 7 - Documentacao canonica

Estado aceitavel:

- `README.md` explica o produto e o estado atual;
- `docs/INDEX.md` aponta as fontes vivas;
- docs de `release/` ficam marcadas como historico;
- Oracle/Ampere, Redis, Telegram, Mercado Pago, Sentry, QZ e PWA aparecem nos docs canonicos;
- toda mudanca operacional atualiza runbook.

## Gate 8 - Seguranca comprovavel

O proximo salto nao e "mais middleware". E evidencia.

Frentes:

- threat model de auth/session;
- threat model de tenant isolation;
- threat model de Mercado Pago;
- threat model de Telegram;
- threat model de QZ/printing;
- testes negativos de workspace;
- DAST basico em staging;
- politica clara de secrets;
- plano de criptografia at-rest;
- migracao do Admin PIN de 4 digitos.

## Gate 9 - Evidencia de colaboracao

Mesmo em projeto solo, a operacao deve parecer revisavel por time:

- PR pequeno para mudanca relevante;
- RFC curta para decisao grande;
- issue com criterio de aceite;
- review externo pontual quando mexer em auth, pagamento, realtime, dados ou deploy;
- pos-incidente quando algo quebrar.

## Resultado esperado

Quando esses gates estiverem vivos, a narrativa muda:

- antes: "eu construi um produto grande sozinho";
- depois: "eu opero um produto critico com qualidade, rollback, seguranca, observabilidade e processo repetivel".

Essa e a diferenca pratica entre pleno avancado e senior inicial defensavel.
