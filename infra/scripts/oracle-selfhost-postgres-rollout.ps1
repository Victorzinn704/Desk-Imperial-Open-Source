param(
  [ValidateSet('sync-all', 'prepare-db', 'prepare-runner', 'prepare-ops', 'up-ops', 'smoke', 'all')]
  [string] $Stage = 'sync-all',
  [string] $DbHost = $env:DESK_DB_HOST,
  [string] $RunnerHost = $env:DESK_RUNNER_HOST,
  [string] $OpsHost = $(if ($env:DESK_OPS_HOST) { $env:DESK_OPS_HOST } else { $env:DESK_BUILDER_HOST }),
  [string] $DbUser = 'ubuntu',
  [string] $RunnerUser = 'ubuntu',
  [string] $OpsUser = 'ubuntu',
  [string] $RemoteRoot = '/opt/desk-imperial',
  [string] $KeyPath = (Join-Path $env:TEMP 'desk_lohana_vm_rsa'),
  [string] $SourceKeyPath = 'C:\Users\Desktop\Desktop\Oracle-Lohana\lohana_vm_rsa',
  [string] $KnownHostsPath = (Join-Path $env:USERPROFILE '.ssh\known_hosts'),
  [string] $DbEnvPath = 'infra/oracle/db/.env',
  [string] $RunnerEnvPath = 'infra/oracle/runner/.env',
  [string] $OpsEnvPath = 'infra/oracle/ops/.env',
  [string] $DbWireGuardConfigPath = '',
  [string] $RunnerWireGuardConfigPath = ''
)

$ErrorActionPreference = 'Stop'

function Ensure-Key {
  if (-not (Test-Path -LiteralPath $KeyPath)) {
    if (-not (Test-Path -LiteralPath $SourceKeyPath)) {
      throw "Chave SSH ausente em '$KeyPath' e fonte '$SourceKeyPath' não encontrada."
    }
    Copy-Item -LiteralPath $SourceKeyPath -Destination $KeyPath -Force
  }

  $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

  & icacls $KeyPath /inheritance:r | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao remover heranca de ACL da chave SSH '$KeyPath'."
  }

  & icacls $KeyPath /grant:r "${currentUser}:R" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao conceder leitura da chave SSH '$KeyPath' para '$currentUser'."
  }

  & icacls $KeyPath /remove "Users" "Authenticated Users" "Everyone" "BUILTIN\\Users" 2>$null | Out-Null
}

function Invoke-Remote {
  param(
    [string] $HostName,
    [string] $UserName,
    [string] $Command
  )

  $NormalizedCommand = $Command -replace "`r`n", "`n"
  $NormalizedCommand = $NormalizedCommand -replace "`r", "`n"

  ssh -i $KeyPath `
    -o StrictHostKeyChecking=accept-new `
    -o UserKnownHostsFile=$KnownHostsPath `
    -o ServerAliveInterval=20 `
    -o ServerAliveCountMax=60 `
    "${UserName}@${HostName}" `
    $NormalizedCommand

  if ($LASTEXITCODE -ne 0) {
    throw "Comando remoto falhou em ${UserName}@${HostName} com exit code $LASTEXITCODE."
  }
}

function Invoke-Scp {
  param(
    [string[]] $Arguments,
    [string] $Description
  )

  scp @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Description falhou com exit code $LASTEXITCODE."
  }
}

function Require-Host {
  param(
    [string] $HostName,
    [string] $Label
  )

  if (-not $HostName) {
    throw "Defina o host de $Label via parâmetro ou variável de ambiente."
  }
}

function Sync-Infra {
  param(
    [string] $HostName,
    [string] $UserName
  )

  $archive = Join-Path $env:TEMP "desk-imperial-infra-$($HostName -replace '[^a-zA-Z0-9]','_').tgz"
  $remoteArchive = "/tmp/desk-imperial-infra-$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss')).tgz"

  if (Test-Path -LiteralPath $archive) {
    Remove-Item -LiteralPath $archive -Force
  }

  tar -czf $archive infra
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $archive)) {
    throw "Falha ao empacotar a pasta infra para ${HostName}."
  }

  Invoke-Scp -Description "Envio da pasta infra para ${HostName}" -Arguments @(
    '-i', $KeyPath,
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', "UserKnownHostsFile=$KnownHostsPath",
    $archive,
    "${UserName}@${HostName}:$remoteArchive"
  )

  Invoke-Remote -HostName $HostName -UserName $UserName -Command @"
