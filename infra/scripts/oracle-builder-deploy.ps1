param(
  [ValidateSet('all', 'api', 'web')]
  [string] $Service = 'all',
  [ValidateSet('registry', 'archive')]
  [string] $Transport = 'registry',
  [ValidateSet('working-tree', 'head')]
  [string] $SourceMode = 'working-tree',
  [string] $KeyPath = (Join-Path $env:TEMP 'desk_oci_key.pem'),
  [string] $SourceKeyPath = 'C:\Users\Desktop\.oci\oci_api_key_new.pem',
  [string] $BuilderHost = $env:DESK_BUILDER_HOST,
  [string] $BuilderPrivateHost = $env:DESK_BUILDER_PRIVATE_HOST,
  [string] $ProductionHost = $env:DESK_PRODUCTION_HOST,
  [string] $KnownHostsPath = (Join-Path $env:USERPROFILE '.ssh\known_hosts'),
  [int] $RegistryTunnelPort = 55000
)

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

if (-not $BuilderHost) {
  $BuilderHost = 'ubuntu@147.15.60.224'
}

if (-not $BuilderHost) {
  throw 'Defina o host do builder via parâmetro -BuilderHost ou variável DESK_BUILDER_HOST.'
}

if (-not $BuilderPrivateHost) {
  $BuilderPrivateHost = '10.220.10.2'
}

if (-not $BuilderPrivateHost) {
  throw 'Defina o host privado do builder via parâmetro -BuilderPrivateHost ou variável DESK_BUILDER_PRIVATE_HOST.'
}

if (-not $ProductionHost) {
  $ProductionHost = 'ubuntu@163.176.171.242'
}

if (-not $ProductionHost) {
  throw 'Defina o host de produção via parâmetro -ProductionHost ou variável DESK_PRODUCTION_HOST.'
}

function Read-EnvFileValues {
  param([string] $Path)

  $values = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $values
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) {
      continue
    }

    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      continue
    }

    $key = $matches[1]
    $value = $matches[2].Trim()

    if ($value.Length -ge 2) {
      $quote = $value.Substring(0, 1)
      if (($quote -eq '"' -or $quote -eq "'") -and $value.EndsWith($quote)) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }

    $values[$key] = $value
  }

  return $values
}

function Resolve-ConfigValue {
  param(
    [string[]] $Keys,
    [hashtable[]] $Sources
  )

  foreach ($key in $Keys) {
    $processValue = [Environment]::GetEnvironmentVariable($key)
    if (-not [string]::IsNullOrWhiteSpace($processValue)) {
      return $processValue.Trim()
    }

    foreach ($source in $Sources) {
      if ($source.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace($source[$key])) {
        return $source[$key].Trim()
      }
    }
  }

  return $null
}

function ConvertTo-BashSingleQuoted {
  param([string] $Value)

  if ($null -eq $Value) {
    return ''
  }

  $escapedSingleQuote = [string]::Concat("'", '"', "'", '"', "'")
  return $Value.Replace("'", $escapedSingleQuote)
}

function Invoke-Remote {
  param(
    [string] $HostName,
    [string] $Command
  )

  $NormalizedCommand = $Command -replace "`r`n", "`n"
  $NormalizedCommand = $NormalizedCommand -replace "`r", "`n"

  ssh -i $KeyPath -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$KnownHostsPath -o ServerAliveInterval=20 -o ServerAliveCountMax=60 $HostName $NormalizedCommand
  if ($LASTEXITCODE -ne 0) {
    throw "Comando remoto falhou em ${HostName} com exit code $LASTEXITCODE."
  }
}

function Invoke-Scp {
  param(
    [string[]] $Arguments,
    [string] $Description
  )

  scp @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Description falhou com exit code $LASTEXITCODE."
  }
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
  Copy-Item -LiteralPath $SourceKeyPath -Destination $KeyPath -Force
}

$rootEnvValues = Read-EnvFileValues -Path (Join-Path $RepoRoot '.env')
$apiEnvValues = Read-EnvFileValues -Path (Join-Path $RepoRoot 'apps/api/.env')
$webEnvValues = Read-EnvFileValues -Path (Join-Path $RepoRoot 'apps/web/.env.local')

