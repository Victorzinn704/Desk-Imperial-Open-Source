# Runbook de Sincronizacao Open Source

**Data:** 2026-05-19
**Estado:** canonico
**Escopo:** sincronizacao segura entre o repositório privado `Victorzinn704/DESK-IMPERIAL` e o repositório publico `Victorzinn704/Desk-Imperial-Open-Source`.

## Objetivo

Manter o repositório open source alinhado com a evolução real do Desk Imperial sem publicar segredo, credencial, detalhe operacional sensível ou documentação com drift.

O repositório privado continua sendo a fonte de verdade de trabalho diário. O repositório publico deve ser uma versão publicável, revisável e honesta do mesmo produto.

## Estado atual da divergência

Auditoria local em 2026-05-19:

| Item                                    | Privado `origin/main` | Publico `public/main` |
| --------------------------------------- | --------------------: | --------------------: |
| Arquivos versionados                    |                  1770 |                   639 |
| Commits desde bases sem ancestral comum |                   517 |                     5 |
| Merge-base direto                       |           inexistente |           inexistente |
| Ultimo push conhecido do publico        |            2026-05-02 |            2026-05-02 |

Isso significa que a proxima sincronizacao não deve ser feita por merge direto. O caminho seguro é criar uma branch nova no remoto publico baseada em `public/main`, substituir a árvore por uma snapshot sanitizada do privado e abrir PR.

## Regra de ouro

Nunca faça push direto em `public/main`.

Use sempre:

1. branch baseada em `public/main`;
2. snapshot sanitizada do privado;
3. scans locais;
4. push para `public`;
5. PR no GitHub;
6. revisao do diff antes do merge.

## O que pode ir para open source

| Área                                     | Regra                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Código de produto                        | Pode ir, desde que não contenha segredo, token, credencial real ou dado de cliente |
| Contratos OpenAPI/Zod                    | Pode ir; ajudam recrutador, contribuidor e auditoria                               |
| Testes                                   | Podem ir; são evidência de qualidade                                               |
| Docs de produto, arquitetura e segurança | Podem ir quando forem canônicas e sem detalhes sensíveis de produção               |
| Runbooks locais                          | Podem ir quando usam placeholders e não expõem infraestrutura real                 |
| Infra Docker local                       | Pode ir com `.env.example` e valores fictícios                                     |

## O que exige revisão antes de publicar

| Área                             | Risco                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `infra/oracle/**`                | Pode conter topologia, nomes de VMs, IPs, caminhos remotos e estratégia operacional |
| docs de incidentes e auditorias  | Podem expor falhas antigas, IPs, fingerprints ou decisões internas                  |
| scripts de credenciais           | Devem usar `Read-Host -AsSecureString`, placeholders e nunca valores reais          |
| QZ Tray, Mercado Pago e Telegram | Podem documentar fluxo, mas não secrets, IDs privados, tokens ou webhook secrets    |
| observabilidade                  | DSNs publicáveis podem existir, mas tokens, auth e URLs privadas não                |
| `.env.example`                   | Deve ter apenas placeholders fortes e instruções seguras                            |

## Denylist operacional antes do primeiro sync grande

Na sincronização de 2026-05-19, a auditoria identificou que o risco maior não era token cru clássico; era exposição de topologia, inventário, acesso remoto e histórico operacional.

Antes de abrir PR publico, revise e remova, sanitize ou transforme em template:

| Caminho                                                                         | Ação recomendada                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `infra/oracle/hosts/desk-hosts.json`                                            | Não publicar com IPs/nomes reais; trocar por `.example`            |
| `infra/oracle/ops/prometheus/file_sd/external-targets.json`                     | Não publicar targets reais                                         |
| `docs/operations/vm-inventory-current-*.md`                                     | Publicar apenas versão redigida ou manter privado                  |
| `docs/operations/oracle-access-hardening-runbook-*.md`                          | Redigir IPs, hostnames, usuários e detalhes de acesso              |
| `docs/release/*oci*`, `docs/release/*oracle*`, `docs/release/*postgres-ampere*` | Tratar como histórico interno; publicar só se sanitizado           |
| `docs/operations/windows-tailscale-ssh-audit-*.md`                              | Redigir fingerprints, IPs, usuário local e detalhes de workstation |
| `docs/operations/macbook-remote-workstation-setup.md`                           | Manter apenas guia genérico; remover chaves, IPs e usuário real    |
| `review_audit/**`                                                               | Não publicar por padrão; é relatório interno/gerado                |
| `.playwright-cli/**`                                                            | Revisar antes; pode conter snapshots de ambiente                   |
| `__pycache__/**`                                                                | Remover; artefato gerado                                           |
| `*.docx`, PDFs gerados e imagens soltas de auditoria                            | Publicar apenas se forem artefatos oficiais do projeto             |

## Gates mínimos antes de publicar

Execute no privado antes de preparar a branch publica:

