param(
  [string]$EnvPath = ".\.env",
  [int]$Limit = 50,
  [string]$StoreId = "",
  [string]$PosId = "",
  [switch]$SaveIfSingle
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [string[]]$Lines,
    [string]$Key
  )

  $pattern = "^\s*" + [regex]::Escape($Key) + "\s*=\s*(.*)\s*$"
  foreach ($line in $Lines) {
    $match = [regex]::Match($line, $pattern)
    if ($match.Success) {
      return ($match.Groups[1].Value.Trim() -replace '^["'']|["'']$', '')
    }
  }

  return ""
}

function Add-QueryParam {
  param(
    [System.Collections.Generic.List[string]]$Parts,
    [string]$Key,
    [string]$Value
  )

  if (-not [string]::IsNullOrWhiteSpace($Value)) {
    $Parts.Add(("{0}={1}" -f $Key, [uri]::EscapeDataString($Value.Trim()))) | Out-Null
  }
}

function Set-EnvValue {
  param(
    [string[]]$Lines,
    [string]$Key,
    [string]$Value
  )

  $pattern = "^\s*" + [regex]::Escape($Key) + "\s*="
  $updated = [System.Collections.Generic.List[string]]::new()
  $found = $false

  foreach ($line in $Lines) {
    if ($line -match $pattern) {
      $updated.Add("$Key=$Value") | Out-Null
      $found = $true
      continue
    }

    $updated.Add($line) | Out-Null
  }

  if (-not $found) {
    $updated.Add("$Key=$Value") | Out-Null
  }

  return $updated.ToArray()
}

function Save-DefaultTerminalId {
  param(
    [string]$Path,
    [string[]]$Lines,
    [object[]]$Terminals
  )

  if ($Terminals.Count -ne 1) {
    Write-Host "Nao atualizei o .env automaticamente porque foram encontradas $($Terminals.Count) maquininhas."
    return
  }

  $terminalId = [string]$Terminals[0].id
  if ([string]::IsNullOrWhiteSpace($terminalId)) {
    Write-Host "Nao atualizei o .env porque a resposta nao trouxe terminal_id valido."
    return
  }

  $updatedLines = Set-EnvValue $Lines "MERCADO_PAGO_POINT_TERMINAL_ID" $terminalId
  [IO.File]::WriteAllLines((Resolve-Path -LiteralPath $Path), $updatedLines, [Text.UTF8Encoding]::new($false))
  Write-Host "MERCADO_PAGO_POINT_TERMINAL_ID atualizado no .env."
}

if (-not (Test-Path -LiteralPath $EnvPath)) {
  throw "Arquivo .env nao encontrado em: $EnvPath"
}

$lines = Get-Content -LiteralPath $EnvPath
$accessToken = Get-EnvValue $lines "MERCADO_PAGO_ACCESS_TOKEN"
if ([string]::IsNullOrWhiteSpace($accessToken)) {
  throw "MERCADO_PAGO_ACCESS_TOKEN nao esta preenchido em: $EnvPath"
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$query = [System.Collections.Generic.List[string]]::new()
Add-QueryParam $query "limit" ([string]$Limit)
Add-QueryParam $query "store_id" $StoreId
Add-QueryParam $query "pos_id" $PosId

$url = "https://api.mercadopago.com/terminals/v1/list"
if ($query.Count -gt 0) {
  $url = $url + "?" + ($query -join "&")
}

$response = Invoke-RestMethod `
  -Method Get `
  -Uri $url `
  -Headers @{
    Authorization = "Bearer $accessToken"
    "Content-Type" = "application/json"
  }

$terminals = @($response.data.terminals)
if ($terminals.Count -eq 0) {
  Write-Host "Nenhuma maquininha Point foi retornada para este Access Token."
  Write-Host "Verifique se a Point esta vinculada a esta conta Mercado Pago e se voce esta usando credenciais de producao da conta correta."
  exit 0
}

$terminals |
  Select-Object `
    @{Name = "terminal_id"; Expression = { $_.id } },
    @{Name = "pos_id"; Expression = { $_.pos_id } },
    @{Name = "store_id"; Expression = { $_.store_id } },
    @{Name = "external_pos_id"; Expression = { $_.external_pos_id } },
    @{Name = "operating_mode"; Expression = { $_.operating_mode } } |
  Format-Table -AutoSize

Write-Host ""
Write-Host "Use o valor da coluna terminal_id em MERCADO_PAGO_POINT_TERMINAL_ID."
Write-Host "Para integracao via API, o Mercado Pago exige a terminal em modo PDV."

if ($SaveIfSingle) {
  Save-DefaultTerminalId $EnvPath $lines $terminals
}