$apiSentryDsn = Resolve-ConfigValue -Keys @('SENTRY_DSN') -Sources @($apiEnvValues, $rootEnvValues)
$webClientSentryDsn = Resolve-ConfigValue -Keys @('NEXT_PUBLIC_SENTRY_DSN') -Sources @($webEnvValues, $rootEnvValues)
$webServerSentryDsn =
  Resolve-ConfigValue -Keys @('SENTRY_WEB_DSN') -Sources @($webEnvValues, $rootEnvValues)
if (-not $webServerSentryDsn) {
  $webServerSentryDsn = $webClientSentryDsn
}

$webSentryAuthToken = Resolve-ConfigValue -Keys @('SENTRY_AUTH_TOKEN') -Sources @($webEnvValues, $rootEnvValues)
$webSentryOrg = Resolve-ConfigValue -Keys @('SENTRY_ORG') -Sources @($webEnvValues, $rootEnvValues)
if (-not $webSentryOrg) {
  $webSentryOrg = 'desk-imperial'
}

$webSentryProject = Resolve-ConfigValue -Keys @('SENTRY_PROJECT_WEB', 'SENTRY_PROJECT') -Sources @($webEnvValues, $rootEnvValues)
if (-not $webSentryProject) {
  $webSentryProject = 'javascript-nextjs'
}

$apiSentryEnabled = if ($apiSentryDsn) { 'true' } else { 'false' }
$webSentryEnabled = if ($webClientSentryDsn) { 'true' } else { 'false' }
$apiSentryTracesSampleRate = '0.1'
$apiSentryProfileSessionSampleRate = '0.02'
$webSentryTracesSampleRate = '0.1'
$webSentryEnvironment = 'production'
$sentrySendDefaultPii = 'false'
$sentryEnableLogs = 'false'

$release = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss')
$archive = Join-Path $env:TEMP "desk-imperial-source-$release.tgz"
$imageArchive = Join-Path $env:TEMP "desk-imperial-images-$release.tgz"
$remoteArchive = "/tmp/desk-imperial-source-$release.tgz"
$remoteImageArchive = "/tmp/desk-imperial-images-$release.tgz"

Write-Host "==> Empacotando fonte ($SourceMode): $archive"
if (Test-Path -LiteralPath $archive) {
  Remove-Item -LiteralPath $archive -Force
}
$hasLocalChanges = [bool](git -C $RepoRoot status --porcelain)
if ($SourceMode -eq 'head') {
  git -C $RepoRoot archive --format=tar.gz --output=$archive HEAD
}
elseif (-not $hasLocalChanges) {
  git -C $RepoRoot archive --format=tar.gz --output=$archive HEAD
}
else {
  $pythonArchiveScript = @"
from __future__ import annotations
import os
import subprocess
import sys
import tarfile
from pathlib import Path

archive_path = Path(sys.argv[1])
repo_root = Path(sys.argv[2])

result = subprocess.run(
    ["git", "ls-files", "-z", "-co", "--exclude-standard"],
    cwd=repo_root,
    capture_output=True,
    check=True,
)
entries = [Path(item.decode("utf-8")) for item in result.stdout.split(b"\0") if item]

with tarfile.open(archive_path, "w:gz") as archive:
    for relative_path in entries:
        full_path = repo_root / relative_path
        if not full_path.exists() or not full_path.is_file():
            continue
        archive.add(full_path, arcname=relative_path.as_posix())
"@

  $pythonArchiveScript | python - $archive $RepoRoot
}
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $archive)) {
  throw "Empacotamento da fonte falhou."
}

Write-Host "==> Enviando fonte para builder: $BuilderHost"
Invoke-Scp -Description 'Envio da fonte para builder' -Arguments @(
  '-i', $KeyPath,
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', "UserKnownHostsFile=$KnownHostsPath",
  $archive,
  "${BuilderHost}:$remoteArchive"
)

$buildServices = @()
if ($Service -in @('all', 'api')) {
  $buildServices += 'api'
}
if ($Service -in @('all', 'web')) {
  $buildServices += 'web'
}

$serviceList = $buildServices -join ' '
$imageList = (($buildServices | ForEach-Object { "desk-imperial-$($_):latest desk-imperial-$($_):$release" }) -join ' ')

if ($buildServices -contains 'web') {
  if (-not $webClientSentryDsn) {
    Write-Warning 'NEXT_PUBLIC_SENTRY_DSN nao foi encontrado localmente. O web sera buildado sem envio de eventos para o Sentry.'
  }

  if (-not $webSentryAuthToken) {
    Write-Warning 'SENTRY_AUTH_TOKEN nao foi encontrado localmente. O build do web nao enviara sourcemaps para o Sentry.'
  }
}

