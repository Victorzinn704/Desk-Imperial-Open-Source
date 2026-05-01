param(
  [string] $KeyPath = (Join-Path $env:TEMP 'desk_oci_db_key.pem'),
  [string] $SourceKeyPath = 'C:\Users\Desktop\.oci\oci_api_key_new.pem',
  [string] $DbHost = $env:DESK_DB_HOST,
  [string] $KnownHostsPath = (Join-Path $env:USERPROFILE '.ssh\known_hosts')
)

$ErrorActionPreference = 'Stop'

if (-not $DbHost) {
  throw 'Defina o host do banco via parâmetro -DbHost ou variável DESK_DB_HOST.'
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
  Copy-Item -LiteralPath $SourceKeyPath -Destination $KeyPath -Force
}

icacls $KeyPath /inheritance:r /grant:r "$env:USERNAME`:R" | Out-Null

ssh -i $KeyPath `
  -o StrictHostKeyChecking=accept-new `
  -o UserKnownHostsFile=$KnownHostsPath `
  -L 5432:127.0.0.1:5432 `
  -L 6432:127.0.0.1:6432 `
  -L 9100:127.0.0.1:9100 `
  -L 9187:127.0.0.1:9187 `
  $DbHost
