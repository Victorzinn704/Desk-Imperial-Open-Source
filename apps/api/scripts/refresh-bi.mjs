import { spawnSync } from 'node:child_process'
import process from 'node:process'

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  process.stderr.write('DIRECT_URL ou DATABASE_URL é obrigatório para refresh do schema bi.\n')
  process.exit(1)
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', 'prisma/sql/refresh-bi.sql'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  },
)

process.exit(result.status ?? 1)