$buildScript = @"
set -euo pipefail
release='$release'
source_archive='$remoteArchive'
workdir="/home/ubuntu/desk-imperial-builder/src"
image_archive='$remoteImageArchive'
services='$serviceList'
transport='$Transport'
image_list='$imageList'
registry_push_host='localhost:5000'
next_public_sentry_dsn='$(ConvertTo-BashSingleQuoted $webClientSentryDsn)'
next_public_sentry_enabled='$(ConvertTo-BashSingleQuoted $webSentryEnabled)'
next_public_sentry_traces_sample_rate='$(ConvertTo-BashSingleQuoted $webSentryTracesSampleRate)'
next_public_sentry_environment='$(ConvertTo-BashSingleQuoted $webSentryEnvironment)'
next_public_sentry_release='$(ConvertTo-BashSingleQuoted $release)'
next_public_sentry_send_default_pii='$(ConvertTo-BashSingleQuoted $sentrySendDefaultPii)'
next_public_sentry_enable_logs='$(ConvertTo-BashSingleQuoted $sentryEnableLogs)'
sentry_web_dsn='$(ConvertTo-BashSingleQuoted $webServerSentryDsn)'
sentry_web_enabled='$(ConvertTo-BashSingleQuoted $webSentryEnabled)'
sentry_web_traces_sample_rate='$(ConvertTo-BashSingleQuoted $webSentryTracesSampleRate)'
sentry_web_environment='$(ConvertTo-BashSingleQuoted $webSentryEnvironment)'
sentry_web_release='$(ConvertTo-BashSingleQuoted $release)'
sentry_web_send_default_pii='$(ConvertTo-BashSingleQuoted $sentrySendDefaultPii)'
sentry_web_enable_logs='$(ConvertTo-BashSingleQuoted $sentryEnableLogs)'
sentry_org='$(ConvertTo-BashSingleQuoted $webSentryOrg)'
sentry_project_web='$(ConvertTo-BashSingleQuoted $webSentryProject)'
sentry_release='$(ConvertTo-BashSingleQuoted $release)'
sentry_auth_token='$(ConvertTo-BashSingleQuoted $webSentryAuthToken)'

mkdir -p /home/ubuntu/desk-imperial-builder/images
rm -rf "`$workdir"
mkdir -p "`$workdir"
tar xzf "`$source_archive" -C "`$workdir"
cd "`$workdir"

if [ "`$transport" = "registry" ]; then
  wget -qO- http://127.0.0.1:5000/v2/_catalog >/dev/null
fi

use_buildx=0
if [ "`$transport" = "registry" ] && docker buildx version >/dev/null 2>&1; then
  docker buildx inspect desk-builder >/dev/null 2>&1 || docker buildx create --name desk-builder --use --driver docker-container >/dev/null
  docker buildx inspect desk-builder --bootstrap >/dev/null
  use_buildx=1
fi

