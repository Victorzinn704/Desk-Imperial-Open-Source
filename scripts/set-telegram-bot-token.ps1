param(
  [Parameter(Mandatory = $true)]
  [string]$TelegramBotToken,
  [string]$TelegramBotUsername = 'Desk_Imperial_bot',
  [string]$TelegramWebhookUrl = 'https://api.deskimperial.online/api/v1/notifications/telegram/webhook',
  [string]$TelegramAllowedWorkspaceOwnerIds = 'cmmsisp33000jpk0pqqey4lr1,cmmv1mcbm0005w050cm8h5m1h',
  [switch]$EnableBot,
  [string]$ProductionHost = 'ubuntu@163.176.171.242',
  [string]$RemoteEnvPath = '/home/ubuntu/desk-imperial/apps/api/.env',
  [string]$KeyPath = (Join-Path $env:TEMP 'desk_oci_key_telegram.pem'),
  [string]$SourceKeyPath = 'C:\Users\Desktop\.oci\oci_api_key_new.pem',
  [string]$KnownHostsPath = (Join-Path $env:USERPROFILE '.ssh\known_hosts')
)

$ErrorActionPreference = 'Stop'

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

if (-not (Test-Path -LiteralPath $KeyPath)) {
  Copy-Item -LiteralPath $SourceKeyPath -Destination $KeyPath -Force
}

Protect-SshPrivateKey -Path $KeyPath

$payload = @{
  telegramBotToken = $TelegramBotToken
  telegramBotUsername = $TelegramBotUsername
  telegramWebhookUrl = $TelegramWebhookUrl
  telegramAllowedWorkspaceOwnerIds = $TelegramAllowedWorkspaceOwnerIds
} | ConvertTo-Json -Compress

if ($EnableBot) {
  $payload = @{
    telegramBotToken = $TelegramBotToken
    telegramBotUsername = $TelegramBotUsername
    telegramWebhookUrl = $TelegramWebhookUrl
    telegramAllowedWorkspaceOwnerIds = $TelegramAllowedWorkspaceOwnerIds
    telegramBotEnabled = 'true'
  } | ConvertTo-Json -Compress
}

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

lines = upsert(lines, "TELEGRAM_BOT_TOKEN", payload["telegramBotToken"])
lines = upsert(lines, "TELEGRAM_BOT_USERNAME", payload["telegramBotUsername"])
lines = upsert(lines, "TELEGRAM_WEBHOOK_URL", payload["telegramWebhookUrl"])
lines = upsert(lines, "TELEGRAM_ALLOWED_WORKSPACE_OWNER_IDS", payload["telegramAllowedWorkspaceOwnerIds"])
if "telegramBotEnabled" in payload:
    lines = upsert(lines, "TELEGRAM_BOT_ENABLED", payload["telegramBotEnabled"])
env_path.parent.mkdir(parents=True, exist_ok=True)
env_path.write_text("\n".join(lines).rstrip("\n") + "\n", encoding="utf-8")
print(f"Atualizado remoto: {env_path}")
"@

$remotePython | ssh -i $KeyPath -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$KnownHostsPath $ProductionHost "python3 -"
if ($LASTEXITCODE -ne 0) {
  throw 'Falha ao atualizar TELEGRAM_BOT_* no Oracle.'
}

Write-Host 'TELEGRAM_BOT_* configurado com sucesso no ambiente remoto.'
Write-Host 'Proximo passo: reiniciar a API e registrar o webhook.'
