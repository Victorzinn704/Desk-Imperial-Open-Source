[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$EnvPath = ".\.env",
  [string]$TerminalId = ""
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

if (-not (Test-Path -LiteralPath $EnvPath)) {
  throw "Arquivo .env nao encontrado em: $EnvPath"
}

$lines = Get-Content -LiteralPath $EnvPath
$accessToken = Get-EnvValue $lines "MERCADO_PAGO_ACCESS_TOKEN"
if ([string]::IsNullOrWhiteSpace($accessToken)) {
  throw "MERCADO_PAGO_ACCESS_TOKEN nao esta preenchido em: $EnvPath"
}

$resolvedTerminalId = $TerminalId.Trim()
if ([string]::IsNullOrWhiteSpace($resolvedTerminalId)) {
  $resolvedTerminalId = Get-EnvValue $lines "MERCADO_PAGO_POINT_TERMINAL_ID"
}

if ([string]::IsNullOrWhiteSpace($resolvedTerminalId)) {
  throw "Informe -TerminalId ou preencha MERCADO_PAGO_POINT_TERMINAL_ID no .env"
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$payload = @{
  terminals = @(
    @{
      id = $resolvedTerminalId
      operating_mode = "PDV"
    }
  )
} | ConvertTo-Json -Depth 5

if ($PSCmdlet.ShouldProcess("Mercado Pago terminal", "ativar modo PDV para o terminal informado")) {
  $response = Invoke-RestMethod `
    -Method Patch `
    -Uri "https://api.mercadopago.com/terminals/v1/setup" `
    -Headers @{
      Authorization = "Bearer $accessToken"
      "Content-Type" = "application/json"
    } `
    -Body $payload

  $response.terminals |
    Select-Object `
      @{Name = "terminal_id"; Expression = { $_.id } },
      @{Name = "operating_mode"; Expression = { $_.operating_mode } } |
    Format-Table -AutoSize

  Write-Host "Reinicie a maquininha e confira no aparelho: Mais opcoes > Configuracoes > Modo de vinculacao."
}