echo "==> Builder: `$services"
for service in `$services; do
  case "`$service" in
    api)
      if [ "`$use_buildx" = "1" ]; then
        docker buildx build --builder desk-builder --progress=plain --load \
          -f infra/oracle/docker/api.Dockerfile \
          -t desk-imperial-api:latest \
          -t "desk-imperial-api:`$release" .
      else
        docker build -f infra/oracle/docker/api.Dockerfile -t desk-imperial-api:latest -t "desk-imperial-api:`$release" .
      fi
      ;;
    web)
      if [ "`$use_buildx" = "1" ]; then
        docker buildx build --builder desk-builder --progress=plain --load \
          --build-arg APP_URL=https://app.deskimperial.online \
          --build-arg NEXT_PUBLIC_APP_URL=https://app.deskimperial.online \
          --build-arg NEXT_PUBLIC_API_URL=https://api.deskimperial.online \
          --build-arg NEXT_PUBLIC_MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json \
          --build-arg NEXT_PUBLIC_SENTRY_DSN="`$next_public_sentry_dsn" \
          --build-arg NEXT_PUBLIC_SENTRY_ENABLED="`$next_public_sentry_enabled" \
          --build-arg NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE="`$next_public_sentry_traces_sample_rate" \
          --build-arg NEXT_PUBLIC_SENTRY_ENVIRONMENT="`$next_public_sentry_environment" \
          --build-arg NEXT_PUBLIC_SENTRY_RELEASE="`$next_public_sentry_release" \
          --build-arg NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII="`$next_public_sentry_send_default_pii" \
          --build-arg NEXT_PUBLIC_SENTRY_ENABLE_LOGS="`$next_public_sentry_enable_logs" \
          --build-arg SENTRY_WEB_DSN="`$sentry_web_dsn" \
          --build-arg SENTRY_WEB_ENABLED="`$sentry_web_enabled" \
          --build-arg SENTRY_WEB_TRACES_SAMPLE_RATE="`$sentry_web_traces_sample_rate" \
          --build-arg SENTRY_WEB_ENVIRONMENT="`$sentry_web_environment" \
          --build-arg SENTRY_WEB_RELEASE="`$sentry_web_release" \
          --build-arg SENTRY_WEB_SEND_DEFAULT_PII="`$sentry_web_send_default_pii" \
          --build-arg SENTRY_WEB_ENABLE_LOGS="`$sentry_web_enable_logs" \
          --build-arg SENTRY_ORG="`$sentry_org" \
          --build-arg SENTRY_PROJECT_WEB="`$sentry_project_web" \
          --build-arg SENTRY_RELEASE="`$sentry_release" \
          --build-arg SENTRY_AUTH_TOKEN="`$sentry_auth_token" \
          -f infra/oracle/docker/web.Dockerfile \
          -t desk-imperial-web:latest \
          -t "desk-imperial-web:`$release" .
      else
        docker build \
          --build-arg APP_URL=https://app.deskimperial.online \
          --build-arg NEXT_PUBLIC_APP_URL=https://app.deskimperial.online \
          --build-arg NEXT_PUBLIC_API_URL=https://api.deskimperial.online \
          --build-arg NEXT_PUBLIC_MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json \
          --build-arg NEXT_PUBLIC_SENTRY_DSN="`$next_public_sentry_dsn" \
          --build-arg NEXT_PUBLIC_SENTRY_ENABLED="`$next_public_sentry_enabled" \
          --build-arg NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE="`$next_public_sentry_traces_sample_rate" \
          --build-arg NEXT_PUBLIC_SENTRY_ENVIRONMENT="`$next_public_sentry_environment" \
          --build-arg NEXT_PUBLIC_SENTRY_RELEASE="`$next_public_sentry_release" \
          --build-arg NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII="`$next_public_sentry_send_default_pii" \
          --build-arg NEXT_PUBLIC_SENTRY_ENABLE_LOGS="`$next_public_sentry_enable_logs" \
          --build-arg SENTRY_WEB_DSN="`$sentry_web_dsn" \
          --build-arg SENTRY_WEB_ENABLED="`$sentry_web_enabled" \
          --build-arg SENTRY_WEB_TRACES_SAMPLE_RATE="`$sentry_web_traces_sample_rate" \
          --build-arg SENTRY_WEB_ENVIRONMENT="`$sentry_web_environment" \
          --build-arg SENTRY_WEB_RELEASE="`$sentry_web_release" \
          --build-arg SENTRY_WEB_SEND_DEFAULT_PII="`$sentry_web_send_default_pii" \
          --build-arg SENTRY_WEB_ENABLE_LOGS="`$sentry_web_enable_logs" \
          --build-arg SENTRY_ORG="`$sentry_org" \
          --build-arg SENTRY_PROJECT_WEB="`$sentry_project_web" \
          --build-arg SENTRY_RELEASE="`$sentry_release" \
          --build-arg SENTRY_AUTH_TOKEN="`$sentry_auth_token" \
          -f infra/oracle/docker/web.Dockerfile \
          -t desk-imperial-web:latest \
          -t "desk-imperial-web:`$release" .
      fi
      ;;
  esac
done

if [ "`$transport" = "registry" ]; then
  echo "==> Publicando imagens no registry local da builder"
  for service in `$services; do
    docker tag "desk-imperial-`$service:`$release" "`$registry_push_host/desk-imperial-`$service:`$release"
    docker tag "desk-imperial-`$service:latest" "`$registry_push_host/desk-imperial-`$service:latest"
    docker push "`$registry_push_host/desk-imperial-`$service:`$release"
    docker push "`$registry_push_host/desk-imperial-`$service:latest"
  done
