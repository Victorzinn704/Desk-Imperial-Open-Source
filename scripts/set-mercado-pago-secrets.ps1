[CmdletBinding()]
param(
  [string]$EnvPath = ".env"
)

$ErrorActionPreference = "Stop"

function Convert-SecureStringToPlainText {
  param([Security.SecureString]$SecureValue)

  if ($null -eq $SecureValue) {
    return ""
  }

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

function Read-EnvLines {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return @()
  }

  return [IO.File]::ReadAllLines((Resolve-Path -LiteralPath $Path))
}

function Get-EnvValue {
  param(
    [string[]]$Lines,
    [string]$Key
  )

  $escapedKey = [Regex]::Escape($Key)
  foreach ($line in $Lines) {
    if ($line -match "^\s*$escapedKey=(.*)$") {
      return $Matches[1]
    }
  }

  return ""
}

function Set-EnvValue {
  param(
    [string[]]$Lines,
    [string]$Key,
    [string]$Value
  )

  $escapedKey = [Regex]::Escape($Key)
  $updated = New-Object Collections.Generic.List[string]
  $found = $false

  foreach ($line in $Lines) {
    if ($line -match "^\s*$escapedKey=") {
      $updated.Add("$Key=$Value")
      $found = $true
      continue
    }
    $updated.Add($line)
  }

  if (-not $found) {
    $updated.Add("$Key=$Value")
  }

  return $updated.ToArray()
}

function Read-SecretInput {
  param(
    [string]$Label,
    [string]$ExistingValue
  )

  $hasExisting = -not [string]::IsNullOrWhiteSpace($ExistingValue)
  $suffix = if ($hasExisting) { " (Enter para manter atual)" } else { "" }
  $secureValue = Read-Host -Prompt "$Label$suffix" -AsSecureString
  $plainValue = Convert-SecureStringToPlainText $secureValue

  if ([string]::IsNullOrWhiteSpace($plainValue)) {
    return $ExistingValue
  }

  return $plainValue.Trim()
}

$resolvedEnvPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($EnvPath)
$lines = Read-EnvLines $resolvedEnvPath
$values = [ordered]@{
  MERCADO_PAGO_PUBLIC_KEY = Read-SecretInput "public_key_MercadoPago" (Get-EnvValue $lines "MERCADO_PAGO_PUBLIC_KEY")
  MERCADO_PAGO_ACCESS_TOKEN = Read-SecretInput "Access_Token_MercadoPago" (Get-EnvValue $lines "MERCADO_PAGO_ACCESS_TOKEN")
  MERCADO_PAGO_CLIENT_ID = Read-SecretInput "Client_ID_MercadoPago" (Get-EnvValue $lines "MERCADO_PAGO_CLIENT_ID")
  MERCADO_PAGO_CLIENT_SECRET = Read-SecretInput "Client_Secret_MercadoPago" (Get-EnvValue $lines "MERCADO_PAGO_CLIENT_SECRET")
  MERCADO_PAGO_POINT_TERMINAL_ID = Read-SecretInput "Terminal_ID_MercadoPago" (Get-EnvValue $lines "MERCADO_PAGO_POINT_TERMINAL_ID")
}

$webhookSecret = Read-SecretInput "Webhook_Secret_MercadoPago (copie do painel de Webhooks; Enter mantem atual)" (
  Get-EnvValue $lines "MERCADO_PAGO_WEBHOOK_SECRET"
)
$values.MERCADO_PAGO_WEBHOOK_SECRET = $webhookSecret

foreach ($entry in $values.GetEnumerator()) {
  $lines = Set-EnvValue $lines $entry.Key $entry.Value
}

if ([string]::IsNullOrWhiteSpace((Get-EnvValue $lines "MERCADO_PAGO_ORDERS_URL"))) {
  $lines = Set-EnvValue $lines "MERCADO_PAGO_ORDERS_URL" "https://api.mercadopago.com/v1/orders"
}

$directory = Split-Path -Parent $resolvedEnvPath
if (-not [string]::IsNullOrWhiteSpace($directory)) {
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
}

[IO.File]::WriteAllLines($resolvedEnvPath, $lines, [Text.UTF8Encoding]::new($false))

Write-Host "Credenciais Mercado Pago atualizadas em $resolvedEnvPath"
Write-Host "Os valores nao foram exibidos no terminal."
if ([string]::IsNullOrWhiteSpace((Get-EnvValue $lines "MERCADO_PAGO_WEBHOOK_SECRET"))) {
  Write-Warning "MERCADO_PAGO_WEBHOOK_SECRET ficou vazio. Webhooks reais serao recusados ate configurar o segredo do painel Mercado Pago."
}
