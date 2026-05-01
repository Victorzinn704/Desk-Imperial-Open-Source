param(
  [string]$Target = "api.deskimperial.online",
  [ValidateSet("quick", "top1000", "full")]
  [string]$Mode = "quick",
  [string]$OutputDir = ".cache/security/nmap"
)

$resolvedOutputDir = Join-Path (Get-Location) $OutputDir
New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeTarget = ($Target -replace '[^a-zA-Z0-9\.-]', '_') -replace '\.', '-'
$outputPath = Join-Path $resolvedOutputDir ("nmap-{0}-{1}-{2}.txt" -f $safeTarget, $Mode, $timestamp)

$arguments = switch ($Mode) {
  "quick" {
    @("-Pn", "-sV", "-p", "22,80,443,3000,4000,5432,6379,9000", $Target)
  }
  "top1000" {
    @("-Pn", "-sV", "--top-ports", "1000", "-T4", $Target)
  }
  "full" {
    @("-Pn", "-sV", "-p", "1-65535", "-T4", $Target)
  }
}

function Invoke-LocalNmap {
  param(
    [string[]]$NmapArguments
  )

  $nmapCommand = Get-Command nmap -ErrorAction SilentlyContinue
  if (-not $nmapCommand) {
    return $false
  }

  & $nmapCommand.Source @NmapArguments 2>&1 | Tee-Object -FilePath $outputPath
  if ($LASTEXITCODE -ne 0) {
    Write-Error ("Nmap local falhou com codigo {0}." -f $LASTEXITCODE)
    exit $LASTEXITCODE
  }

  return $true
}

function Invoke-DockerNmap {
  param(
    [string[]]$NmapArguments
  )

  $dockerInfo = docker info 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Nmap nao esta instalado no host e o Docker daemon nao esta disponivel para fallback."
    exit 1
  }

  docker run --rm instrumentisto/nmap @NmapArguments 2>&1 | Tee-Object -FilePath $outputPath
  if ($LASTEXITCODE -ne 0) {
    Write-Error ("Nmap via Docker falhou com codigo {0}." -f $LASTEXITCODE)
    exit $LASTEXITCODE
  }
}

Write-Host ("Executando Nmap em {0} no modo {1}..." -f $Target, $Mode)
Write-Host ("Relatorio: {0}" -f $outputPath)

if (-not (Invoke-LocalNmap -NmapArguments $arguments)) {
  Write-Host "Nmap local indisponivel. Usando fallback via Docker."
  Invoke-DockerNmap -NmapArguments $arguments
}

Write-Host "Scan concluido."
