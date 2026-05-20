param(
  [string] $PrivateKeyPath = '',
  [string] $DestinationDir = '',
  [string] $EnvPath = '',
  [switch] $NoOpen,
  [switch] $KeepPlaintextPrivateKey
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  $scriptPath = $PSScriptRoot
  if ([string]::IsNullOrWhiteSpace($scriptPath)) {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
  }

  return (Resolve-Path -LiteralPath (Join-Path $scriptPath '..')).Path
}

function Resolve-DefaultPath {
  param(
    [string] $Value,
    [string] $Fallback
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $Fallback
  }

  return $Value
}

function Write-SecretTextFile {
  param(
    [string] $Path,
    [string] $Content
  )

  $directory = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
  Set-Content -LiteralPath $Path -Value $Content.Trim() -Encoding ascii
}

function Copy-PrivateKey {
  param(
    [string] $SourcePath,
    [string] $TargetPath
  )

  if ([string]::IsNullOrWhiteSpace($SourcePath)) {
    Ensure-PrivateKeyPlaceholder -TargetPath $TargetPath
    return
  }

  $resolvedSource = (Resolve-Path -LiteralPath $SourcePath).Path
  Copy-Item -LiteralPath $resolvedSource -Destination $TargetPath -Force
}

function Ensure-PrivateKeyPlaceholder {
  param([string] $TargetPath)

  if (-not (Test-Path -LiteralPath $TargetPath)) {
    Set-Content -LiteralPath $TargetPath -Value '' -Encoding ascii
  }

  if (-not $NoOpen) {
    Write-Host "Cole a private_key.pem no arquivo que sera aberto e salve antes de fechar o Notepad."
    Start-Process -FilePath 'notepad.exe' -ArgumentList "`"$TargetPath`"" -Wait
  }
}

function Assert-CertificatePem {
  param([string] $Path)

  $content = Get-Content -LiteralPath $Path -Raw
  if ($content -notmatch '-----BEGIN CERTIFICATE-----' -or $content -notmatch '-----END CERTIFICATE-----') {
    throw "Certificado QZ invalido em $Path."
  }
}

function Assert-PrivateKeyPem {
  param([string] $Path)

  $content = Get-Content -LiteralPath $Path -Raw
  $hasPrivateKey = $content -match '-----BEGIN (RSA |EC |)PRIVATE KEY-----'
  $hasPrivateKeyEnd = $content -match '-----END (RSA |EC |)PRIVATE KEY-----'
  if (-not $hasPrivateKey -or -not $hasPrivateKeyEnd) {
    throw "private_key.pem ausente ou invalida em $Path. Rode novamente sem -NoOpen ou informe -PrivateKeyPath."
  }
}

function Protect-PrivateKeyFile {
  param([string] $Path)

  if ([System.Environment]::OSVersion.Platform -ne 'Win32NT') {
    return
  }

  $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  icacls $Path /inheritance:r /grant:r "${currentUser}:F" "*S-1-5-18:F" "*S-1-5-32-544:F" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao restringir permissoes de $Path."
  }
}

function Get-Sha256Hex {
  param([string] $Path)

  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    return ([System.BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha256.Dispose()
  }
}

function New-RandomBytes {
  param([int] $Length)

  $bytes = New-Object byte[] $Length
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
    return $bytes
  } finally {
    $generator.Dispose()
  }
}

function Copy-ByteRange {
  param(
    [byte[]] $Source,
    [int] $Start,
    [int] $Length
  )

  $target = New-Object byte[] $Length
  [System.Array]::Copy($Source, $Start, $target, 0, $Length)
  return $target
}

function Join-ByteArrays {
  param([byte[][]] $Parts)

  $length = 0
  foreach ($part in $Parts) {
    $length += $part.Length
  }

  $result = New-Object byte[] $length
  $offset = 0
  foreach ($part in $Parts) {
    [System.Array]::Copy($part, 0, $result, $offset, $part.Length)
    $offset += $part.Length
  }

  return $result
}

function Protect-PrivateKeyForRuntime {
  param(
    [string] $SourcePath,
    [string] $TargetPath
  )

  $plaintext = [System.IO.File]::ReadAllBytes($SourcePath)
  $masterKey = New-RandomBytes -Length 64
  $encryptionKey = Copy-ByteRange -Source $masterKey -Start 0 -Length 32
  $macKey = Copy-ByteRange -Source $masterKey -Start 32 -Length 32
  $iv = New-RandomBytes -Length 16

  $aes = [System.Security.Cryptography.Aes]::Create()
  try {
    $aes.KeySize = 256
    $aes.BlockSize = 128
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
    $aes.Key = $encryptionKey
    $aes.IV = $iv

    $encryptor = $aes.CreateEncryptor()
    try {
      $ciphertext = $encryptor.TransformFinalBlock($plaintext, 0, $plaintext.Length)
    } finally {
      $encryptor.Dispose()
    }
  } finally {
    $aes.Dispose()
  }

  $aad = [System.Text.Encoding]::UTF8.GetBytes('qz-tray-private-key:v1')
  $macInput = Join-ByteArrays -Parts @($aad, $iv, $ciphertext)
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($macKey)
  try {
    $signature = $hmac.ComputeHash($macInput)
  } finally {
    $hmac.Dispose()
  }

  $payload = [ordered]@{
    version = 1
    algorithm = 'aes-256-cbc+hmac-sha256'
    iv = [System.Convert]::ToBase64String($iv)
    ciphertext = [System.Convert]::ToBase64String($ciphertext)
    hmac = [System.Convert]::ToBase64String($signature)
  }

  Set-Content -LiteralPath $TargetPath -Value ($payload | ConvertTo-Json -Compress) -Encoding ascii
  Protect-PrivateKeyFile -Path $TargetPath

  return [System.Convert]::ToBase64String($masterKey)
}

function Upsert-EnvValue {
  param(
    [string] $Path,
    [string] $Key,
    [string] $Value
  )

  $line = "$Key=$Value"
  if (-not (Test-Path -LiteralPath $Path)) {
    Set-Content -LiteralPath $Path -Value $line -Encoding utf8
    return
  }

  $lines = @(Get-Content -LiteralPath $Path)
  $pattern = "^\s*$([regex]::Escape($Key))="
  $updated = $false
  $nextLines = @(foreach ($existingLine in $lines) {
    if ($existingLine -match $pattern) {
      $updated = $true
      $line
    } else {
      $existingLine
    }
  })

  if (-not $updated) {
    $nextLines += $line
  }

  Set-Content -LiteralPath $Path -Value $nextLines -Encoding utf8
}

function Remove-EnvValue {
  param(
    [string] $Path,
    [string] $Key
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $pattern = "^\s*$([regex]::Escape($Key))="
  $nextLines = @(Get-Content -LiteralPath $Path | Where-Object { $_ -notmatch $pattern })
  Set-Content -LiteralPath $Path -Value $nextLines -Encoding utf8
}

$repoRoot = Resolve-RepoRoot
$targetDir = Resolve-DefaultPath -Value $DestinationDir -Fallback (Join-Path $repoRoot '.secrets\qz-tray')
$targetEnvPath = Resolve-DefaultPath -Value $EnvPath -Fallback (Join-Path $repoRoot 'apps\web\.env.local')
$defaultCertificatePath = Join-Path $repoRoot 'scripts\qz-tray-demo-certificate.txt'
$certificatePath = Join-Path $targetDir 'digital-certificate.txt'
$privateKeyTargetPath = Join-Path $targetDir 'private_key.pem'
$encryptedPrivateKeyPath = Join-Path $targetDir 'private_key.encrypted.json'

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Write-SecretTextFile -Path $certificatePath -Content (Get-Content -LiteralPath $defaultCertificatePath -Raw)
Copy-PrivateKey -SourcePath $PrivateKeyPath -TargetPath $privateKeyTargetPath
Assert-CertificatePem -Path $certificatePath
Assert-PrivateKeyPem -Path $privateKeyTargetPath

$certificateSha256 = Get-Sha256Hex -Path $certificatePath
$privateKeySha256 = Get-Sha256Hex -Path $privateKeyTargetPath
$privateKeyEncryptionKey = Protect-PrivateKeyForRuntime -SourcePath $privateKeyTargetPath -TargetPath $encryptedPrivateKeyPath

Upsert-EnvValue -Path $targetEnvPath -Key 'QZ_TRAY_CERTIFICATE_PATH' -Value $certificatePath
Upsert-EnvValue -Path $targetEnvPath -Key 'QZ_TRAY_CERTIFICATE_SHA256' -Value $certificateSha256
Upsert-EnvValue -Path $targetEnvPath -Key 'QZ_TRAY_PRIVATE_KEY_ENCRYPTED_PATH' -Value $encryptedPrivateKeyPath
Upsert-EnvValue -Path $targetEnvPath -Key 'QZ_TRAY_PRIVATE_KEY_ENCRYPTION_KEY' -Value $privateKeyEncryptionKey
Upsert-EnvValue -Path $targetEnvPath -Key 'QZ_TRAY_PRIVATE_KEY_SHA256' -Value $privateKeySha256

if ($KeepPlaintextPrivateKey) {
  Protect-PrivateKeyFile -Path $privateKeyTargetPath
  Upsert-EnvValue -Path $targetEnvPath -Key 'QZ_TRAY_PRIVATE_KEY_PATH' -Value $privateKeyTargetPath
} else {
  Remove-Item -LiteralPath $privateKeyTargetPath -Force
  Remove-EnvValue -Path $targetEnvPath -Key 'QZ_TRAY_PRIVATE_KEY_PATH'
}

Write-Host "QZ Tray certificado configurado:"
Write-Host "  certificado: $certificatePath"
Write-Host "  certificado sha256: $certificateSha256"
Write-Host "  private key criptografada: $encryptedPrivateKeyPath"
Write-Host "  private key sha256: $privateKeySha256"
Write-Host "  env: $targetEnvPath"
Write-Host "A chave privada nao foi exibida. O runtime usa arquivo criptografado + hash de integridade."