set -euo pipefail
sudo mkdir -p '$RemoteRoot'
sudo tar xzf '$remoteArchive' -C '$RemoteRoot'
rm -f '$remoteArchive'
"@

  Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
}

function Upload-FileIfPresent {
  param(
    [string] $LocalPath,
    [string] $HostName,
    [string] $UserName,
    [string] $RemotePath,
    [string] $Mode = '600'
  )

  if (-not $LocalPath -or -not (Test-Path -LiteralPath $LocalPath)) {
    return $false
  }

  $remoteTemp = "/tmp/$([IO.Path]::GetFileName($LocalPath))"

  Invoke-Scp -Description "Envio de $(Split-Path $LocalPath -Leaf) para ${HostName}" -Arguments @(
    '-i', $KeyPath,
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', "UserKnownHostsFile=$KnownHostsPath",
    $LocalPath,
    "${UserName}@${HostName}:$remoteTemp"
  )

  Invoke-Remote -HostName $HostName -UserName $UserName -Command @"
set -euo pipefail
sudo mkdir -p '$(Split-Path $RemotePath -Parent -replace '\\','/')'
sudo install -m $Mode '$remoteTemp' '$RemotePath'
rm -f '$remoteTemp'
"@

  return $true
}

function Prepare-DbHost {
  Require-Host -HostName $DbHost -Label 'banco'
  Sync-Infra -HostName $DbHost -UserName $DbUser

  $envUploaded = Upload-FileIfPresent -LocalPath $DbEnvPath -HostName $DbHost -UserName $DbUser -RemotePath "$RemoteRoot/infra/oracle/db/.env"
  $wgUploaded = Upload-FileIfPresent -LocalPath $DbWireGuardConfigPath -HostName $DbHost -UserName $DbUser -RemotePath '/etc/wireguard/wg0.conf'

  Invoke-Remote -HostName $DbHost -UserName $DbUser -Command @"
set -euo pipefail
cd '$RemoteRoot'
sudo bash infra/scripts/oracle-db-host-prepare.sh
$(if ($wgUploaded) { "sudo systemctl enable --now wg-quick@wg0" } else { "echo 'wg0.conf nao foi enviado automaticamente; assumindo WireGuard ja configurado.'" })
$(if ($envUploaded) { "test -f infra/oracle/db/.env" } else { "echo 'infra/oracle/db/.env nao foi enviado automaticamente; assumindo arquivo ja presente.'" })
sudo bash infra/scripts/oracle-db-network-guard.sh
sudo install -m 644 infra/oracle/db/systemd/network-guard.service /etc/systemd/system/network-guard.service
sudo systemctl daemon-reload
sudo systemctl enable --now network-guard.service
bash infra/scripts/oracle-db-bootstrap.sh up
bash infra/scripts/oracle-db-bootstrap.sh stanza-create
bash infra/scripts/oracle-db-bootstrap.sh backup-full
bash infra/scripts/oracle-db-bootstrap.sh check
"@
}

function Prepare-RunnerHost {
  Require-Host -HostName $RunnerHost -Label 'runner'
  Sync-Infra -HostName $RunnerHost -UserName $RunnerUser

  $envUploaded = Upload-FileIfPresent -LocalPath $RunnerEnvPath -HostName $RunnerHost -UserName $RunnerUser -RemotePath "$RemoteRoot/infra/oracle/runner/.env"
  $wgUploaded = Upload-FileIfPresent -LocalPath $RunnerWireGuardConfigPath -HostName $RunnerHost -UserName $RunnerUser -RemotePath '/etc/wireguard/wg0.conf'

  Invoke-Remote -HostName $RunnerHost -UserName $RunnerUser -Command @"
set -euo pipefail
cd '$RemoteRoot'
sudo bash infra/scripts/oracle-runner-host-prepare.sh
$(if ($wgUploaded) { "sudo systemctl enable --now wg-quick@wg0" } else { "echo 'wg0.conf do runner nao foi enviado automaticamente; assumindo WireGuard ja configurado.'" })
$(if ($envUploaded) { "test -f infra/oracle/runner/.env" } else { "echo 'infra/oracle/runner/.env nao foi enviado automaticamente; assumindo arquivo ja presente.'" })
bash infra/scripts/oracle-runner-bootstrap.sh up
"@
}

