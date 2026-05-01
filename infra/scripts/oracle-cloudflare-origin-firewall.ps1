param(
  [ValidateSet('apply', 'confirm', 'rollback')]
  [string] $Action = 'apply',
  [string] $StateDir,
  [int] $RollbackSeconds = 180,
  [string[]] $ExtraIpv4Ranges = @(),
  [string[]] $ExtraIpv6Ranges = @(),
  [string] $KeyPath = (Join-Path $env:TEMP 'desk_oci_key.pem'),
  [string] $SourceKeyPath = 'C:\Users\Desktop\.oci\oci_api_key_new.pem',
  [string] $ProductionHost = $env:DESK_PRODUCTION_HOST,
  [string] $KnownHostsPath = (Join-Path $env:USERPROFILE '.ssh\known_hosts')
)

$ErrorActionPreference = 'Stop'

if (-not $ProductionHost) {
  $ProductionHost = 'ubuntu@163.176.171.242'
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
  Copy-Item -LiteralPath $SourceKeyPath -Destination $KeyPath -Force
}

$remoteScriptPath = '/tmp/oracle-cloudflare-origin-ufw-allowlist.sh'

scp -i $KeyPath -o StrictHostKeyChecking=accept-new -o "UserKnownHostsFile=$KnownHostsPath" `
  "infra/scripts/oracle-cloudflare-origin-ufw-allowlist.sh" "${ProductionHost}:$remoteScriptPath"
if ($LASTEXITCODE -ne 0) {
  throw 'Falha ao enviar o script de firewall para a origem.'
}

$stateArg = if ($StateDir) { " '$StateDir'" } else { '' }
$extraIpv4Arg = if ($ExtraIpv4Ranges.Count -gt 0) { " EXTRA_IPV4_RANGES='$($ExtraIpv4Ranges -join ' ')'" } else { '' }
$extraIpv6Arg = if ($ExtraIpv6Ranges.Count -gt 0) { " EXTRA_IPV6_RANGES='$($ExtraIpv6Ranges -join ' ')'" } else { '' }
$remoteCommand = "chmod 700 $remoteScriptPath && sudo ROLLBACK_SECONDS=$RollbackSeconds$extraIpv4Arg$extraIpv6Arg bash $remoteScriptPath $Action$stateArg"

ssh -i $KeyPath -o StrictHostKeyChecking=accept-new -o "UserKnownHostsFile=$KnownHostsPath" `
  -o ServerAliveInterval=20 -o ServerAliveCountMax=20 `
  $ProductionHost $remoteCommand
if ($LASTEXITCODE -ne 0) {
  throw 'Falha ao executar a automação de firewall na origem.'
}
