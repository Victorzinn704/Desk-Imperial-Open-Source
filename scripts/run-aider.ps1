[CmdletBinding(PositionalBinding = $false)]
Param(
  [ValidateSet('fast', 'daily', 'critical', 'smart', 'custom')]
  [string]$Mode = 'daily',

  [ValidateSet('openrouter', 'groq', 'github', 'minimax')]
  [string]$Provider = '',

  [string]$Model = '',
  [string]$TokenFile = '',

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$AiderArgs
)

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $repoRoot

$envFiles = @(
  "$repoRoot\.env.local",
  "$repoRoot\.env"
)

function Get-EnvFileValue {
  Param(
    [Parameter(Mandatory = $true)]
    [string]$Key
  )

  $pattern = '^{0}\s*=\s*(.*)$' -f [regex]::Escape($Key)

  foreach ($envFile in $envFiles) {
    if (-not (Test-Path $envFile)) { continue }

    foreach ($rawLine in Get-Content -Path $envFile) {
      $line = $rawLine.Trim()
      if (-not $line -or $line.StartsWith('#')) { continue }

      if ($line.StartsWith('export ')) {
        $line = $line.Substring(7).Trim()
      }

      if ($line -match $pattern) {
        $value = $Matches[1].Trim()

        if (
          (($value.StartsWith('"')) -and ($value.EndsWith('"'))) -or
          (($value.StartsWith("'")) -and ($value.EndsWith("'")))
        ) {
          $value = $value.Substring(1, $value.Length - 2)
        }

        if ($value) {
          return $value
        }
      }
    }
  }

  return $null
}

$validModes = @('fast', 'daily', 'critical', 'smart', 'custom')
if ($AiderArgs -and $AiderArgs.Count -gt 0) {
  $firstArg = $AiderArgs[0]
  if ($firstArg -and (-not $firstArg.StartsWith('-')) -and ($validModes -contains $firstArg.ToLowerInvariant())) {
    $Mode = $firstArg.ToLowerInvariant()
    if ($AiderArgs.Count -gt 1) {
      $AiderArgs = $AiderArgs[1..($AiderArgs.Count - 1)]
    } else {
      $AiderArgs = @()
    }
  }
}

$modeDefaults = @{
  fast = @{
    provider = 'groq'
    model = 'groq/llama-3.3-70b-versatile'
    mapTokens = '384'
    historyTokens = '1400'
    refresh = 'manual'
  }
  daily = @{
    provider = 'openrouter'
    model = 'openrouter/deepseek/deepseek-chat-v3-0324'
    mapTokens = '1024'
    historyTokens = '2500'
    refresh = 'files'
  }
  critical = @{
    provider = 'github'
    model = 'gpt-4o'
    mapTokens = '2048'
    historyTokens = '4500'
    refresh = 'files'
  }
  smart = @{
    provider = 'minimax'
    model = 'minimax-text-01'
    mapTokens = '896'
    historyTokens = '2000'
    refresh = 'files'
  }
}

if ($Mode -ne 'custom') {
  $defaults = $modeDefaults[$Mode]
  if (-not $Provider) { $Provider = $defaults.provider }
  if (-not $Model) { $Model = $defaults.model }

  $AiderArgs = @(
    '--map-tokens', $defaults.mapTokens,
    '--max-chat-history-tokens', $defaults.historyTokens,
    '--map-refresh', $defaults.refresh,
    '--chat-language', 'pt-BR',
    '--edit-format', 'whole'
  ) + $AiderArgs
}

if (-not $Provider) { $Provider = 'openrouter' }

if (-not $TokenFile) {
  switch ($Provider) {
    'openrouter' { $TokenFile = "$repoRoot\.openrouter.token" }
    'groq' { $TokenFile = "$repoRoot\.groq.token" }
    'github' { $TokenFile = "$repoRoot\.github-models.token" }
    'minimax' { $TokenFile = "$repoRoot\.minimax.token" }
  }
}

