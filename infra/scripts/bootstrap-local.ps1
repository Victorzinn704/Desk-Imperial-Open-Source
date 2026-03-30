$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

Set-Location $root
npm run db:up
npm --workspace @partner/api run prisma:generate
npm --workspace @partner/api run prisma:migrate:dev
npm run seed
