param(
  [string] $KeyPath = (Join-Path $env:TEMP 'desk_oci_ops_key.pem'),
  [string] $SourceKeyPath = 'C:\Users\Desktop\.oci\oci_api_key_new.pem',
  [string] $OpsHost = 'ubuntu@147.15.60.224'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $KeyPath)) {
  Copy-Item -LiteralPath $SourceKeyPath -Destination $KeyPath -Force
}

icacls $KeyPath /inheritance:r /grant:r "$env:USERNAME`:R" | Out-Null

ssh -i $KeyPath `
  -o StrictHostKeyChecking=no `
  -L 3001:127.0.0.1:3001 `
  -L 9090:127.0.0.1:9090 `
  -L 9093:127.0.0.1:9093 `
  -L 9000:127.0.0.1:9000 `
  -L 12345:127.0.0.1:12345 `
  -L 3100:127.0.0.1:3100 `
  -L 3200:127.0.0.1:3200 `
  $OpsHost