function Up-OpsHost {
  Require-Host -HostName $OpsHost -Label 'ops'
  Sync-Infra -HostName $OpsHost -UserName $OpsUser

  $envUploaded = Upload-FileIfPresent -LocalPath $OpsEnvPath -HostName $OpsHost -UserName $OpsUser -RemotePath "$RemoteRoot/infra/oracle/ops/.env"

  Invoke-Remote -HostName $OpsHost -UserName $OpsUser -Command @"
set -euo pipefail
cd '$RemoteRoot'
$(if ($envUploaded) { "test -f infra/oracle/ops/.env" } else { "echo 'infra/oracle/ops/.env nao foi enviado automaticamente; assumindo arquivo ja presente.'" })
docker compose -f infra/oracle/ops/compose.yaml --env-file infra/oracle/ops/.env up -d
curl -fsS http://127.0.0.1:9090/api/v1/targets >/dev/null
"@
}

function Prepare-OpsHost {
  Require-Host -HostName $OpsHost -Label 'ops'
  Sync-Infra -HostName $OpsHost -UserName $OpsUser

  $envUploaded = Upload-FileIfPresent -LocalPath $OpsEnvPath -HostName $OpsHost -UserName $OpsUser -RemotePath "$RemoteRoot/infra/oracle/ops/.env"

  Invoke-Remote -HostName $OpsHost -UserName $OpsUser -Command @"
set -euo pipefail
cd '$RemoteRoot'
sudo bash infra/scripts/oracle-ops-host-prepare.sh
$(if ($envUploaded) { "test -f infra/oracle/ops/.env" } else { "echo 'infra/oracle/ops/.env nao foi enviado automaticamente; assumindo arquivo ja presente.'" })
"@
}

function Run-Smoke {
  if ($DbHost) {
    Invoke-Remote -HostName $DbHost -UserName $DbUser -Command @"
set -euo pipefail
cd '$RemoteRoot'
bash infra/scripts/oracle-db-bootstrap.sh ps
bash infra/scripts/oracle-db-bootstrap.sh check
"@
  }

  if ($RunnerHost) {
    Invoke-Remote -HostName $RunnerHost -UserName $RunnerUser -Command @"
set -euo pipefail
cd '$RemoteRoot'
bash infra/scripts/oracle-runner-bootstrap.sh ps
"@
  }

  if ($OpsHost) {
    Invoke-Remote -HostName $OpsHost -UserName $OpsUser -Command @"
set -euo pipefail
curl -fsS http://127.0.0.1:9090/api/v1/targets >/dev/null
curl -fsS http://127.0.0.1:3002/api/health >/dev/null
"@
  }
}

Ensure-Key

switch ($Stage) {
  'sync-all' {
    if ($DbHost) { Sync-Infra -HostName $DbHost -UserName $DbUser }
    if ($RunnerHost) { Sync-Infra -HostName $RunnerHost -UserName $RunnerUser }
    if ($OpsHost) { Sync-Infra -HostName $OpsHost -UserName $OpsUser }
  }
  'prepare-db' { Prepare-DbHost }
  'prepare-runner' { Prepare-RunnerHost }
  'prepare-ops' { Prepare-OpsHost }
  'up-ops' { Up-OpsHost }
  'smoke' { Run-Smoke }
  'all' {
    Prepare-DbHost
    Prepare-RunnerHost
    Prepare-OpsHost
    Up-OpsHost
    Run-Smoke
  }
}