else
  rm -f "`$image_archive"
  docker save `$image_list | gzip -1 > "`$image_archive"
  ls -lh "`$image_archive"
fi
"@

Write-Host "==> Buildando imagens na vm-free-02"
Invoke-Remote -HostName $BuilderHost -Command $buildScript

if ($Transport -eq 'archive') {
  Write-Host "==> Baixando pacote de imagens do builder"
  if (Test-Path -LiteralPath $imageArchive) {
    Remove-Item -LiteralPath $imageArchive -Force
  }
  Invoke-Scp -Description 'Download das imagens do builder' -Arguments @(
    '-i', $KeyPath,
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', "UserKnownHostsFile=$KnownHostsPath",
    "${BuilderHost}:$remoteImageArchive",
    $imageArchive
  )
  if (-not (Test-Path -LiteralPath $imageArchive)) {
    throw "Pacote de imagens não foi gerado localmente."
  }
}

Write-Host "==> Enviando fonte para produção"
Invoke-Scp -Description 'Envio da fonte para produção' -Arguments @(
  '-i', $KeyPath,
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', "UserKnownHostsFile=$KnownHostsPath",
  $archive,
  "${ProductionHost}:$remoteArchive"
)

if ($Transport -eq 'archive') {
  Write-Host "==> Enviando pacote de imagens para produção"
  Invoke-Scp -Description 'Envio das imagens para produção' -Arguments @(
    '-i', $KeyPath,
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', "UserKnownHostsFile=$KnownHostsPath",
    $imageArchive,
    "${ProductionHost}:$remoteImageArchive"
  )
}

$prodScript = @"
set -euo pipefail
release='$release'
source_archive='$remoteArchive'
image_archive='$remoteImageArchive'
services='$serviceList'
transport='$Transport'
builder_private_host='$BuilderPrivateHost'
registry_tunnel_port='$RegistryTunnelPort'
registry_pull_host="localhost:$RegistryTunnelPort"
api_sentry_dsn='$(ConvertTo-BashSingleQuoted $apiSentryDsn)'
api_sentry_enabled='$(ConvertTo-BashSingleQuoted $apiSentryEnabled)'
api_sentry_traces_sample_rate='$(ConvertTo-BashSingleQuoted $apiSentryTracesSampleRate)'
api_sentry_profile_session_sample_rate='$(ConvertTo-BashSingleQuoted $apiSentryProfileSessionSampleRate)'
web_client_sentry_dsn='$(ConvertTo-BashSingleQuoted $webClientSentryDsn)'
web_sentry_enabled='$(ConvertTo-BashSingleQuoted $webSentryEnabled)'
web_sentry_traces_sample_rate='$(ConvertTo-BashSingleQuoted $webSentryTracesSampleRate)'
web_sentry_environment='$(ConvertTo-BashSingleQuoted $webSentryEnvironment)'
web_sentry_dsn='$(ConvertTo-BashSingleQuoted $webServerSentryDsn)'
sentry_send_default_pii='$(ConvertTo-BashSingleQuoted $sentrySendDefaultPii)'
sentry_enable_logs='$(ConvertTo-BashSingleQuoted $sentryEnableLogs)'
sentry_org='$(ConvertTo-BashSingleQuoted $webSentryOrg)'
sentry_project_web='$(ConvertTo-BashSingleQuoted $webSentryProject)'

cd /home/ubuntu/desk-imperial
tar xzf "`$source_archive" -C /home/ubuntu/desk-imperial

