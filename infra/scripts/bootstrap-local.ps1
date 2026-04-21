$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

Set-Location $root
npm run local:backend:prepare