switch ($Provider) {
  'openrouter' {
    if ($env:OPENROUTER_API_KEY) {
      $env:OPENAI_API_KEY = $env:OPENROUTER_API_KEY
    }

    if (-not $env:OPENAI_API_KEY) {
      $token = Get-EnvFileValue -Key 'OPENROUTER_API_KEY'
      if (-not $token) {
        $token = Get-EnvFileValue -Key 'OPENAI_API_KEY'
      }
      if ($token) { $env:OPENAI_API_KEY = $token }
    }

    if (-not $env:OPENAI_API_KEY -and (Test-Path $TokenFile)) {
      $token = (Get-Content -Path $TokenFile -Raw).Trim()
      if ($token) { $env:OPENAI_API_KEY = $token }
    }

    if (-not $env:OPENAI_API_KEY) {
      Write-Error 'Defina OPENROUTER_API_KEY (ou OPENAI_API_KEY) ou crie .openrouter.token.'
      exit 1
    }

    if (-not $Model) { $Model = 'openrouter/deepseek/deepseek-chat-v3-0324' }
    $env:OPENAI_API_BASE = 'https://openrouter.ai/api/v1'
  }

  'groq' {
    if ($env:GROQ_API_KEY) {
      $env:OPENAI_API_KEY = $env:GROQ_API_KEY
    }

    if (-not $env:OPENAI_API_KEY) {
      $token = Get-EnvFileValue -Key 'GROQ_API_KEY'
      if (-not $token) {
        $token = Get-EnvFileValue -Key 'OPENAI_API_KEY'
      }
      if ($token) { $env:OPENAI_API_KEY = $token }
    }

    if (-not $env:OPENAI_API_KEY -and (Test-Path $TokenFile)) {
      $token = (Get-Content -Path $TokenFile -Raw).Trim()
      if ($token) { $env:OPENAI_API_KEY = $token }
    }

    if (-not $env:OPENAI_API_KEY) {
      Write-Error 'Defina GROQ_API_KEY (ou OPENAI_API_KEY) ou crie .groq.token.'
      exit 1
    }

    if (-not $Model) { $Model = 'groq/llama-3.3-70b-versatile' }
    $env:OPENAI_API_BASE = 'https://api.groq.com/openai/v1'
  }

  'github' {
    if (-not $env:OPENAI_API_KEY) {
      $token = Get-EnvFileValue -Key 'OPENAI_API_KEY'
      if ($token) { $env:OPENAI_API_KEY = $token }
    }

    if (-not $env:OPENAI_API_KEY -and (Test-Path $TokenFile)) {
      $token = (Get-Content -Path $TokenFile -Raw).Trim()
      if ($token) { $env:OPENAI_API_KEY = $token }
    }

    if (-not $env:OPENAI_API_KEY) {
      Write-Error 'Defina OPENAI_API_KEY ou crie .github-models.token.'
      exit 1
    }

    if (-not $Model) { $Model = 'gpt-4o' }
    $env:OPENAI_API_BASE = 'https://models.inference.ai.azure.com'
  }

  'minimax' {
    if ($env:MINIMAX_API_KEY) {
      $env:OPENAI_API_KEY = $env:MINIMAX_API_KEY
    }

    if (-not $env:OPENAI_API_KEY) {
      $token = Get-EnvFileValue -Key 'MINIMAX_API_KEY'
      if (-not $token) {
        $token = Get-EnvFileValue -Key 'OPENAI_API_KEY'
      }
      if ($token) { $env:OPENAI_API_KEY = $token }
    }

    if (-not $env:OPENAI_API_KEY -and (Test-Path $TokenFile)) {
      $token = (Get-Content -Path $TokenFile -Raw).Trim()
      if ($token) { $env:OPENAI_API_KEY = $token }
    }

    if (-not $env:OPENAI_API_KEY) {
      Write-Error 'Defina MINIMAX_API_KEY (ou OPENAI_API_KEY) ou crie .minimax.token.'
      exit 1
    }

    if (-not $Model) { $Model = 'minimax-text-01' }
    $env:OPENAI_API_BASE = 'https://api.minimaxi.com/v1'
  }
}

$env:AIDER_PROVIDER = $Provider
$env:AIDER_MODEL = $Model

Write-Host "Modo: $Mode | Provider: $Provider | Modelo: $Model"

if (Get-Command aider -ErrorAction SilentlyContinue) {
  aider @AiderArgs
  exit $LASTEXITCODE
}

$venvCandidates = @()
if ($env:AIDER_PYTHON) {
  $venvCandidates += $env:AIDER_PYTHON
}
$venvCandidates += @(
  "$repoRoot\.venv-aider\Scripts\python.exe",
  "$repoRoot\.venv\Scripts\python.exe",
  "$repoRoot\..\Playground\.venv\Scripts\python.exe"
)

$venvPython = $venvCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if ($venvPython -and (Test-Path $venvPython)) {
  & $venvPython -m aider @AiderArgs
  exit $LASTEXITCODE
}

python -m aider @AiderArgs