```powershell
npm run repo:open-source:audit
npm run repo:scan-public
npm run lint:secrets
npm run quality:contracts
git diff --check
```

Para gerar uma snapshot completa sanitizada fora do repositório privado:

```powershell
npm run repo:open-source:prepare
```

O comando cria `..\desk-imperial-open-source-snapshot`, copia apenas arquivos versionados, remove arquivos bloqueados pela politica de publicação, sanitiza `.env.example` e grava o relatório em `docs/operations/open-source-full-sync-audit.md`.

Valide a snapshot antes de abrir PR:

```powershell
Set-Location ..\desk-imperial-open-source-snapshot
git init
git add -A
node scripts/scan-public-repo-risks.mjs
gitleaks dir . --config ..\desk-imperial\.gitleaks.toml --redact --no-banner
```

Se a intenção for publicar uma snapshot maior, execute também:

```powershell
npm run quality:offline-release -- --profile standard
```

Enquanto o GitHub Actions estiver bloqueado por billing, registre o resultado como:

> validado localmente; CI remoto bloqueado por billing.

Nunca registre como "CI verde" nesse periodo.

## Fluxo recomendado com worktree

Use um worktree separado para não poluir o trabalho diário:

```powershell
$Date = Get-Date -Format yyyyMMdd
$Branch = "public-sync/current-main-$Date"
$Worktree = "..\desk-imperial-public-sync-$Date"

git fetch origin --prune
git fetch public --prune
git worktree add $Worktree -b $Branch public/main
```

Dentro do worktree publico, substitua a árvore pela snapshot do privado:

```powershell
Set-Location $Worktree
robocopy ..\desk-imperial-open-source-snapshot . /MIR /XD .git node_modules .next dist build coverage .turbo .cache /XF .git
```

Depois revise o diff. Se aparecer `infra/oracle/**`, `review_audit/**`, `.playwright-cli/**`, inventário real de VM, Tailscale/workstation ou arquivo com credencial, a snapshot deve ser corrigida antes do commit.

Rode os gates:

```powershell
npm ci
npm run repo:scan-public
npm run lint:secrets
npm run quality:contracts
git diff --check
```

Faça commit e push para o remoto publico:

```powershell
git status --short
git add -A
git commit -m "chore(open-source): sync public snapshot"
git push -u public $Branch
```

Abra PR via GitHub CLI:

```powershell
gh pr create `
  --repo Victorzinn704/Desk-Imperial-Open-Source `
  --base main `
  --head $Branch `
  --draft `
  --title "chore(open-source): sync public snapshot" `
  --body-file .\docs\operations\open-source-sync-runbook.md
```

Se o GitHub recusar comparação por histórico, a branch foi criada do lugar errado. Refaça a partir de `public/main`, não de `origin/main`.

## Checklist de revisão do PR publico

- [ ] README publico conta a historia atual sem prometer o que só existe no privado
- [ ] `docs/INDEX.md` aponta para fontes canonicas atuais
- [ ] `docs/current-state.md` declara limitações reais
- [ ] `.env.example` usa placeholders fortes
- [ ] nenhuma credencial aparece em docs, scripts ou testes
- [ ] `repo:scan-public` passou
- [ ] `lint:secrets` passou
- [ ] `quality:contracts` passou
- [ ] diff de `infra/oracle/**` foi revisado manualmente
- [ ] diff de `docs/security/**` foi revisado manualmente
- [ ] diff de `docs/operations/**` foi revisado manualmente

## Como evitar drift depois da sincronizacao

Toda mudança futura que alterar produto, API, segurança, pagamentos, realtime, Telegram, impressão, deploy ou observabilidade deve responder:

1. O repositório publico precisa receber essa mudança agora?
2. A documentação canônica foi atualizada no privado?
3. A documentação pública pode expor esse detalhe com segurança?
4. Existe evidência pública suficiente para sustentar claims de currículo, GitHub profile e README?

Se a resposta 1 for "sim", a mudança deve abrir uma segunda PR no repositório publico ou entrar na próxima branch `public-sync/current-main-YYYYMMDD`.

## Relação com currículo e portfólio

O GitHub público deve sustentar as afirmações profissionais feitas sobre o Desk Imperial. Para isso:

- mantenha o README publico alinhado ao estado real;
- deixe claro quando a versão pública é snapshot/sanitizada;
- exponha arquitetura, testes, contratos e screenshots sem dados reais;
- não use claims como "CI verde" quando o CI remoto estiver bloqueado por billing;
- não cite funcionalidades privadas sem documentação pública mínima.

## Fontes relacionadas

- [Estado atual do projeto](../current-state.md)
- [Indice de documentacao](../INDEX.md)
- [Contribution e manutencao de docs](../_meta/contribution.md)
- [Prontidao operacional](./production-operational-readiness.md)
- [Threat model de fluxos críticos](../security/threat-model-critical-flows.md)
