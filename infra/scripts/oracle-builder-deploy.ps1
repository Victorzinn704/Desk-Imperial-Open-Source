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

if (-not $BuilderHost) {
  throw 'Defina o host do builder via parâmetro -BuilderHost ou variável DESK_BUILDER_HOST.'
}

if (-not $BuilderPrivateHost) {
  throw 'Defina o host privado do builder via parâmetro -BuilderPrivateHost ou variável DESK_BUILDER_PRIVATE_HOST.'
}

if (-not $ProductionHost) {
  throw 'Defina o host de produção via parâmetro -ProductionHost ou variável DESK_PRODUCTION_HOST.'
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

$release = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss')
$archive = Join-Path $env:TEMP "desk-imperial-source-$release.tgz"
$imageArchive = Join-Path $env:TEMP "desk-imperial-images-$release.tgz"
$remoteArchive = "/tmp/desk-imperial-source-$release.tgz"
$remoteImageArchive = "/tmp/desk-imperial-images-$release.tgz"

Write-Host "==> Empacotando fonte ($SourceMode): $archive"
if (Test-Path -LiteralPath $archive) {
  Remove-Item -LiteralPath $archive -Force
}
$hasLocalChanges = [bool](git status --porcelain)
if ($SourceMode -eq 'head') {
  git archive --format=tar.gz --output=$archive HEAD
}
elseif (-not $hasLocalChanges) {
  git archive --format=tar.gz --output=$archive HEAD
}
else {
  git ls-files -z -co --exclude-standard | tar.exe --null -czf $archive -T -
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
          -f infra/oracle/docker/web.Dockerfile \
          -t desk-imperial-web:latest \
          -t "desk-imperial-web:`$release" .
      else
        docker build \
          --build-arg APP_URL=https://app.deskimperial.online \
          --build-arg NEXT_PUBLIC_APP_URL=https://app.deskimperial.online \
          --build-arg NEXT_PUBLIC_API_URL=https://api.deskimperial.online \
          --build-arg NEXT_PUBLIC_MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json \
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
