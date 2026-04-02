[CmdletBinding(PositionalBinding = $false)]
Param(
  [ValidateSet('fast', 'daily', 'critical', 'smart', 'custom')]
  [string]$Mode = 'critical',

  [string]$Model = '',

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$AiderArgs
)

$runner = Join-Path $PSScriptRoot 'run-aider.ps1'
if (-not (Test-Path $runner)) {
  Write-Error "Nao foi possivel localizar run-aider.ps1 em $runner"
  exit 1
}

& $runner -Mode $Mode -Provider github -Model $Model @AiderArgs
exit $LASTEXITCODE
