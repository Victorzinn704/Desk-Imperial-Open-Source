# Execução Remota — PostgreSQL Ampere / Runner / Ops

## Objetivo

Executar a preparação remota host por host da migração `Neon -> Ampere` sem depender de comando manual solto.

## Mapa canônico de hosts

- `vm1` -> VM do Joao: app/api do Desk
- `vm2` -> VM do Joao: observabilidade e monitoramento
- `vm3` -> VM do Joao: imagem
- `vm4` -> VM da Lohana: banco PostgreSQL do Desk
- `vm5` -> VM da Lohana: backup/runner do banco

Neste runbook:

- `<DB_HOST>` = `vm4`
- `<RUNNER_HOST>` = `vm5`
- `<OPS_HOST>` = `vm2`

## Pré-requisitos locais

- chaves SSH válidas para os hosts Oracle/Lohana
- `.env` reais já criados localmente:
  - `infra/oracle/db/.env`
  - `infra/oracle/runner/.env`
  - `infra/oracle/ops/.env`
- configs WireGuard reais fora do Git:
  - `wg-db.conf`
  - `wg-runner.conf`

## Variáveis esperadas

O script usa, por padrão:

- `DESK_DB_HOST`
- `DESK_RUNNER_HOST`
- `DESK_OPS_HOST` ou `DESK_BUILDER_HOST`

Também aceita tudo por parâmetro.

## Script principal

```powershell
.\infra\scripts\oracle-selfhost-postgres-rollout.ps1
```

Validação em 2026-04-22:

- bug de ACL do `icacls` corrigido no `Ensure-Key`
- teste local sem hosts remotos criou a chave temporária com leitura apenas para o usuário atual
- o script não depende mais da expressão frágil `$env:USERNAME:(R)`

## Ordem recomendada

### 1. Sincronizar a árvore `infra/` para todos os hosts

```powershell
.\infra\scripts\oracle-selfhost-postgres-rollout.ps1 -Stage sync-all `
  -DbHost <DB_HOST> `
  -RunnerHost <RUNNER_HOST> `
  -OpsHost <OPS_HOST>
```

### 2. Preparar a Ampere do banco

```powershell
.\infra\scripts\oracle-selfhost-postgres-rollout.ps1 -Stage prepare-db `
  -DbHost <DB_HOST> `
  -DbEnvPath infra/oracle/db/.env `
  -DbWireGuardConfigPath C:\caminho\seguro\wg-db.conf
```

O estágio faz:

- sync da pasta `infra/`
- upload opcional do `.env` do banco
- upload opcional do `wg0.conf`
- `oracle-db-host-prepare.sh`
- `wg-quick@wg0`
- `oracle-db-network-guard.sh`
- instala `network-guard.service`
- sobe a stack do banco
- roda `stanza-create`
- roda `backup-full`
- roda `check`

### 3. Preparar o runner AMD micro

```powershell
.\infra\scripts\oracle-selfhost-postgres-rollout.ps1 -Stage prepare-runner `
  -RunnerHost <RUNNER_HOST> `
  -RunnerEnvPath infra/oracle/runner/.env `
  -RunnerWireGuardConfigPath C:\caminho\seguro\wg-runner.conf
```

### 4. Subir a stack de ops/BI

Antes de subir a stack, prepare o host de ops:

```powershell
.\infra\scripts\oracle-selfhost-postgres-rollout.ps1 -Stage prepare-ops `
  -OpsHost <OPS_HOST> `
  -OpsEnvPath infra/oracle/ops/.env
```

Depois suba a stack:

```powershell
.\infra\scripts\oracle-selfhost-postgres-rollout.ps1 -Stage up-ops `
  -OpsHost <OPS_HOST> `
  -OpsEnvPath infra/oracle/ops/.env
```

### 5. Rodar smoke remoto

```powershell
.\infra\scripts\oracle-selfhost-postgres-rollout.ps1 -Stage smoke `
  -DbHost <DB_HOST> `
  -RunnerHost <RUNNER_HOST> `
  -OpsHost <OPS_HOST>
```

### 6. Rodar tudo de uma vez

Só use depois de validar cada etapa separadamente pelo menos uma vez.

```powershell
.\infra\scripts\oracle-selfhost-postgres-rollout.ps1 -Stage all `
  -DbHost <DB_HOST> `
  -RunnerHost <RUNNER_HOST> `
  -OpsHost <OPS_HOST> `
  -DbEnvPath infra/oracle/db/.env `
  -RunnerEnvPath infra/oracle/runner/.env `
  -OpsEnvPath infra/oracle/ops/.env `
  -DbWireGuardConfigPath C:\caminho\seguro\wg-db.conf `
  -RunnerWireGuardConfigPath C:\caminho\seguro\wg-runner.conf
```

## Notas de segurança

- o script **não** lê segredos do Git; ele só envia arquivos que você apontar explicitamente
- se `.env` ou `wg0.conf` não forem informados, ele assume que já existem no host
- a chave SSH padrão do rollout para a tenancy da Lohana é `C:\Users\Desktop\Desktop\Oracle-Lohana\lohana_vm_rsa`
- a Ampere só deve aceitar:
  - `vm-free-01` em `5432` e `6432`
  - `vm-free-02` em `5432`, `9100`, `9187`
- o runner não precisa de SQL aberto para o banco
- `DIRECT_URL` deve usar `desk_migration`, nunca `postgres`

## Depois desta execução

Quando `prepare-db`, `prepare-runner`, `up-ops` e `smoke` passarem, siga para o cutover:

- [postgres-ampere-cutover-2026-04-22.md](C:/Users/Desktop/Documents/desk-imperial/docs/release/postgres-ampere-cutover-2026-04-22.md)

Status: cutover executado e validado em 2026-04-22. Este runbook fica como base de repetição/recuperação, não como etapa pendente.