if [ "`$transport" = "registry" ]; then
  echo "==> Abrindo tunel SSH local para o registry da builder"
  control="/tmp/desk-registry-tunnel-`$release.sock"
  rm -f "`$control"
  old_tunnel_pids=`$(pgrep -f "127.0.0.1:`$registry_tunnel_port:127.0.0.1:5000" || true)
  if [ -n "`$old_tunnel_pids" ]; then
    echo "==> Encerrando tunel antigo do registry: `$old_tunnel_pids"
    kill `$old_tunnel_pids || true
    sleep 1
  fi
  ssh -i ~/.ssh/desk_registry_tunnel_ed25519 \
    -o StrictHostKeyChecking=accept-new \
    -o ExitOnForwardFailure=yes \
    -M -S "`$control" \
    -fnNT \
    -L "127.0.0.1:`$registry_tunnel_port:127.0.0.1:5000" \
    "ubuntu@`$builder_private_host"

  cleanup_tunnel() {
    ssh -i ~/.ssh/desk_registry_tunnel_ed25519 -S "`$control" -O exit "ubuntu@`$builder_private_host" >/dev/null 2>&1 || true
    rm -f "`$control"
  }
  trap cleanup_tunnel EXIT

  wget -qO- "http://127.0.0.1:`$registry_tunnel_port/v2/_catalog" >/dev/null
  for service in `$services; do
    docker pull "`$registry_pull_host/desk-imperial-`$service:`$release"
    docker tag "`$registry_pull_host/desk-imperial-`$service:`$release" "desk-imperial-`$service:`$release"
    docker tag "`$registry_pull_host/desk-imperial-`$service:`$release" "desk-imperial-`$service:latest"
  done
else
  docker load -i "`$image_archive"
fi

if [ -f apps/api/.env ]; then
  if grep -q '^DEMO_DAILY_LIMIT_MINUTES=' apps/api/.env; then
    sed -i 's/^DEMO_DAILY_LIMIT_MINUTES=.*/DEMO_DAILY_LIMIT_MINUTES=0/' apps/api/.env
  else
    printf '\nDEMO_DAILY_LIMIT_MINUTES=0\n' >> apps/api/.env
  fi
fi

if [ -f .env ]; then
  sed -i '/^DEMO_LOGIN_ENABLED=/d' .env
fi

export DESK_SENTRY_API_DSN="`$api_sentry_dsn"
export DESK_SENTRY_API_ENABLED="`$api_sentry_enabled"
export DESK_SENTRY_API_TRACES_SAMPLE_RATE="`$api_sentry_traces_sample_rate"
export DESK_SENTRY_API_PROFILE_SESSION_SAMPLE_RATE="`$api_sentry_profile_session_sample_rate"
export DESK_SENTRY_WEB_CLIENT_DSN="`$web_client_sentry_dsn"
export DESK_SENTRY_WEB_DSN="`$web_sentry_dsn"
export DESK_SENTRY_WEB_ENABLED="`$web_sentry_enabled"
export DESK_SENTRY_WEB_TRACES_SAMPLE_RATE="`$web_sentry_traces_sample_rate"
export DESK_SENTRY_ENVIRONMENT="`$web_sentry_environment"
export DESK_SENTRY_RELEASE="`$release"
export DESK_SENTRY_SEND_DEFAULT_PII="`$sentry_send_default_pii"
export DESK_SENTRY_ENABLE_LOGS="`$sentry_enable_logs"
export DESK_SENTRY_ORG="`$sentry_org"
export DESK_SENTRY_PROJECT_WEB="`$sentry_project_web"

python3 - <<'PY'
import os
from pathlib import Path

env_path = Path('/home/ubuntu/desk-imperial/.env')
lines = env_path.read_text(encoding='utf-8').splitlines() if env_path.exists() else []
index_by_key = {}

for index, line in enumerate(lines):
    if not line or line.lstrip().startswith('#') or '=' not in line:
        continue
    key = line.split('=', 1)[0].strip()
    if key:
        index_by_key[key] = index

