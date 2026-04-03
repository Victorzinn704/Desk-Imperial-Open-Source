param(
  [ValidateSet('copilot', 'codex', 'claude')]
  [string]$Agent = 'copilot',
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$PlaywrightArgs
)

$ErrorActionPreference = 'Stop'
$session = "desk-imperial-$Agent"
$sessionArg = "-s=$session"

if (-not $PlaywrightArgs -or $PlaywrightArgs.Count -eq 0) {
  $PlaywrightArgs = @('--help')
}

$usesExplicitSession = $false
foreach ($arg in $PlaywrightArgs) {
  if ($arg -match '^-s=|^--session=') {
    $usesExplicitSession = $true
    break
  }
}

$effectiveArgs = if ($usesExplicitSession) {
  $PlaywrightArgs
} else {
  @($sessionArg) + $PlaywrightArgs
}

$globalCli = Get-Command playwright-cli -ErrorAction SilentlyContinue
if ($globalCli) {
  & playwright-cli @effectiveArgs
  exit $LASTEXITCODE
}

& npx playwright-cli @effectiveArgs
exit $LASTEXITCODE
