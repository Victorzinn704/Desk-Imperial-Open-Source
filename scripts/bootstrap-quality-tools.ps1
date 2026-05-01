param()

$ErrorActionPreference = 'Stop'

function Test-Command {
  param([Parameter(Mandatory = $true)][string]$Name)

  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host '==> Validando bootstrap local da central de quality'

if (-not (Test-Command npm)) {
  throw 'npm nao encontrado no PATH.'
}

Write-Host '==> Instalando dependencias npm locais do monorepo'
npm install
if ($LASTEXITCODE -ne 0) {
  throw 'npm install falhou.'
}

if (-not (Test-Command gitleaks)) {
  if (Test-Command winget) {
    Write-Host '==> Instalando Gitleaks via winget'
    winget install --id Gitleaks.Gitleaks -e --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
      Write-Warning 'Winget nao conseguiu instalar o Gitleaks neste host.'
      if (Test-Command choco) {
        Write-Host '==> Tentando instalar Gitleaks via Chocolatey'
        choco install gitleaks -y --no-progress
        if ($LASTEXITCODE -ne 0) {
          Write-Warning 'Chocolatey tambem nao conseguiu instalar o Gitleaks. Instale manualmente via release do GitHub.'
        }
      } else {
        Write-Warning 'Chocolatey nao esta disponivel. Instale manualmente via release do GitHub ou corrija as sources do winget.'
      }
    }
  } else {
    if (Test-Command choco) {
      Write-Host '==> Instalando Gitleaks via Chocolatey'
      choco install gitleaks -y --no-progress
      if ($LASTEXITCODE -ne 0) {
        Write-Warning 'Chocolatey nao conseguiu instalar o Gitleaks. Instale manualmente: https://github.com/gitleaks/gitleaks/releases'
      }
    } else {
      Write-Warning 'Gitleaks nao encontrado e nenhum instalador automatico esta disponivel. Instale manualmente: https://github.com/gitleaks/gitleaks/releases'
    }
  }
} else {
  Write-Host '==> Gitleaks ja presente'
}

if (-not (Test-Command semgrep)) {
  if (Test-Command python) {
    Write-Host '==> Instalando Semgrep via pip user'
    python -m pip install --user semgrep
    if ($LASTEXITCODE -ne 0) {
      Write-Warning 'Semgrep nao foi instalado com sucesso via pip. Corrija o Python local ou instale manualmente.'
    }
  } else {
    Write-Warning 'Semgrep nao encontrado e Python nao esta disponivel. Instale manualmente: https://semgrep.dev/docs/getting-started/'
  }
} else {
  Write-Host '==> Semgrep ja presente'
}

Write-Host '==> Bootstrap concluido. Abra um novo terminal se PATH tiver sido atualizado.'