updates = {
    'SENTRY_DSN': os.environ.get('DESK_SENTRY_API_DSN', ''),
    'SENTRY_ENABLED': os.environ.get('DESK_SENTRY_API_ENABLED', 'false'),
    'SENTRY_ENABLE_LOGS': os.environ.get('DESK_SENTRY_ENABLE_LOGS', 'false'),
    'SENTRY_SEND_DEFAULT_PII': os.environ.get('DESK_SENTRY_SEND_DEFAULT_PII', 'false'),
    'SENTRY_TRACES_SAMPLE_RATE': os.environ.get('DESK_SENTRY_API_TRACES_SAMPLE_RATE', '0.1'),
    'SENTRY_PROFILE_SESSION_SAMPLE_RATE': os.environ.get('DESK_SENTRY_API_PROFILE_SESSION_SAMPLE_RATE', '0.02'),
    'SENTRY_PROFILE_LIFECYCLE': 'trace',
    'SENTRY_ENVIRONMENT': os.environ.get('DESK_SENTRY_ENVIRONMENT', 'production'),
    'SENTRY_RELEASE': os.environ.get('DESK_SENTRY_RELEASE', ''),
    'NEXT_PUBLIC_SENTRY_DSN': os.environ.get('DESK_SENTRY_WEB_CLIENT_DSN', ''),
    'NEXT_PUBLIC_SENTRY_ENABLED': os.environ.get('DESK_SENTRY_WEB_ENABLED', 'false'),
    'NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE': os.environ.get('DESK_SENTRY_WEB_TRACES_SAMPLE_RATE', '0.1'),
    'NEXT_PUBLIC_SENTRY_ENVIRONMENT': os.environ.get('DESK_SENTRY_ENVIRONMENT', 'production'),
    'NEXT_PUBLIC_SENTRY_RELEASE': os.environ.get('DESK_SENTRY_RELEASE', ''),
    'NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII': os.environ.get('DESK_SENTRY_SEND_DEFAULT_PII', 'false'),
    'NEXT_PUBLIC_SENTRY_ENABLE_LOGS': os.environ.get('DESK_SENTRY_ENABLE_LOGS', 'false'),
    'SENTRY_WEB_DSN': os.environ.get('DESK_SENTRY_WEB_DSN', ''),
    'SENTRY_WEB_ENABLED': os.environ.get('DESK_SENTRY_WEB_ENABLED', 'false'),
    'SENTRY_WEB_TRACES_SAMPLE_RATE': os.environ.get('DESK_SENTRY_WEB_TRACES_SAMPLE_RATE', '0.1'),
    'SENTRY_WEB_ENVIRONMENT': os.environ.get('DESK_SENTRY_ENVIRONMENT', 'production'),
    'SENTRY_WEB_RELEASE': os.environ.get('DESK_SENTRY_RELEASE', ''),
    'SENTRY_WEB_SEND_DEFAULT_PII': os.environ.get('DESK_SENTRY_SEND_DEFAULT_PII', 'false'),
    'SENTRY_WEB_ENABLE_LOGS': os.environ.get('DESK_SENTRY_ENABLE_LOGS', 'false'),
    'SENTRY_ORG': os.environ.get('DESK_SENTRY_ORG', 'desk-imperial'),
    'SENTRY_PROJECT_WEB': os.environ.get('DESK_SENTRY_PROJECT_WEB', 'javascript-nextjs'),
}

for key, value in updates.items():
    if value is None:
        continue
    entry = f'{key}={value}'
    if key in index_by_key:
        lines[index_by_key[key]] = entry
    else:
        index_by_key[key] = len(lines)
        lines.append(entry)

env_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
PY

docker compose up -d --no-build --force-recreate `$services

for service in `$services; do
  container="desk-`$service"
  echo "==> Aguardando health de `$container"
  for attempt in `$(seq 1 90); do
    status=`$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "`$container" 2>/dev/null || true)
    if [ "`$status" = "healthy" ] || [ "`$status" = "running" ]; then
      echo "`$container=`$status"
      break
    fi
    if [ "`$attempt" -eq 90 ]; then
      echo "ERRO: `$container nao ficou healthy. Status final: `$status"
      docker logs --tail=120 "`$container" || true
      exit 1
    fi
    sleep 2
  done
done

docker compose ps
"@

Write-Host "==> Promovendo imagens na produção via $Transport"
Invoke-Remote -HostName $ProductionHost -Command $prodScript

Write-Host "==> Validando endpoints públicos"
for ($attempt = 1; $attempt -le 20; $attempt++) {
  try {
    $app = Invoke-WebRequest -UseBasicParsing -Uri 'https://app.deskimperial.online/' -TimeoutSec 30
    $api = Invoke-WebRequest -UseBasicParsing -Uri 'https://api.deskimperial.online/api/v1/health' -TimeoutSec 30
    break
  } catch {
    if ($attempt -eq 20) {
      throw
    }

    Start-Sleep -Seconds 3
  }
}
Write-Host "app=$($app.StatusCode)"
Write-Host "api=$($api.StatusCode)"

Write-Host "==> Limpando artefatos temporários"
Invoke-Remote -HostName $BuilderHost -Command "rm -f '$remoteArchive' '$remoteImageArchive'"
Invoke-Remote -HostName $ProductionHost -Command "rm -f '$remoteArchive' '$remoteImageArchive'"
Remove-Item -LiteralPath $archive, $imageArchive -Force -ErrorAction SilentlyContinue

Write-Host "==> Deploy finalizado: $release"
