param(
  [Parameter(Mandatory = $true)]
  [string]$PexelsApiKey,
  [string]$PexelsApiUrl = 'https://api.pexels.com/v1',
  [switch]$SkipRemote,
  [string]$ProductionHost = $env:DESK_PRODUCTION_HOST,
  [string]$RemoteEnvPath = '/home/ubuntu/desk-imperial/.env',
  [string]$KeyPath = (Join-Path $env:TEMP 'desk_oci_key.pem'),
  [string]$SourceKeyPath = 'C:\Users\Desktop\.oci\oci_api_key_new.pem',
  [string]$KnownHostsPath = (Join-Path $env:USERPROFILE '.ssh\known_hosts')
)

$ErrorActionPreference = 'Stop'

function Set-EnvValueInFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $directory = Split-Path -Parent $Path
  if ($directory -and -not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType File -Path $Path -Force | Out-Null
  }

  $content = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) {
    $content = ''
  }

  $escapedName = [regex]::Escape($Name)
  $line = "$Name=$Value"

  if ($content -match "(?m)^$escapedName=") {
    $updated = [regex]::Replace($content, "(?m)^$escapedName=.*$", $line)
  } else {
    $prefix = if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { "`r`n" } else { '' }
    $updated = "$content$prefix$line`r`n"
  }

  Set-Content -LiteralPath $Path -Value $updated -NoNewline
}

function Protect-SshPrivateKey {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Chave SSH nao encontrada: $Path"
  }

  $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls $Path /inheritance:r /grant:r "${currentUser}:R" /remove:g 'Users' 'Authenticated Users' 'Everyone' 'CodexSandboxUsers' | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Nao foi possivel endurecer ACL da chave automaticamente: $Path"
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$usingCopiedKey = $false

if (-not $PSBoundParameters.ContainsKey('KeyPath')) {
  $KeyPath = $SourceKeyPath
}

$localEnvFiles = @(
  (Join-Path $repoRoot '.env.local'),
  (Join-Path $repoRoot 'apps\web\.env.local')
)

foreach ($envFile in $localEnvFiles) {
  Set-EnvValueInFile -Path $envFile -Name 'PEXELS_API_URL' -Value $PexelsApiUrl
  Set-EnvValueInFile -Path $envFile -Name 'PEXELS_API_KEY' -Value $PexelsApiKey
  Write-Host "Atualizado: $envFile"
}

if (-not $SkipRemote) {
  if (-not $ProductionHost) {
    throw 'Defina DESK_PRODUCTION_HOST ou passe -ProductionHost para atualizar o Oracle.'
  }

  if (-not (Test-Path -LiteralPath $KeyPath)) {
    Copy-Item -LiteralPath $SourceKeyPath -Destination $KeyPath -Force
    $usingCopiedKey = $true
  }

  if ($usingCopiedKey) {
    Protect-SshPrivateKey -Path $KeyPath
  }

  $payload = @{
    apiUrl = $PexelsApiUrl
    apiKey = $PexelsApiKey
  } | ConvertTo-Json -Compress
  $payloadBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload))

  $remotePython = @"
from __future__ import annotations
import base64
import json
from pathlib import Path

payload = json.loads(base64.b64decode("$payloadBase64").decode("utf-8"))
env_path = Path("$RemoteEnvPath")
content = env_path.read_text(encoding="utf-8") if env_path.exists() else ""
lines = content.splitlines()

def upsert(lines: list[str], name: str, value: str) -> list[str]:
    prefix = f"{name}="
    updated = False
    for index, line in enumerate(lines):
        if line.startswith(prefix):
            lines[index] = prefix + value
            updated = True
            break
    if not updated:
        lines.append(prefix + value)
    return lines

lines = upsert(lines, "PEXELS_API_URL", payload["apiUrl"])
lines = upsert(lines, "PEXELS_API_KEY", payload["apiKey"])
env_path.parent.mkdir(parents=True, exist_ok=True)
env_path.write_text("\n".join(lines).rstrip("\n") + "\n", encoding="utf-8")
print(f"Atualizado remoto: {env_path}")
"@
  $remotePython | ssh -i $KeyPath -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$KnownHostsPath $ProductionHost "python3 -"
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao atualizar PEXELS_API_KEY no Oracle.'
  }
}

Write-Host 'PEXELS configurado com sucesso.'
